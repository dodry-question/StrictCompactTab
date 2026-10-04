import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Тесты валидации бэкапа при импорте (app/backup-validate.js).
//
// Импорт — самая старая и чувствительная функция: файл приходит от
// пользователя и может быть из любой прошлой версии либо чужим. Здесь
// проверяется контракт sanitize(): не бросает исключений, приводит поля к
// известным типам, работает по белому списку ключей, отбрасывает небезопасные
// ссылки — и при этом ничего не теряет из настоящих настроек.
//
// Скрипты подключаются в том же порядке, что и в index.html: src/utils.js
// (ESM → AppUtils), app/shortcuts-migration.js, app/backup-validate.js,
// app/backup-updates.js (нужен для buildBackupPayload в тесте полного цикла).
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

globalThis.window = globalThis;

// Минимальные стабы: app/shortcuts-migration.js на верхнем уровне
// getElementById('folder-modal') и вешает обработчики
const stubEl = {
  addEventListener() {},
  classList: { add() {}, remove() {}, contains: () => false },
  dataset: {}
};
globalThis.document = {
  getElementById: () => stubEl,
  querySelector: () => null
};

// app/shortcuts-migration.js — модуль (шаг «в»): грузится через import
// после document-заглушек (файл на верхнем уровне вешает обработчики)
await import(pathToFileURL(path.join(ROOT, 'app/shortcuts-migration.js')).href);
// app/backup-validate.js — модуль (шаг «в»): грузится через import
const { BackupValidate } = await import(pathToFileURL(path.join(ROOT, 'app/backup-validate.js')).href);

// app/backup-updates.js на верхнем уровне читает btnExport/btnImport/
// importFileInput из core.js — здесь заглушаем их null, чтобы блоки
// обработчиков не навешивались, а функция buildBackupPayload была доступна
vm.runInThisContext('var btnExport = null; var btnImport = null; var importFileInput = null;', {
  filename: 'backup-stubs'
});
// app/backup-updates.js — модуль (шаг «в»): грузится после заглушек btn*,
// потому что на верхнем уровне файл их читает
await import(pathToFileURL(path.join(ROOT, 'app/backup-updates.js')).href);

const sanitize = BackupValidate.sanitize;
const buildBackupPayload = vm.runInThisContext('buildBackupPayload');

test('sanitize отклоняет корень, не похожий на бэкап', () => {
  [null, undefined, 'text', 42, true].forEach((root) => {
    const r = sanitize(root);
    assert.equal(r.ok, false, `ожидали отказ для ${String(root)}`);
    assert.equal(typeof r.reason, 'string');
    assert.equal(r.value, undefined, 'отказанный файл не должен давать значение');
  });
});

test('старейший формат: плоский массив ярлыков с полем folder', () => {
  const r = sanitize([
    { name: 'A', url: 'https://a.example/', folder: 'f1' },
    { name: 'B', url: 'https://b.example/' }
  ]);
  assert.equal(r.ok, true);

  const folder = r.value.shortcuts.find((s) => s.isFolder);
  assert.ok(folder, 'категория f1 должна быть воссоздана');
  assert.equal(folder.id, 'f1');
  assert.equal(folder.children[0].name, 'A');
  assert.equal(folder.children[0].url, 'https://a.example/');

  const rootShortcut = r.value.shortcuts.find((s) => s.name === 'B');
  assert.ok(rootShortcut, 'ярлык без категории остаётся на верхнем уровне');

  // настроек в этом формате нет — все значения по умолчанию
  assert.equal(r.value.columns, 10);
  assert.equal(r.value.size, 'small');
  assert.equal(r.value.language, 'en');
  assert.equal(r.value.theme, 'dark');
  assert.equal(r.value.searchEngine, 'duckduckgo');
});

