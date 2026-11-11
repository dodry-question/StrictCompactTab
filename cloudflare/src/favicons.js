// Фавиконки сайтов через Worker.
//
// Зачем это нужно. Google отдаёт иконки БЕЗ CORS-заголовков, поэтому страница
// расширения может показать их через <img>, но не может прочитать байты и
// сохранить на устройство. Из-за этого иконки каждый раз ехали из сети и
// плитка успевала моргнуть пустой. Worker забирает картинку сам и отдаёт с
// access-control-allow-origin: * — клиент кладёт её в localStorage как
// data:URL и дальше рисует из памяти, обновляя не чаще раза в сутки.
//
// Заодно Google видит IP Cloudflare, а не пользователя.
//
// Прокси закрытый: адрес апстрима фиксирован, наружу уходит только имя хоста,
// прошедшее проверку, и размер из белого списка. Кеш — Cache API (неделя),
// записи в KV не тратятся.

import { CORS_HEADERS, json, readCached, writeCached } from './http.js';

const UPSTREAM = 'https://www.google.com/s2/favicons';
const SIZES = new Set([16, 32, 64, 128]);
const TTL_SECONDS = 7 * 86400;
const MAX_BYTES = 128 * 1024;
const UPSTREAM_TIMEOUT_MS = 8000;

const HOST_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

// Принимается только голое имя хоста: схема, порт, путь, логин и пароль
// отбрасываются, иначе прокси можно было бы дёргать чем угодно.
function parseDomain(raw) {
  const host = String(raw || '').trim().toLowerCase();
  if (!host || host.length > 253) return '';

  let url;
  try {
    url = new URL('https://' + host);
  } catch (error) {
    return '';
  }
  if (url.hostname !== host) return '';
  return HOST_RE.test(host) ? host : '';
}

export async function favicon(request, env, options = {}) {
  const url = new URL(request.url);
  const domain = parseDomain(url.searchParams.get('domain'));
  if (!domain) return json({ error: 'bad_domain' }, 400);

  const size = Number(url.searchParams.get('size')) || 64;
  if (!SIZES.has(size)) return json({ error: 'bad_size' }, 400);

  const fetchImpl = options.fetchImpl || fetch;
  const cache = options.cache === undefined ? (typeof caches !== 'undefined' ? caches.default : null) : options.cache;
  const cacheKey = new Request('https://favicon-cache.internal/' + size + '/' + encodeURIComponent(domain));

  const hit = await readCached(cache, cacheKey);
  if (hit) return hit;

  let upstream;
  try {
    upstream = await fetchImpl(UPSTREAM + '?sz=' + size + '&domain=' + encodeURIComponent(domain), {
      redirect: 'follow',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
  } catch (error) {
    return json({ error: 'upstream_unavailable' }, 502);
  }

  if (!upstream.ok) return json({ error: 'upstream_unavailable', status: upstream.status }, 502);

  const type = upstream.headers.get('content-type') || '';
  if (!/^image\//i.test(type)) return json({ error: 'not_an_image' }, 502);

  const bytes = await upstream.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) return json({ error: 'bad_icon' }, 502);

  const response = new Response(bytes, {
    status: 200,
    headers: Object.assign({}, CORS_HEADERS, {
      'content-type': type,
      'cache-control': 'public, max-age=' + TTL_SECONDS
    })
  });
  await writeCached(cache, cacheKey, response);
  return response;
}