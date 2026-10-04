import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
// Реальный setImmediate: глобальный setTimeout в стабе ниже заглушён и колбэки
// не вызывает, а он нам нужен, чтобы имитировать асинхронность chrome.storage.
import { setImmediate as nodeSetImmediate } from 'node:timers';

// ---------------------------------------------------------------------------
// Тест интерфейса плагина «Расписание».
//
// app/schedule.js — обычный classic-скрипт, поэтому он проверяется так же,
// как и загрузка приложения в tests/app-load.test.js: скрипты выполняются
// в порядке <script> из index.html через vm.runInThisContext (общая глобальная
// область, как в браузере). Здесь стабы DOM умеют чуть больше — важны
// innerHTML (очистка списков), contains (проверки «клик внутри панели»)
// и цепочка родителей.
//
// Проверяется полный сценарий: галка в настройках → кнопка → панель →
// перетаскивание НАСТОЯЩЕГО .xlsx → список групп → выбор группы → расписание
// по дням → смена группы → удаление файла.
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'schedule-sample.xlsx');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

globalThis.window = globalThis;

// --- мини-DOM --------------------------------------------------------------

function makeClassList(classes) {
  return {
    add: (...names) => names.forEach((n) => classes.add(n)),
    remove: (...names) => names.forEach((n) => classes.delete(n)),
    toggle: (name, force) => {
      const want = force === undefined ? !classes.has(name) : force;
      if (want) classes.add(name);
      else classes.delete(name);
      return want;
    },
    contains: (name) => classes.has(name)
  };
}

function makeElement(tagName = 'div', id = '') {
  const classes = new Set();
  const el = {
    tagName: tagName.toUpperCase(),
    id,
    style: { setProperty() {}, removeProperty() {}, getPropertyValue: () => '' },
    dataset: {},
    attributes: {},
    handlers: {},
    children: [],
    parentNode: null,
    _text: null,        // null = текст берётся из детей (как в браузере)
    value: '',
    checked: false,
    type: '',
    files: [],
    tabIndex: 0,
    isConnected: true,
    addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); },
    removeEventListener() {},
    // синхронная отправка события этому элементу (как element.click())
    dispatch(name, event) {
      (this.handlers[name] || []).forEach((h) => h.call(this, { type: name, target: this, preventDefault() {}, ...event }));
    },
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      child.isConnected = true;
      this._text = null;   // содержимое теперь задают дети
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
      return child;
    },
    contains(node) {
      let cur = node;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentNode;
      }
      return false;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    matches() { return false; },
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }; },
    focus() { globalThis.document.activeElement = this; },
    blur() { if (globalThis.document.activeElement === this) globalThis.document.activeElement = null; },
    click() { this.dispatch('click'); },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; },
    removeAttribute(name) { delete this.attributes[name]; },
    hasAttribute(name) { return name in this.attributes; },
    cloneNode() { return makeElement(this.tagName, this.id); },
    insertAdjacentHTML() {}
  };
  // className и classList — одно и то же множество, как в браузере
  el.classList = makeClassList(classes);
  Object.defineProperty(el, 'className', {
    get() { return [...classes].join(' '); },
    set(value) {
      classes.clear();
      String(value || '').split(/\s+/).filter(Boolean).forEach((n) => classes.add(n));
    }
  });
  // textContent — как в браузере: присваивание стирает детей, а при наличии
  // детей отдаёт их склейку (иначе тесты не видели бы текст внутри <h3>)
  Object.defineProperty(el, 'textContent', {
    get() {
      if (el._text !== null) return el._text;
      return el.children.map((c) => c.textContent).join('');
    },
    set(value) {
      el.children.forEach((child) => { child.parentNode = null; child.isConnected = false; });
      el.children = [];
      el._text = value == null ? '' : String(value);
    }
  });
  // innerHTML = '' должен очищать детей (плагин так перерисовывает списки).
  // Дети ОТСОЕДИНЯЮТСЯ, как в браузере: если плагин случайно затрёт этой
  // строкой само поле поиска, тесты обязаны это заметить (contains вернёт false).
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._innerHTML || ''; },
    set(value) {
      el.children.forEach((child) => { child.parentNode = null; child.isConnected = false; });
      el.children = [];
      el._text = null;
      el._innerHTML = value;
    }
  });
  return el;
}

