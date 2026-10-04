import { normalizeMistWidgets } from '../src/utils.js';

// --- ВАЛИДАЦИЯ ИМПОРТИРУЕМОГО БЭКАПА ----------------------------------------
// Импорт — самая старая и самая рискованная операция: файл приходит от
// пользователя и может быть из ЛЮБОЙ прошлой версии (плоский массив ярлыков,
// ключи folders/groups, timeFormat, тема nord) или быть вообще чужим.
//
// Контракт sanitize():
//   * не бросает исключений: поле либо принимается в известном типе и
//     диапазоне, либо заменяется значением по умолчанию — UI не ломается;
//   * работает по белому списку ключей: чужой JSON не может протащить в
//     хранилище произвольные поля (включая __proto__);
//   * ok:false возвращает только для файлов, не похожих на бэкап вообще
//     (корень — не объект и не массив): импорт в этом случае прерывается
//     ДО стирания хранилища, старые настройки остаются нетронутыми;
//   * ярлыки со скриптовыми схемами (javascript:, vbscript:, data:) —
//     встретиться они могут только в чужом файле — отбрасываются целиком.
//
// Порядок подключения в index.html: после app/shortcuts-migration.js
// (extractCategoryMeta/migrateToNested/generateId) и app/core.js
// (normalizeMistWidgets из AppUtils), до app/backup-updates.js.
// Всё внутри IIFE — в общую область видимости попадает только
// window.BackupValidate.
(() => {
  // Реальный бэкап — сотни КБ (обои и иконки в base64). Потолок в 20 МБ
  // отсекает файлы-гиганты ДО чтения: JSON.parse на сотнях мегабайтов
  // заморозил бы вкладку на секунды.
  const MAX_FILE_BYTES = 20 * 1024 * 1024;

  const NAME_MAX = 300;
  const URL_MAX = 4000;
  const BACKGROUND_MAX = 10 * 1024 * 1024;
  const ICON_MAX = 4 * 1024 * 1024;
  const LOGO_MAX = 512 * 1024;
  const ENGINES_MAX = 50;

  const BUILTIN_ENGINES = ['duckduckgo', 'yandex', 'google', 'brave', 'bing', 'qwant', 'startpage'];
  // 'nord' из старых версий и любые чужие значения → 'dark'
  const THEMES = ['dark', 'light', 'adaptive'];
  const SIZES = ['small', 'medium', 'large'];
  const MIST_PRESETS = ['center', 'split', 'zen'];
  const LANGUAGES = ['en', 'ru'];

  const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

  // JSON.parse создаёт __proto__ как ОБЫЧНЫЙ собственный ключ; присваивание
  // такого ключа в объект-литерал сменило бы прототип (prototype pollution)
  const isSafeKey = (k) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype';

  // Строка с потолком длины; числа и булевы значения — как строки,
  // всё прочее (объекты, массивы, null) — значение по умолчанию
  const asString = (v, def, max) => {
    if (typeof v === 'string') return v.length > max ? v.slice(0, max) : v;
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    if (typeof v === 'boolean') return String(v);
    return def;
  };

  const asBool = (v, def) => {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 1) return true;
    if (v === 'false' || v === 0) return false;
    return def;
  };

  const asInt = (v, def, min, max) => {
    const n = typeof v === 'number'
      ? v
      : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const asEnum = (v, allowed, def) => (allowed.indexOf(v) !== -1 ? v : def);

  const asNumOrNull = (v) => {
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // Иконка уходит в <img src>: data:image/... здесь безопасен (скрипты в SVG
  // через <img> не выполняются), обычные ссылки — тоже. Остальное — не иконка.
  const asIconUrl = (v, max) => {
    if (typeof v !== 'string') return null;
    const s = v.slice(0, max);
    if (/^data:image\//i.test(s)) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return null;
  };

  // Признак скриптовой схемы в ссылке ярлыка. Браузер игнорирует пробелы,
  // табы и переводы строк внутри схемы ("java\nscript:" — всё ещё
  // javascript:), поэтому схема проверяется по строке без пробельных символов.
  const isBlockedLink = (v) => {
    if (typeof v !== 'string') return false;
    const s = v.trim();
    if (!s) return false;
    return /^(javascript|vbscript|data):/i.test(s.replace(/\s+/g, ''));
  };

  // Единственные поля ярлыка, которые читает текущая версия: name, url,
  // customIcon (см. services/shortcut-icons.js и services/shortcut-renderer.js).
  // Всё остальное — чужой мусор, в хранилище не попадает.
  const sanitizeShortcut = (raw) => {
    if (!isPlainObject(raw)) return null;
    if (isBlockedLink(raw.url)) return null;

    const name = asString(raw.name, '', NAME_MAX);
    const url = typeof raw.url === 'string' ? raw.url.trim().slice(0, URL_MAX) : '';
    // Пустышка без имени и без ссылки не нужна: рисовала бы мёртвую плитку
    if (!name && !url) return null;

    return {
      id: asString(raw.id, '', 100),
      name,
      url,
      customIcon: asIconUrl(raw.customIcon, ICON_MAX)
    };
  };

  const sanitizeFolder = (raw) => {
    const id = asString(raw.id, '', 100) || generateId('f_');
    const name = asString(raw.name, '', NAME_MAX) || id;
    const children = (Array.isArray(raw.children) ? raw.children : [])
      .map(sanitizeShortcut)
      .filter(Boolean);
    return { id, name, isFolder: true, children };
  };

  // Карта позиций виджетов: { clock: { left, top, widthPx, ... } }.
  // Читается в applyLayoutPositions() (app/layout-widgets.js) — значения
  // обязаны быть числами, иначе в стили попадает "NaN%".
  const sanitizeLayoutPositions = (v) => {
    if (!isPlainObject(v)) return null;
    const out = {};
    let count = 0;
    Object.keys(v).forEach((key) => {
      if (!isSafeKey(key) || count >= 20) return;
      const pos = v[key];
      if (!isPlainObject(pos)) return;
      const entry = {};
      ['left', 'top', 'scale'].forEach((prop) => {
        const n = asNumOrNull(pos[prop]);
        if (n !== null) entry[prop] = n;
      });
      ['widthPx', 'heightPx', 'widthCells', 'heightCells'].forEach((prop) => {
        const n = asNumOrNull(pos[prop]);
        if (n !== null && n > 0) entry[prop] = n;
      });
      if (Object.keys(entry).length === 0) return;
      out[key] = entry;
      count += 1;
    });
    return count > 0 ? out : null;
  };

  const sanitizeWeatherCoords = (v) => {
    const src = isPlainObject(v) ? v : null;
    return {
      lat: src ? asNumOrNull(src.lat) : null,
      lon: src ? asNumOrNull(src.lon) : null,
      resolvedName: src ? asString(src.resolvedName, '', 200) : ''
    };
  };

  const sanitizeWeatherCache = (v) => {
    const src = isPlainObject(v) ? v : null;
    return {
      temp: src ? asString(src.temp, '', 30) : '',
      code: src ? asNumOrNull(src.code) : null,
      desc: src ? asString(src.desc, '', 100) : '',
      timestamp: src ? asInt(src.timestamp, 0, 0, Number.MAX_SAFE_INTEGER) : 0
    };
  };

  const sanitizeCustomEngines = (v) => {
    if (!Array.isArray(v)) return [];
    return v
      .filter(isPlainObject)
      .slice(0, ENGINES_MAX)
      .map((eng) => ({
        id: asString(eng.id, '', 100),
        name: asString(eng.name, '', NAME_MAX),
        // Поле в старых версиях могло называться url
        queryUrl: asString(eng.queryUrl, '', 2000) || asString(eng.url, '', 2000),
        logo: asIconUrl(eng.logo, LOGO_MAX)
      }));
  };

  const sanitizeSearchEngine = (v, engines) => {
    const id = asString(v, 'duckduckgo', 100);
    if (BUILTIN_ENGINES.indexOf(id) !== -1) return id;
    if (engines.some((eng) => eng.id === id)) return id;
    // Неизвестный движок: в UI есть только известные значения, иначе
    // select показывал бы пустоту, а поиск — неизвестный URL
    return 'duckduckgo';
  };

  // Обои кладутся в document.body.style.backgroundImage как url(...):
  // принимаем data:image/... (сжатый файл) и http(s)-ссылку, остальное —
  // null, чтобы в CSS не попало постороннее значение.
  const sanitizeBackground = (v) => {
    if (typeof v !== 'string') return null;
    const s = v.slice(0, BACKGROUND_MAX);
    if (/^data:image\//i.test(s)) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return null;
  };

  // Формат СЫРОЙ (строка) — так пишет storage/storage.js и так читает
  // favicon-loader.js. Объектные значения в этой позиции никогда не
  // работали (applyFavicon подставлял бы "[object Object]").
  const sanitizeFavicon = (v) => asIconUrl(v, ICON_MAX);

  const sanitizeScheduleGroup = (v) => {
    if (typeof v === 'string') return v.slice(0, 300);
    // На случай бэкапа, где группа лежала объектом с названием
    if (isPlainObject(v)) return asString(v.name, '', 300) || null;
    return null;
  };

  /**
   * Приводит распарсенный бэкап к состоянию, которое loadState/saveState
   * считают корректным. Ошибок не бросает.
   *
   * @param {any} raw - результат JSON.parse файла бэкапа
   * @returns {{ok: boolean, value?: any, reason?: string}}
   */
  function sanitize(raw) {
    if (!isPlainObject(raw) && !Array.isArray(raw)) {
      return {
        ok: false,
        reason: 'backup root must be an object or an array, got ' + (raw === null ? 'null' : typeof raw)
      };
    }

    // Старейший формат — просто массив ярлыков: настроек в нём нет,
    // поэтому settings-ключи читаются только из объектных бэкапов
    const data = isPlainObject(raw) ? raw : {};
    const rawShortcuts = Array.isArray(raw)
      ? raw
      : (Array.isArray(raw.shortcuts) ? raw.shortcuts : []);

    // Миграция любых прошлых форматов (плоские ярлыки с folder/category/group,
    // ключи folders/categories/groups, готовая вложенная структура)
    const migrated = migrateToNested(rawShortcuts.filter(isPlainObject), extractCategoryMeta(raw));
    const shortcuts = [];
    migrated.forEach((item) => {
      if (!isPlainObject(item)) return;
      if (item.isFolder) {
        shortcuts.push(sanitizeFolder(item));
      } else {
        const shortcut = sanitizeShortcut(item);
        if (shortcut) shortcuts.push(shortcut);
      }
    });

    const customSearchEngines = sanitizeCustomEngines(data.customSearchEngines);

    const value = {
      shortcuts,
      columns: asInt(data.columns, 10, 1, 30),
      size: asEnum(data.size, SIZES, 'small'),
      // Отсутствие поля или легаси-алиас timeFormat из старых версий
      format12h: asBool(data.format12h, data.timeFormat === '12h'),
      showSeconds: asBool(data.showSeconds, false),
      showDate: asBool(data.showDate, true),
      customBackground: sanitizeBackground(data.customBackground),
      customFavicon: sanitizeFavicon(data.customFavicon),
      language: asEnum(data.language, LANGUAGES, 'en'),
      searchEngine: sanitizeSearchEngine(data.searchEngine, customSearchEngines),
      theme: asEnum(data.theme, THEMES, 'dark'),
      adaptiveThemeData: isPlainObject(data.adaptiveThemeData) ? data.adaptiveThemeData : null,
      layoutPositions: sanitizeLayoutPositions(data.layoutPositions),
      layoutGridSnap: asBool(data.layoutGridSnap, false),
      layoutGridSize: asInt(data.layoutGridSize, 20, 5, 200),
      showClock: asBool(data.showClock, true),
      showWeather: asBool(data.showWeather, false),
      weatherCity: asString(data.weatherCity, '', 100),
      weatherCoords: sanitizeWeatherCoords(data.weatherCoords),
      weatherCache: sanitizeWeatherCache(data.weatherCache),
      customSearchEngines,
      checkUpdates: asBool(data.checkUpdates, false),
      layoutZenMode: asBool(data.layoutZenMode, false),
      layoutIosMode: asBool(data.layoutIosMode, false),
      layoutStealthMode: asBool(data.layoutStealthMode, false),
      layoutMistMode: asBool(data.layoutMistMode, false),
      mistPreset: asEnum(data.mistPreset, MIST_PRESETS, 'center'),
      mistPerRow: asInt(data.mistPerRow, 6, 1, 16),
      mistHeadOffset: normalizeMistWidgets(data.mistHeadOffset),
      // Плагин «Расписание»: галка и выбранная группа — настройки, поэтому
      // они принадлежат бэкапу. Сам файл расписания (scheduleData) — нет:
      // его заново загружают перетаскиванием .xlsx.
      scheduleEnabled: asBool(data.scheduleEnabled, false),
      scheduleGroup: sanitizeScheduleGroup(data.scheduleGroup)
    };

    // Zen и Mist взаимоисключающи: иначе комбинация из чужого бэкапа
    // расходится с тем, что записывает saveState
    if (value.layoutZenMode) value.layoutMistMode = false;

    return { ok: true, value };
  }

  window.BackupValidate = { MAX_FILE_BYTES, sanitize };
})();

// Экспорт для будущих import (шаг «в»); мост window.BackupValidate задаётся внутри IIFE.
const BackupValidate = window.BackupValidate;
export { BackupValidate };
