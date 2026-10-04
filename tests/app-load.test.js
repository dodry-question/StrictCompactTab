import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Smoke-тест загрузки приложения.
//
// После разделения бывшего script.js (4573 строки) на app/*.js каждый файл
// исполняется в браузере как отдельный classic-скрипт: они разделяют одну
// глобальную область видимости (объект window + глобальная лексическая
// среда let/const/function), а порядок задаётся порядком тегов <script defer>
// в index.html. Здесь воспроизводятся именно эти семантика и порядок через
// vm.runInThisContext, чтобы поймать ошибки разрешения имён (ReferenceError /
// TDZ), если бы нарезка их сломала.
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

globalThis.window = globalThis;

// --- стабы браузерного окружения -------------------------------------------
const docListeners = {};
const winListeners = {};
const intervals = [];

function makeClassList() {
  const set = new Set();
  return {
    add: (...names) => names.forEach((n) => set.add(n)),
    remove: (...names) => names.forEach((n) => set.delete(n)),
    toggle: (name, force) => {
      const want = force === undefined ? !set.has(name) : force;
      if (want) set.add(name);
      else set.delete(name);
      return want;
    },
    contains: (name) => set.has(name)
  };
}

function makeElement(tagName = 'div', id = '') {
  const handlers = {};
  const attributes = {};
  return {
    tagName: tagName.toUpperCase(),
    id,
    className: '',
    style: {
      setProperty() {},
      removeProperty() {},
      getPropertyValue() { return ''; }
    },
    dataset: {},
    attributes,
    handlers,
    children: [],
    parentNode: null,
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    tabIndex: 0,
    href: '',
    src: '',
    alt: '',
    title: '',
    hidden: false,
    classList: makeClassList(),
    addEventListener(name, handler) {
      (handlers[name] ||= []).push(handler);
    },
    removeEventListener() {},
    dispatch(name, event) {
      (handlers[name] || []).forEach((h) => h.call(this, event || { type: name }));
    },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    insertBefore(child) { this.children.unshift(child); child.parentNode = this; return child; },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
      return child;
    },
    replaceChild(next, prev) {
      const i = this.children.indexOf(prev);
      if (i >= 0) this.children[i] = next;
      return prev;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementsByClassName() { return []; },
    getElementsByTagName() { return []; },
    closest() { return null; },
    contains() { return false; },
    matches() { return false; },
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }; },
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
    setAttribute(name, value) { attributes[name] = String(value); },
    getAttribute(name) { return name in attributes ? attributes[name] : null; },
    removeAttribute(name) { delete attributes[name]; },
    hasAttribute(name) { return name in attributes; },
    cloneNode() { return makeElement(this.tagName, this.id); },
    insertAdjacentHTML() {}
  };
}

const elementById = new Map();
const byId = (id) => {
  if (!elementById.has(id)) elementById.set(id, makeElement('div', id));
  return elementById.get(id);
};

// Кэш по селектору: в браузере document.querySelector('.x') всегда возвращает
// ОДИН и тот же элемент. Без кэша нельзя проверить, что код выставил атрибут
// (например href иконки вкладки) — каждый вызов давал бы новый элемент.
const selectorCache = new Map();

