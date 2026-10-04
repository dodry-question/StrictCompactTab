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
    // Сервисы (services/*.js)
    WeatherService: any;
    WeatherDrawer: any;
    ShortcutRenderer: any;
    ShortcutIcons: any;
    ShortcutCategories: any;
    ShortcutLayout: any;
    // Валидация импортируемого бэкапа (app/backup-validate.js)
    BackupValidate: any;
    // Динамическая тема (app/theme-adaptive.js — модуль с мостом, шаг «в»)
    AdaptiveThemeManager: any;
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
// app/backup-updates.js — модуль (шаг «в»): мосты window.* для классических
// потребителей. Объявление как global var даёт и голое имя, и window.X.
var buildBackupPayload: any;
var checkForUpdates: any;
// app/settings-panel.js — модуль (шаг «в»): мосты для классических потребителей
// (голое имя в потребителе + window.X при назначении обеспечиваются одним var).
var searchInput: any;
var modal: any;
var openBtn: any;
var closeBtn: any;
var closeSettings: any;
var sizeSelect: any;
var columnsSelect: any;
var languageSelect: any;
var searchEngineSelect: any;
var themeSelect: any;
var addCatCustom: any;
var addCatSelectedFor: any;
// app/controls.js — модуль (шаг «в»)
var layoutEditControls: any;
var populateSearchEnginesSelect: any;
var initCustomSearchEngines: any;
// app/navigation.js — модуль (шаг «в»)
var navHandleKeydown: any;
var createMistPill: any;
var rebuildNavModel: any;
// app/modal-shortcuts.js — модуль (шаг «в»)
var renderModalShortcutsList: any;
// app/shortcuts-migration.js — модуль (шаг «в»)
var extractCategoryMeta: any;
var generateId: any;
var migrateToNested: any;
var moveNestedItem: any;
var findShortcutOrFolderById: any;
var isFolderContainingTarget: any;
var closeFolder: any;
var folderModal: any;
// app/appearance.js — модуль (шаг «в»)
var compressImage: any;
var applyBackground: any;
var applyTheme: any;
var applyMistMode: any;
var applyMistPreset: any;
var syncModeToggles: any;
var applyClockVisibility: any;
var applyFavicon: any;
var applyLanguage: any;
// app/categories-tabs.js — модуль (шаг «в»)
var buildTabs: any;
var getActiveTab: any;
var getGridMetrics: any;
var stabilizeShortcutsHeight: any;
var renderMistPills: any;
var selectCategory: any;
var renderCategoryTabs: any;
var tabsPanelAboveGrid: any;
var syncTabsDomPosition: any;
// app/mist-toggles.js — модуль (шаг «в»)
var showClockCb: any;
var showDateCb: any;
var timeFormatCb: any;
var showSecondsCb: any;
var layoutIosModeCb: any;
var revealMistZenByWheel: any;
// app/state-render.js — модуль (шаг «в»)
var loadState: any;
var saveState: any;
var updateSearchEngineUI: any;
var renderShortcuts: any;
var container: any;
// app/layout-dnd.js — модуль (шаг «в»)
var initLayoutDragAndDrop: any;
var onResizeStart: any;
var removeResizeHandles: any;
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
// app/weather.js — модуль (шаг «в»): 2 accessors + 5 мостов функций
var draggedId: any;
var justDroppedId: any;
var getWeatherDescription: any;
var updateStatusText: any;
var updateWeatherWidget: any;
var handleCityInputChange: any;
var applyWeatherVisibility: any;
// app/categories-settings.js — модуль (шаг «в»): accessor + 9 мостов
var settingsCategoryId: any;
var refreshAfterCategoryChange: any;
var ensureSettingsCategoryId: any;
var findCategoryById: any;
var moveItemToCategory: any;
var populateCategorySelects: any;
var renderCategoryTabsBar: any;
var renderCategoryHeader: any;
var getCategoryItems: any;
var buildCategoryOptions: any;
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
// app/schedule.js — модуль (шаг «в»): 5 мостов, внутренние let не тронуты
var syncScheduleEnabled: any;
var refreshSchedulePanel: any;
var handleScheduleFile: any;
var isSchedulePanelOpen: any;
var closeSchedulePanel: any;
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
