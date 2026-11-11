// Облачное хранилище настроек. Сервер видит только шифротекст:
// ключ шифрования и код синхронизации остаются на устройстве.
//
// Слот — первые 22 символа base64url от SHA-256, вычисленного клиентом из
// кода. X-Sync-Auth — отдельное производное того же кода. Worker хранит
// только SHA-256 от него и сверяет при каждой записи: чужой не сможет
// перезаписать слот, даже зная URL.
//
// Ограничение: любой, кто знает код синхронизации, может вывести auth.
// Роль «главное устройство» — это защита от случайной перезаписи в UI,
// а не криптографическое разделение прав.

import { sha256Hex } from './hash.js';
import { json } from './http.js';

const SLOT_RE = /^[A-Za-z0-9_-]{16,64}$/;
const AUTH_RE = /^[A-Za-z0-9_-]{20,128}$/;
const IV_RE = /^[A-Za-z0-9_-]{16}$/;
const DATA_RE = /^[A-Za-z0-9_-]+$/;

function syncKey(slot) {
  return 'sync:' + slot;
}

function authKey(slot) {
  return 'sync-auth:' + slot;
}

function maxBytes(env) {
  const value = Number(env.SYNC_MAX_BYTES);
  return Number.isFinite(value) && value >= 1024 ? value : 2 * 1024 * 1024;
}

function validEnvelope(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.v !== 1) return false;
  if (!IV_RE.test(String(value.iv || ''))) return false;
  if (!DATA_RE.test(String(value.data || ''))) return false;
  if (value.comp !== 'gzip' && value.comp !== 'none') return false;
  return true;
}

function tooLarge() {
  return json({ error: 'payload_too_large' }, 413);
}

export async function syncGet(env, slot) {
  if (!SLOT_RE.test(slot)) return json({ error: 'bad_slot' }, 400);

  const raw = await env.SYNC.get(syncKey(slot), { type: 'text' });
  if (!raw) return json({ error: 'not_found' }, 404);

  // Данные уже зашифрованы клиентом; сервер не разбирает и не логирует их.
  return new Response(raw, {
    status: 200,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'X-Schedule-Hash',
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff'
    }
  });
}

export async function syncPut(request, env, slot) {
  if (!SLOT_RE.test(slot)) return json({ error: 'bad_slot' }, 400);

  const auth = request.headers.get('x-sync-auth') || '';
  if (!AUTH_RE.test(auth)) return json({ error: 'bad_auth' }, 401);

  const declared = Number(request.headers.get('content-length') || 0);
  const limit = maxBytes(env);
  if (declared > limit) return tooLarge();

  const bytes = await request.arrayBuffer();
  if (!bytes || bytes.byteLength > limit) return tooLarge();

  let envelope;
  try {
    envelope = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    return json({ error: 'bad_json' }, 400);
  }
  if (!validEnvelope(envelope)) return json({ error: 'bad_envelope' }, 400);

  const verifier = await sha256Hex(new TextEncoder().encode(auth));
  const stored = await env.SYNC.get(authKey(slot), { type: 'text' });
  if (stored && stored !== verifier) return json({ error: 'forbidden' }, 403);

  const updatedAt = Date.now();
  const payload = JSON.stringify({
    v: 1,
    comp: envelope.comp,
    iv: envelope.iv,
    data: envelope.data,
    updatedAt
  });

  // Сначала закрепляем владельца слота, затем пишем данные. Если запись
  // данных упадёт, слот останется за тем же auth и повторная попытка пройдёт.
  if (!stored) await env.SYNC.put(authKey(slot), verifier);
  await env.SYNC.put(syncKey(slot), payload);

  return json({ ok: true, updatedAt });
}