globalThis.document = {
  body: makeElement('body'),
  documentElement: makeElement('html'),
  head: makeElement('head'),
  readyState: 'complete',
  activeElement: null,
  hidden: false,
  getElementById: (id) => byId(id),
  // в index.html есть link.page-favicon — возвращаем элемент, чтобы href можно было назначить
  querySelector: (sel) => {
    if (!selectorCache.has(sel)) {
      selectorCache.set(sel, makeElement('link', String(sel).replace(/[.#]/, '')));
    }
    return selectorCache.get(sel);
  },
  querySelectorAll: () => [],
  getElementsByClassName: () => [],
  createElement: (tag) => makeElement(tag),
  createDocumentFragment: () => { const f = makeElement('fragment'); f.tagName = '#fragment'; return f; },
  createTextNode: (text) => ({ nodeType: 3, textContent: text }),
  addEventListener: (name, handler) => { (docListeners[name] ||= []).push(handler); },
  removeEventListener: () => {}
};

Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  writable: true,
  value: {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    language: 'en-US',
    platform: 'Linux x86_64',
    clipboard: { writeText: async () => {} }
  }
});

const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => { storageMap.set(k, String(v)); },
  removeItem: (k) => { storageMap.delete(k); },
  clear: () => { storageMap.clear(); },
  key: (i) => [...storageMap.keys()][i] ?? null,
  get length() { return storageMap.size; }
};

globalThis.window.addEventListener = (name, handler) => { (winListeners[name] ||= []).push(handler); };
globalThis.window.removeEventListener = () => {};
globalThis.getComputedStyle = () => ({
  getPropertyValue: () => '',
  display: 'block',
  visibility: 'visible',
  opacity: '1',
  width: '0px',
  height: '0px'
});
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {}, removeEventListener() {} });
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.setInterval = (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; };
globalThis.clearInterval = () => {};
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.fetch = () => new Promise(() => {}); // сеть в тестах недоступна: никогда не резолвится
globalThis.alert = () => {};
globalThis.confirm = () => true;
globalThis.prompt = () => null;
globalThis.Image = class { set src(v) { this._src = v; } };
globalThis.innerWidth = 1920;
globalThis.innerHeight = 1080;
globalThis.devicePixelRatio = 1;

// --- порядок скриптов берём напрямую из index.html -------------------------
const html = read('index.html');
const scriptTags = [...html.matchAll(/<script([^>]*)src="([^"]+)"[^>]*>/g)].map((m) => ({
  attrs: m[1],
  src: m[2]
}));
const orderedSources = scriptTags.map((t) => t.src);

test('index.html: src/utils.js подключён раньше скриптов app/* (defer + module)', () => {
  const utilsIndex = orderedSources.indexOf('src/utils.js');
  const firstAppIndex = orderedSources.findIndex((s) => s.startsWith('app/'));
  assert.ok(utilsIndex >= 0, 'src/utils.js не найден в index.html');
  assert.ok(firstAppIndex > utilsIndex, 'app/*.js должен идти после src/utils.js');
});

test('все подключённые скрипты существуют на диске', () => {
  const missing = orderedSources.filter((src) => !fs.existsSync(path.join(ROOT, src)));
  assert.deepEqual(missing, []);
});

// --- исполнение в порядке документа (classic — vm, module — import) --------
const loaded = [];
const errors = [];

for (const tag of scriptTags) {
  try {
    if (/\btype="module"/.test(tag.attrs)) {
      await import(pathToFileURL(path.join(ROOT, tag.src)).href);
    } else {
      vm.runInThisContext(read(tag.src), { filename: path.join(ROOT, tag.src) });
    }
    loaded.push(tag.src);
  } catch (err) {
    errors.push(`${tag.src}: ${err.name}: ${err.message}`);
  }
}

test('ни один скрипт не бросил исключение при загрузке', () => {
  assert.deepEqual(errors, []);
});

test('все скрипты из index.html загружены', () => {
  assert.equal(loaded.length, scriptTags.length, `загружено ${loaded.length} из ${scriptTags.length}`);
});

// --- кросс-файловая проверка разрешения имён -------------------------------
// vm.runInThisContext видит глобальную лексическую среду отдельных скриптов
// (let/const/function) так же, как браузер между classic-скриптами.
const probe = (expr) => vm.runInThisContext(expr);

