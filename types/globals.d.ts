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
}

export {};
