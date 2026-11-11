// Cloudflare Worker для Strict Compact Tab.
//
// Два независимых назначения:
//   /sync/<slot>      — облачное хранилище зашифрованных настроек;
//   /schedule/latest  — метаданные последнего расписания из группы ВК;
//   /schedule/file    — сам .xlsx из кеша KV;
//   /weather/forecast — прокси прогноза Open-Meteo (кеш 10 минут);
//   /weather/geocode  — прокси поиска города Open-Meteo;
//   /favicon          — иконка сайта с CORS, чтобы клиент сохранил её на устройстве.
//
// Расширение никогда не обращается к vk.com: только к этому Worker.
// Так VK видит IP Cloudflare, а не пользователя. Токены VK не используются.

import { corsPreflight, json, methodNotAllowed } from './http.js';
import { favicon } from './favicons.js';
import { getScheduleFile, publicMeta, refreshSchedule } from './schedule-cache.js';
import { syncGet, syncPut } from './sync.js';
import { weatherForecast, weatherGeocode } from './weather.js';

const SYNC_PATH_RE = /^\/sync\/([A-Za-z0-9_-]{16,64})$/;

function scheduleFileResponse(meta, bytes) {
  const asciiName = 'schedule.xlsx';
  const utf8Name = encodeURIComponent(meta.fileName || asciiName);
  return new Response(bytes, {
    status: 200,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'X-Schedule-Hash',
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'x-content-type-options': 'nosniff',
      'x-schedule-hash': meta.hash || ''
    }
  });
}

async function handleFetch(request, env) {
  if (request.method === 'OPTIONS') return corsPreflight();

  const url = new URL(request.url);

  if (url.pathname === '/health') {
    return json({ ok: true, service: 'strict-compact-tab' });
  }

  const syncMatch = url.pathname.match(SYNC_PATH_RE);
  if (syncMatch) {
    if (request.method === 'GET') return syncGet(env, syncMatch[1]);
    if (request.method === 'PUT') return syncPut(request, env, syncMatch[1]);
    return methodNotAllowed(['GET', 'PUT', 'OPTIONS']);
  }

  if (url.pathname === '/weather/forecast') {
    if (request.method !== 'GET') return methodNotAllowed(['GET', 'OPTIONS']);
    return weatherForecast(request, env);
  }

  if (url.pathname === '/weather/geocode') {
    if (request.method !== 'GET') return methodNotAllowed(['GET', 'OPTIONS']);
    return weatherGeocode(request, env);
  }

  if (url.pathname === '/favicon') {
    if (request.method !== 'GET') return methodNotAllowed(['GET', 'OPTIONS']);
    return favicon(request, env);
  }

  if (url.pathname === '/schedule/latest') {
    if (request.method !== 'GET') return methodNotAllowed(['GET', 'OPTIONS']);

    const force = url.searchParams.get('refresh') === '1';
    const result = await refreshSchedule(env, { force });
    if (!result.meta) {
      return result.error
        ? json({ error: 'upstream_unavailable' }, 503)
        : json({ error: 'no_schedule' }, 404);
    }
    return json(Object.assign({ ok: true }, publicMeta(result.meta, env)));
  }

  if (url.pathname === '/schedule/file') {
    if (request.method !== 'GET') return methodNotAllowed(['GET', 'OPTIONS']);

    const result = await getScheduleFile(env);
    if (!result.bytes) {
      if (result.error) return json({ error: 'upstream_unavailable' }, 503);
      return json({ error: 'no_schedule' }, 404);
    }
    return scheduleFileResponse(result.meta, result.bytes);
  }

  return json({ error: 'not_found' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleFetch(request, env);
    } catch (error) {
      // Ни тело запроса, ни заголовки не логируем: в них может быть
      // зашифрованный бэкап и ключ записи.
      console.error('worker: request failed:', error && error.message ? error.message : 'unknown');
      return json({ error: 'internal' }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    const task = refreshSchedule(env, { force: true }).catch((error) => {
      console.error('worker: cron refresh failed:', error && error.message ? error.message : 'unknown');
    });
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(task);
    else await task;
  }
};