const elementById = new Map();
const byId = (id) => {
  if (!elementById.has(id)) elementById.set(id, makeElement('div', id));
  return elementById.get(id);
};

const docListeners = {};
globalThis.document = {
  body: makeElement('body'),
  documentElement: makeElement('html'),
  head: makeElement('head'),
  readyState: 'complete',
  activeElement: null,
  hidden: false,
  getElementById: (id) => byId(id),
  querySelector: (sel) => makeElement('link', String(sel).replace(/[.#]/, '')),
  querySelectorAll: () => [],
  getElementsByClassName: () => [],
  createElement: (tag) => makeElement(tag),
  createTextNode: (text) => ({ nodeType: 3, textContent: text }),
  createDocumentFragment: () => {
    const frag = makeElement('fragment');
    frag.tagName = '#fragment';
    const append = frag.appendChild.bind(frag);
    // фрагмент «выкладывает» детей напрямую, как в браузере
    frag.appendChild = (child) => {
      if (child.tagName === '#fragment') {
        child.children.forEach((c) => append(c));
        child.children = [];
        return child;
      }
      return append(child);
    };
    return frag;
  },
  addEventListener(name, handler) { (docListeners[name] ||= []).push(handler); },
  removeEventListener() {}
};

// Разметка панели расписания из index.html (id — как в разметке)
const panel = byId('schedule-panel');
const drop = byId('schedule-drop');
const fileInput = byId('schedule-file-input');
const groupsView = byId('schedule-groups');
const groupsList = byId('schedule-groups-list');
const view = byId('schedule-view');
const body = makeElement('div', 'schedule-body');
body.appendChild(drop);
body.appendChild(byId('schedule-error'));
body.appendChild(groupsView);
body.appendChild(view);
panel.appendChild(makeElement('header', 'schedule-header'));
panel.appendChild(body);
const groupsTitle = makeElement('p');
groupsTitle.className = 'schedule-groups-title';
groupsView.appendChild(groupsTitle);
groupsView.appendChild(byId('schedule-group-search'));
groupsView.appendChild(byId('schedule-groups-none'));
groupsView.appendChild(groupsList);
byId('schedule-fab');
byId('schedule-close');
byId('schedule-change-group');
byId('schedule-delete');
byId('schedule-vk');
byId('schedule-subtitle');
byId('schedule-enabled').type = 'checkbox';
fileInput.type = 'file';

Object.defineProperty(globalThis, 'navigator', {
  configurable: true, writable: true,
  value: { userAgent: 'Chrome/120', language: 'ru-RU', platform: 'Linux x86_64', clipboard: { writeText: async () => {} } }
});

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  clear: () => { store.clear(); },
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; }
};

globalThis.window.addEventListener = () => {};
globalThis.window.removeEventListener = () => {};
globalThis.getComputedStyle = () => ({
  getPropertyValue: () => '', display: 'block', visibility: 'visible', opacity: '1', width: '0px', height: '0px'
});
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {}, removeListener() {}, removeEventListener() {} });
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.setInterval = () => 1;
globalThis.clearInterval = () => {};
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.fetch = () => new Promise(() => {});
globalThis.alert = () => {};
globalThis.confirm = () => true;
globalThis.prompt = () => null;
globalThis.Image = class { set src(v) { this._src = v; } };
globalThis.innerWidth = 1920;
globalThis.innerHeight = 1080;
globalThis.devicePixelRatio = 1;

// --- загрузка приложения в порядке index.html ------------------------------

const html = read('index.html');
const scriptTags = [...html.matchAll(/<script([^>]*)src="([^"]+)"[^>]*>/g)]
  .map((m) => ({ attrs: m[1], src: m[2] }));

