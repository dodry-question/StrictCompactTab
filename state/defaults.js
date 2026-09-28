window.DEFAULT_SHORTCUTS = [];

window.STATE = {
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

window.MIST_WIDGET_KEYS = ['clock', 'search'];
