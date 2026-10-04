import { STATE } from '../state/store.js';

import { normalizeMistWidgets } from '../src/utils.js';

// --- Р РђРЎРџРћР›РћР–Р•РќРР• Р­Р›Р•РњР•РќРўРћР’ (LAYOUT DRAG & DROP) ---
let activeDragElement = null;
let dragOffset = { x: 0, y: 0 };
let hasDragged = false;
let tempPositions = {};
let layoutGridSnap = null;
let layoutGridSize = null;

// --- MIST: ДВА независимых виджета «Время» и «Поиск» ---
// Часы и поиск — отдельные виджеты: каждый двигается и меняет размер
// сам по себе, поэтому блок можно разнести по экрану как угодно.
let tempMistWidgets = normalizeMistWidgets(null);
let mistHeadDrag = null;

function isMistHeadWidget(widget) {
  if (!widget || !document.body.classList.contains('mode-mist')) return false;
  return widget.classList.contains('clock-container') || widget.id === 'search-form';
}

// Ключ виджета внутри карты mistHeadOffset: 'clock' | 'search' | null
function mistWidgetKey(widget) {
  if (!widget) return null;
  if (widget.id === 'search-form') return 'search';
  if (widget.classList.contains('clock-container')) return 'clock';
  return null;
}

let activeResizeElement = null;
let resizeStartCoords = { x: 0, y: 0 };
let resizeStartDimensions = { w: 0, h: 0 };
let resizeStartScale = 1;

// Стартовые размеры для ресайза: jsdom/скрытые элементы отдают нули,
// тогда берём эталонные габариты (пропорции всё равно сохранятся)
const RESIZE_BASE_SIZE = {
  clock: { w: 450, h: 110 },
  weather: { w: 300, h: 90 },
  search: { w: 580, h: 40 },
  shortcuts: { w: 600, h: 400 }
};

// Минимальная ширина виджета при пропорциональном ресайзе вне iOS.
const RESIZE_MIN_WIDTH = {
  clock: 200,
  weather: 140,
  search: 260,
  shortcuts: 320
};

const IOS_RESIZE_MIN_CELLS = {
  clock: { w: 4, h: 6 },
  weather: { w: 4, h: 6 },
  search: { w: 7, h: 5 },
  shortcuts: { w: 8, h: 6 }
};

function getWidgetKey(element) {
  if (element.id === 'widget-clock') return 'clock';
  if (element.id === 'weather-widget') return 'weather';
  if (element.id === 'search-form') return 'search';
  if (element.id === 'widget-shortcuts') return 'shortcuts';
  return null;
}

// Инлайн-свойства, которые задают кастомную позицию/размер элемента
const CUSTOM_POSITION_PROPS = ['position', 'top', 'left', 'right', 'bottom', 'transform',
  'margin', 'width', 'height', 'max-width', 'max-height'];

// Полностью снимает кастомные позиционные стили (top/left/transform/…)
// у поиска, часов, погоды, панели категорий и сетки ярлыков —
// элементы возвращаются в дефолтную сетку Flex/Grid текущего пресета
function clearCustomLayoutStyles() {
  const targets = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(
    '.draggable-widget, .clock-container, .weather-container, .search-form, .shortcuts-wrapper, #mist-tabs, #shortcuts-container'
  ));
  targets.forEach(el => {
    CUSTOM_POSITION_PROPS.forEach(prop => el.style.removeProperty(prop));
    // Сдвиги и размеры независимых виджетов в режиме Mist
    el.style.removeProperty('--mist-head-x');
    el.style.removeProperty('--mist-head-y');
    el.style.removeProperty('--clock-scale');
  });
}

// --- MIST: независимые виджеты «Время» и «Поиск» ---
// Сдвиг каждого виджета живёт в СВОЕЙ CSS-переменной, размер — в
// инлайн-стиле, масштаб часов — в --clock-scale. Ничего не связано
// с соседним виджетом, поэтому верстка не «уезжает» у второго.
/** @returns {HTMLElement[]} */
function mistHeadElements() {
  return /** @type {HTMLElement[]} */ ([
    document.querySelector('.clock-container'),
    document.getElementById('search-form')
  ].filter(Boolean));
}

