// @ts-check
// Точка правды по ФОРМЕ данных приложения. JSDoc @typedef'ы ниже описывают
// профиль состояния, который tsc (checkJs) и редактор используют для проверки.
// Начальные ЗНАЧЕНИЯ и владение живым объектом — в state/store.js (этап «б»:
// store вместо window.STATE).
// По мере типизации (этап P2) эти типы переедут в .ts и станут импортируемыми.

/**
 * @typedef {object} Shortcut
 * @property {string} name
 * @property {string} url
 * @property {string} [id]
 * @property {string} [categoryId]
 * @property {string|null} [icon]
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
 * @typedef {object} AppState
 * @property {Shortcut[]} shortcuts
 * @property {number} columns
 * @property {string} size
 * @property {string|null} customBackground
 * @property {string|object|null} customFavicon
 * @property {string} language
 * @property {string} searchEngine
 * @property {boolean} showDate
 * @property {boolean} format12h
 * @property {boolean} showSeconds
 * @property {string} theme
 * @property {object|null} adaptiveThemeData
 * @property {object|null} layoutPositions
 * @property {boolean} layoutGridSnap
 * @property {number} layoutGridSize
 * @property {boolean} showClock
 * @property {boolean} showWeather
 * @property {string} weatherCity
 * @property {WeatherCoords} weatherCoords
 * @property {WeatherCache} weatherCache
 * @property {boolean} checkUpdates
 * @property {boolean} layoutZenMode
 * @property {boolean} layoutMistMode
 * @property {string} mistPreset
 * @property {number} mistPerRow
 * @property {boolean} scheduleEnabled
 * @property {object|null} scheduleGroup
 * @property {{ clock: MistWidgetBox, search: MistWidgetBox }} mistHeadOffset
 */

/** @type {Shortcut[]} */
window.DEFAULT_SHORTCUTS = [];

/** @type {string[]} */
window.MIST_WIDGET_KEYS = ['clock', 'search'];