test('старый объектный формат: folders + timeFormat + тема nord', () => {
  const r = sanitize({
    shortcuts: [{ name: 'A', url: 'https://a.example/', folder: 'f1' }],
    folders: [{ id: 'f1', name: 'Работа' }],
    timeFormat: '12h',
    theme: 'nord',
    columns: 8,
    size: 'large',
    language: 'ru'
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.format12h, true, 'алиас timeFormat → format12h');
  assert.equal(r.value.theme, 'dark', 'nord из старых версий → dark');
  assert.equal(r.value.columns, 8);
  assert.equal(r.value.size, 'large');
  assert.equal(r.value.language, 'ru');

  const folder = r.value.shortcuts.find((s) => s.isFolder);
  assert.equal(folder.name, 'Работа');
  assert.equal(folder.children[0].name, 'A');
});

test('битые типы настроек не ломают состояние', () => {
  const r = sanitize({
    columns: 'abc',
    size: 7,
    theme: 123,
    language: 'de',
    weatherCoords: 5,
    weatherCache: 'x',
    customSearchEngines: 'no',
    layoutPositions: 7,
    mistPreset: 'hax',
    mistPerRow: 'million',
    layoutGridSize: -50,
    scheduleEnabled: 'yes',
    scheduleGroup: 42,
    customBackground: 'javascript:alert(1)',
    customFavicon: 12345,
    searchEngine: 'evil',
    evilKey: 'x',
    shortcuts: [{ name: 'ok', url: 'https://ok.example/' }]
  });
  assert.equal(r.ok, true);

  assert.equal(r.value.columns, 10);
  assert.equal(r.value.size, 'small');
  assert.equal(r.value.theme, 'dark');
  assert.equal(r.value.language, 'en');
  assert.deepEqual(r.value.weatherCoords, { lat: null, lon: null, resolvedName: '' });
  assert.deepEqual(r.value.weatherCache, { temp: '', code: null, desc: '', timestamp: 0 });
  assert.deepEqual(r.value.customSearchEngines, []);
  assert.equal(r.value.layoutPositions, null);
  assert.equal(r.value.mistPreset, 'center');
  assert.equal(r.value.mistPerRow, 6);
  assert.equal(r.value.layoutGridSize, 5, 'отрицательное значение упирается в минимум');
  assert.equal(r.value.scheduleEnabled, false);
  assert.equal(r.value.scheduleGroup, null);
  assert.equal(r.value.customBackground, null, 'не-data:image фон отбрасывается');
  assert.equal(r.value.customFavicon, null);
  assert.equal(r.value.searchEngine, 'duckduckgo');
  assert.equal('evilKey' in r.value, false, 'чужой ключ не попадает в хранилище');
});

test('чужие ключи и __proto__ не попадают в хранилище', () => {
  const evil = JSON.parse(
    '{"__proto__": {"polluted": true},' +
      ' "layoutPositions": {"__proto__": {"polluted": true}, "clock": {"left": 5, "top": 6}},' +
      ' "shortcuts": []}'
  );
  const r = sanitize(evil);
  assert.equal(r.ok, true);

  assert.equal(Object.prototype.polluted, undefined, 'prototype pollution не случилась');
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(r.value, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.value.layoutPositions, '__proto__'), false);
  assert.equal(r.value.layoutPositions.clock.left, 5);
  assert.equal(r.value.layoutPositions.clock.top, 6);
});

