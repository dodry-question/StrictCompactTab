// Общие ответы Worker: CORS, JSON, запрет кеширования.
export const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-allow-headers': 'Content-Type, X-Sync-Auth',
  'access-control-max-age': '86400',
  'access-control-expose-headers': 'X-Schedule-Hash',
  'x-content-type-options': 'nosniff',
  'cache-control': 'no-store'
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({}, CORS_HEADERS, {
      'content-type': 'application/json; charset=utf-8'
    })
  });
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function methodNotAllowed(allowed) {
  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: Object.assign({}, CORS_HEADERS, {
      'content-type': 'application/json; charset=utf-8',
      allow: allowed.join(', ')
    })
  });
}

// Кеш прокси (погода, иконки) — Cache API, а не KV: записи в KV лимитированы
// тысячей в сутки, а прокси только ускоряет ответы и переживает сбой молча.
export async function readCached(cache, key) {
  if (!cache) return null;
  try {
    return await cache.match(key);
  } catch (error) {
    return null;
  }
}

export async function writeCached(cache, key, response) {
  if (!cache) return;
  try {
    await cache.put(key, response.clone());
  } catch (error) {
    // Кеш — необязательная оптимизация; при сбое просто отдаём ответ.
  }
}
