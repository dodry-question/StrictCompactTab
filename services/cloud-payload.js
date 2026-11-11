// Что именно уходит в облако и что остаётся на устройстве.
//
// В облако — только настройки и ярлыки. Обои (customBackground), производная
// от них палитра (adaptiveThemeData), кеш погоды, файл расписания и служебные
// ключи не синхронизируются: они либо большие, либо бессмысленны на другом
// устройстве.
//
// При получении облака используется тот же белый список, что и при импорте
// JSON-бэкапа (BackupValidate.sanitize). После санитизации локальные ключи
// возвращаются из текущего хранилища: clearAndSet стирает всё, и без этого
// второе устройство потеряло бы свои обои и скачанное расписание.

import { BackupValidate } from '../app/backup-validate.js';

export const LOCAL_ONLY_KEYS = Object.freeze([
  'customBackground',
  'adaptiveThemeData',
  'weatherCache',
  'scheduleData',
  'scheduleMeta',
  'scheduleLastCheck',
  'scheduleNotifiedHash',
  'scheduleAutoCheck',
  'cloudSyncConfig',
  'workerBaseUrl',
  'workerEnabled',
  'lastUpdateCheck',
  'cachedLatestVersion',
  'shortcutIconCache'
]);

// Эти поля не должны попадать даже в шифрованный конверт: они либо
// локальные, либо выводятся из локальных данных.
const EXCLUDED_FROM_CLOUD = new Set([
  'customBackground',
  'adaptiveThemeData',
  'weatherCache',
  'scheduleAutoCheck'
]);

export function buildCloudPayload(allData) {
  const result = BackupValidate.sanitize(allData);
  if (!result.ok) throw new Error('invalid_state');

  const payload = Object.assign({}, result.value);
  EXCLUDED_FROM_CLOUD.forEach((key) => {
    delete payload[key];
  });

  payload.format = 'strict-compact-tab-cloud';
  payload.formatVersion = 1;
  payload.syncedAt = new Date().toISOString();
  return payload;
}

export function estimatePayloadBytes(payload) {
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}

/**
 * Возвращает санитизированные облачные настройки с локальными ключами,
 * которые нельзя терять при clearAndSet.
 *
 * @param {any} sanitizedValue результат BackupValidate.sanitize(...).value
 * @param {Record<string, any> | null} localRaw текущее содержимое хранилища
 */
export function mergeLocalOnly(sanitizedValue, localRaw) {
  const merged = Object.assign({}, sanitizedValue);
  if (!localRaw || typeof localRaw !== 'object') return merged;

  LOCAL_ONLY_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(localRaw, key)) {
      merged[key] = localRaw[key];
    }
  });
  return merged;
}
