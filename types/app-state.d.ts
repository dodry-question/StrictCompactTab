// МОДУЛЬНЫЕ типы профиля состояния (этап P2.2).
//
// Было (до P2.2): все @typedef'ы лежали в state/defaults.js и были
// ГЛОБАЛЬНЫМИ (ambient) — любой .js использовал `AppState` без импорта,
// файл даже не подключался в index.html (тег снят в fa0e527), а имя типа
// нельзя было найти по import-графу.
//
// Стало: единственный модуль типов. Потребители берут типы через
// JSDoc-импорт:
//
//   /** @import { AppState, ShortcutItem } from '../types/app-state.d.ts' */
//
// Это конструкция TypeScript для .js-файлов: рантайм её не видит (JSDoc —
// комментарий), сборки нет, а tsc получает настоящий модульный тип.
//
// В релизный zip попадает только то, что перечислено в tools/build-release.ps1:
// папки types/ там НЕТ, поэтому файл не влияет ни на размер, ни на рантайм.
//
// Правило поддержки: этот профиль — зеркало PERSIST_KEYS (state/store.js).
// Расхождение списков уже один раз привело к дыре в типах (P2.1: не хватало
// layoutIosMode/layoutStealthMode/customSearchEngines) — сверять при правках.

/**
 * Элемент STATE.shortcuts — ярлык ИЛИ папка-категория.
 *
 * Почему один тип, а не union «ярлык | папка»: в JS эти профили неразличимы
 * по структуре (Shortcut — подмножество ShortcutFolder), tsc такой union не
 * сужает по `isFolder`, а разложить список на два массива нельзя без правки
 * логики. Здесь честно описан ОБЪЕДИНЁННЫЙ профиль.
 *
 * Поля:
 *   * `url` необязателен — у папки его нет, а ярлык без ссылки отсекает
 *     санитайзер бэкапа (app/backup-validate.js: !name && !url → мусор);
 *   * `customIcon` — имя, которое читают services/shortcut-icons.js и
 *     services/shortcut-renderer.js (не `icon`);
 *   * легаси-поля старых бэкапов (folder/category/group/__category) в типе не
 *     описаны: их разбирает migrateToNested по «сырым» объектам.
 */
export type ShortcutItem = {
  id?: string;
  name?: string;
  url?: string;
  customIcon?: string | null;
  isFolder?: true;
  children?: ShortcutItem[];
};

/**
 * Псевдоним для мест, где список ГАРАНТИРОВАННО папки (результат фильтра
 * `isFolder`, поиск категории по id) — иначе пришлось бы ставить каст на
 * каждое обращение к `.children`.
 */
export type ShortcutFolder = ShortcutItem;

/** Координаты города для погоды (Open-Meteo). */
export type WeatherCoords = {
  lat: number | null;
  lon: number | null;
  resolvedName: string;
};

/** Кэш последнего ответа погоды, чтобы не дёргать сеть на каждой вкладке. */
export type WeatherCache = {
  temp: string;
  code: number | null;
  desc: string;
  timestamp: number;
};

/** Сдвиг и размер одного виджета Mist. */
export type MistWidgetBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  s: number;
};

/**
 * Ровно то, что возвращает normalizeMistWidgets() (src/utils.js) и что лежит
 * в STATE.mistHeadOffset: два независимых виджета Mist.
 */
export type MistWidgets = { clock: MistWidgetBox; search: MistWidgetBox };

/**
 * Пользовательский поисковик: создаёт services/search-ui.js, санитизирует
 * app/backup-validate.js (sanitizeCustomEngines → ровно эти 4 поля).
 */
export type CustomSearchEngine = {
  id: string;
  name: string;
  queryUrl: string;
  logo: string | null;
};

/**
 * Профиль состояния приложения — то, чем является `STATE` (state/store.js).
 * Объединения (size/language/theme/mistPreset) повторяют списки известных
 * значений из app/backup-validate.js и <option> в index.html.
 */
export type AppState = {
  shortcuts: ShortcutItem[];
  columns: number;
  size: 'small' | 'medium' | 'large';
  customBackground: string | null;
  customFavicon: string | null;
  language: 'en' | 'ru';
  searchEngine: string;
  showDate: boolean;
  format12h: boolean;
  showSeconds: boolean;
  theme: 'dark' | 'light' | 'adaptive';
  adaptiveThemeData: object | null;
  layoutPositions: Record<string, any> | null;
  layoutGridSnap: boolean;
  layoutGridSize: number;
  layoutIosMode: boolean;
  layoutStealthMode: boolean;
  showClock: boolean;
  showWeather: boolean;
  weatherCity: string;
  weatherCoords: WeatherCoords;
  weatherCache: WeatherCache;
  customSearchEngines: CustomSearchEngine[];
  checkUpdates: boolean;
  layoutZenMode: boolean;
  layoutMistMode: boolean;
  mistPreset: 'center' | 'split' | 'zen';
  mistPerRow: number;
  scheduleEnabled: boolean;
  scheduleGroup: string | null;
  mistHeadOffset: MistWidgets;
};
