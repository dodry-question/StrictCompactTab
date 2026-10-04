// @ts-check
// Рантайм-значения, которые до фазы 3 жили в state/defaults.js как window.X.
// Сам defaults.js остался контейнером JSDoc-типов (глобальные typedef'ы для
// checkJs) и в index.html больше не подключается; потребители — через import:
// app/core.js (переэкспорт) и app/state-render.js (fallback при loadState).
// typedef'ы остаются глобальными, пока этап P2 не перенесёт их в .ts.

/** @type {ShortcutItem[]} */
export const DEFAULT_SHORTCUTS = [];

/** @type {string[]} */
export const MIST_WIDGET_KEYS = ['clock', 'search'];
