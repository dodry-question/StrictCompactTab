import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Клиентские запросы к Worker (services/schedule-sync.js).
//
// Контракт из требований: проверка расписания — ровно ОДИН GET /schedule/latest,
// скачивание файла — ровно ОДИН GET /schedule/file. Здесь fetch подменён
// счётчиком, поэтому лишний запрос сразу роняет тест.
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const syncUrl = pathToFileURL(path.join(ROOT, 'services/schedule-sync.js')).href;

const {
  normalizeBaseUrl,
  sha256Hex,
  fetchLatestSchedule,
  fetchScheduleFile
} = await import(syncUrl);

const originalFetch = globalThis.fetch;
const calls = [];

function mockFetch(handler) {
  calls.length = 0;
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options: options || {} });
    return handler(String(url), options || {});
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  calls.length = 0;
});

test('normalizeBaseUrl: схема, путь и хвост отбрасываются, http — только локально', () => {
  assert.equal(normalizeBaseUrl('example.workers.dev'), 'https://example.workers.dev');
  assert.equal(normalizeBaseUrl('https://example.workers.dev/path?x=1#y'), 'https://example.workers.dev');
  assert.equal(normalizeBaseUrl('  https://example.workers.dev  '), 'https://example.workers.dev');
  assert.equal(normalizeBaseUrl('http://localhost:8787'), 'http://localhost:8787');
  assert.equal(normalizeBaseUrl('http://127.0.0.1:8787/x'), 'http://127.0.0.1:8787');

  assert.equal(normalizeBaseUrl('http://example.com'), '');
  assert.equal(normalizeBaseUrl('ftp://example.com'), '');
  assert.equal(normalizeBaseUrl('https://user:pass@example.com'), '');
  assert.equal(normalizeBaseUrl('https://'), '');
  assert.equal(normalizeBaseUrl(''), '');
  assert.equal(normalizeBaseUrl(null), '');
});

test('fetchLatestSchedule: один запрос, поля ответа нормализуются', async () => {
  mockFetch(() =>
    jsonResponse({
      ok: true,
      hash: 'abc123',
      title: '10 02.11-07.11.xlsx',
      fileName: '10 02.11-07.11.xlsx',
      size: 435101,
      date: 1699000000,
      postId: 9904,
      checkedAt: 1700000000,
      stale: false
    })
  );

  const result = await fetchLatestSchedule('example.workers.dev');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.workers.dev/schedule/latest');
  assert.equal(calls[0].options.cache, 'no-store');

  assert.equal(result.ok, true);
  assert.equal(result.none, false);
  assert.equal(result.schedule.hash, 'abc123');
  assert.equal(result.schedule.fileName, '10 02.11-07.11.xlsx');
  assert.equal(result.schedule.size, 435101);
  assert.equal(result.schedule.postId, 9904);
  assert.equal(result.schedule.stale, false);
});

test('fetchLatestSchedule: refresh=1 просит сервер сходить в ВК один раз', async () => {
  mockFetch(() => jsonResponse({ ok: true, hash: 'abc123' }));

  await fetchLatestSchedule('https://example.workers.dev', { refresh: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.workers.dev/schedule/latest?refresh=1');

  await fetchLatestSchedule('https://example.workers.dev');
  assert.equal(calls[1].url, 'https://example.workers.dev/schedule/latest');
});

test('fetchLatestSchedule: 404 — расписания ещё нет, это не ошибка', async () => {
  mockFetch(() => jsonResponse({ error: 'no_schedule' }, 404));
  const result = await fetchLatestSchedule('https://example.workers.dev');
  assert.deepEqual(result, { ok: true, none: true });
  assert.equal(calls.length, 1);
});

test('fetchLatestSchedule: битый ответ и HTTP-ошибка различаются', async () => {
  mockFetch(() => new Response('not json', { status: 200 }));
  await assert.rejects(fetchLatestSchedule('https://example.workers.dev'), /schedule_bad_json/);

  mockFetch(() => jsonResponse({ ok: true }));
  await assert.rejects(fetchLatestSchedule('https://example.workers.dev'), /schedule_bad_response/);

  mockFetch(() => jsonResponse({ error: 'boom' }, 500));
  await assert.rejects(fetchLatestSchedule('https://example.workers.dev'), /schedule_http_500/);
});

test('fetchLatestSchedule: пустой адрес не доходит до сети', async () => {
  mockFetch(() => jsonResponse({ ok: true }));
  await assert.rejects(fetchLatestSchedule(''), /bad_worker_url/);
  assert.equal(calls.length, 0);
});

test('fetchScheduleFile: один запрос, хеш считается по скачанным байтам', async () => {
  const bytes = new Uint8Array(2048);
  bytes.set([0x50, 0x4b, 0x03, 0x04]);

  mockFetch(() =>
    new Response(bytes, {
      status: 200,
      headers: { 'x-schedule-hash': 'from-server' }
    })
  );

  const result = await fetchScheduleFile('https://example.workers.dev');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.workers.dev/schedule/file');
  assert.equal(result.buffer.byteLength, 2048);
  assert.equal(result.headerHash, 'from-server');
  assert.equal(result.hash, await sha256Hex(bytes));
  assert.match(result.hash, /^[0-9a-f]{64}$/);
});

test('fetchScheduleFile: пустой и не-xlsx ответы отклоняются до разбора', async () => {
  mockFetch(() => new Response(new Uint8Array(10), { status: 200 }));
  await assert.rejects(fetchScheduleFile('https://example.workers.dev'), /schedule_file_empty/);

  const html = new TextEncoder().encode('<html>' + 'x'.repeat(2048) + '</html>');
  mockFetch(() => new Response(html, { status: 200 }));
  await assert.rejects(fetchScheduleFile('https://example.workers.dev'), /schedule_file_not_xlsx/);

  mockFetch(() => jsonResponse({ error: 'upstream_unavailable' }, 503));
  await assert.rejects(fetchScheduleFile('https://example.workers.dev'), /schedule_file_http_503/);
});
