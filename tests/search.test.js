import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.style = {};
    this.handlers = {};
    this.files = [];
    this.dataset = {};
    this.textContent = '';
    this.className = '';
    this.classes = new Set();
    this.attributes = {};
    this._value = '';
    this.resetCalled = false;
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !this.classes.has(name) : force;
        if (shouldAdd) this.classes.add(name);
        else this.classes.delete(name);
        return shouldAdd;
      },
      contains: (name) => this.classes.has(name)
    };
  }

  set value(value) {
    const nextValue = String(value);
    if (this.tagName === 'select' && this.children.length > 0 &&
        !this.children.some(option => option.value === nextValue)) {
      this._value = '';
      return;
    }
    this._value = nextValue;
  }

  get value() {
    return this._value;
  }

  set innerHTML(value) {
    this.children = [];
    this._value = value;
  }

  get selectedIndex() {
    if (this.tagName !== 'select') return -1;
    return this.children.findIndex(option => option.value === this._value);
  }

  appendChild(child) {
    if (child.tagName === '#fragment') {
      this.children.push(...child.children);
      child.children = [];
      return child;
    }
    this.children.push(child);
    return child;
  }

  addEventListener(name, handler) {
    this.handlers[name] = handler;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  querySelectorAll(selector) {
    if (selector === '.mist-tab') {
      return this.children.filter(child => child.className === 'mist-tab');
    }
    return [];
  }

  reset() {
    this.resetCalled = true;
  }
}

let elements;

globalThis.document = {
  getElementById(id) {
    return elements[id] || null;
  },
  createElement(tagName) {
    return new MockElement(tagName);
  },
  createDocumentFragment() {
    return new MockElement('#fragment');
  }
};

await import('../services/search.js');
await import('../services/search-ui.js');
await import('../services/weather.js');
await import('../services/shortcut-renderer.js');
await import('../services/shortcut-categories.js');
await import('../services/shortcut-layout.js');

test.beforeEach(() => {
  elements = {};
});

test('builds encoded URLs for built-in, custom, and unknown engines', () => {
  assert.equal(
    SearchService.buildSearchUrl('hello world', 'google', []),
    'https://www.google.com/search?q=hello%20world'
  );
  assert.equal(
    SearchService.buildSearchUrl('term', 'custom_example', [
      { id: 'custom_example', queryUrl: 'https://example.com/?q=' }
    ]),
    'https://example.com/?q=term'
  );
  assert.equal(
    SearchService.buildSearchUrl('term', 'missing', []),
    'https://duckduckgo.com/?q=term'
  );
});

test('populates engine options and falls back to DuckDuckGo for an unknown selection', () => {
  const select = new MockElement('select');
  elements['search-engine-select'] = select;
  const state = {
    searchEngine: 'custom_example',
    customSearchEngines: [{ id: 'custom_example', name: 'Example' }]
  };
  let saveCount = 0;

  SearchUI.populateSearchEnginesSelect(state, () => saveCount++);

  assert.equal(select.value, 'custom_example');
  assert.equal(select.children.at(-1).textContent, 'Example');
  assert.equal(saveCount, 0);

  state.searchEngine = 'deleted_engine';
  SearchUI.populateSearchEnginesSelect(state, () => saveCount++);

  assert.equal(state.searchEngine, 'duckduckgo');
  assert.equal(select.value, 'duckduckgo');
  assert.equal(saveCount, 1);
});

test('updates both search logos for custom and Brave engines', () => {
  const mainLogo = new MockElement('img');
  const settingsLogo = new MockElement('img');
  elements['search-engine-logo'] = mainLogo;
  elements['settings-search-logo'] = settingsLogo;

  const state = {
    searchEngine: 'custom_example',
    customSearchEngines: [{ id: 'custom_example', logo: 'data:image/png;base64,logo' }]
  };
  SearchUI.updateSearchEngineUI(state);

  assert.equal(mainLogo.src, 'data:image/png;base64,logo');
  assert.equal(settingsLogo.src, 'data:image/png;base64,logo');
  assert.equal(mainLogo.classList.contains('inverted'), false);

  state.searchEngine = 'brave';
  SearchUI.updateSearchEngineUI(state);

  assert.equal(mainLogo.src, 'assets/search_brave.png');
  assert.equal(settingsLogo.src, 'assets/search_brave.png');
  assert.equal(mainLogo.classList.contains('inverted'), true);
  assert.equal(settingsLogo.classList.contains('inverted'), true);
});

