// ---------- НАВИГАЦИЯ ПО СЕТКЕ ЯРЛЫКОВ СТРЕЛКАМИ ----------

function gridShortcutItems() {
  return container ? Array.from(container.querySelectorAll('.shortcut-card, .mist-pill')) : [];
}

// Сколько карточек помещается в один ряд (считаем по верхним координатам)
function gridItemsPerRow(items) {
  if (!items.length) return 1;
  const firstTop = items[0].offsetTop;
  let perRow = 0;
  while (perRow < items.length && items[perRow].offsetTop === firstTop) perRow++;
  return perRow > 0 ? perRow : 1;
}

// ---------- КЛАВИАТУРНАЯ НАВИГАЦИЯ: ДИНАМИЧЕСКАЯ МОДЕЛЬ ЗОН ----------
// Структура DOM меняется от режима Layout (Standard / Left / Zen / Mist):
// панель категорий оказывается то НАД сеткой, то ПОД ней, часы, поиск и
// виджеты лежат в разных узлах. Готовые «связи» между узлами хранить нельзя —
// после смены режима они ведут не туда. Поэтому список фокусируемых элементов
// (Search / Categories / Grid / Widgets) пересобирается заново: при каждой
// отрисовке интерфейса (renderShortcuts) и перед каждым нажатием клавиши.

// Видим ли элемент — вместе со всеми предками (display: none родителя
// по вычисленным стилям самого элемента не виден)
function navVisible(el) {
  if (!el || el.isConnected === false) return false;
  let node = el;
  while (node && node.nodeType === 1) {
    const st = window.getComputedStyle(node);
    if (st.display === 'none' || st.visibility === 'hidden') return false;
    node = node.parentElement;
  }
  return true;
}

// Фокусируемые элементы внутри корня (в DOM-порядке)
function navFocusables(root) {
  if (!root) return [];
  const sel = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), button:not([disabled]), ' +
    '[tabindex="0"], [contenteditable]';
  return Array.from(root.querySelectorAll(sel))
    .filter((el) => el.tabIndex !== -1 && navVisible(el));
}

function navZoneRoots(key) {
  return (NAV_ZONE_ROOTS[key] || [])
    .map((id) => document.getElementById(id))
    .filter(Boolean);
}

// Порядок зон СВЕРХУ-ВНИЗ. Опора — режим Layout (в тестовом окружении
// и в скрытых блоках измерить нечего), в браузере порядок уточняется
// по реальным координатам элементов.
function navZoneOrder() {
  const above = tabsPanelAboveGrid();
  const fallback = ['widgets', 'search'].concat(above ? ['tabs', 'grid'] : ['grid', 'tabs']);
  const tops = {};
  let measured = 0;
  fallback.forEach((key) => {
    let top = null;
    navZoneRoots(key).forEach((el) => {
      if (!navVisible(el)) return;
      const r = el.getBoundingClientRect();
      if (r && r.top > 0) top = top === null ? r.top : Math.min(top, r.top);
    });
    tops[key] = top;
    if (top !== null) measured += 1;
  });
  if (measured !== fallback.length) return fallback;
  return fallback.slice().sort((a, b) => tops[a] - tops[b]);
}

function navZoneItems(key) {
  if (key === 'widgets') {
    return navZoneRoots('widgets').filter(navVisible).map((el) => {
      // Часы/погода не кликабельны по умолчанию: tabindex=-1 делает их
      // доступными для программного фокуса, не меняя порядок Tab
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      return el;
    });
  }
  if (key === 'grid') return gridShortcutItems().filter(navVisible);
  const roots = navZoneRoots(key).filter(navVisible);
  if (!roots.length) return [];
  // У чипов категорий roving tabindex (неактивные = -1), поэтому берём их
  // напрямую: стрелками доступны ВСЕ чипы, а в Tab — только активный
  if (key === 'tabs') {
    return Array.from(roots[0].querySelectorAll('.mist-tab')).filter(navVisible);
  }
  return navFocusables(roots[0]);
}

