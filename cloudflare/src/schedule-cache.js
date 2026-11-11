// Кеш расписания в KV. Cron обновляет его каждые 6 часов, а первый клик
// после часового простоя может инициировать обновление сам — клиент всё
// равно делает ровно один запрос к Worker.

import { sha256Hex } from './hash.js';
import { discoverLatest, downloadDoc } from './vk.js';

const META_KEY = 'schedule:meta';
const FILE_KEY = 'schedule:file';
const DEFAULT_TTL_SECONDS = 3600;
const DEFAULT_MAX_BYTES = 12 * 1024 * 1024;
// Клиентский ?refresh=1 приходит каждый раз, когда пользователь включает
// рубильник Worker. Несколько человек подряд не должны превращаться в
// несколько сканов ВК: свежее пяти минут считаем актуальным и не идём в сеть.
const FORCE_MIN_INTERVAL_MS = 5 * 60 * 1000;

export async function readMeta(env) {
  try {
    const value = await env.SYNC.get(META_KEY, { type: 'json' });
    return value && typeof value === 'object' ? value : null;
  } catch (error) {
    return null;
  }
}

async function writeMeta(env, meta) {
  await env.SYNC.put(META_KEY, JSON.stringify(meta));
}

function ttlMs(env) {
  const value = Number(env.SCHEDULE_TTL_SECONDS);
  return (Number.isFinite(value) && value > 0 ? value : DEFAULT_TTL_SECONDS) * 1000;
}

function maxFileBytes(env) {
  const value = Number(env.SCHEDULE_MAX_BYTES);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_BYTES;
}

const ILLEGAL_FILE_CHARS = new Set(['\\', '/', ':', '*', '?', '"', '<', '>', '|']);

export function safeFileName(title) {
  let name = '';
  for (const char of String(title || 'schedule.xlsx')) {
    name += ILLEGAL_FILE_CHARS.has(char) || char.charCodeAt(0) < 32 ? '_' : char;
  }
  name = name.trim();
  if (!name) name = 'schedule.xlsx';
  if (!/\.xlsx$/i.test(name)) name += '.xlsx';
  return name.slice(0, 120);
}

export function publicMeta(meta, env, now = Date.now()) {
  const stale =
    !meta.checkedAt ||
    now - meta.checkedAt > ttlMs(env) ||
    Boolean(meta.lastRefreshError);
  return {
    hash: meta.hash,
    title: meta.title || '',
    fileName: meta.fileName || safeFileName(meta.title),
    size: meta.size || 0,
    date: meta.date || 0,
    postId: meta.postId || null,
    checkedAt: meta.checkedAt || 0,
    stale
  };
}

// Ищет новое расписание и при необходимости скачивает его.
// Никогда не бросает наружу: сетевые сбои возвращаются в error, а клиенту
// остаётся прошлый кеш (со stale: true), если он был.
export async function refreshSchedule(env, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const now = Date.now();
  const prev = await readMeta(env);

  const minAge = options.force ? FORCE_MIN_INTERVAL_MS : ttlMs(env);
  if (prev && prev.checkedAt && now - prev.checkedAt < minAge) {
    return { meta: prev, refreshed: false };
  }

  let found;
  try {
    found = await discoverLatest(env, fetchImpl);
  } catch (error) {
    if (prev) {
      const meta = Object.assign({}, prev, {
        checkedAt: now,
        lastRefreshError: 'discover_failed'
      });
      await writeMeta(env, meta);
      return { meta, refreshed: true, error };
    }
    return { meta: null, refreshed: true, error };
  }

  if (!found) {
    if (prev) {
      const meta = Object.assign({}, prev, {
        checkedAt: now,
        lastRefreshError: 'no_schedule_found'
      });
      await writeMeta(env, meta);
      return { meta, refreshed: true };
    }
    return { meta: null, refreshed: true };
  }

  // Документ тот же (id, размер и дата загрузки совпали) — файл не качаем.
  if (
    prev &&
    prev.docId &&
    prev.docId === found.id &&
    prev.size === found.size &&
    prev.date === found.date &&
    prev.hash
  ) {
    const meta = Object.assign({}, prev, {
      title: found.title,
      fileName: safeFileName(found.title),
      postId: found.postId,
      sourceUrl: found.url,
      checkedAt: now,
      lastRefreshError: undefined
    });
    delete meta.lastRefreshError;
    await writeMeta(env, meta);
    return { meta, refreshed: true };
  }

  let bytes;
  try {
    bytes = await downloadDoc(found.url, fetchImpl, maxFileBytes(env));
  } catch (error) {
    if (prev) {
      const meta = Object.assign({}, prev, {
        checkedAt: now,
        lastRefreshError: 'download_failed'
      });
      await writeMeta(env, meta);
      return { meta, refreshed: true, error };
    }
    return { meta: null, refreshed: true, error };
  }

  const hash = await sha256Hex(bytes);
  const meta = {
    hash,
    docId: found.id,
    title: found.title,
    fileName: safeFileName(found.title),
    size: bytes.byteLength,
    date: found.date,
    postId: found.postId,
    sourceUrl: found.url,
    checkedAt: now
  };

  await env.SYNC.put(FILE_KEY, bytes);
  await writeMeta(env, meta);
  return { meta, refreshed: true };
}

// Отдаёт байты файла из кеша. Если кеш пуст или рассинхронизирован с
// метаданными — скачивает заново по сохранённой ссылке.
export async function getScheduleFile(env, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  let meta = await readMeta(env);
  if (!meta) {
    await refreshSchedule(env, { force: true, fetchImpl });
    meta = await readMeta(env);
  }
  if (!meta) return { meta: null, bytes: null };

  let bytes = await env.SYNC.get(FILE_KEY, { type: 'arrayBuffer' });
  let hash = bytes ? await sha256Hex(bytes) : '';

  if (!bytes || hash !== meta.hash) {
    try {
      if (!meta.sourceUrl) {
        await refreshSchedule(env, { force: true, fetchImpl });
        meta = await readMeta(env);
        if (!meta || !meta.sourceUrl) return { meta, bytes: null };
      }
      const fresh = await downloadDoc(meta.sourceUrl, fetchImpl, maxFileBytes(env));
      bytes = fresh;
      hash = await sha256Hex(fresh);
      if (hash !== meta.hash) {
        meta = Object.assign({}, meta, { hash, size: bytes.byteLength, checkedAt: Date.now() });
        await writeMeta(env, meta);
      }
      await env.SYNC.put(FILE_KEY, bytes);
    } catch (error) {
      return { meta, bytes: null, error };
    }
  }

  return { meta, bytes };
}
