// Код синхронизации и сквозное шифрование облачных настроек.
//
// Код — это 20 случайных символов Crockford Base32 (100 бит) в виде
// SCT1-XXXXX-XXXXX-XXXXX-XXXXX. Из него через PBKDF2 выводятся:
//   * ключ AES-GCM (32 байта) — им шифруется JSON;
//   * slot — идентификатор записи в KV (22 символа base64url);
//   * auth — ключ записи (43 символа base64url).
// Сам код на сервер никогда не отправляется: только slot и auth.
//
// PBKDF2 здесь нужен не для защиты от перебора (код и так случайный), а
// чтобы из перехваченного slot нельзя было дешёво вернуть код. 150k
// итераций дают ~50–100 мс один раз за вкладку и кешируются.

const CODE_PREFIX = 'SCT1';
const CODE_LENGTH = 20;
// Crockford Base32: без I, L, O, U — их путают с 1, 0 и V.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PBKDF2_ITERATIONS = 150000;
const PBKDF2_SALT = new TextEncoder().encode('strict-compact-tab/cloud/v1');
const DERIVE_BITS = 512;

const deriveCache = new Map();

function formatCode(body) {
  return CODE_PREFIX + '-' + body.match(/.{5}/g).join('-');
}

export function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let body = '';
  // 256 делится на 32 нацело — смещения нет, байт можно брать по модулю.
  for (let i = 0; i < bytes.length; i++) body += ALPHABET[bytes[i] & 31];
  return formatCode(body);
}

export function normalizeCode(input) {
  const raw = String(input || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/U/g, 'V');

  if (!raw.startsWith(CODE_PREFIX)) return null;
  const body = raw.slice(CODE_PREFIX.length);

  if (body.length !== CODE_LENGTH) return null;
  for (let i = 0; i < body.length; i++) {
    if (ALPHABET.indexOf(body[i]) === -1) return null;
  }
  return formatCode(body);
}

export function isCloudCode(value) {
  return normalizeCode(value) !== null;
}

function concatBytes(...parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

export function bytesToBase64Url(bytes) {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(text) {
  const source = String(text || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = source + '='.repeat((4 - (source.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function sha256Base64Url(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToBase64Url(new Uint8Array(digest));
}

async function deriveUncached(canonical, iterations) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(canonical),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: PBKDF2_SALT,
        iterations,
        hash: 'SHA-256'
      },
      material,
      DERIVE_BITS
    )
  );

  const keyBytes = bits.slice(0, 32);
  const authSeed = bits.slice(32);
  const slot = (await sha256Base64Url(concatBytes(authSeed, new TextEncoder().encode('|slot')))).slice(
    0,
    22
  );
  const auth = (await sha256Base64Url(concatBytes(authSeed, new TextEncoder().encode('|auth')))).slice(
    0,
    43
  );
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
    'encrypt',
    'decrypt'
  ]);

  return { canonical, key, slot, auth };
}

/**
 * @param {string} code
 * @param {{iterations?: number}} [options] только для тестов
 */
export async function deriveCode(code, options = {}) {
  const canonical = normalizeCode(code);
  if (!canonical) throw new Error('bad_code');

  const iterations = Math.max(1, Math.min(1000000, Number(options.iterations) || PBKDF2_ITERATIONS));
  const cacheKey = canonical + '|' + iterations;
  if (deriveCache.has(cacheKey)) return deriveCache.get(cacheKey);

  const promise = deriveUncached(canonical, iterations);
  deriveCache.set(cacheKey, promise);
  try {
    return await promise;
  } catch (error) {
    deriveCache.delete(cacheKey);
    throw error;
  }
}

async function gzip(bytes) {
  if (typeof CompressionStream !== 'function') return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (error) {
    return null;
  }
}

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encryptPayload(payload, derived) {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  let comp = 'none';
  let body = json;

  const compressed = await gzip(json);
  if (compressed && compressed.byteLength < json.byteLength) {
    comp = 'gzip';
    body = compressed;
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derived.key, body)
  );

  return {
    v: 1,
    comp,
    iv: bytesToBase64Url(iv),
    data: bytesToBase64Url(cipher)
  };
}

export async function decryptPayload(envelope, derived) {
  if (!envelope || envelope.v !== 1) throw new Error('bad_envelope');
  if (typeof envelope.iv !== 'string' || envelope.iv.length !== 16) {
    throw new Error('bad_envelope');
  }
  if (typeof envelope.data !== 'string' || !envelope.data) {
    throw new Error('bad_envelope');
  }

  let plain;
  try {
    plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64UrlToBytes(envelope.iv) },
        derived.key,
        base64UrlToBytes(envelope.data)
      )
    );
  } catch (error) {
    // Неверный код и повреждённые данные неразличимы по AES-GCM — это нормально.
    const failure = /** @type {Error & {code?: string}} */ (new Error('decrypt_failed'));
    failure.code = 'decrypt_failed';
    throw failure;
  }

  let body = plain;
  if (envelope.comp === 'gzip') body = await gunzip(plain);
  else if (envelope.comp !== 'none') throw new Error('bad_compression');

  let value;
  try {
    value = JSON.parse(new TextDecoder().decode(body));
  } catch (error) {
    throw new Error('bad_payload', { cause: error });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('bad_payload');
  }
  return value;
}

export const CloudSync = {
  PBKDF2_ITERATIONS,
  generateCode,
  normalizeCode,
  isCloudCode,
  deriveCode,
  encryptPayload,
  decryptPayload,
  bytesToBase64Url,
  base64UrlToBytes
};
