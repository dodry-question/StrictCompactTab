// Ambient-декларации остаточных глобалов расширения (этап «в» закрыт).
//
// Этап «в» (ESM) убрал публикации модулей в window: app/* и сервисы связаны
// import-ами (live bindings), запись в общие let — через сеттеры владельцев.
// Остаток:
//   * window.materialColorUtilities — вендорная min-библиотека
//     (assets/material-color-utilities.min.js), грузится динамически
//     в app/theme-adaptive.js;
//   * Navigator.brave / Navigator.userAgentData — нестандартные API.
//
// Публикаций НАШИХ модулей в window больше нет: последний мост
// (window.getWeatherDescription, TDZ-исключение weather ↔ clock-topbar) снят —
// clock-topbar теперь берёт описание погоды у WeatherService напрямую, а
// weather.js импортирует renderTopbar из state-render, а не из clock-topbar.
//
// Типы намеренно широкие (any) — уточнение по мере типизации (P2).
// Профиль данных состояния описан МОДУЛЬНЫМИ типами в types/app-state.d.ts
// (P2.2: раньше это были глобальные JSDoc-typedef'ы в state/defaults.js —
// файл удалён, глобальных typedef'ов больше нет, потребители импортируют
// типы через JSDoc `@import`).
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
}

export {};