test('общая область видимости разделённых файлов сохранилась', () => {
  // функции из разных частей бывшего script.js
  assert.equal(probe('typeof loadState'), 'function');                // state-render.js
  assert.equal(probe('typeof renderShortcuts'), 'function');          // state-render.js
  assert.equal(probe('typeof renderModalShortcutsList'), 'function'); // modal-shortcuts.js
  assert.equal(probe('typeof navHandleKeydown'), 'function');         // navigation.js
  assert.equal(probe('typeof initLayoutDragAndDrop'), 'function');    // layout-dnd.js
  assert.equal(probe('typeof updateClockAndDate'), 'function');       // clock-topbar.js
  assert.equal(probe('typeof initCustomSearchEngines'), 'function');  // controls.js
  // let/const-состояние, разъехавшееся по файлам
  assert.equal(probe('typeof STATE'), 'object');                      // core.js (const STATE = store.state)
  assert.equal(probe('typeof window.store'), 'object');               // state/store.js
  assert.equal(probe('typeof window.store.state'), 'object');         // владелец состояния (этап «б»)
  assert.equal(probe('STATE === window.store.state'), true);          // alias указывает на store
  assert.equal(probe('Array.isArray(window.store.persistKeys)'), true); // единственный список ключей
  assert.equal(probe('typeof activeCategory'), 'string');             // core.js (let activeCategory)
  assert.equal(probe('typeof mistTabsEl'), 'object');                 // core.js (const mistTabsEl)
  assert.equal(probe('typeof TRANSLATIONS'), 'object');               // core.js
  assert.equal(probe('typeof AppUtils'), 'object');                   // src/utils.js (module)
  assert.equal(probe('typeof ShortcutCategories'), 'object');         // services/shortcut-categories.js
});

test('обработчики событий навешены и инициализация выполнена', () => {
  assert.ok((docListeners.keydown || []).length >= 1, 'нет keydown на document');
  assert.ok((winListeners.wheel || []).length >= 1, 'нет wheel на window');
  assert.ok(intervals.length >= 1, 'часы не заведены через setInterval');
});

test('иконка вкладки: по умолчанию компактная, своя — из состояния', () => {
  // Раньше здесь ставился логотип favicon.png на 78 КБ, потом прозрачная
  // иконка 16px — иконка вкладки переключалась и исчезала на долю секунды.
  // Теперь значение одно и то же в favicon-loader.js и applyFavicon().
  const href = () => probe("document.querySelector('.page-favicon').getAttribute('href')");
  assert.equal(href(), 'assets/icon-48.png');

  probe('STATE.customFavicon = "data:image/png;base64,myicon"; applyFavicon()');
  assert.equal(href(), 'data:image/png;base64,myicon');

  probe('STATE.customFavicon = null; applyFavicon()');
  assert.equal(href(), 'assets/icon-48.png');
});

test('панель расписания скрыта критическим правилом до применения стилей', () => {
  // Плагин грузит свой CSS по требованию, поэтому в index.html есть
  // html:not(.schedule-ready) #schedule-panel { display: none !important }.
  // Проверяем, что правило действительно лежит в подключённой таблице —
  // иначе панель мелькала бы неоформленной на долю секунды.
  const base = read('css/base/variables-and-reset.css');
  assert.match(base, /html:not\(\.schedule-ready\)\s+#schedule-panel/);
  assert.match(base, /display:\s*none\s*!important/);

  // И в index.html плагин подключён НЕ через <link>, а кодом
  const html = read('index.html');
  assert.doesNotMatch(html, /<link[^>]*schedule-panel\.css/);
  assert.match(html, /services\/shortcut-icons\.js/);
});

test('манифест объявляет прозрачные иконки 16/32 — иначе вкладка моргает логотипом', () => {
  // Chrome до загрузки страницы показывает иконку расширения из манифеста.
  // Раньше там стояли настоящие 48/128, и при своей иконке вкладка на долю
  // секунды показывала логотип, прежде чем подставить пользовательский.
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.icons['16'], 'assets/icon16_trans.png');
  assert.equal(manifest.icons['32'], 'assets/icon32_trans.png');
  // карточка расширения и панель настроек по-прежнему с нормальным логотипом
  assert.equal(manifest.icons['48'], 'assets/icon-48.png');
  assert.equal(manifest.icons['128'], 'assets/icon-128.png');

  // сами файлы существуют и действительно крошечные (пустые прозрачные PNG)
  ['16', '32'].forEach((size) => {
    const file = path.join(ROOT, manifest.icons[size]);
    assert.ok(fs.existsSync(file), `нет ${manifest.icons[size]}`);
    assert.ok(fs.statSync(file).size < 1024, 'прозрачная иконка должна быть крошечной');
  });
});

