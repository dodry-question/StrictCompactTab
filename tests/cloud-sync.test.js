import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Сквозное шифрование облачных настроек (services/cloud-sync.js).
//
// Код синхронизации — единственный секрет: из него выводятся ключ AES-GCM,
// slot и auth. Сервер получает только slot/auth и шифротекст. Тесты фиксируют
// формат кода, устойчивость нормализации к опечаткам (O/0, I/1, U/V) и то,
// что чужой код НЕ может расшифровать конверт.
//
// PBKDF2 в тестах идёт с малым числом итераций: проверяется логика, а не
// криптостойкость (150k итераций сделали бы прогон медленным).
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serviceUrl = pathToFileURL(path.join(ROOT, 'services/cloud-sync.js')).href;

const {
  generateCode,
  normalizeCode,
  isCloudCode,
  deriveCode,
  encryptPayload,
  decryptPayload
} = await import(serviceUrl);

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_RE = /^SCT1-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/;

function isCrockford(body) {
  return [...body].every((char) => ALPHABET.includes(char));
}

test('generateCode: формат SCT1 и только символы Crockford Base32', () => {
  for (let i = 0; i < 25; i++) {
    const code = generateCode();
    assert.match(code, CODE_RE);
    assert.equal(normalizeCode(code), code);
  }
});

test('normalizeCode: регистр, пробелы и пропущенные дефисы не важны', () => {
  const code = 'SCT1-ABCDE-FGHJK-MNPQR-STVWX';
  assert.equal(normalizeCode(code.toLowerCase()), code);
  assert.equal(normalizeCode('sct1 abcde fghjk mnpqr stvwx'), code);
  assert.equal(normalizeCode('  SCT1ABCDEFGHJKMNPQRSTVWX  '), code);
  assert.equal(isCloudCode(code), true);
});

test('normalizeCode: похожие символы исправляются (O→0, I/L→1, U→V)', () => {
  assert.equal(
    normalizeCode('SCT1-OOOOO-IIIII-LLLLL-UUUUU'),
    'SCT1-00000-11111-11111-VVVVV'
  );
  // Префикс с I вместо 1 — частая опечатка при переписывании кода
  assert.equal(
    normalizeCode('SCTI-ABCDE-FGHJK-MNPQR-STVWX'),
    'SCT1-ABCDE-FGHJK-MNPQR-STVWX'
  );
});

test('normalizeCode: мусор и неверная длина отклоняются', () => {
  assert.equal(normalizeCode(''), null);
  assert.equal(normalizeCode('SCT1'), null);
  assert.equal(normalizeCode('SCT1-ABCDE-FGHJK-MNPQR-STVW'), null);
  assert.equal(normalizeCode('SCT1-ABCDE-FGHJK-MNPQR-STVWXY'), null);
  assert.equal(normalizeCode('ABCDE-FGHJK-MNPQR-STVWX'), null);
  assert.equal(normalizeCode('SCT1-ABCDE-FGHJK-MNPQR-STVW!'), null);
  assert.equal(isCloudCode('not a code'), false);
});

test('deriveCode: одинаковый код даёт одинаковые slot/auth, разные — разные', async () => {
  const a1 = await deriveCode('SCT1-ABCDE-FGHJK-MNPQR-STVWX', { iterations: 1000 });
  const a2 = await deriveCode('sct1 abcde fghjk mnpqr stvwx', { iterations: 1000 });
  const b = await deriveCode('SCT1-ABCDE-FGHJK-MNPQR-STVWY', { iterations: 1000 });

  assert.equal(a1.slot, a2.slot);
  assert.equal(a1.auth, a2.auth);
  assert.notEqual(a1.slot, b.slot);
  assert.notEqual(a1.auth, b.auth);

  // 22 символа — идентификатор слота в KV; 43 — пропуск на запись
  assert.match(a1.slot, /^[A-Za-z0-9_-]{22}$/);
  assert.match(a1.auth, /^[A-Za-z0-9_-]{43}$/);
});

test('deriveCode: кривой код — ошибка bad_code', async () => {
  await assert.rejects(deriveCode('SCT1-123', { iterations: 1000 }), /bad_code/);
});

test('encryptPayload → decryptPayload: JSON переживает шифрование и gzip', async () => {
  const derived = await deriveCode('SCT1-ABCDE-FGHJK-MNPQR-STVWX', { iterations: 1000 });
  const payload = {
    format: 'strict-compact-tab-cloud',
    text: 'Привет, мир',
    nested: { list: [1, 2, 3], flag: true },
    numbers: [0, -1.5, 1000000]
  };

  const envelope = await encryptPayload(payload, derived);
  assert.equal(envelope.v, 1);
  assert.ok(envelope.comp === 'gzip' || envelope.comp === 'none');
  assert.equal(envelope.iv.length, 16);
  assert.match(envelope.data, /^[A-Za-z0-9_-]+$/);

  const restored = await decryptPayload(envelope, derived);
  assert.deepEqual(restored, payload);
});

test('decryptPayload: другой код не расшифровывает конверт', async () => {
  const derived = await deriveCode('SCT1-ABCDE-FGHJK-MNPQR-STVWX', { iterations: 1000 });
  const other = await deriveCode('SCT1-ABCDE-FGHJK-MNPQR-STVWY', { iterations: 1000 });
  const envelope = await encryptPayload({ theme: 'light' }, derived);

  await assert.rejects(
    decryptPayload(envelope, other),
    (error) => error && error.code === 'decrypt_failed'
  );
});

test('decryptPayload: повреждённые данные и чужая версия конверта отклоняются', async () => {
  const derived = await deriveCode('SCT1-ABCDE-FGHJK-MNPQR-STVWX', { iterations: 1000 });
  const envelope = await encryptPayload({ theme: 'dark' }, derived);

  const tampered = Object.assign({}, envelope, {
    data: (envelope.data[0] === 'A' ? 'B' : 'A') + envelope.data.slice(1)
  });
  await assert.rejects(
    decryptPayload(tampered, derived),
    (error) => error && error.code === 'decrypt_failed'
  );

  await assert.rejects(decryptPayload({ v: 2 }, derived), /bad_envelope/);
  await assert.rejects(decryptPayload({ v: 1, iv: 'short', data: 'abc' }, derived), /bad_envelope/);
  await assert.rejects(
    decryptPayload({ v: 1, iv: envelope.iv, data: envelope.data, comp: 'brotli' }, derived),
    /bad_compression/
  );
});