// Пересборка модели: зоны в визуальном порядке + метрика сетки ярлыков
function rebuildNavModel() {
  const zones = [];
  navZoneOrder().forEach((key) => {
    const items = navZoneItems(key);
    if (!items.length) return;
    zones.push({ key, items, roots: navZoneRoots(key) });
  });
  const gridZone = zones.find((z) => z.key === 'grid');
  const gridItems = gridZone ? gridZone.items : [];
  navModel = {
    zones,
    gridItems,
    gridPerRow: gridItems.length ? gridItemsPerRow(gridItems) : 1
  };
  return navModel;
}

function navFocus(el) {
  if (el && typeof el.focus === 'function') el.focus();
}

function navActiveTabElement() {
  if (!mistTabsEl) return null;
  return mistTabsEl.querySelector('.mist-tab.active') || mistTabsEl.querySelector('.mist-tab');
}

// Вход в зону с нужной стороны: ближайший к границе элемент
function navZoneEntry(zone, dir) {
  if (!zone) return null;
  if (zone.key === 'tabs') return navActiveTabElement() || zone.items[0];
  if (zone.key === 'search') {
    return zone.items.find((el) => el.tagName === 'INPUT') || zone.items[0];
  }
  if (zone.key === 'widgets') return zone.items[0];
  return dir > 0 ? zone.items[0] : zone.items[zone.items.length - 1];
}

// Переход в соседнюю зону сверху/снизу. За крайней зоной клавиша лишь
// гасится — фокус не «улетает» и страница не скроллится.
function navJumpZone(model, zi, dir, e) {
  const nz = zi + dir;
  e.preventDefault();
  if (nz < 0 || nz >= model.zones.length) return true;
  navFocus(navZoneEntry(model.zones[nz], dir));
  return true;
}