test('скриптовые ссылки отбрасывают ярлык, обычные — остаются', () => {
  const r = sanitize({
    shortcuts: [
      { name: 'x', url: 'javascript:alert(1)' },
      { name: 'y', url: 'java\nscript:alert(1)' },
      { name: 'z', url: 'data:text/html,<b>1</b>' },
      { name: 'v', url: 'vbscript:msgbox' },
      { name: 'ok', url: 'https://ok.example/' },
      { name: 'без ссылки' }
    ]
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.shortcuts.length, 2, 'вредоносные ярлыки удалены целиком');

  const ok = r.value.shortcuts.find((s) => s.name === 'ok');
  assert.equal(ok.url, 'https://ok.example/');

  const noUrl = r.value.shortcuts.find((s) => s.name === 'без ссылки');
  assert.ok(noUrl, 'ярлык без ссылки (но с именем) сохраняется — это не атака');
  assert.equal(noUrl.url, '');
});

test('полный цикл: экспорт → импорт сохраняет настройки и ярлыки', () => {
  const payload = buildBackupPayload({
    shortcuts: [
      {
        id: 'f_work',
        name: 'Work',
        isFolder: true,
        children: [{ id: 'sc_1', name: 'Gmail', url: 'https://mail.google.com/', customIcon: null }]
      },
      { id: 'sc_2', name: 'Wiki', url: 'https://wikipedia.org/', customIcon: 'data:image/png;base64,AA' }
    ],
    columns: 8,
    size: 'medium',
    language: 'ru',
    searchEngine: 'yandex',
    theme: 'light',
    format12h: true,
    showSeconds: true,
    showDate: false,
    customBackground: 'data:image/jpeg;base64,AAA',
    customFavicon: 'data:image/png;base64,BB',
    weatherCity: 'Москва',
    weatherCoords: { lat: 55.7, lon: 37.6, resolvedName: 'Москва' },
    weatherCache: { temp: '+12', code: 3, desc: 'ясно', timestamp: 123 },
    customSearchEngines: [{ id: 'custom_1', name: 'My', queryUrl: 'https://my.test/?q=', logo: null }],
    checkUpdates: true,
    layoutMistMode: true,
    mistPreset: 'split',
    mistPerRow: 4,
    scheduleEnabled: true,
    scheduleGroup: 'ИСПк-302',
    layoutPositions: { clock: { left: 10.5, top: 20, widthPx: 400, heightPx: 100, scale: 1.2 } },
    // служебное — в бэкап не попадает и не должно «воскреснуть» при импорте
    scheduleData: { groups: [] },
    shortcutIconCache: { key: 'value' },
    lastUpdateCheck: 5,
    cachedLatestVersion: 'v9.9.9'
  });

  const r = sanitize(payload);
  assert.equal(r.ok, true);
  const v = r.value;

  // структура ярлыков целиком
  const folder = v.shortcuts.find((s) => s.isFolder);
  assert.equal(folder.name, 'Work');
  assert.equal(folder.children[0].name, 'Gmail');
  assert.equal(folder.children[0].url, 'https://mail.google.com/');
  const wiki = v.shortcuts.find((s) => s.name === 'Wiki');
  assert.equal(wiki.url, 'https://wikipedia.org/');
  assert.equal(wiki.customIcon, 'data:image/png;base64,AA');

  // настройки
  assert.equal(v.columns, 8);
  assert.equal(v.size, 'medium');
  assert.equal(v.language, 'ru');
  assert.equal(v.searchEngine, 'yandex');
  assert.equal(v.theme, 'light');
  assert.equal(v.format12h, true);
  assert.equal(v.showSeconds, true);
  assert.equal(v.showDate, false);
  assert.equal(v.customBackground, 'data:image/jpeg;base64,AAA');
  assert.equal(v.customFavicon, 'data:image/png;base64,BB');
  assert.equal(v.weatherCity, 'Москва');
  assert.deepEqual(v.weatherCoords, { lat: 55.7, lon: 37.6, resolvedName: 'Москва' });
  assert.deepEqual(v.weatherCache, { temp: '+12', code: 3, desc: 'ясно', timestamp: 123 });
  assert.deepEqual(v.customSearchEngines, [
    { id: 'custom_1', name: 'My', queryUrl: 'https://my.test/?q=', logo: null }
  ]);
  assert.equal(v.checkUpdates, true);
  assert.equal(v.layoutMistMode, true);
  assert.equal(v.mistPreset, 'split');
  assert.equal(v.mistPerRow, 4);
  assert.equal(v.scheduleEnabled, true);
  assert.equal(v.scheduleGroup, 'ИСПк-302');
  assert.deepEqual(v.layoutPositions, { clock: { left: 10.5, top: 20, widthPx: 400, heightPx: 100, scale: 1.2 } });

  // служебные ключи не вернулись
  assert.equal('scheduleData' in v, false);
  assert.equal('shortcutIconCache' in v, false);
  assert.equal('lastUpdateCheck' in v, false);
  assert.equal('cachedLatestVersion' in v, false);
});

test('Zen и Mist взаимоисключающи даже в чужом бэкапе', () => {
  const both = sanitize({ shortcuts: [], layoutZenMode: true, layoutMistMode: true });
  assert.equal(both.value.layoutZenMode, true);
  assert.equal(both.value.layoutMistMode, false, 'приоритет у Zen — как в loadState/saveState');

  const mistOnly = sanitize({ shortcuts: [], layoutMistMode: true });
  assert.equal(mistOnly.value.layoutMistMode, true, 'Mist сам по себе включён остаётся');
});

test('настройки расписания переживают импорт', () => {
  const r = sanitize({ shortcuts: [], scheduleEnabled: true, scheduleGroup: 'ИСПк-302' });
  assert.equal(r.value.scheduleEnabled, true);
  assert.equal(r.value.scheduleGroup, 'ИСПк-302');

  // чужой/будущий формат, где группа лежит объектом — берём название
  const asObject = sanitize({ shortcuts: [], scheduleGroup: { name: 'Группа' } });
  assert.equal(asObject.value.scheduleGroup, 'Группа');
});

test('потолок размера файла разумен', () => {
  // Реальный бэкап — сотни КБ; слишком низкий потолок заблокировал бы
  // настоящие файлы, слишком высокий — позволил бы заморозить вкладку
  const max = BackupValidate.MAX_FILE_BYTES;
  assert.ok(max >= 1024 * 1024, 'потолок не ниже 1 МБ');
  assert.ok(max <= 50 * 1024 * 1024, 'потолок не выше 50 МБ');
});
