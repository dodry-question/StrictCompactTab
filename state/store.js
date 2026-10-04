// @ts-check
// Единственный владелец состояния приложения — этап «б» (store вместо
// window.STATE).
//
// Было: начальные значения лежали в state/defaults.js как window.STATE,
// и каждый файл app/* брал ссылку через const STATE = window.STATE (core.js).
// Стало:
//   * шаблон начальных значений — локальная константа здесь, не глобал;
//   * живое состояние — window.store.state (core.js берёт оттуда ссылку,
//     прямые записи STATE.x в app/* работают как раньше — это тот же
//     объект, ничего в 500 местах вызовов не менялось);
//   * список ключей хранилища — РОВНО ОДИН (PERSIST_KEYS). Раньше он был
//     продублирован: массив в loadState (storage.get) и объект в saveState
//     (storage.set); расхождение списков молча теряло бы поле при сохранении.
//
// store.set/store.subscribe — явная точка записи для нового кода и базис
// для этапа «в» (ESM: import { store } вместо глобалов). Сохранение
// остаётся ЯВНЫМ (saveState вызывается после изменений, как и раньше) —
// авто-сохранение на каждую запись дало бы лишние записи в storage при
// перетаскивании и вводе.

// Этап «в» (ESM): файл — модуль, экспортирует store; window.store остаётся
// временным «мостом» для классических app/* до их перехода на import.

const store = (function () {
  /** @type {AppState} Шаблон начальных значений — не мутировать. */
  const DEFAULT_STATE = {
    shortcuts: [],
    columns: 10,
    size: "small",
    customBackground: null,
    customFavicon: null,
    language: "en",
    searchEngine: "duckduckgo",
    showDate: true,
    format12h: false,
    showSeconds: false,
    theme: "dark",
    adaptiveThemeData: null,
    layoutPositions: null,
    layoutGridSnap: false,
    layoutGridSize: 20,
    showClock: true,
    showWeather: false,
    weatherCity: "",
    weatherCoords: { lat: null, lon: null, resolvedName: "" },
    weatherCache: { temp: "", code: null, desc: "", timestamp: 0 },
    checkUpdates: false,
    layoutZenMode: false,
    layoutMistMode: false,
    mistPreset: "center",
    mistPerRow: 6,
    scheduleEnabled: false,
    scheduleGroup: null,
    mistHeadOffset: {
      clock: { x: 0, y: 0, w: 0, h: 0, s: 1 },
      search: { x: 0, y: 0, w: 0, h: 0, s: 1 }
    }
  };

  // Ключи, которые уходят в storage.set и читаются при загрузке.
  // Легаси-ключи миграций (categories/folders/groups) сюда НЕ входят —
  // их передаёт store.load(), они пишутся только чтением.
  const PERSIST_KEYS = Object.freeze([
    'shortcuts', 'columns', 'size', 'customBackground', 'customFavicon',
    'language', 'searchEngine', 'showDate', 'format12h', 'showSeconds',
    'theme', 'adaptiveThemeData', 'layoutPositions', 'layoutGridSnap',
    'layoutGridSize', 'layoutIosMode', 'layoutStealthMode', 'showClock',
    'showWeather', 'weatherCity', 'weatherCoords', 'weatherCache',
    'customSearchEngines', 'checkUpdates', 'layoutZenMode', 'layoutMistMode',
    'mistPreset', 'mistPerRow', 'scheduleEnabled', 'scheduleGroup',
    'mistHeadOffset'
  ]);

  /** @type {Set<(state: any, key: string) => void>} */
  const listeners = new Set();

  // Глубокий клон: вложенные виджеты (mistHeadOffset, weatherCoords,
  // weatherCache) и массив shortcuts не должны делиться с шаблоном —
  // иначе запись в них протекала бы в DEFAULT_STATE.
  /** @param {any} value @returns {any} */
  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') {
      /** @type {Record<string, any>} */
      const out = {};
      Object.keys(value).forEach((key) => { out[key] = clone(value[key]); });
      return out;
    }
    return value;
  }

  /** @type {AppState} Живое состояние — его видит app/* как STATE. */
  const state = clone(DEFAULT_STATE);
  // any-представление для индексации по строковому ключу (API get/set)
  const bag = /** @type {any} */ (state);

  /** @param {string} key */
  function emit(key) {
    listeners.forEach((listener) => {
      try {
        listener(state, key);
      } catch (error) {
        // Подписчик не должен ронять запись вызывающего кода
        console.error('store: подписчик пережил падение на ' + key, error);
      }
    });
  }

  return {
    /** Живое состояние приложения (тот же объект, что app/* зовёт STATE). */
    state,
    /** Ключи, которые сохраняются в хранилище (замороженный список). */
    persistKeys: PERSIST_KEYS,

    /** @param {string} key */
    get(key) {
      return bag[key];
    },

    /** @param {string} key @param {any} value */
    set(key, value) {
      bag[key] = value;
      emit(key);
    },

    /** @param {Record<string, any>} partial */
    setMany(partial) {
      Object.keys(partial).forEach((key) => {
        bag[key] = partial[key];
        emit(key);
      });
    },

    /**
     * Явная подписка на изменения. Возвращает функцию отписки.
     * Прямые записи STATE.x подписчикам не видны — им нужен store.set.
     * @param {(state: any, key: string) => void} listener
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    /**
     * Чтение из storage: свои ключи + переданные легаси-ключи миграций.
     * @param {string[]} extraKeys
     * @param {(result: any) => void} callback
     */
    load(extraKeys, callback) {
      window.storage.get(PERSIST_KEYS.concat(extraKeys || []), callback);
    },

    /**
     * Запись в storage по единому списку ключей. overrides — точечные
     * замены перед записью (например, нормализованный mistHeadOffset).
     * @param {any} [overrides]
     */
    save(overrides) {
      /** @type {Record<string, any>} */
      const payload = {};
      PERSIST_KEYS.forEach((key) => { payload[key] = bag[key]; });
      if (overrides) Object.assign(payload, overrides);
      window.storage.set(payload);
    }
  };
})();

// Мост для классических app/* (core.js: const store = window.store) — уберём
// в фазе 3, когда потребители перейдут на import { store }.
window.store = store;
export { store };