// --- Статические проверки: то, что не ловит загрузка скриптов ------------

test('все ключи data-i18n* из разметки есть в словаре для en и ru', () => {
  const html = read('index.html');
  const keys = [...html.matchAll(/data-i18n(?:-title|-placeholder)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 20, `найдено ключей: ${keys.length}`);

  const en = TRANSLATIONS.en;
  const ru = TRANSLATIONS.ru;
  const missingEn = keys.filter((key) => !(key in en));
  const missingRu = keys.filter((key) => !(key in ru));
  // Раньше здесь опечатка saveBtn вместо btnSave: кнопка «Сохранить»
  // в панели макета не переводилась, а applyLanguage молча её пропускал
  assert.deepEqual(missingEn, [], 'нет ключей в en');
  assert.deepEqual(missingRu, [], 'нет ключей в ru');
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ru).sort(),
    'наборы ключей en и ru должны совпадать');
});

test('обработчик клавиш не падает на цифрах (isInputActive должен быть в области видимости)', () => {
  // Регрессия: isInputActive объявлялся во вложенном блоке ниже по
  // обработчику, и обращение к нему выше бросало ReferenceError —
  // цифровые хоткеи категорий не работали вообще.
  mistTabsEl.style.display = 'flex';
  const keydown = (docListeners.keydown || [])[0];
  assert.ok(keydown, 'нет слушателя keydown');
  ['1', '2', '9', '0', 'ArrowLeft', 'Escape'].forEach((key) => {
    assert.doesNotThrow(() => keydown({
      key,
      target: { nodeType: 1, tagName: 'BODY' },
      preventDefault() {},
      ctrlKey: false,
      altKey: false,
      metaKey: false
    }), `клавиша ${key} вызывает исключение`);
  });
  mistTabsEl.style.display = '';
});

test('loadState снимает флаг state-loading даже при исключении', () => {
  // Иначе любая ошибка внутри колбэка оставляла страницу с
  // html.state-loading, то есть с вечно пустой (чёрной) вкладкой
  const source = read('app/state-render.js');
  assert.match(source, /finally\s*\{[\s\S]*classList\.remove\('state-loading'\)/,
    'снятие флага должно быть в finally');
  assert.match(source, /catch\s*\(error\)/, 'тело колбэка должно быть в try/catch');
});

test('экспорт бэкапа не тащит файл расписания, импорт возвращает настройки плагина', () => {
  // Асимметрия была с обеих сторон: scheduleData (сотни КБ разобранного .xlsx)
  // попадал в JSON, а scheduleEnabled/scheduleGroup при импорте терялись,
  // потому что clearAndSet стирает хранилище целиком.
  const payload = probe('buildBackupPayload({' +
    ' scheduleData: { groups: [{ name: "G", lessons: [1,2,3] }] },' +
    ' lastUpdateCheck: 123,' +
    ' shortcutIconCache: { "128|example.com": "data:image/png;base64,x" },' +
    ' theme: "dark" })');

  assert.equal(payload.scheduleData, undefined, 'файл расписания не должен попадать в бэкап');
  assert.equal(payload.lastUpdateCheck, undefined, 'служебные ключи не должны попадать в бэкап');
  assert.equal(payload.shortcutIconCache, undefined, 'кэш иконок не должен попадать в бэкап');
  assert.equal(payload.theme, 'dark', 'обычные настройки сохраняются');

  // импорт обязан вернуть галку и выбранную группу. Сторона импорта
  // целиком переехала в app/backup-validate.js (белый список полей);
  // функциональная проверка — в tests/backup-validate.test.js
  const validateSource = read('app/backup-validate.js');
  assert.match(validateSource, /scheduleEnabled:\s*asBool\(data\.scheduleEnabled, false\)/);
  assert.match(validateSource, /scheduleGroup:\s*sanitizeScheduleGroup\(data\.scheduleGroup\)/);
});