// Плагина «Расписание» до его загрузки в state нет — эмулируем чистое состояние
const loadErrors = [];
for (const tag of scriptTags) {
  try {
    if (/\btype="module"/.test(tag.attrs)) {
      await import(pathToFileURL(path.join(ROOT, tag.src)).href);
    } else {
      vm.runInThisContext(read(tag.src), { filename: path.join(ROOT, tag.src) });
    }
  } catch (err) {
    loadErrors.push(`${tag.src}: ${err.name}: ${err.message}`);
  }
}

const app = globalThis;
// Пауз нужна для цепочек промисов (открытие панели читает файл из хранилища).
// Реальный таймер node:timers/promises, а не globalThis.setTimeout — тот в стабе
// заглушен. Разбор .xlsx — тоже асинхронный, поэтому там ждём по условию.
const settle = () => delay(0);
async function waitFor(predicate, message) {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await delay(10);
  }
  throw new Error(`не дождались: ${message}`);
}

// --- хранилище должно вести себя как настоящее --------------------------
// storage/storage.js в браузере работает через chrome.storage.local, где
// set/get вызывают колбэк НА СЛЕДУЮЩЕМ ТИКЕ. ЛокальныйStorage-фолбэк внутри
// того же файла синхронный, и из-за этого тесты не воспроизводили гонки —
// например, «удалить файл» успевало перерисовать панель со старым файлом.
// Оборачиваем МЕТОДЫ того же объекта (не заменяем сам объект: приложение
// держит ссылку const storage = window.storage).
const storageQueue = [];
const flushStorage = () => {
  while (storageQueue.length) storageQueue.shift()();
};
['get', 'set', 'getAll', 'clearAndSet'].forEach((name) => {
  const original = app.storage[name];
  app.storage[name] = function (...args) {
    const callback = args[args.length - 1];
    if (typeof callback !== 'function') return original.apply(this, args);
    storageQueue.push(() => original.apply(this, args));
    return nodeSetImmediate(flushStorage);
  };
});

// Ищем кнопку/элемент по классу в собранном дереве
const findByClass = (root, className) => {
  if (root.classList && root.classList.contains(className)) return root;
  for (const child of root.children || []) {
    const hit = findByClass(child, className);
    if (hit) return hit;
  }
  return null;
};
const findAllByClass = (root, className, out = []) => {
  if (root.classList && root.classList.contains(className)) out.push(root);
  for (const child of root.children || []) findAllByClass(child, className, out);
  return out;
};
const texts = (nodes) => nodes.map((n) => n.textContent);

// Ожидаемый день подсветки для группы прямо из разобранного файла
globalThis.__nextLesson = (partialName) => {
  const data = JSON.parse(store.get('scheduleData'));
  const group = data.groups.find((g) => g.name.includes(partialName));
  if (!group) return null;
  const next = window.ScheduleParser.nextLesson(group.lessons, new Date());
  return next ? next.day : null;
};

// --- собственный файл-«расписание» (реальный .xlsx слишком долгий для всех
//     сценариев подряд; на нём отдельно проверяется разбор — см. schedule.test.js)

test('все скрипты index.html загрузились без ошибок', () => {
  assert.deepEqual(loadErrors, []);
});

test('модуль плагина загрузился и подключён ДО вызова loadState()', () => {
  assert.equal(typeof app.syncScheduleEnabled, 'function');
  const scheduleIndex = scriptTags.findIndex((t) => t.src === 'app/schedule.js');
  const inputKeysIndex = scriptTags.findIndex((t) => t.src === 'app/input-keys.js');
  assert.ok(scheduleIndex >= 0, 'app/schedule.js не подключён');
  assert.ok(scheduleIndex < inputKeysIndex,
    'app/schedule.js должен идти до app/input-keys.js (там вызывается loadState)');
});

test('галка выключена по умолчанию: кнопки нет, панель закрыта', () => {
  assert.equal(app.store.state.scheduleEnabled, false);
  assert.equal(app.store.state.scheduleGroup, null);
  assert.equal(app.document.body.classList.contains('schedule-on'), false);
  assert.equal(byId('schedule-enabled').checked, false);
});

