// Ambient-декларации кастомных глобалов расширения.
//
// Приложение собрано из classic-скриптов, которые публикуют свои модули в
// window / globalThis. Без этого файла `tsc --noEmit` (checkJs) считал бы
// каждое обращение `window.X` ошибкой «Property 'X' does not exist on Window».
//
// ВАЖНО: типы здесь намеренно широкие (any) — это стартовая точка этапа P0.
// Уточнять по мере типизации сервисов (P2) и/или перевода на ESM+импорты (P1),
// после чего этот файл можно будет удалить. Профиль данных состояния описан
// JSDoc @typedef'ами в state/defaults.js.
//
// ВНИМАНИЕ (обновлено в фазе 3): интерфейс Window и `var` ниже — два разных
// пространства имён tsc, конфликта нет. `var X` даёт голое имя потребителям
// (пока они не переведены на import), `Window.X` — присвоения `window.X = ...`.
declare global {
  interface Window {
    // Локализация и дефолты (TRANSLATIONS переведён на import в фазе 3)
    DEFAULT_SHORTCUTS: any;
    // Геометрия mist-виджетов
    MIST_WIDGET_KEYS: any;
    // Внешняя библиотека (загружается динамически в theme-adaptive.js)
    materialColorUtilities: any;
    // Тест-хук
    __nextLesson: any;
  }

  // Нестандартные браузерные API, которых нет в стандартной lib.dom:
  //   * Brave Browser (navigator.brave) — используется в app/backup-updates.js;
  //   * User-Agent Client Hints (navigator.userAgentData) — там же, как fallback.
  interface Navigator {
    brave?: { isBrave(): Promise<boolean> };
    userAgentData?: {
      getHighEntropyValues(hints: string[]): Promise<{ brands: { brand: string }[] }>;
    };
  }

  // src/utils.js — чистый ESM-модуль (фаза 3): публикаций в globalThis больше
  // нет, потребители берут функции через import.
// app/settings-panel.js — 10 мостов сняты (фаза 3); осталось 2 accessors ниже
var addCatCustom: any;
var addCatSelectedFor: any;
// app/state-render.js — модуль (шаг «в»)
var loadState: any;
var saveState: any;
var updateSearchEngineUI: any;
var renderShortcuts: any;
var container: any;
// app/layout-widgets.js — модуль (шаг «в»): 9 accessors (общие let) + мосты
var tempPositions: any;
var layoutGridSnap: any;
var layoutGridSize: any;
var tempMistWidgets: any;
var activeDragElement: any;
var hasDragged: any;
var mistHeadDrag: any;
var activeResizeElement: any;
var resizeStartScale: any;
var dragOffset: any;
var resizeStartCoords: any;
var resizeStartDimensions: any;
var RESIZE_BASE_SIZE: any;
var RESIZE_MIN_WIDTH: any;
var IOS_RESIZE_MIN_CELLS: any;
var applyLayoutPositions: any;
var applyMistWidgets: any;
var isMistHeadWidget: any;
var getWidgetKey: any;
var clearCustomLayoutStyles: any;
var mistWidgetKey: any;
var applyClockScale: any;
// app/weather.js — 4 моста сняты (фаза 3); остался getWeatherDescription + accessors
var getWeatherDescription: any;
var draggedId: any;
var justDroppedId: any;
// app/categories-settings.js — 9 мостов сняты (фаза 3); accessor settingsCategoryId остался
var settingsCategoryId: any;
// app/clock-topbar.js — модуль (шаг «в»): accessor activeCategory + 12 DOM-мостов
var activeCategory: any;
var mistTabsEl: any;
var mistPresetSelect: any;
var mistPerRowSelect: any;
var mistZenZone: any;
var showWeatherCb: any;
var weatherCityInput: any;
var weatherInputStatus: any;
var weatherSubsettings: any;
var weatherTemp: any;
var weatherDetails: any;
var weatherWidget: any;
var weatherIcon: any;
var renderTopbar: any;
var updateClockAndDate: any;
// app/core.js — модуль (шаг «в», фаза 2): глобальный хаб алиасов
var DEFAULT_SHORTCUTS: any;
var MIST_WIDGET_KEYS: any;
var MIST_CELL_GAP: any;
var MIST_PAD: any;
var MIST_MAX_W: any;
var MIST_CELL_W: any;
var NAV_KEYS: any;
var NAV_ZONE_ROOTS: any;
var btnExport: any;
var btnImport: any;
var importFileInput: any;
var navModel: any;
var editingIndex: any;
}

export {};
