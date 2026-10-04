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
// ВНИМАНИЕ: `store`, `storage`, `TRANSLATIONS`, `DEFAULT_SHORTCUTS` и
// `MIST_WIDGET_KEYS` объявлены ТОЛЬКО через интерфейс Window (а не как `var`),
// потому что те же имена уже объявлены как top-level `const` в app/core.js
// (`const STATE = window.store.state;` и т.п.) — иначе tsc ругался бы на
// «Cannot redeclare block-scoped variable».
declare global {
  interface Window {
    // Состояние (владелец — state/store.js, этап «б»: store вместо window.STATE)
    // и слой хранения
    store: any;
    storage: any;
    // Локализация и дефолты
    TRANSLATIONS: any;
    DEFAULT_SHORTCUTS: any;
    // Геометрия mist-виджетов
    MIST_WIDGET_KEYS: any;
    // Сервисы (services/*.js)
    WeatherService: any;
    WeatherDrawer: any;
    SearchService: any;
    SearchUI: any;
    ShortcutRenderer: any;
    ShortcutIcons: any;
    ShortcutCategories: any;
    ShortcutLayout: any;
    ScheduleXlsx: any;
    ScheduleParser: any;
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

  // src/utils.js — это ESM-модуль, он публикует себя в globalThis (а значит и
  // как window.AppUtils). Объявляем глобальную переменную, чтобы работали обе
  // формы обращения.
  var AppUtils: any;
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
}

export {};
