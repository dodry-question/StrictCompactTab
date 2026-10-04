// Ambient-декларации остаточных глобалов расширения (этап «в» закрыт).
//
// Этап «в» (ESM) убрал публикации модулей в window: app/* и сервисы связаны
// import-ами (live bindings), запись в общие let — через сеттеры владельцев.
// Остаток после кластеров 1–29 и фазы 4:
//   * getWeatherDescription — мост app/weather.js, задокументированное
//     исключение: clock-topbar читает его в рантайме, weather читает
//     константы clock-topbar на top-level — обратный импорт замкнул бы
//     цикл; снимается при следующей пересборке clock-topbar;
//   * window.materialColorUtilities — вендорная min-библиотека
//     (assets/material-color-utilities.min.js), грузится динамически
//     в app/theme-adaptive.js;
//   * Navigator.brave / Navigator.userAgentData — нестандартные API.
//
// Типы намеренно широкие (any) — уточнение по мере типизации (P2).
// Профиль данных состояния описан JSDoc @typedef'ами в state/defaults.js
// (файл остаётся без <script> в index.html — только контейнер глобальных
// typedef'ов для checkJs; рантайм-значения — в state/values.js).
declare global {
  interface Window {
    // Внешняя библиотека (загружается динамически в theme-adaptive.js)
    materialColorUtilities: any;
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

  // app/weather.js — единственный оставшийся мост (TDZ, см. шапку файла)
  var getWeatherDescription: any;
}

export {};
