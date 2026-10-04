// @ts-check
// Точка правды по ФОРМЕ данных приложения. JSDoc @typedef'ы ниже описывают
// профиль состояния, который tsc (checkJs) и редактор используют для проверки.
// Начальные ЗНАЧЕНИЯ и владение живым объектом — в state/store.js (этап «б»:
// store вместо window.STATE).
// По мере типизации (этап P2) эти типы переедут в .ts и станут импортируемыми.
// Рантайм-значения (DEFAULT_SHORTCUTS/MIST_WIDGET_KEYS) переехали в
// state/values.js (модуль, фаза 3) — здесь только типы, тег <script> в
// index.html убран.

// P2.1: поля приведены к тому, что реально пишет приложение.
//   * `url` необязателен: папки его не имеют, а ярлык без ссылки отсекается
//     санитайзером бэкапа (backup-validate: !name && !url → мусор);
//   * `customIcon` (а не `icon`) — имя, которое читают services/shortcut-icons.js
//     и services/shortcut-renderer.js;
//   * `categoryId`/`icon` убраны: их не читает ни один файл (легаси-поля
//     старых бэкапов разбирает migrateToNested по «сырым» объектам).
// Легаси-поля конкретного ярлыка (folder/category/group/__category) живут
// только внутри миграции и набираются динамически, поэтому в типе их нет.

/**
 * Элемент STATE.shortcuts — ярлык ИЛИ папка-категория.
 *
 * Почему один тип, а не union: пары «ярлык | папка» в JS неразличимы по
 * структуре (Shortcut — подмножество ShortcutFolder), tsc такой union не
 * сужает по `isFolder`, а разложить список на два массива нельзя без правки
 * логики. Здесь честно описан ОБЪЕДИНЁННЫЙ профиль: общие поля плюс
 * папочные, и это единственный тип, который сходится с кодом в каждой точке.
 *
 * @typedef {object} ShortcutItem
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [url]
 * @property {string|null} [customIcon]
 * @property {true} [isFolder]
 * @property {ShortcutItem[]} [children]
 */

/**
 * Псевдоним для мест, где список ГАРАНТИРОВАННО папки (результат фильтра
 * `isFolder`, поиск категории по id): иначе пришлось бы ставить каст на
 * каждое обращение к `.children`.
 * @typedef {ShortcutItem} ShortcutFolder
 */

/**
 * @typedef {object} WeatherCoords
 * @property {number|null} lat
 * @property {number|null} lon
 * @property {string} resolvedName
 */

/**
 * @typedef {object} WeatherCache
 * @property {string} temp
 * @property {number|null} code
 * @property {string} desc
 * @property {number} timestamp
 */

/**
 * @typedef {object} MistWidgetBox
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {number} s
 */

/**
 * Сдвиги и размеры двух независимых виджетов Mist — ровно то, что возвращает
 * normalizeMistWidgets() (src/utils.js) и что лежит в STATE.mistHeadOffset.
 * @typedef {{ clock: MistWidgetBox, search: MistWidgetBox }} MistWidgets
 */

/**
 * Пользовательский поисковик (services/search-ui.js создаёт, app/backup-validate.js
 * санитизирует: sanitizeCustomEngines → ровно эти 4 поля).
 * @typedef {object} CustomSearchEngine
 * @property {string} id
 * @property {string} name
 * @property {string} queryUrl
 * @property {string|null} logo
 */

/**
 * @typedef {object} AppState
 * @property {ShortcutItem[]} shortcuts
 * @property {number} columns
 * @property {'small'|'medium'|'large'} size
 * @property {string|null} customBackground
 * @property {string|null} customFavicon
 * @property {'en'|'ru'} language
 * @property {string} searchEngine
 * @property {boolean} showDate
 * @property {boolean} format12h
 * @property {boolean} showSeconds
 * @property {'dark'|'light'|'adaptive'} theme
 * @property {object|null} adaptiveThemeData
 * @property {Record<string, any>|null} layoutPositions
 * @property {boolean} layoutGridSnap
 * @property {number} layoutGridSize
 * @property {boolean} layoutIosMode
 * @property {boolean} layoutStealthMode
 * @property {boolean} showClock
 * @property {boolean} showWeather
 * @property {string} weatherCity
 * @property {WeatherCoords} weatherCoords
 * @property {WeatherCache} weatherCache
 * @property {CustomSearchEngine[]} customSearchEngines
 * @property {boolean} checkUpdates
 * @property {boolean} layoutZenMode
 * @property {boolean} layoutMistMode
 * @property {'center'|'split'|'zen'} mistPreset
 * @property {number} mistPerRow
 * @property {boolean} scheduleEnabled
 * @property {string|null} scheduleGroup
 * @property {MistWidgets} mistHeadOffset
 */
