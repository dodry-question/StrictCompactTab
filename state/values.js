// @ts-check
/** @import { ShortcutItem } from '../types/app-state.d.ts' */
// Рантайм-значения, которые до фазы 3 жили в state/defaults.js как window.X.
// Сам defaults.js удалён в P2.2: типы переехали в модуль types/app-state.d.ts,
// значений там не было; потребители — через import:
// app/core.js (переэкспорт) и app/state-render.js (fallback при loadState).

/** @type {ShortcutItem[]} */
export const DEFAULT_SHORTCUTS = [];

/** @type {string[]} */
export const MIST_WIDGET_KEYS = ['clock', 'search'];