test('стили плагина не подключены, пока галка выключена', () => {
  // 20 КБ CSS не должны разбираться при каждой новой вкладке у того,
  // кто расписанием не пользуется
  const links = app.document.head.children.filter((c) => c.getAttribute('data-schedule-style') !== null);
  assert.equal(links.length, 0, 'CSS плагина должен подмешиваться только по требованию');
});

test('включение галки подмешивает стили ровно один раз и открывает панель только после их применения', () => {
  const styleLinks = () => app.document.head.children
    .filter((c) => c.getAttribute('data-schedule-style') !== null);
  const isReady = () => app.document.documentElement.classList.contains('schedule-ready');

  assert.equal(styleLinks().length, 0);
  assert.equal(isReady(), false);

  byId('schedule-enabled').checked = true;
  byId('schedule-enabled').dispatch('change');
  assert.equal(styleLinks().length, 1, 'стили должны подмешаться при включении');
  assert.equal(styleLinks()[0].href, 'css/components/schedule-panel.css');
  // <link> ещё не применился: флага нет, значит критическое правило
  // html:not(.schedule-ready) держит панель и кнопку скрытыми
  assert.equal(isReady(), false, 'нельзя открывать панель до применения стилей');

  // повторные вызовы не плодят дубли <link>
  app.syncScheduleEnabled();
  app.syncScheduleEnabled();
  assert.equal(styleLinks().length, 1, 'дублей <link> быть не должно');

  // таблица применилась — панель разрешена
  styleLinks()[0].dispatch('load');
  assert.equal(isReady(), true);
});

test('включение галки показывает кнопку и сохраняет состояние', () => {
  const checkbox = byId('schedule-enabled');
  checkbox.checked = true;
  checkbox.dispatch('change');
  assert.equal(app.store.state.scheduleEnabled, true);
  assert.equal(app.document.body.classList.contains('schedule-on'), true);
  assert.equal(JSON.parse(store.get('scheduleEnabled')), true);
});

test('без файла панель открывается на окне переноса', async () => {
  byId('schedule-fab').dispatch('click');
  // Хранилище асинхронно (как chrome.storage), поэтому отрисовка приходит
  // не в том же тике, что и клик
  await waitFor(() => drop.hidden === false, 'панель не отрисовалась');

  assert.ok(panel.classList.contains('is-open'), 'панель не открылась');
  assert.equal(app.document.body.classList.contains('schedule-open'), true);
  assert.equal(byId('schedule-fab').getAttribute('aria-expanded'), 'true');
  assert.equal(drop.hidden, false, 'зона переноса должна быть видна');
  assert.equal(groupsView.hidden, true);
  assert.equal(view.hidden, true);
  // в первом запуске кнопок «удалить файл» и «ВК» ещё нет — файла не существует
  assert.equal(byId('schedule-delete').hidden, true);
  assert.equal(byId('schedule-vk').hidden, true);
});

test('файл не-xlsx даёт понятную ошибку и не ломает панель', async () => {
  const bogus = {
    name: 'отчёт.docx',
    lastModified: Date.now(),
    arrayBuffer: async () => new TextEncoder().encode('not a zip').buffer
  };
  await app.handleScheduleFile(bogus);
  await settle();

  assert.equal(byId('schedule-error').hidden, false, 'ошибка не показана');
  assert.match(byId('schedule-error').textContent, /\.xlsx/);
  // панель остаётся в том же виде: файл не принят, но и не потерян
  assert.equal(drop.hidden, false, 'панель должна остаться на переносе файла');
  assert.equal(panel.classList.contains('is-open'), true);
});

