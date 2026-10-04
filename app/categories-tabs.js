import { STATE } from '../state/store.js';

import { TRANSLATIONS } from '../i18n/translations.js';

// ---------- КАТЕГОРИИ (ВКЛАДКИ) ----------

function buildTabs() {
  const result = window.ShortcutCategories.buildTabs(
    STATE.shortcuts,
    STATE.language,
    TRANSLATIONS,
    activeCategory
  );
  activeCategory = result.activeCategory;
  return result.tabs;
}

function getActiveTab(tabs) {
  return window.ShortcutCategories.getActiveTab(tabs, activeCategory);
}

// Метрики классической сетки: жёсткие равные колонки (display: grid),
// одинаковая ширина плиток и фиксированный отступ gap: 12px.
// --grid-cols / --cell-size задают CSS: repeat(var(--grid-cols), var(--cell-size))
function getGridMetrics(count) {
  return window.ShortcutLayout.getGridMetrics(
    count,
    STATE.size,
    STATE.columns,
    window.innerWidth
  );
}

// Фиксирует высоту области ярлыков: она одинакова для ВСЕХ категорий,
// поэтому панель вкладок и ярлыки не «пыгают» при переключении.
// В классике число рядов считается по колонкам CSS-сетки, в Mist — по
// названиям и доступной ширине (flex flow). Расчёт детерминирован и не
// зависит от getBoundingClientRect — высота одинакова и в браузере,
// и в тестовом окружении без layout.
let lastFixedHeight = 0;
let cachedClassicRowHeight = 0;

// Доступная ширина под поток пилюль (только режим Mist). В браузере берём
// модуль — его ширина не зависит от того, какая категория открыта; иначе
// тот же предел, что задаёт CSS (--mist-max-w / MIST_MAX_W).
function flowContentWidth() {
  const pad = MIST_PAD * 2; // внутренний отступ контейнера (10px × 2)
  const mod = document.getElementById('mist-module');
  if (mod && mod.clientWidth > 0) return Math.max(180, mod.clientWidth - pad);
  const cap = parseFloat(container && container.style.maxWidth);
  const limit = cap > 0 ? cap : MIST_MAX_W;
  return Math.max(180, limit - pad);
}

// Метрики пилюли для оценки её ширины по названию (без layout):
// .mist-pill { padding: 8px 16px; border: 1px; icon 19px; gap 8px;
//              font-size: 14.5px; max-width: min(300px, 100%) }
function mistChipMetrics() {
  return {
    minW: 0, padX: 34, icon: 19, innerGap: 8, labelPad: 0,
    gap: MIST_CELL_GAP, charW: 7.6, maxText: 239, maxW: 300
  };
}

// Оценка ширины пилюли по длине названия — без layout, поэтому
// результат одинаков в браузере и в jsdom (высота не «прыгает»)
function flowChipWidth(name, cfg) {
  const text = Math.min((name || '').length * cfg.charW, cfg.maxText) + cfg.labelPad;
  const natural = cfg.padX + cfg.icon + cfg.innerGap + text;
  return Math.max(cfg.minW, Math.min(cfg.maxW, natural));
}

// Сколько строк займёт категория в потоке (жадная укладка строк)
function countFlowRows(names, availW, cfg) {
  let rows = 1;
  let used = 0;
  names.forEach((name) => {
    const w = Math.min(availW, flowChipWidth(name, cfg));
    if (used > 0 && used + cfg.gap + w > availW) {
      rows += 1;
      used = w;
    } else {
      used = used === 0 ? w : used + cfg.gap + w;
    }
  });
  return Math.max(1, rows);
}

function stabilizeShortcutsHeight(tabs) {
  if (!container) return;

  if (document.body.classList.contains('mode-ios')) {
    container.style.height = '';
    lastFixedHeight = 0;
    return;
  }

  const isMist = document.body.classList.contains('mode-mist');
  const list = tabs || [];
  let rows = 0;
  let rowHeight;
  let padding;

  if (isMist) {
    // --- Mist: органичный Flex-поток, высоту задаёт ТОЛЬКО CSS ---
    // Инлайн-высоту сетке ярлыков НЕ навязываем: она применялась бы как
    // фиксированный размер и на свежей вкладке считалась ДО отрисовки
    // пилюль (offsetHeight ещё 0) — высота выходила меньше контента, и в
    //низу появлялся лишний скролл-блок/«полоса». После «Сбросить макет»
    // такой высоты нет (clearCustomLayoutStyles её снимает, а повторный
    // рендер не возвращает) — состояние загрузки теперь совпадает с ним
    // ПОЛНОСТЬЮ: никакого position: absolute, ширин/высот и расчётов
    // mistHeadOffset для сетки, только чистый flex-поток.
    lastFixedHeight = 0;
    container.style.height = '';
    return;
  } else {
    // --- Стандартный режим: классическая CSS-сетка, ряды = колонки ---
    // Высота ряда: измеряем уже отрисованную плитку (браузер), без layout —
    // квадратная плитка (width === height) + gap: 12px.
    const card = /** @type {HTMLElement} */ (container.querySelector('.shortcut-card'));
    if (card && card.offsetHeight) {
      cachedClassicRowHeight = card.offsetHeight + 12;
    }
    rowHeight = cachedClassicRowHeight || (getGridMetrics(1).itemWidth + 12);
    padding = 24; // 12px × 2

    list.forEach(tab => {
      const items = (tab.items || []).filter(i => i && !i.isFolder);
      if (!items.length) return;
      const m = getGridMetrics(items.length);
      rows = Math.max(rows, Math.ceil(items.length / Math.max(1, m.columns)));
    });
  }

  // Во всём приложении нет ни одного ярлыка — держим прежнюю высоту,
  // чтобы панель категорий не съезжала
  if (!rows) {
    rows = lastFixedHeight
      ? Math.max(1, Math.round((lastFixedHeight - padding) / rowHeight))
      : 1;
  }

  const needed = Math.round(rows * rowHeight + padding);
  const cap = Math.max(160, Math.round(window.innerHeight * (isMist ? 0.46 : 0.52)));
  const height = Math.min(needed, cap);

  // Высота уже зафиксирована — ничего не перезаписываем (без «дёрганий»)
  if (height === lastFixedHeight) return;
  lastFixedHeight = height;
  container.style.height = `${height}px`;
}

