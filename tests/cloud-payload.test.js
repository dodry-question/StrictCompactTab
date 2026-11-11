import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Состав облачного конверта (services/cloud-payload.js).
//
// Главное, что здесь проверяется:
//   * в облако НЕ уходят обои, палитра от обоев, кеш погоды и файл расписания;
//   * чужие ключи не протаскиваются (белый список — тот же, что у импорта);
//   * после скачивания локальные ключи устройства не теряются, потому что
//     storage.clearAndSet стирает хранилище целиком.
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// backup-validate.js импортирует shortcuts-migration.js, а тот на этапе
// загрузки вешает обработчики модалки папки.
globalThis.document = { getElementById: () => null };

const payloadUrl = pathToFileURL(path.join(ROOT, 'services/cloud-payload.js')).href;
const { buildCloudPayload, mergeLocalOnly, LOCAL_ONLY_KEYS } = await import(payloadUrl);

const LOCAL_KEYS = {
  customBackground: 'data:image/png;base64,AAAA',
  adaptiveThemeData: { primary: '#123456' },
  weatherCache: { temp: '+5', code: 3, desc: 'cloudy', timestamp: 123 },
  scheduleData: { groups: [{ name: 'Группа' }] },
  scheduleMeta: { hash: 'abc' },
  scheduleLastCheck: 123,
  scheduleNotifiedHash: 'abc',
  scheduleAutoCheck: true,
  cloudSyncConfig: { code: 'SCT1-ABCDE-FGHJK-MNPQR-STVWX', master: true },
  workerBaseUrl: 'https://example.workers.dev',
  workerEnabled: true,
  shortcutIconCache: { a: 'b' }
};

const STATE = Object.assign({}, LOCAL_KEYS, {
  shortcuts: [{ id: 's1', name: 'Docs', url: 'https://example.com' }],
  theme: 'light',
  showClock: false,
  columns: 7,
  unknownKey: 'must not leak'
});

test('buildCloudPayload: настройки и ярлыки на месте, обои и кеши — нет', () => {
  const payload = buildCloudPayload(STATE);

  assert.equal(payload.format, 'strict-compact-tab-cloud');
  assert.equal(payload.formatVersion, 1);
  assert.equal(typeof payload.syncedAt, 'string');
  assert.equal(payload.theme, 'light');
  assert.equal(payload.showClock, false);
  assert.equal(payload.columns, 7);
  assert.deepEqual(payload.shortcuts, [
    { id: 's1', name: 'Docs', url: 'https://example.com', customIcon: null }
  ]);

  [
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
    'shortcutIconCache'
  ].forEach((key) => {
    assert.equal(Object.prototype.hasOwnProperty.call(payload, key), false, key);
  });

  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'unknownKey'), false);
});

test('buildCloudPayload: корень не-объект отклоняется до обращения к серверу', () => {
  assert.throws(() => buildCloudPayload(null), /invalid_state/);
  assert.throws(() => buildCloudPayload('shortcuts'), /invalid_state/);
});

test('mergeLocalOnly: локальные ключи возвращаются поверх облачных настроек', () => {
  const sanitized = { theme: 'dark', shortcuts: [] };
  const merged = mergeLocalOnly(sanitized, LOCAL_KEYS);

  assert.equal(merged.theme, 'dark');
  assert.equal(merged.customBackground, LOCAL_KEYS.customBackground);
  assert.deepEqual(merged.scheduleData, LOCAL_KEYS.scheduleData);
  assert.equal(merged.workerBaseUrl, LOCAL_KEYS.workerBaseUrl);
  assert.equal(merged.workerEnabled, true, 'рубильник — решение устройства, облако его не меняет');
  assert.equal(merged.scheduleAutoCheck, true);
  assert.equal(Object.prototype.hasOwnProperty.call(merged, 'unknownKey'), false);
});

test('mergeLocalOnly: отсутствующие на устройстве ключи не появляются', () => {
  const sanitized = { theme: 'dark' };
  const merged = mergeLocalOnly(sanitized, { theme: 'light' });

  assert.deepEqual(merged, { theme: 'dark' });
  LOCAL_ONLY_KEYS.forEach((key) => {
    assert.equal(Object.prototype.hasOwnProperty.call(merged, key), false, key);
  });
});