// Применяет карту { clock: {...}, search: {...} } к обоим виджетам
function applyMistWidgets(map) {
  const inMist = document.body.classList.contains('mode-mist');
  const norm = normalizeMistWidgets(map);
  const moduleElement = document.getElementById('mist-module');
  if (!inMist && moduleElement) {
    moduleElement.style.removeProperty('--mist-panel-x');
    moduleElement.style.removeProperty('--mist-panel-y');
    moduleElement.style.removeProperty('--mist-panel-width');
  }

  mistHeadElements().forEach(el => {
    const key = mistWidgetKey(el) || 'clock';
    // Вне Mist чистим только «хвосты» сдвига — размеры/масштаб часов
    // в классическом режиме задаёт applyLayoutPositions()
    const off = inMist ? norm[key] : { x: 0, y: 0, w: 0, h: 0, s: 1 };

    if (off.x || off.y) {
      el.style.setProperty('--mist-head-x', off.x + 'px');
      el.style.setProperty('--mist-head-y', off.y + 'px');
    } else {
      el.style.removeProperty('--mist-head-x');
      el.style.removeProperty('--mist-head-y');
    }

    if (!inMist) return;

    if (key === 'clock') {
      // Часы масштабируются ЦЕЛИКОМ: шрифт и контейнер (CSS calc) растут вместе
      applyClockScale(el, off.s);
    } else {
      if (moduleElement) {
        moduleElement.style.setProperty('--mist-panel-x', (off.x || 0) + 'px');
        moduleElement.style.setProperty('--mist-panel-y', (off.y || 0) + 'px');
        if (off.w > 0) moduleElement.style.setProperty('--mist-panel-width', off.w + 'px');
        else moduleElement.style.removeProperty('--mist-panel-width');
      }

      if (off.w > 0 && off.h > 0) {
        // Поиск — собственные габариты (CSS заданы через !important)
        el.style.setProperty('width', off.w + 'px', 'important');
        el.style.setProperty('max-width', off.w + 'px', 'important');
        el.style.setProperty('height', off.h + 'px', 'important');
        el.style.setProperty('max-height', off.h + 'px', 'important');
      } else {
        el.style.removeProperty('width');
        el.style.removeProperty('max-width');
        el.style.removeProperty('height');
        el.style.removeProperty('max-height');
      }
    }
  });
}

function applyLayoutPositions() {
  const isIos = document.body.classList.contains('mode-ios');
  // Режимы Mist/Split задают композицию сами: абсолютные кастомные координаты,
  // сохранённые в классическом режиме, здесь СБРАСЫВАЕМ до пресетных значений,
  // иначе элементы «уезжают» и ломают верстку при переключении
  const isMist = document.body.classList.contains('mode-mist');
  const widgets = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.draggable-widget'));
  widgets.forEach(widget => {
    const key = getWidgetKey(widget);
    const pos = (!isMist && key && STATE.layoutPositions && STATE.layoutPositions[key])
      ? STATE.layoutPositions[key]
      : null;
    if (pos) {
      widget.style.position = 'absolute';
      widget.style.margin = '0';
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
      widget.style.transform = 'none';
      widget.style.left = pos.left + '%';
      widget.style.top = pos.top + '%';
      
      if (isIos) {
        const defaultSizes = {
          clock: { w: 8, h: 8 },
          weather: { w: 6, h: 6 },
          search: { w: 8, h: 8 },
          shortcuts: { w: 16, h: 16 }
        };
        const wCells = pos.widthCells || defaultSizes[key].w;
        const hCells = pos.heightCells || defaultSizes[key].h;
        
        widget.style.width = `calc(${wCells} * var(--grid-size, 20px))`;
        widget.style.height = `calc(${hCells} * var(--grid-size, 20px))`;
        
        if (wCells >= hCells * 1.4) {
          widget.classList.add('widget-wide');
        } else {
          widget.classList.remove('widget-wide');
        }
      } else if (key === 'clock') {
        // Часы: габариты считает CSS от --clock-scale (пропорции сохраняются)
        widget.style.width = '';
        widget.style.height = '';
        widget.style.removeProperty('max-width');
        widget.classList.remove('widget-wide');
      } else {
        // Остальные виджеты: собственные габариты из режима редактирования
        const w = Number(pos.widthPx) || 0;
        const h = Number(pos.heightPx) || 0;
        widget.style.width = w > 0 ? w + 'px' : '';
        widget.style.height = h > 0 ? h + 'px' : '';
        widget.style.maxWidth = w > 0 ? w + 'px' : '';
        widget.style.maxHeight = h > 0 ? h + 'px' : '';
        widget.classList.remove('widget-wide');
      }

      // Масштаб часов при ресайзе (пропорции часы/дата сохраняются)
      applyClockScale(widget, pos.scale);
    } else {
      widget.style.position = '';
      widget.style.margin = '';
      widget.style.right = '';
      widget.style.bottom = '';
      widget.style.transform = '';
      widget.style.left = '';
      widget.style.top = '';
      widget.style.width = '';
      widget.style.height = '';
      widget.style.removeProperty('max-width');
      widget.style.removeProperty('max-height');
      widget.classList.remove('widget-wide');
      applyClockScale(widget, 1);
    }
  });

  // В Mist часы и поиск живут как ДВА независимых виджета:
  // у каждого свой сдвиг и свой размер
  if (isMist) {
    applyMistWidgets(STATE.mistHeadOffset);
  } else {
    // Вне Mist эти сдвиги не нужны — убираем переменные,
    // чтобы классическая раскладка осталась без следов
    applyMistWidgets(null);
  }
}