test('renders and deletes a custom engine, restoring the default when selected', () => {
  const list = new MockElement();
  elements['custom-engines-list'] = list;
  const state = {
    language: 'ru',
    searchEngine: 'custom_example',
    customSearchEngines: [{
      id: 'custom_example',
      name: 'Example',
      queryUrl: 'https://example.com/?q='
    }]
  };
  const calls = [];
  const actions = {
    saveState: () => calls.push('save'),
    populateSearchEnginesSelect: () => calls.push('populate'),
    updateSearchEngineUI: () => calls.push('update'),
    renderCustomSearchEngines: () => calls.push('render')
  };

  SearchUI.renderCustomSearchEngines(state, actions);

  assert.equal(list.children.length, 1);
  const deleteButton = list.children[0].children[1];
  assert.equal(deleteButton.textContent, 'Удалить');
  deleteButton.handlers.click();

  assert.equal(state.searchEngine, 'duckduckgo');
  assert.deepEqual(state.customSearchEngines, []);
  assert.deepEqual(calls, ['save', 'populate', 'update', 'render']);
});

test('initializes the custom-engine form and saves a compressed-logo engine', () => {
  const ids = [
    'btn-toggle-custom-engines',
    'custom-engines-panel',
    'add-custom-engine-form',
    'custom-engine-name',
    'custom-engine-query',
    'custom-engine-logo-file',
    'custom-engine-logo-status'
  ];
  ids.forEach(id => { elements[id] = new MockElement(); });

  const panel = elements['custom-engines-panel'];
  const form = elements['add-custom-engine-form'];
  const fileInput = elements['custom-engine-logo-file'];
  const statusText = elements['custom-engine-logo-status'];
  panel.style.display = 'none';
  const state = { language: 'ru', customSearchEngines: [] };
  const calls = [];
  const actions = {
    renderCustomSearchEngines: () => calls.push('render'),
    saveState: () => calls.push('save'),
    populateSearchEnginesSelect: () => calls.push('populate'),
    compressImage(file, width, height, quality, callback) {
      assert.equal(file, 'logo-file');
      assert.deepEqual([width, height, quality], [64, 64, 0.85]);
      calls.push('compress');
      callback('compressed-logo');
    }
  };

  SearchUI.initCustomSearchEngines(state, {
    ru: { logoLoadedStatus: 'Логотип загружен' }
  }, actions);

  elements['btn-toggle-custom-engines'].handlers.click();
  assert.equal(panel.style.display, 'flex');
  assert.equal(calls[0], 'render');

  fileInput.files = ['logo-file'];
  fileInput.handlers.change({ target: fileInput });
  assert.equal(statusText.textContent, 'Логотип загружен');

  elements['custom-engine-name'].value = 'Demo';
  elements['custom-engine-query'].value = 'example.com/search?q=';
  form.handlers.submit({ preventDefault: () => calls.push('prevent') });

  assert.equal(state.customSearchEngines.length, 1);
  assert.match(state.customSearchEngines[0].id, /^custom_/);
  assert.equal(state.customSearchEngines[0].queryUrl, 'https://example.com/search?q=');
  assert.equal(state.customSearchEngines[0].logo, 'compressed-logo');
  assert.equal(form.resetCalled, true);
  assert.deepEqual(calls, ['render', 'prevent', 'compress', 'save', 'populate', 'render']);
});

test('renders classic shortcut cards and skips folders', () => {
  const container = new MockElement();
  const items = [
    { id: 'example', name: 'Example', url: 'https://example.com/path' },
    { id: 'custom', name: 'Custom', url: 'invalid-url', customIcon: 'data:image/png;base64,icon' },
    { id: 'folder', name: 'Folder', isFolder: true },
    null
  ];

  ShortcutRenderer.appendClassicCards(items, 'medium', container);

  assert.equal(container.children.length, 2);
  const [exampleCard, customCard] = container.children;
  assert.equal(exampleCard.href, 'https://example.com/path');
  assert.equal(exampleCard.className, 'shortcut-card size-medium');
  assert.equal(exampleCard.dataset.id, 'example');
  assert.equal(exampleCard.children[0].src, 'https://www.google.com/s2/favicons?sz=128&domain=example.com');
  assert.equal(exampleCard.children[1].textContent, 'Example');
  assert.equal(customCard.children[0].src, 'data:image/png;base64,icon');
  customCard.children[0].onerror();
  assert.match(customCard.children[0].src, /^data:image\/svg\+xml/);
});

test('renders category tabs with roving focus and reuses matching buttons', () => {
  const element = new MockElement();
  const selections = [];
  const onSelect = (...args) => selections.push(args);
  const initialTabs = [
    { id: 'main', name: 'Home' },
    { id: 'folder-a', name: 'Folder A' }
  ];

  ShortcutRenderer.renderCategoryTabs(element, initialTabs, 'main', onSelect);

  const [homeButton, folderButton] = element.children;
  assert.equal(element.style.display, 'flex');
  assert.equal(element.attributes.role, 'tablist');
  assert.equal(homeButton.attributes['aria-selected'], 'true');
  assert.equal(homeButton.tabIndex, 0);
  assert.equal(folderButton.attributes['aria-selected'], 'false');
  assert.equal(folderButton.tabIndex, -1);
  folderButton.handlers.click();
  assert.deepEqual(selections, [['folder-a', 1, true]]);

  const updatedTabs = [
    { id: 'main', name: 'Главная' },
    { id: 'folder-a', name: 'Папка A' }
  ];
  ShortcutRenderer.renderCategoryTabs(element, updatedTabs, 'folder-a', onSelect);

  assert.equal(element.children[0], homeButton);
  assert.equal(homeButton.textContent, 'Главная');
  assert.equal(folderButton.textContent, 'Папка A');
  assert.equal(folderButton.tabIndex, 0);
  assert.equal(folderButton.attributes['aria-selected'], 'true');

  ShortcutRenderer.renderCategoryTabs(element, [{ id: 'main', name: 'Главная' }], 'main', onSelect);
  assert.equal(element.style.display, 'none');
  assert.equal(element.children.length, 0);
});