// ---------- РЕНДЕР MIST: FLEX-ПОТОК «ПИЛЮЛЬ» ----------
// Пилюли кладутся ПРЯМО в контейнер (без рядов-обёрток): контейнер —
// это Flexbox с переносом (flex-wrap), ширина каждой пилюли ПО ТЕКСТУ.
// Никаких одинаковых колонок, пустых ячеек и «лесенок»: короткие
// названия дают короткие пилюли, длинные — аккуратно переносятся.

function renderMistPills(items) {
  if (!container) return;
  container.innerHTML = '';
  container.style.maxWidth = '';

  const list = (Array.isArray(items) ? items : []).filter(item => item && !item.isFolder);
  // Настройка «Ярлыков в ряду» ограничивает ширину центрального блока:
  // виртуальная ячейка × ряд + padding − gap, но не больше MIST_MAX_W.
  // Переменная вешается на body, чтобы её видел и сам модуль (#mist-module)
  const perRow = Math.max(1, parseInt(STATE.mistPerRow, 10) || 6);
  document.body.style.setProperty(
    '--mist-max-w',
    Math.min(MIST_MAX_W,
      perRow * MIST_CELL_W + MIST_PAD * 2 - MIST_CELL_GAP) + 'px'
  );

  const fragment = document.createDocumentFragment();
  list.forEach(item => fragment.appendChild(createMistPill(item)));
  container.appendChild(fragment);
}

// Переключение активной категории (вкладки) — в классике и в Mist
function selectCategory(tabId, index, focusTab) {
  if (activeCategory === tabId) {
    if (focusTab) focusTabByIndex(index);
    return;
  }

  activeCategory = tabId;
  renderShortcuts();

  if (focusTab) focusTabByIndex(index);
}

function focusTabByIndex(index) {
  if (!mistTabsEl) return;
  const buttons = /** @type {NodeListOf<HTMLButtonElement>} */ (mistTabsEl.querySelectorAll('.mist-tab'));
  if (buttons[index]) buttons[index].focus();
}

function renderCategoryTabs(tabs) {
  window.ShortcutRenderer.renderCategoryTabs(
    mistTabsEl,
    tabs,
    activeCategory,
    (tabId, index, focusTab) => selectCategory(tabId, index, focusTab)
  );
}

// Клавиатура чипа категории: Left/Right — соседние категории (циклически),
// Где панель категорий лежит физически относительно сетки ярлыков.
// Классика и все три Mist-пресета (split/center/zen): вкладки СВЕРХУ —
// у split прямо под поиском, у center/zen сразу под ним же
function tabsPanelAboveGrid() {
  if (!document.body.classList.contains('mode-mist')) return true;
  return document.body.classList.contains('mist-preset-split') ||
    document.body.classList.contains('mist-preset-center') ||
    document.body.classList.contains('mist-preset-zen');
}

// Порядок в DOM обязан совпадать с визуальным порядком, иначе Tab
// «прыгает» не туда: вкладки сверху → первые в DOM, снизу → последние
function syncTabsDomPosition() {
  if (!mistTabsEl || !container) return;
  const wrap = mistTabsEl.parentElement;
  if (!wrap || wrap !== container.parentElement) return;
  const tabsFirst = wrap.firstElementChild === mistTabsEl;
  const wantTabsFirst = tabsPanelAboveGrid();
  if (tabsFirst === wantTabsFirst) return;
  if (wantTabsFirst) wrap.insertBefore(mistTabsEl, container);
  else wrap.insertBefore(container, mistTabsEl);
}

// Мосты для потребителей (state-render, input-keys, navigation) —
// уберём в фазе 3 шага «в». Внутренние let (lastFixedHeight и кэши строк)
// снаружи не читаются — обычных мостов по значению хватает.
window.buildTabs = buildTabs;
window.getActiveTab = getActiveTab;
window.getGridMetrics = getGridMetrics;
window.stabilizeShortcutsHeight = stabilizeShortcutsHeight;
window.renderMistPills = renderMistPills;
window.selectCategory = selectCategory;
window.renderCategoryTabs = renderCategoryTabs;
window.tabsPanelAboveGrid = tabsPanelAboveGrid;
window.syncTabsDomPosition = syncTabsDomPosition;
export {
  buildTabs,
  getActiveTab,
  getGridMetrics,
  flowContentWidth,
  mistChipMetrics,
  flowChipWidth,
  countFlowRows,
  stabilizeShortcutsHeight,
  renderMistPills,
  selectCategory,
  focusTabByIndex,
  renderCategoryTabs,
  tabsPanelAboveGrid,
  syncTabsDomPosition
};

