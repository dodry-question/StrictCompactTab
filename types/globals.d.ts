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
// app/state-render.js — 5 мостов сняты (фаза 3, хаб: saveState/loadState/…)
// app/layout-widgets.js — 13 мостов сняты (фаза 3); 9 accessors (общие let) остались
var tempPositions: any;
var layoutGridSnap: any;
var layoutGridSize: any;
var tempMistWidgets: any;
var activeDragElement: any;
var hasDragged: any;
var mistHeadDrag: any;
var activeResizeElement: any;
var resizeStartScale: any;
// app/weather.js — 4 моста сняты (фаза 3); остался getWeatherDescription (accessors сняты — часть 3)
var getWeatherDescription: any;
// app/categories-settings.js — 9 мостов + accessor settingsCategoryId сняты (часть 3)
// app/clock-topbar.js — 14 мостов сняты (фаза 3); accessor activeCategory остался
var activeCategory: any;
// app/core.js — 9 мостов + accessors navModel/editingIndex сняты (часть 3); алиасы
var DEFAULT_SHORTCUTS: any;
var MIST_WIDGET_KEYS: any;
}

export {};
