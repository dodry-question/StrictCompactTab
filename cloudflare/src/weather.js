// Прокси к Open-Meteo: у части мобильных провайдеров запросы к
// api.open-meteo.com режутся, а домен воркера открывается. Заодно Open-Meteo
// видит IP Cloudflare, а не пользователя.
//
// Наружу отдаётся ровно тот же JSON, что и напрямую, поэтому клиент не
// знает, откуда пришли данные. Параметры проходят по белому списку: адрес
// апстрима фиксирован, так что превратить прокси в открытый редирект нельзя.
//
// Кеш — Cache API Cloudflare, без записей в KV: свежий прогноз нужен раз в
// 10 минут, а лимиты KV на запись тратить незачем.

import { CORS_HEADERS, json, readCached, writeCached } from './http.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const FORECAST_PARAMS = [
  'current',
  'hourly',
  'daily',
  'current_weather',
  'forecast_days',
  'timezone',
  'temperature_unit',
  'wind_speed_unit',
  'precipitation_unit'
];
const GEOCODE_PARAMS = ['count', 'language', 'countryCode'];

const FORECAST_TTL = 600;
const GEOCODE_TTL = 86400;
const UPSTREAM_TIMEOUT_MS = 8000;

// Координаты округляются до 4 знаков (~11 м): этого хватает для города и
// заодно схлопывает почти одинаковые запросы в один ключ кеша.
function parseCoords(latRaw, lonRaw) {
  // Number(null) и Number('') дают 0 — пустой запрос не должен
  // превращаться в «координаты 0,0» и тянуть прогноз из океана.
  if (latRaw === null || lonRaw === null || latRaw === '' || lonRaw === '') return null;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4 };
}

function copyParams(target, source, names, limit) {
  names.forEach((name) => {
    const value = source.get(name);
    if (value !== null && value !== '') target.searchParams.set(name, value.slice(0, limit));
  });
}

async function proxyJson(upstreamUrl, ttl, options) {
  const fetchImpl = options.fetchImpl || fetch;
  const cache = options.cache === undefined ? (typeof caches !== 'undefined' ? caches.default : null) : options.cache;
  const cacheKey = new Request('https://weather-cache.internal/' + encodeURIComponent(upstreamUrl));

  const hit = await readCached(cache, cacheKey);
  if (hit) return hit;

  let upstream;
  try {
    upstream = await fetchImpl(upstreamUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
  } catch (error) {
    return json({ error: 'upstream_unavailable' }, 502);
  }

  if (!upstream.ok) {
    return json({ error: 'upstream_unavailable', status: upstream.status }, 502);
  }

  const body = await upstream.text();
  const response = new Response(body, {
    status: 200,
    headers: Object.assign({}, CORS_HEADERS, {
      'cache-control': 'public, max-age=' + ttl,
      'content-type': 'application/json; charset=utf-8'
    })
  });
  await writeCached(cache, cacheKey, response);
  return response;
}

export function weatherForecast(request, env, options = {}) {
  const url = new URL(request.url);
  const coords = parseCoords(url.searchParams.get('latitude'), url.searchParams.get('longitude'));
  if (!coords) return json({ error: 'bad_coords' }, 400);

  const upstream = new URL(FORECAST_URL);
  copyParams(upstream, url.searchParams, FORECAST_PARAMS, 240);
  upstream.searchParams.set('latitude', String(coords.lat));
  upstream.searchParams.set('longitude', String(coords.lon));

  return proxyJson(upstream.toString(), FORECAST_TTL, options);
}

export function weatherGeocode(request, env, options = {}) {
  const url = new URL(request.url);
  const name = String(url.searchParams.get('name') || '').trim().slice(0, 100);
  if (!name) return json({ error: 'bad_query' }, 400);

  const upstream = new URL(GEOCODE_URL);
  upstream.searchParams.set('name', name);
  copyParams(upstream, url.searchParams, GEOCODE_PARAMS, 40);

  return proxyJson(upstream.toString(), GEOCODE_TTL, options);
}