test('builds category tabs and preserves or replaces the active category', () => {
  const shortcuts = [
    { id: 'top', name: 'Top shortcut' },
    { id: 'folder-a', name: 'Folder A', isFolder: true, children: [{ id: 'inside' }] },
    null
  ];
  const translations = { en: { mistHomeTab: 'Home' } };
  const result = ShortcutCategories.buildTabs(shortcuts, 'en', translations, 'folder-a');

  assert.deepEqual(result.tabs.map(tab => tab.id), ['main', 'folder-a']);
  assert.equal(result.tabs[0].name, 'Home');
  assert.deepEqual(result.tabs[0].items, [shortcuts[0]]);
  assert.deepEqual(result.tabs[1].items, [{ id: 'inside' }]);
  assert.equal(result.activeCategory, 'folder-a');
  assert.equal(ShortcutCategories.getActiveTab(result.tabs, result.activeCategory), result.tabs[1]);

  const fallback = ShortcutCategories.buildTabs(
    [{ id: 'only-folder', name: 'Only folder', isFolder: true }],
    'en',
    translations,
    'removed-category'
  );
  assert.deepEqual(fallback.tabs.map(tab => tab.id), ['only-folder']);
  assert.equal(fallback.activeCategory, 'only-folder');

  const empty = ShortcutCategories.buildTabs([], 'en', translations, 'removed-category');
  assert.deepEqual(empty.tabs.map(tab => tab.id), ['main']);
  assert.equal(empty.activeCategory, 'main');
});

test('maps category hotkeys 1-9 and 0 to category indexes', () => {
  assert.equal(ShortcutCategories.getHotkeyIndex('1', 10), 0);
  assert.equal(ShortcutCategories.getHotkeyIndex('2', 10), 1);
  assert.equal(ShortcutCategories.getHotkeyIndex('9', 10), 8);
  assert.equal(ShortcutCategories.getHotkeyIndex('0', 10), 9);
  assert.equal(ShortcutCategories.getHotkeyIndex('0', 9), -1);
  assert.equal(ShortcutCategories.getHotkeyIndex('x', 10), -1);
  assert.equal(ShortcutCategories.getHotkeyIndex('1', 0), -1);
});

test('calculates classic shortcut grid metrics within the viewport', () => {
  const narrowGrid = ShortcutLayout.getGridMetrics(10, 'small', 10, 320);
  assert.deepEqual(narrowGrid, {
    itemWidth: 85,
    gap: 12,
    padding: 24,
    columns: 2,
    maxWidth: 224,
    perRow: 2
  });

  const largeGrid = ShortcutLayout.getGridMetrics(8, 'large', 4, 1920);
  assert.equal(largeGrid.itemWidth, 110);
  assert.equal(largeGrid.columns, 4);
  assert.equal(largeGrid.perRow, 4);
  assert.equal(largeGrid.maxWidth, 508);

  const emptyGrid = ShortcutLayout.getGridMetrics(0, 'unknown', 0, 1920);
  assert.equal(emptyGrid.itemWidth, 85);
  assert.equal(emptyGrid.columns, 1);
  assert.equal(emptyGrid.perRow, 1);
});

test('requests current, hourly, and five-day weather from Open-Meteo', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  const forecast = { current: { temperature_2m: 12 }, hourly: {}, daily: {} };

  globalThis.fetch = async (url) => {
    requestUrl = String(url);
    return {
      ok: true,
      json: async () => forecast
    };
  };

  try {
    const result = await WeatherService.fetchForecast(58.6, 49.65);
    const url = new URL(requestUrl);

    assert.equal(url.origin, 'https://api.open-meteo.com');
    assert.equal(url.pathname, '/v1/forecast');
    assert.equal(url.searchParams.get('latitude'), '58.6');
    assert.equal(url.searchParams.get('longitude'), '49.65');
    assert.match(url.searchParams.get('current'), /temperature_2m/);
    assert.match(url.searchParams.get('hourly'), /precipitation_probability/);
    assert.match(url.searchParams.get('daily'), /temperature_2m_max/);
    assert.equal(url.searchParams.get('forecast_days'), '5');
    assert.equal(url.searchParams.get('timezone'), 'auto');
    assert.equal(result, forecast);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reports an Open-Meteo forecast request failure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 503 });

  try {
    await assert.rejects(WeatherService.fetchForecast(0, 0), /503/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