test('загрузка файла переносит на выбор группы и сортирует список', async () => {
  const search = byId('schedule-group-search');
  const bytes = fs.readFileSync(FIXTURE);
  const buffer = await new Blob([bytes]).arrayBuffer();
  const file = {
    name: '5_28_09-03_10.xlsx',
    lastModified: Date.UTC(2026, 8, 28),
    arrayBuffer: async () => buffer
  };

  await app.handleScheduleFile(file);
  await settle();

  assert.equal(byId('schedule-error').hidden, true, `ошибка: ${byId('schedule-error').textContent}`);
  assert.equal(drop.hidden, true, 'зона переноса должна скрыться');
  assert.equal(groupsView.hidden, false, 'список групп должен показаться');
  assert.equal(byId('schedule-delete').hidden, false, 'появилась кнопка удаления файла');
  assert.equal(byId('schedule-vk').hidden, false, 'появилась ссылка на ВК');

  // Строка поиска и заголовок живут в РАЗМЕТКЕ, а не рисуются кодом: списком
  // групп нельзя перетирать их innerHTML, иначе поиск перестаёт работать.
  assert.ok(groupsView.contains(search), 'поле поиска должно остаться в DOM после рендера списка');
  assert.ok(groupsView.contains(byId('schedule-groups-none')), '«ничего не найдено» должно остаться в DOM');
  assert.ok(groupsView.children.some((c) => c.classList.contains('schedule-groups-title')),
    'заголовок «Выберите свою группу» должен остаться в DOM');
  const saved = JSON.parse(store.get('scheduleData'));
  assert.equal(saved.fileName, '5_28_09-03_10.xlsx');
  assert.ok(saved.groups.length >= 50, `групп: ${saved.groups.length}`);

  const buttons = findAllByClass(groupsView, 'schedule-group-btn');
  assert.equal(buttons.length, saved.groups.length);
  const names = texts(buttons.map((b) => findByClass(b, 'schedule-group-name')));
  assert.deepEqual(names, names.slice().sort((a, b) => a.localeCompare(b, 'ru-RU')),
    'группы должны идти по алфавиту');
  assert.ok(names.some((n) => n.includes('ИСПк-302')), 'в списке нет ИСПк-302');
  // каждая кнопка показывает число занятий
  assert.ok(buttons.every((b) => {
    const count = findByClass(b, 'schedule-group-count');
    return count && Number(count.textContent) > 0;
  }));
});

test('поиск фильтрует список групп по названию и специальности', async () => {
  const search = byId('schedule-group-search');
  const count = () => findAllByClass(groupsView, 'schedule-group-btn').length;

  search.value = 'ИСПк-302';
  search.dispatch('input');
  const byName = findAllByClass(groupsView, 'schedule-group-btn');
  assert.equal(byName.length, 1);
  assert.match(findByClass(byName[0], 'schedule-group-name').textContent, /ИСПк-302/);

  search.value = 'ЭКОО';
  search.dispatch('input');
  assert.ok(count() >= 1, 'поиск по «ЭКОО» ничего не нашёл');
  assert.ok(count() < 60, 'поиск не отфильтровал список');

  search.value = 'такого точно нет';
  search.dispatch('input');
  assert.equal(count(), 0);
  assert.equal(byId('schedule-groups-none').hidden, false, 'нужно показать «ничего не найдено»');

  search.value = '';
  search.dispatch('input');
  assert.ok(count() > 50, 'сброс поиска не вернул все группы');
  assert.equal(byId('schedule-groups-none').hidden, true);
});