// Масштаб часов: 1 — исходный размер, иначе CSS-переменная
// переиспользуется в calc() для шрифта и габаритов контейнера
function applyClockScale(widget, scale) {
  if (!widget || !widget.classList.contains('clock-container')) return;
  const s = Number(scale);
  if (isFinite(s) && s > 0 && Math.abs(s - 1) > 1e-6) {
    widget.style.setProperty('--clock-scale', String(s));
  } else {
    widget.style.removeProperty('--clock-scale');
  }
}

// --- Мосты для layout-dnd/controls/mist-toggles/state-render/appearance ------
// (13 мостов функций/констант сняты — фаза 3.) Переприсваиваемые извне let
// закрыты ACCESSORS: layout-dnd, controls и mist-toggles пишут в эти
// переменные напрямую (tempPositions = {}, activeDragElement = widget, ...),
// и обычный мост по значению дал бы десинк.
Object.defineProperty(window, 'tempPositions', {
  get: () => tempPositions,
  set: (value) => { tempPositions = value; },
  configurable: true
});
Object.defineProperty(window, 'layoutGridSnap', {
  get: () => layoutGridSnap,
  set: (value) => { layoutGridSnap = value; },
  configurable: true
});
Object.defineProperty(window, 'layoutGridSize', {
  get: () => layoutGridSize,
  set: (value) => { layoutGridSize = value; },
  configurable: true
});
Object.defineProperty(window, 'tempMistWidgets', {
  get: () => tempMistWidgets,
  set: (value) => { tempMistWidgets = value; },
  configurable: true
});
Object.defineProperty(window, 'activeDragElement', {
  get: () => activeDragElement,
  set: (value) => { activeDragElement = value; },
  configurable: true
});
Object.defineProperty(window, 'hasDragged', {
  get: () => hasDragged,
  set: (value) => { hasDragged = value; },
  configurable: true
});
Object.defineProperty(window, 'mistHeadDrag', {
  get: () => mistHeadDrag,
  set: (value) => { mistHeadDrag = value; },
  configurable: true
});
Object.defineProperty(window, 'activeResizeElement', {
  get: () => activeResizeElement,
  set: (value) => { activeResizeElement = value; },
  configurable: true
});
Object.defineProperty(window, 'resizeStartScale', {
  get: () => resizeStartScale,
  set: (value) => { resizeStartScale = value; },
  configurable: true
});
export {
  activeDragElement,
  dragOffset,
  hasDragged,
  tempPositions,
  layoutGridSnap,
  layoutGridSize,
  tempMistWidgets,
  mistHeadDrag,
  activeResizeElement,
  resizeStartCoords,
  resizeStartDimensions,
  resizeStartScale,
  RESIZE_BASE_SIZE,
  RESIZE_MIN_WIDTH,
  IOS_RESIZE_MIN_CELLS,
  CUSTOM_POSITION_PROPS,
  isMistHeadWidget,
  mistWidgetKey,
  getWidgetKey,
  clearCustomLayoutStyles,
  mistHeadElements,
  applyMistWidgets,
  applyLayoutPositions,
  applyClockScale
};

