import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Тесты store (state/store.js) — владельца состояния и единого списка ключей
// хранилища (этап «б»: store вместо window.STATE).
//
// Главный страховочный смысл — PERSIST_KEYS: раньше список был продублирован
// (массив в loadState для storage.get и объект в saveState для storage.set),
// и расхождение списков молча теряло бы поле при сохранении. Здесь скрипт
// грузится как модуль (этап «в») поверх заглушки storage.
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

globalThis.window = globalThis;

// --- заглушка слоя хранения -------------------------------------------------
const gets = [];
const sets = [];
globalThis.storage = {
  get(keys, cb) {
    gets.push(keys);
    cb({ language: 'ru' });
  },
  set(obj) {
    sets.push(obj);
  }
};

await import(pathToFileURL(path.join(ROOT, 'state/store.js')).href);

const store = globalThis.store;

test('store.state — живое состояние с начальными значениями из шаблона', () => {
  assert.equal(typeof store, 'object');
  assert.equal(typeof store.state, 'object');
  assert.equal(store.state.language, 'en');
  assert.equal(store.state.columns, 10);
  assert.equal(store.state.mistPreset, 'center');
  assert.equal(store.state.weatherCoords.lat, null);
  assert.equal(store.state.weatherCache.temp, '');
  assert.deepEqual(store.state.mistHeadOffset.clock, { x: 0, y: 0, w: 0, h: 0, s: 1 });
  assert.deepEqual(store.state.shortcuts, []);
});

test('get/set/setMany пишут состояние и уведомляют подписчиков', () => {
  const events = [];
  const off = store.subscribe((state, key) => events.push([key, state[key]]));

  assert.equal(store.get('language'), 'en');
  store.set('language', 'ru');
  assert.equal(store.state.language, 'ru');

  store.setMany({ columns: 5, size: 'large' });
  assert.equal(store.get('columns'), 5);
  assert.deepEqual(events, [
    ['language', 'ru'],
    ['columns', 5],
    ['size', 'large']
  ]);

  // отписка останавливает уведомления
  off();
  store.set('language', 'en');
  assert.equal(events.length, 3);
});

test('упавший подписчик не роняет запись', () => {
  const off = store.subscribe(() => {
    throw new Error('намеренное падение');
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.doesNotThrow(() => store.set('columns', 7));
  } finally {
    console.error = originalError;
    off();
  }
  assert.equal(store.state.columns, 7);
});

test('save пишет ровно persistKeys и уважает overrides', () => {
  assert.ok(Object.isFrozen(store.persistKeys), 'список ключей должен быть заморожен');

  store.save({ mistHeadOffset: { normalized: true } });
  const payload = sets.pop();
  assert.deepEqual(Object.keys(payload).sort(), [...store.persistKeys].sort());
  assert.deepEqual(payload.mistHeadOffset, { normalized: true }, 'override заменяет ключ');
  assert.equal(payload.language, store.state.language, 'обычные поля берутся из состояния');

  // легаси-ключи миграций читаются, но никогда не сохраняются
  assert.ok(!('categories' in payload));
  assert.ok(!('folders' in payload));
  assert.ok(!('groups' in payload));
});

test('load читает persistKeys плюс переданные легаси-ключи', () => {
  let result;
  store.load(['categories', 'folders', 'groups'], (data) => { result = data; });
  const keys = gets.pop();
  store.persistKeys.forEach((key) => assert.ok(keys.includes(key), `нет ключа ${key}`));
  ['categories', 'folders', 'groups'].forEach((key) => assert.ok(keys.includes(key), `нет легаси-ключа ${key}`));
  assert.deepEqual(result, { language: 'ru' }, 'результат уходит в колбэк как есть');
});
