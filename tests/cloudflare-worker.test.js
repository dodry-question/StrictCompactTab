import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Cloudflare Worker (cloudflare/src/*) без wrangler и без сети.
//
// Проверяем контракт, на который опирается расширение:
//   * PATCH-подобная запись: первый PUT закрепляет слот за auth, чужой auth
//     получает 403 и НЕ может перезаписать данные;
//   * GET отдаёт ровно то, что было положено (шифротекст сервер не трогает);
//   * лимит размера и кривой конверт отсекаются до записи;
//   * разбор HTML стены ВК находит xlsx-вложение и игнорирует чужие ссылки.
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function load(relative) {
  return import(pathToFileURL(path.join(ROOT, relative)).href);
}

const worker = (await load('cloudflare/src/index.js')).default;
const { safeFileName } = await load('cloudflare/src/schedule-cache.js');
const { extractXlsxDocs, chooseNewest } = await load('cloudflare/src/vk.js');

function makeKv() {
  const map = new Map();
  return {
    map,
    async get(key, options) {
      const value = map.get(key);
      if (value === undefined) return null;
      const type = options && options.type;
      if (type === 'json') return JSON.parse(value);
      if (type === 'arrayBuffer') {
        return value instanceof ArrayBuffer
          ? value
          : new TextEncoder().encode(String(value)).buffer;
      }
      return value;
    },
    async put(key, value) {
      map.set(key, value);
    }
  };
}

const SLOT_A = 'A'.repeat(22);
const SLOT_B = 'B'.repeat(22);
const AUTH_A = 'a'.repeat(43);
const AUTH_B = 'b'.repeat(43);

function envelope(data = 'ciphertext') {
  return { v: 1, comp: 'none', iv: 'i'.repeat(16), data };
}

function putRequest(slot, auth, body) {
  return new Request('https://worker.test/sync/' + slot, {
    method: 'PUT',
    headers: { 'x-sync-auth': auth, 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

test('worker: /health отвечает без KV', async () => {
  const response = await worker.fetch(new Request('https://worker.test/health'), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: 'strict-compact-tab' });
});

test('worker: OPTIONS — CORS-префлайт, POST на sync — 405', async () => {
  const preflight = await worker.fetch(
    new Request('https://worker.test/sync/' + SLOT_A, { method: 'OPTIONS' }),
    { SYNC: makeKv() }
  );
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');

  const wrongMethod = await worker.fetch(
    new Request('https://worker.test/sync/' + SLOT_A, { method: 'DELETE' }),
    { SYNC: makeKv() }
  );
  assert.equal(wrongMethod.status, 405);
});

test('worker: PUT закрепляет слот, GET возвращает конверт, чужой auth — 403', async () => {
  const kv = makeKv();
  const env = { SYNC: kv };

  const first = await worker.fetch(putRequest(SLOT_A, AUTH_A, envelope('first')), env);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).ok, true);

  const read = await worker.fetch(new Request('https://worker.test/sync/' + SLOT_A), env);
  assert.equal(read.status, 200);
  assert.equal(read.headers.get('cache-control'), 'no-store');
  const stored = await read.json();
  assert.equal(stored.v, 1);
  assert.equal(stored.data, 'first');
  assert.ok(stored.updatedAt > 0);

  const foreign = await worker.fetch(putRequest(SLOT_A, AUTH_B, envelope('hijack')), env);
  assert.equal(foreign.status, 403);

  const after = await (await worker.fetch(new Request('https://worker.test/sync/' + SLOT_A), env)).json();
  assert.equal(after.data, 'first');

  // Владелец может перезаписывать сколько угодно
  const again = await worker.fetch(putRequest(SLOT_A, AUTH_A, envelope('second')), env);
  assert.equal(again.status, 200);
  const last = await (await worker.fetch(new Request('https://worker.test/sync/' + SLOT_A), env)).json();
  assert.equal(last.data, 'second');
});

test('worker: пустой слот — 404, неверный auth — 401, кривой конверт — 400', async () => {
  const env = { SYNC: makeKv() };

  const missing = await worker.fetch(new Request('https://worker.test/sync/' + SLOT_B), env);
  assert.equal(missing.status, 404);

  const noAuth = await worker.fetch(
    new Request('https://worker.test/sync/' + SLOT_B, { method: 'PUT', body: JSON.stringify(envelope()) }),
    env
  );
  assert.equal(noAuth.status, 401);

  const badJson = await worker.fetch(putRequest(SLOT_B, AUTH_A, 'not json'), env);
  assert.equal(badJson.status, 400);

  const badEnvelope = await worker.fetch(
    putRequest(SLOT_B, AUTH_A, { v: 1, comp: 'none', iv: 'short', data: 'abc' }),
    env
  );
  assert.equal(badEnvelope.status, 400);

  // Отклонённый запрос НЕ должен закреплять слот за собой
  assert.equal(env.SYNC.map.has('sync-auth:' + SLOT_B), false);
  assert.equal(env.SYNC.map.has('sync:' + SLOT_B), false);
});

test('worker: тело больше лимита отсекается 413 и не пишется', async () => {
  const env = { SYNC: makeKv(), SYNC_MAX_BYTES: '1024' };
  const large = await worker.fetch(
    putRequest(SLOT_B, AUTH_A, envelope('x'.repeat(4096))),
    env
  );
  assert.equal(large.status, 413);
  assert.equal(env.SYNC.map.size, 0);
});

test('worker: слот короче 16 символов не попадает в маршрут', async () => {
  const env = { SYNC: makeKv() };
  const response = await worker.fetch(
    new Request('https://worker.test/sync/short', { method: 'PUT', body: '{}' }),
    env
  );
  assert.equal(response.status, 404);
});

test('safeFileName: запрещённые символы заменяются, расширение добавляется', () => {
  const name = safeFileName('10 02.11-07.11');
  assert.equal(name, '10 02.11-07.11.xlsx');

  const dirty = safeFileName('a/b:c*?"<>|.xlsx');
  assert.equal(dirty, 'a_b_c______.xlsx');

  const control = safeFileName('a\u0001b.xlsx');
  assert.equal(control, 'a_b.xlsx');

  assert.equal(safeFileName(''), 'schedule.xlsx');
  assert.ok(safeFileName('x'.repeat(300)).length <= 120);
});

function vkDoc(overrides = {}) {
  return Object.assign(
    {
      id: 501,
      title: '10 02.11-07.11.xlsx',
      ext: 'xlsx',
      size: 435101,
      date: 1699000000,
      // VK в AJAX-ответе экранирует слэши дважды
      url: 'https:\\/\\/vk.com\\/doc501'
    },
    overrides
  );
}

function vkHtml(doc) {
  const json = JSON.stringify({ type: 'doc', doc, from_id: -85060840, id: 9904 });
  return '<div class="wall">' + json.replace(/"/g, '&quot;') + '</div>';
}

test('vk: находит xlsx-вложение, снимает двойное экранирование и postId', () => {
  const docs = extractXlsxDocs(vkHtml(vkDoc()));
  assert.equal(docs.length, 1);
  assert.equal(docs[0].id, 501);
  assert.equal(docs[0].url, 'https://vk.com/doc501');
  assert.equal(docs[0].size, 435101);
  assert.equal(docs[0].postId, 9904);
});

test('vk: дубли одного документа и ссылки не на VK отбрасываются', () => {
  const html = vkHtml(vkDoc()) + vkHtml(vkDoc()) + vkHtml(vkDoc({ id: 777, url: 'https://evil.example/doc777' }));
  const docs = extractXlsxDocs(html);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].id, 501);
});

test('vk: chooseNewest берёт поздний документ, при равной дате — больший', () => {
  assert.equal(chooseNewest([]), null);

  const older = { id: 1, date: 100, size: 5000 };
  const newer = { id: 2, date: 200, size: 3000 };
  assert.equal(chooseNewest([older, newer]).id, 2);

  const small = { id: 3, date: 300, size: 1000 };
  const large = { id: 4, date: 300, size: 2000 };
  assert.equal(chooseNewest([small, large]).id, 4);
});

// ---------------------------------------------------------------------------
// Погодный прокси: белый список параметров, проверка координат, кеш.
// ---------------------------------------------------------------------------

async function withFetch(stub, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function makeCache() {
  const map = new Map();
  return {
    map,
    async match(request) {
      return map.get(request.url) || undefined;
    },
    async put(request, response) {
      map.set(request.url, response);
    }
  };
}

test('weather: прокси пересылает прогноз и выкидывает чужие параметры', async () => {
  let upstreamUrl = '';
  const payload = { current_weather: { temperature: 4, weathercode: 3 } };

  const response = await withFetch(
    async (url) => {
      upstreamUrl = String(url);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(payload)
      };
    },
    () =>
      worker.fetch(
        new Request(
          'https://worker.test/weather/forecast?latitude=58.6&longitude=49.65&current_weather=true&foo=bar'
        ),
        {}
      )
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual(await response.json(), payload);

  const upstream = new URL(upstreamUrl);
  assert.equal(upstream.origin, 'https://api.open-meteo.com');
  assert.equal(upstream.pathname, '/v1/forecast');
  assert.equal(upstream.searchParams.get('latitude'), '58.6');
  assert.equal(upstream.searchParams.get('longitude'), '49.65');
  assert.equal(upstream.searchParams.get('current_weather'), 'true');
  assert.equal(upstream.searchParams.has('foo'), false);
});

test('weather: кривые координаты — 400 без запроса к апстриму', async () => {
  let calls = 0;
  const response = await withFetch(
    async () => {
      calls += 1;
      return { ok: true, text: async () => '{}' };
    },
    () =>
      worker.fetch(
        new Request('https://worker.test/weather/forecast?latitude=999&longitude=0'),
        {}
      )
  );

  assert.equal(response.status, 400);
  assert.equal(calls, 0);

  const missing = await worker.fetch(new Request('https://worker.test/weather/forecast'), {});
  assert.equal(missing.status, 400);
});

test('weather: ошибка апстрима отдаётся как 502 и не кешируется', async () => {
  const cache = makeCache();
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: cache };

  try {
    const response = await withFetch(
      async () => ({ ok: false, status: 500, text: async () => 'boom' }),
      () =>
        worker.fetch(
          new Request('https://worker.test/weather/forecast?latitude=1&longitude=2'),
          {}
        )
    );

    assert.equal(response.status, 502);
    assert.equal(cache.map.size, 0);
  } finally {
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  }
});

test('weather: второй запрос тех же координат отдаётся из кеша', async () => {
  const cache = makeCache();
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: cache };
  let calls = 0;

  try {
    await withFetch(
      async () => {
        calls += 1;
        return { ok: true, status: 200, text: async () => '{"n":' + calls + '}' };
      },
      async () => {
        const first = await worker.fetch(
          new Request('https://worker.test/weather/forecast?latitude=58.60001&longitude=49.65'),
          {}
        );
        assert.equal((await first.json()).n, 1);

        // Координаты округляются до 4 знаков — тот же ключ кеша
        const second = await worker.fetch(
          new Request('https://worker.test/weather/forecast?latitude=58.6&longitude=49.65'),
          {}
        );
        assert.equal((await second.json()).n, 1);
      }
    );

    assert.equal(calls, 1);
    assert.equal(cache.map.size, 1);
  } finally {
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  }
});

test('weather: геокодирование требует название и ходит в geocoding-api', async () => {
  let upstreamUrl = '';
  const response = await withFetch(
    async (url) => {
      upstreamUrl = String(url);
      return { ok: true, status: 200, text: async () => '{"results":[]}' };
    },
    () =>
      worker.fetch(
        new Request('https://worker.test/weather/geocode?name=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0&language=ru&count=1'),
        {}
      )
  );

  assert.equal(response.status, 200);
  const upstream = new URL(upstreamUrl);
  assert.equal(upstream.origin, 'https://geocoding-api.open-meteo.com');
  assert.equal(upstream.pathname, '/v1/search');
  assert.equal(upstream.searchParams.get('name'), 'Москва');
  assert.equal(upstream.searchParams.get('language'), 'ru');

  const empty = await worker.fetch(new Request('https://worker.test/weather/geocode'), {});
  assert.equal(empty.status, 400);
});

test('weather: POST на погодные маршруты — 405', async () => {
  const response = await worker.fetch(
    new Request('https://worker.test/weather/forecast', { method: 'POST' }),
    {}
  );
  assert.equal(response.status, 405);
});

// ---------------------------------------------------------------------------
// Иконки сайтов: прокси нужен, чтобы клиент мог сохранить байты на устройстве
// (Google не отдаёт CORS). Проверяем закрытость прокси и кеш.
// ---------------------------------------------------------------------------

async function withCache(fn) {
  const cache = makeCache();
  const original = globalThis.caches;
  globalThis.caches = { default: cache };
  try {
    return await fn(cache);
  } finally {
    if (original === undefined) delete globalThis.caches;
    else globalThis.caches = original;
  }
}

test('favicon: картинка отдаётся с CORS и кешируется на неделю', async () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  let calls = 0;
  let upstreamUrl = '';

  await withCache((cache) =>
    withFetch(
      async (url) => {
        calls += 1;
        upstreamUrl = String(url);
        return new Response(bytes, { status: 200, headers: { 'content-type': 'image/png' } });
      },
      async () => {
        const first = await worker.fetch(
          new Request('https://worker.test/favicon?domain=example.com&size=128'),
          {}
        );
        assert.equal(first.status, 200);
        assert.equal(first.headers.get('access-control-allow-origin'), '*');
        assert.equal(first.headers.get('content-type'), 'image/png');
        assert.match(first.headers.get('cache-control'), /max-age=604800/);
        assert.deepEqual(new Uint8Array(await first.arrayBuffer()), bytes);

        const second = await worker.fetch(
          new Request('https://worker.test/favicon?domain=example.com&size=128'),
          {}
        );
        assert.equal(second.status, 200);
        assert.equal(cache.map.size, 1);
      }
    )
  );

  assert.equal(calls, 1, 'второй запрос обслужен кешем');
  const upstream = new URL(upstreamUrl);
  assert.equal(upstream.origin, 'https://www.google.com');
  assert.equal(upstream.pathname, '/s2/favicons');
  assert.equal(upstream.searchParams.get('domain'), 'example.com');
  assert.equal(upstream.searchParams.get('sz'), '128');
});

test('favicon: чужой адрес и размер отсекаются до обращения к апстриму', async () => {
  let calls = 0;
  await withFetch(
    async () => {
      calls += 1;
      return new Response('', { status: 200 });
    },
    async () => {
      const queries = [
        '',
        '?domain=',
        '?domain=evil.example/x',
        '?domain=https://evil.example',
        '?domain=user:pass@evil.example',
        '?domain=localhost',
        '?domain=example.com&size=999'
      ];
      for (const query of queries) {
        const response = await worker.fetch(new Request('https://worker.test/favicon' + query), {});
        assert.equal(response.status, 400, query);
      }
    }
  );
  assert.equal(calls, 0);
});

test('favicon: HTML вместо картинки не отдаётся и не кешируется', async () => {
  await withCache((cache) =>
    withFetch(
      async () => new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } }),
      async () => {
        const response = await worker.fetch(
          new Request('https://worker.test/favicon?domain=example.com&size=64'),
          {}
        );
        assert.equal(response.status, 502);
        assert.equal(cache.map.size, 0);
      }
    )
  );
});

test('favicon: POST — 405', async () => {
  const response = await worker.fetch(
    new Request('https://worker.test/favicon?domain=example.com', { method: 'POST' }),
    {}
  );
  assert.equal(response.status, 405);
});

// ---------------------------------------------------------------------------
// Рубильник клиента: ?refresh=1 приходит на каждое включение, но скан ВК
// должен быть один — остальные получают уже сохранённые метаданные.
// ---------------------------------------------------------------------------

test('schedule: повторный refresh=1 не сканирует ВК заново', async () => {
  const env = { SYNC: makeKv(), VK_OWNER_ID: '-85060840', SCHEDULE_MAX_PAGES: '1' };
  const bytes = new Uint8Array(2048);
  bytes.set([0x50, 0x4b, 0x03, 0x04]);
  let wallCalls = 0;

  await withFetch(
    async (url) => {
      if (String(url).includes('al_wall.php')) {
        wallCalls += 1;
        return { ok: true, status: 200, text: async () => vkHtml(vkDoc()) };
      }
      return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer };
    },
    async () => {
      const first = await worker.fetch(new Request('https://worker.test/schedule/latest?refresh=1'), env);
      assert.equal(first.status, 200);
      const meta = await first.json();
      assert.equal(meta.ok, true);
      assert.equal(wallCalls, 1);

      const second = await worker.fetch(new Request('https://worker.test/schedule/latest?refresh=1'), env);
      assert.equal(second.status, 200);
      assert.equal((await second.json()).hash, meta.hash);
      assert.equal(wallCalls, 1, 'свежие метаданные отдаются без нового похода в ВК');
    }
  );
});