test('выбор группы показывает расписание по дням, парам и времени', async () => {
  const search = byId('schedule-group-search');
  search.value = 'ИСПк-302';
  search.dispatch('input');
  findAllByClass(groupsView, 'schedule-group-btn')[0].dispatch('click');

  assert.equal(groupsView.hidden, true);
  assert.equal(view.hidden, false);
  assert.equal(byId('schedule-change-group').hidden, false, 'кнопка «сменить группу» нужна');
  assert.equal(app.store.state.scheduleGroup.includes('ИСПк-302'), true);
  // группа хранится по НАЗВАНИЮ: id после каждого разбора генерируются заново
  assert.equal(store.get('scheduleGroup'), app.store.state.scheduleGroup);

  const days = findAllByClass(view, 'schedule-day');
  assert.ok(days.length >= 3, `дней в расписании: ${days.length}`);
  assert.match(byId('schedule-subtitle').textContent, /ИСПк-302/);

  // неделя по порядку, начиная с понедельника (название дня лежит в span,
  // рядом может стоять значок времени ближайшей пары)
  const dayName = (d) => findByClass(d, 'schedule-day-text').textContent;
  const weekdays = days.map((d) => app.ScheduleParser.dayKey(dayName(d)).weekday);
  assert.deepEqual(weekdays, weekdays.slice().sort((a, b) => a - b));

  // внутри дня: сетка «время + содержание», пары отсортированы
  days.forEach((day) => {
    const rows = findAllByClass(day, 'schedule-lesson');
    assert.ok(rows.length > 0, 'день без занятий');
    rows.forEach((row) => {
      assert.ok(findByClass(row, 'schedule-lesson-time'), 'нет времени');
      const subject = findByClass(row, 'schedule-lesson-subject');
      assert.ok(subject && subject.textContent.length > 0, 'нет дисциплины');
    });
    const times = rows.map((r) => app.ScheduleParser.timeKey(findByClass(r, 'schedule-lesson-time').textContent));
    assert.deepEqual(times, times.slice().sort((a, b) => a - b), 'пары не по порядку');
  });

  // конкретное занятие из реального файла дошло до интерфейса
  const monday = days.find((d) => /ПОНЕДЕЛЬНИК/.test(dayName(d)));
  const first = findAllByClass(monday, 'schedule-lesson')[0];
  assert.equal(findByClass(first, 'schedule-lesson-time').textContent, '8.20-9.50');
  assert.match(findByClass(first, 'schedule-lesson-subject').textContent, /^МДК 05\.01/);
  assert.equal(findByClass(first, 'schedule-lesson-kind').textContent, 'Пр. занятие');
  assert.equal(findByClass(first, 'schedule-lesson-meta').textContent, 'Сергеева Е.Г. · 1-113');
});

test('подсвечивается день СЛЕДУЮЩИХ пар, а не «сегодня»', async () => {
  const buffer = await new Blob([fs.readFileSync(FIXTURE)]).arrayBuffer();
  await app.handleScheduleFile({ name: '5_28_09-03_10.xlsx', lastModified: Date.now(), arrayBuffer: async () => buffer });
  await settle();

  // ИСПк-302: пары в понедельник 28.09 с 8.20
  const search = byId('schedule-group-search');
  search.value = 'ИСПк-302';
  search.dispatch('input');
  findAllByClass(groupsView, 'schedule-group-btn')[0].dispatch('click');
  assert.equal(view.hidden, false);

  const highlighted = findAllByClass(view, 'schedule-day').filter((d) => d.classList.contains('is-next'));
  const expected = window.__nextLesson('ИСПк-302');
  if (expected) {
    assert.equal(highlighted.length, 1, 'подсвечен должен быть ровно один день');
    const title = findByClass(highlighted[0], 'schedule-day-text').textContent;
    assert.equal(title, expected, `подсвечен ${title}, а следующие пары в ${expected}`);
    // рядом с названием дня — время начала ближайшей пары
    assert.match(findByClass(highlighted[0], 'schedule-day-badge').textContent, /\d+[.:]\d+/);
  } else {
    assert.equal(highlighted.length, 0, 'неделя кончилась — подсвечивать нечего');
  }
});

test('«сменить группу» возвращает к списку и подсвечивает текущую', async () => {
  byId('schedule-change-group').dispatch('click');
  assert.equal(groupsView.hidden, false);
  assert.equal(view.hidden, true);
  assert.equal(byId('schedule-change-group').hidden, true, 'в списке групп кнопка не нужна');

  const selected = findAllByClass(groupsView, 'schedule-group-btn')
    .filter((b) => b.classList.contains('is-selected'));
  assert.equal(selected.length, 1, 'текущая группа должна быть подсвечена');
  assert.match(findByClass(selected[0], 'schedule-group-name').textContent, /ИСПк-302/);

  // выбираем другую группу — расписание пересобирается
  const search = byId('schedule-group-search');
  search.value = 'ЭКОО';
  search.dispatch('input');
  const other = findAllByClass(groupsView, 'schedule-group-btn')[0];
  const otherName = findByClass(other, 'schedule-group-name').textContent;
  other.dispatch('click');
  assert.equal(app.store.state.scheduleGroup, otherName);
  assert.equal(view.hidden, false);
  assert.match(byId('schedule-subtitle').textContent, new RegExp(otherName.slice(0, 8)));
});