// Единый обработчик клавиатуры навигации. Возвращает true, если клавиша
// «наша» (даже когда default намеренно не подавляем — например, каретка
// в поле ввода), и false, если событие нужно отдать другим обработчикам.
function navHandleKeydown(e) {
  const key = e.key;
  const isTab = key === 'Tab';
  if (!isTab && !NAV_KEYS.includes(key)) return false;
  if (e.ctrlKey || e.altKey || e.metaKey) return false;

  const model = rebuildNavModel();
  if (!model.zones.length) return false;

  const anchor = (e.target && e.target.nodeType === 1) ? e.target : document.activeElement;
  // Панель «Расписание» — самостоятельный интерфейс (app/schedule.js): стрелки
  // прокручивают её, Tab ходит по её элементам, а не по зонам новой вкладки
  const schedulePanelEl = document.getElementById('schedule-panel');
  if (schedulePanelEl && schedulePanelEl.classList.contains('is-open') &&
      schedulePanelEl.contains(anchor)) return true;
  const inputType = anchor && anchor.tagName === 'INPUT' ? (anchor.type || 'text').toLowerCase() : '';
  const textLike = anchor && anchor.tagName === 'INPUT' &&
    ['text', 'search', 'url', 'email'].includes(inputType);
  // Поле, где стрелки значимы для содержимого (textarea, число, файл…)
  const hardEntry = anchor && (
    anchor.tagName === 'TEXTAREA' || anchor.isContentEditable ||
    (anchor.tagName === 'INPUT' && !textLike)
  );
  if (hardEntry) return true;
  // Строка поиска: Left/Right и Home/End двигают каретку, не зоны
  if (textLike && !isTab && key !== 'ArrowUp' && key !== 'ArrowDown') return true;

  // Какая зона держит якорь
  let zi = -1;
  let ii = -1;
  for (let i = 0; i < model.zones.length; i += 1) {
    const z = model.zones[i];
    const idx = z.items.indexOf(anchor);
    if (idx >= 0) { zi = i; ii = idx; break; }
    if (z.roots.some((r) => r.contains && r.contains(anchor))) { zi = i; ii = 0; break; }
  }

  // --- Tab: сквозной переход между зонами в визуальном порядке ---
  if (isTab) {
    if (zi < 0) return false;
    if (!e.shiftKey && anchor === searchInput && model.zones[zi].key === 'search') {
      const tabsZone = model.zones.find((item) => item.key === 'tabs');
      const activeTab = tabsZone && navActiveTabElement();
      if (activeTab) {
        e.preventDefault();
        navFocus(activeTab);
        return true;
      }
    }

    const flat = [];
    const bounds = [];
    model.zones.forEach((z) => {
      const start = flat.length;
      // roving tabindex и tabindex=-1 (виджеты) в обход Tab не входят —
      // они достижимы стрелками, а Tab идёт по обычному порядку зон
      z.items.forEach((it) => { if (it.tabIndex !== -1) flat.push(it); });
      bounds.push({ start, end: flat.length - 1 });
    });
    if (!flat.length) return false;
    let cur = flat.indexOf(anchor);
    if (cur < 0) cur = e.shiftKey ? bounds[zi].end : bounds[zi].start;
    const next = e.shiftKey ? cur - 1 : cur + 1;
    // За крайним элементом клавиша отдаётся браузеру — фокус уходит со страницы
    if (next < 0 || next >= flat.length) return false;
    e.preventDefault();
    navFocus(flat[next]);
    return true;
  }

  const zone = zi >= 0 ? model.zones[zi] : null;

  // --- Фокус вне зон (страница, служебные узлы): точка входа — поиск ---
  if (!zone) {
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const entry = model.zones.find((z) => z.key === 'search') || model.zones[0];
      e.preventDefault();
      navFocus(navZoneEntry(entry, 1));
      return true;
    }
    return false; // Left/Right и Home/End уходят глобальным хоткеям
  }

  // --- Панель категорий: Left/Right/Home/End переключают категорию ---
  if (zone.key === 'tabs' &&
      (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End')) {
    const buttons = zone.items;
    if (buttons.length < 2) return false;
    let ni = buttons.indexOf(anchor);
    if (ni < 0) ni = 0;
    if (key === 'ArrowRight') ni = (ni + 1) % buttons.length;
    else if (key === 'ArrowLeft') ni = (ni - 1 + buttons.length) % buttons.length;
    else if (key === 'Home') ni = 0;
    else ni = buttons.length - 1;
    e.preventDefault();
    selectCategory(buttons[ni].dataset.tabId, ni, true);
    return true;
  }

  // --- Home/End: границы текущей зоны ---
  if (key === 'Home' || key === 'End') {
    e.preventDefault();
    navFocus(key === 'Home' ? zone.items[0] : zone.items[zone.items.length - 1]);
    return true;
  }

  const dir = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0;

  // --- Сетка ярлыков: движение по рядам ---
  if (zone.key === 'grid') {
    const items = zone.items;
    const perRow = model.gridPerRow;

    if (dir) {
      const next = ii + dir * perRow;
      if (next >= 0 && next < items.length) {
        e.preventDefault();
        navFocus(items[next]);
        return true;
      }
      // Верхний/нижний ряд → зона выше/ниже (поиск, категории, виджеты)
      return navJumpZone(model, zi, dir, e);
    }

    const col = ii % perRow;
    const rowStart = ii - col;
    const rowEnd = Math.min(rowStart + perRow, items.length) - 1;
    let target = -1;
    if (key === 'ArrowRight') {
      target = ii < rowEnd ? ii + 1 : (rowEnd + 1 < items.length ? rowEnd + 1 : -1);
    } else {
      target = ii > rowStart ? ii - 1 : (rowStart - perRow >= 0 ? rowStart - 1 : -1);
    }
    e.preventDefault();
    if (target >= 0) navFocus(items[target]);
    return true;
  }

  // --- Остальные зоны: Up/Down всегда ведут в соседнюю зону ---
  if (dir) return navJumpZone(model, zi, dir, e);

  // --- Left/Right внутри зоны (кнопки поиска, виджеты) ---
  const next = key === 'ArrowRight' ? ii + 1 : ii - 1;
  e.preventDefault();
  if (next >= 0 && next < zone.items.length) navFocus(zone.items[next]);
  return true;
}
function createMistPill(item) {
  const pill = document.createElement('a');
  pill.className = 'mist-pill';
  pill.href = item.url;
  pill.title = item.name;

  const img = document.createElement('img');
  img.className = 'mist-pill-icon';
  img.alt = '';

  window.ShortcutIcons.attach(img, item, 64);

  const span = document.createElement('span');
  span.className = 'mist-pill-label';
  span.textContent = item.name;

  pill.appendChild(img);
  pill.appendChild(span);
  return pill;
}





