// @ts-check
/** @import { MistWidgets } from '../types/app-state.d.ts' */

/**
 * Нормализует одну пару координат сдвига (или объект-бокс целиком: берутся x/y).
 * @param {any} raw
 * @returns {{x: number, y: number}}
 */
export function normalizeMistHeadOffset(raw) {
  const x = raw && Number.isFinite(Number(raw.x)) ? Number(raw.x) : 0;
  const y = raw && Number.isFinite(Number(raw.y)) ? Number(raw.y) : 0;
  return { x, y };
}

/**
 * Приводит STATE.mistHeadOffset (любой прошлый или чужой формат: легаси-пара
 * x/y, отсутствующее поле, мусор) к форме { clock: MistWidgetBox, search: ... }.
 * @param {any} raw
 * @returns {MistWidgets}
 */
export function normalizeMistWidgets(raw) {
  const isLegacy = !!(raw && typeof raw === 'object' && !raw.clock && !raw.search);
  const legacy = isLegacy ? normalizeMistHeadOffset(raw) : { x: 0, y: 0 };
  /** @type {MistWidgets} */
  const out = /** @type {any} */ ({});

  ['clock', 'search'].forEach((key) => {
    const src = raw && raw[key] && typeof raw[key] === 'object' ? raw[key] : null;
    const vec = normalizeMistHeadOffset(src || legacy);
    out[key] = {
      x: vec.x,
      y: vec.y,
      w: src && Number.isFinite(Number(src.w)) && Number(src.w) > 0 ? Number(src.w) : 0,
      h: src && Number.isFinite(Number(src.h)) && Number(src.h) > 0 ? Number(src.h) : 0,
      s: src && Number.isFinite(Number(src.s)) && Number(src.s) > 0 ? Number(src.s) : 1
    };
  });

  return out;
}

export function formatDateLine(state, now = new Date()) {
  const dayNum = now.getDate();

  if (state.language === 'ru') {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${days[now.getDay()]}, ${dayNum} ${months[now.getMonth()]}`;
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${dayNum}`;
}

export function getTopbarCityName(state) {
  let cityName = (state.weatherCoords && state.weatherCoords.resolvedName) || state.weatherCity || '';
  if (cityName.includes('(')) cityName = cityName.split('(')[0].trim();
  return cityName;
}