test('группа переживает замену файла — не приходится искать заново', async () => {
  const before = app.store.state.scheduleGroup;
  const bytes = fs.readFileSync(FIXTURE);
  const buffer = await new Blob([bytes]).arrayBuffer();

  // «свежая неделя»: тот же файл, но id групп генерируются заново
  await app.handleScheduleFile({ name: '12_05-10_10.xlsx', lastModified: Date.now(), arrayBuffer: async () => buffer });
  await settle();

  assert.equal(app.store.state.scheduleGroup, before, 'группа сбросилась после замены файла');
  assert.equal(view.hidden, false, 'должно сразу открыться расписание');
  assert.ok(findAllByClass(view, 'schedule-day').length > 0);
  // подзаголовок показывает выбранную группу, а не имя файла
  assert.ok(byId('schedule-subtitle').textContent.includes(before),
    byId('schedule-subtitle').textContent);
});

test('группа, которой нет в новом файле, сбрасывается на список', async () => {
  const buffer = await new Blob([fs.readFileSync(FIXTURE)]).arrayBuffer();
  // выдумываем несуществующую группу, как если бы файл сменился
  app.store.state.scheduleGroup = 'Группа НЕТ-ТАКОЙ-999';
  app.saveState();
  await app.handleScheduleFile({ name: 'test.xlsx', lastModified: Date.now(), arrayBuffer: async () => buffer });
  await settle();
  assert.equal(app.store.state.scheduleGroup, null);
  assert.equal(groupsView.hidden, false, 'должен показаться список групп');
});

test('удаление файла возвращает окно переноса и чистит хранилище', async () => {
  // заново выбираем группу, чтобы было что удалять
  const buffer = await new Blob([fs.readFileSync(FIXTURE)]).arrayBuffer();
  await app.handleScheduleFile({ name: '5_28_09-03_10.xlsx', lastModified: Date.now(), arrayBuffer: async () => buffer });
  await settle();
  const search = byId('schedule-group-search');
  search.value = 'ИСПк-302';
  search.dispatch('input');
  findAllByClass(groupsView, 'schedule-group-btn')[0].dispatch('click');
  assert.equal(view.hidden, false);

  byId('schedule-delete').dispatch('click');
  await settle();

  assert.equal(store.has('scheduleData'), false, 'файл не удалён из хранилища');
  assert.equal(app.store.state.scheduleGroup, null);
  assert.equal(drop.hidden, false, 'должно вернуться окно переноса файла');
  assert.equal(groupsView.hidden, true);
  assert.equal(byId('schedule-delete').hidden, true);
  assert.equal(byId('schedule-subtitle').textContent, '');
});

test('перетаскивание файла в панель обрабатывается и файл не «открывается»', async () => {
  const bytes = fs.readFileSync(FIXTURE);
  const buffer = await new Blob([bytes]).arrayBuffer();
  const file = { name: 'drag.xlsx', lastModified: Date.now(), arrayBuffer: async () => buffer };

  let prevented = false;
  panel.dispatch('drop', {
    dataTransfer: { files: [file], items: [{ kind: 'file', getAsFile: () => file }] },
    preventDefault() { prevented = true; }
  });
  // обработчик drop'а не возвращает промис, поэтому ждём по условию
  await waitFor(() => store.has('scheduleData'), 'файл после перетаскивания');

  assert.equal(prevented, true, 'браузер не должен открывать файл вместо загрузки');
  assert.equal(panel.classList.contains('is-dragover'), false, 'подсветка зоны не снята');
  assert.equal(JSON.parse(store.get('scheduleData')).fileName, 'drag.xlsx');
  assert.equal(groupsView.hidden, false, 'после перетаскивания — список групп');
});

