import { TRANSLATIONS } from '../i18n/translations.js';

// AppUtils (formatDateLine, getTopbarCityName, normalizeMistWidgets) больше не
// публикуется в window — потребители импортируют функции из src/utils.js напрямую.

// --- РЎР›РћР’РђР Р¬ РџР•Р Р•Р’РћР”РћР’ (Р›РћРљРђР›РР—РђР¦РРЇ) ---
// TRANSLATIONS приходит через import в первой строке файла

// --- Р РђРЎРЁРР Р•РќРќРђРЇ РЎРРЎРўР•РњРђ РҐР РђРќР•РќРРЇ (СЃ РїРѕРґРґРµСЂР¶РєРѕР№ Р±СЌРєР°РїРѕРІ) ---
// storage: потребители импортируют напрямую из storage/storage.js — фаза 3.

// --- Р§РРЎРўР«Р™ РЎРўРђР РўРћР’Р«Р™ РЁРђР±Р›РћРќ ---
const DEFAULT_SHORTCUTS = window.DEFAULT_SHORTCUTS;
// STATE/store (state/store.js) потребители импортируют напрямую — фаза 3.
const MIST_WIDGET_KEYS = window.MIST_WIDGET_KEYS;

// Геометрия Flex-потока пилюль — ТОЛЬКО режим Mist (в стандартном режиме
// работает исходная CSS-сетка, см. getGridMetrics) — должна совпадать с CSS:
//   body.mode-mist .shortcuts-container { display: flex; flex-wrap: wrap; gap: 8px 10px; }
//   .mist-pill { padding: 8px 16px; font-size: 14.5px; gap: 8px;
//                max-width: min(300px, 100%) }
// Ширина пилюли считается по тексту: короткие названия («VK», «ав») дают
// короткие пилюли, длинные — растут до max-width и переносятся потоком.
const MIST_CELL_GAP = 10;   // колонка контейнера (gap: 8px 10px)
const MIST_PAD = 10;        // padding контейнера пилюль (10px)
const MIST_MAX_W = 700;     // предельная ширина центрального блока (px)
const MIST_CELL_W = 115;    // виртуальная ячейка настройки «Ярлыков в ряду»

// Клавиатурная навигация: динамическая модель зон (см. rebuildNavModel).
// Объявлено здесь же, чтобы model была готова к первой отрисовке.
const NAV_ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const NAV_KEYS = NAV_ARROWS.concat(['Home', 'End']);
const NAV_ZONE_ROOTS = {
  widgets: ['widget-clock', 'weather-widget'],
  search: ['search-form'],
  tabs: ['mist-tabs'],
  grid: ['shortcuts-container']
};
let navModel = null;

let editingIndex = -1;

// --- РРќРР¦РРђР›РР—РђР¦РРЇ Р­Р›Р•РњР•РќРўРћР’ РРњРџРћР РўРђ / Р­РљРЎРџРћР РўРђ ---
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const importFileInput = /** @type {HTMLInputElement} */ (document.getElementById('import-file-input'));

// --- navModel/editingIndex — ACCESSORS (шаг «в») -----------------------------
// Их переписывают navigation/modal-shortcuts/settings-panel/categories-settings —
// без accessora была бы рассинхронизация. Остальные 9 мостов (MIST_*/NAV_*/btn*)
// сняты — фаза 3. storage/DEFAULT_SHORTCUTS/MIST_WIDGET_KEYS опубликованы
// своими модулями (window.X) — здесь только export; TRANSLATIONS — на import.
Object.defineProperty(window, 'navModel', {
  get: () => navModel,
  set: (value) => { navModel = value; },
  configurable: true
});
Object.defineProperty(window, 'editingIndex', {
  get: () => editingIndex,
  set: (value) => { editingIndex = value; },
  configurable: true
});
export {
  TRANSLATIONS,
  DEFAULT_SHORTCUTS,
  MIST_WIDGET_KEYS,
  MIST_CELL_GAP,
  MIST_PAD,
  MIST_MAX_W,
  MIST_CELL_W,
  NAV_ARROWS,
  NAV_KEYS,
  NAV_ZONE_ROOTS,
  navModel,
  editingIndex,
  btnExport,
  btnImport,
  importFileInput
};