test('смена языка перерисовывает содержимое открытой панели', async () => {
  const search = byId('schedule-group-search');
  search.value = '';
  search.dispatch('input');
  findAllByClass(groupsView, 'schedule-group-btn')[0].dispatch('click');
  assert.equal(view.hidden, false);
  // дни приходят из файла по-русски и не зависят от языка интерфейса
  const dayTitle = findByClass(view, 'schedule-day-text').textContent;

  app.store.state.language = 'en';
  app.applyLanguage('en');
  assert.equal(app.isSchedulePanelOpen(), true, 'панель не должна закрываться при смене языка');
  assert.equal(findByClass(view, 'schedule-day-text').textContent, dayTitle);

  // в списке групп placeholder рисуется кодом — он должен обновиться
  byId('schedule-change-group').dispatch('click');
  app.store.state.language = 'ru';
  app.applyLanguage('ru');
  assert.equal(search.placeholder, 'Название или номер группы');

  // вернуть группу и английский, чтобы следующие тесты шли в известном состоянии
  findAllByClass(groupsView, 'schedule-group-btn')[0].dispatch('click');
  app.store.state.language = 'en';
  app.applyLanguage('en');
  assert.equal(view.hidden, false);
});

test('кнопка переключает панель, Escape и клик мимо закрывают', async () => {
  app.closeSchedulePanel();

  byId('schedule-fab').dispatch('click');
  await settle();
  assert.ok(panel.classList.contains('is-open'), 'панель не открылась');
  assert.equal(app.document.body.classList.contains('schedule-open'), true);
  assert.equal(byId('schedule-fab').getAttribute('aria-expanded'), 'true');

  // повторный клик по кнопке закрывает
  byId('schedule-fab').dispatch('click');
  assert.equal(panel.classList.contains('is-open'), false, 'кнопка должна закрывать панель');
  byId('schedule-fab').dispatch('click');
  await settle();

  // клик ВНУТРИ панели закрывать её не должен
  (docListeners.click || []).forEach((h) => h({ type: 'click', target: view }));
  assert.equal(panel.classList.contains('is-open'), true, 'клик внутри панели закрыл её');

  // клик мимо — закрывает (оверлея нет, экран остаётся живым)
  (docListeners.click || []).forEach((h) => h({ type: 'click', target: makeElement('div') }));
  assert.equal(panel.classList.contains('is-open'), false, 'клик мимо не закрыл панель');
  assert.equal(app.document.body.classList.contains('schedule-open'), false);
  assert.equal(byId('schedule-fab').getAttribute('aria-expanded'), 'false');

  byId('schedule-fab').dispatch('click');
  await settle();
  (docListeners.keydown || []).forEach((h) => h({ key: 'Escape', preventDefault() {} }));
  assert.equal(panel.classList.contains('is-open'), false, 'Escape не закрыл панель');
});

test('выключение галки прячет кнопку и закрывает панель', async () => {
  byId('schedule-fab').dispatch('click');
  await settle();
  assert.ok(panel.classList.contains('is-open'));

  const checkbox = byId('schedule-enabled');
  checkbox.checked = false;
  checkbox.dispatch('change');

  assert.equal(app.store.state.scheduleEnabled, false);
  assert.equal(app.document.body.classList.contains('schedule-on'), false);
  assert.equal(panel.classList.contains('is-open'), false, 'панель должна закрыться');
  assert.equal(JSON.parse(store.get('scheduleEnabled')), false);
});

test('смена режима макета закрывает панель', async () => {
  const checkbox = byId('schedule-enabled');
  checkbox.checked = true;
  checkbox.dispatch('change');
  byId('schedule-fab').dispatch('click');
  await settle();
  assert.ok(panel.classList.contains('is-open'));

  const zen = makeElement('input', 'layout-zen-mode');
  (docListeners.change || []).forEach((h) => h({ target: zen }));
  assert.equal(panel.classList.contains('is-open'), false, 'панель должна закрыться при смене режима');
});
