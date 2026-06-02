document.addEventListener('DOMContentLoaded', () => {

  // --- СЛОВАРЬ ПЕРЕВОДОВ (ЛОКАЛИЗАЦИЯ) ---
  const TRANSLATIONS = {
    en: {
      searchPlaceholder: "Search the web...",
      searchBtnTitle: "Search",
      settingsTitle: "Screen Settings",
      addShortcutTitle: "Add New Shortcut",
      namePlaceholder: "Name",
      urlPlaceholder: "URL Link",
      addBtn: "Add",
      uploadIconTitle: "Upload custom icon (optional)",
      gridDisplayTitle: "Grid Display",
      shortcutSizeLabel: "Shortcut Size",
      sizeSmall: "Small (85x85px)",
      sizeMedium: "Medium (98x98px)",
      sizeLarge: "Large (110x110px)",
      columnsLabel: "Max in row",
      bgImageTitle: "Background Image",
      chooseFileBtn: "Choose File",
      resetBtn: "Reset",
      tabFaviconTitle: "Tab Favicon",
      chooseIconBtn: "Choose Icon",
      clockDateSettingsTitle: "Clock and Date Settings",
      showDateLabel: "Show date and day of the week",
      format12hLabel: "12-hour format (AM/PM)",
      showSecondsLabel: "Display seconds",
      backupTitle: "Backup Configuration",
      exportBtn: "Export",
      importBtn: "Import",
      manageShortcutsTitle: "Manage Shortcuts",
      listEmpty: "Shortcuts list is empty",
      btnEdit: "Edit",
      btnDelete: "Delete",
      btnSave: "Save",
      btnCancel: "Cancel",
      importSuccess: "Import successful!",
      importError: "Import error. Make sure the file is a correct JSON backup.",
      importReadError: "Error reading the backup file.",
      themeTitle: "Theme",
      themeLabel: "Color Theme",
      themeDark: "Dark",
      themeLight: "Light",
      themeAdaptive: "Adaptive",
      layoutTitle: "Layout",
      editLayoutBtn: "Edit Layout",
      resetLayoutBtn: "Reset Layout",
      gridSnapLabel: "Snap to Grid",
      showClockLabel: "Show Clock and Date",
      weatherSettingsTitle: "Weather Settings",
      showWeatherLabel: "Show Weather Widget",
      weatherCityLabel: "City Name",
      weatherCityPlaceholder: "Enter city (e.g. Moscow, Moscow Oblast, RU)",
      weatherNoCity: "No city set",
      weatherStatusSearching: "Searching...",
      weatherStatusFound: "Found",
      weatherStatusNotFound: "City not found",
      weatherStatusError: "Error loading weather",
      weatherLoading: "Loading...",
      
      // Локализация вкладок/папок
      shortcutCategoryLabel: "Folder",
      addCategoryTitle: "Add Folder",
      defaultCategoryName: "General",
      addCategoryPrompt: "Enter new folder name:",
      renameCategoryPrompt: "Rename folder to:",
      deleteCategoryConfirm: "Are you sure you want to delete this folder?",
      deleteShortcutsConfirm: "Would you also like to delete all shortcuts inside this folder? (Click Cancel to keep them and move to General)",
      searchEngineLabel: "Search Engine",
      iosModeLabel: "iOS Widget Mode (Square tiles)",
      stealthModeLabel: "Stealth Mode (Ultra-minimalism)",
      
      // Свои поисковики
      manageCustomEnginesBtn: "Custom Engines",
      addCustomEngineTitle: "Add Custom Search Engine",
      customEngineNamePlaceholder: "Engine Name",
      customEngineQueryPlaceholder: "Query URL (e.g. https://domain.com/search?q=)",
      chooseLogoBtn: "Choose Logo",
      logoLoadedStatus: "Logo selected",
      weatherOpenMeteoConfirm: "Would you like to view the detailed weather forecast for the selected city?",
      weatherNoCityAlert: "Weather city is not set. Please configure a city in settings.",
      checkUpdatesLabel: "Check for updates (GitHub)",
      updateAvailable: "New version available: ",
      updateDownload: "Download",
      zenModeLabel: "Zen Mode (Only wallpaper & settings)"
    },
    ru: {
      searchPlaceholder: "Искать в интернете...",
      searchBtnTitle: "Искать",
      settingsTitle: "Настройки экрана",
      addShortcutTitle: "Добавить новый ярлык",
      namePlaceholder: "Название",
      urlPlaceholder: "Ссылка URL",
      addBtn: "Добавить",
      uploadIconTitle: "Загрузить иконку (опционально)",
      gridDisplayTitle: "Отображение сетки",
      shortcutSizeLabel: "Размер ярлыков",
      sizeSmall: "Маленький (85x85px)",
      sizeMedium: "Средний (98x98px)",
      sizeLarge: "Крупный (110x110px)",
      columnsLabel: "В ряду (макс.)",
      bgImageTitle: "Фоновое изображение",
      chooseFileBtn: "Выбрать файл",
      resetBtn: "Сбросить",
      tabFaviconTitle: "Иконка вкладки",
      chooseIconBtn: "Выбрать иконку",
      clockDateSettingsTitle: "Настройки часов и даты",
      showDateLabel: "Показывать дату и день недели",
      format12hLabel: "12-часовой формат (AM/PM)",
      showSecondsLabel: "Отображать секунды",
      backupTitle: "Резервное копирование",
      exportBtn: "Экспорт",
      importBtn: "Импорт",
      manageShortcutsTitle: "Управление ярлыками",
      listEmpty: "Список ярлыков пуст",
      btnEdit: "Редактировать",
      btnDelete: "Удалить",
      btnSave: "Сохранить",
      btnCancel: "Отмена",
      importSuccess: "Импорт успешно выполнен!",
      importError: "Ошибка при импорте. Убедитесь, что выбран правильный файл резервной копии JSON.",
      importReadError: "Ошибка при чтении файла бэкапа.",
      themeTitle: "Тема оформления",
      themeLabel: "Цветовая тема",
      themeDark: "Темная",
      themeLight: "Светлая",
      themeAdaptive: "Адаптивная",
      layoutTitle: "Расположение элементов",
      editLayoutBtn: "Редактировать макет",
      resetLayoutBtn: "Сбросить макет",
      gridSnapLabel: "Привязать к сетке",
      showClockLabel: "Показывать часы и дату",
      weatherSettingsTitle: "Настройки погоды",
      showWeatherLabel: "Показывать погоду",
      weatherCityLabel: "Город",
      weatherCityPlaceholder: "Введите город (например, Москва, Московская обл., RU)",
      weatherNoCity: "Город не задан",
      weatherStatusSearching: "Поиск...",
      weatherStatusFound: "Найдено",
      weatherStatusNotFound: "Город не найден",
      weatherStatusError: "Ошибка загрузки погоды",
      weatherLoading: "Загрузка...",
      
      // Локализация вкладок/папок
      shortcutCategoryLabel: "Папка",
      addCategoryTitle: "Добавить папку",
      defaultCategoryName: "Общая",
      addCategoryPrompt: "Введите название новой папки:",
      renameCategoryPrompt: "Переименовать папку в:",
      deleteCategoryConfirm: "Вы уверены, что хотите удалить эту папку?",
      deleteShortcutsConfirm: "Хотите также удалить все ярлыки внутри этой папки? (Нажмите Отмена, чтобы сохранить их и перенести в Общую)",
      searchEngineLabel: "Поисковая система",
      iosModeLabel: "Режим виджетов iOS (Квадратные плитки)",
      stealthModeLabel: "Стелс-режим (Ультра-минимализм)",
      
      // Свои поисковики
      manageCustomEnginesBtn: "Свои поисковики",
      addCustomEngineTitle: "Добавить свой поисковик",
      customEngineNamePlaceholder: "Название поисковика",
      customEngineQueryPlaceholder: "Ссылка для запроса (напр. https://domain.com/search?q=)",
      chooseLogoBtn: "Выбрать лого",
      logoLoadedStatus: "Логотип выбран",
      weatherOpenMeteoConfirm: "Хотите посмотреть подробный прогноз погоды для выбранного города?",
      weatherNoCityAlert: "Город для погоды не задан. Пожалуйста, настройте его в параметрах.",
      checkUpdatesLabel: "Проверять обновления (GitHub)",
      updateAvailable: "Доступна новая версия: ",
      updateDownload: "Скачать",
      zenModeLabel: "Дзен-режим (Только обои и настройки)"
    }
  };

  // --- РАСШИРЕННАЯ СИСТЕМА ХРАНЕНИЯ (с поддержкой бэкапов) ---
  const storage = {
    get: (keys, callback) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(keys, callback);
      } else {
        const result = {};
        const isArray = Array.isArray(keys);
        const queryKeys = isArray ? keys : [keys];
        
        queryKeys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              result[key] = JSON.parse(value);
            } catch (e) {
              result[key] = value;
            }
          } else {
            result[key] = null;
          }
        });
        callback(isArray ? result : result[keys]);
      }
    },
    set: (data, callback) => {
      if (data && data.hasOwnProperty('customFavicon')) {
        if (data.customFavicon === null) {
          localStorage.removeItem('customFavicon');
        } else {
          const favVal = data.customFavicon;
          localStorage.setItem('customFavicon', (typeof favVal === 'object' && favVal !== null) ? JSON.stringify(favVal) : favVal);
        }
      }
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(data, callback);
      } else {
        Object.keys(data).forEach(key => {
          const val = data[key];
          if (val === null || val === undefined) {
            localStorage.removeItem(key);
          } else if (typeof val === 'object' && val !== null) {
            localStorage.setItem(key, JSON.stringify(val));
          } else {
            localStorage.setItem(key, val);
          }
        });
        if (callback) callback();
      }
    },
    getAll: (callback) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(null, callback);
      } else {
        const result = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          try {
            result[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            result[key] = localStorage.getItem(key);
          }
        }
        callback(result);
      }
    },
    clearAndSet: (data, callback) => {
      if (data && data.hasOwnProperty('customFavicon')) {
        if (data.customFavicon === null) {
          localStorage.removeItem('customFavicon');
        } else {
          const favVal = data.customFavicon;
          localStorage.setItem('customFavicon', (typeof favVal === 'object' && favVal !== null) ? JSON.stringify(favVal) : favVal);
        }
      } else {
        localStorage.removeItem('customFavicon');
      }
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.clear(() => {
          chrome.storage.local.set(data, callback);
        });
      } else {
        localStorage.clear();
        Object.keys(data).forEach(key => {
          const val = data[key];
          if (val === null || val === undefined) {
            localStorage.removeItem(key);
          } else if (typeof val === 'object' && val !== null) {
            localStorage.setItem(key, JSON.stringify(val));
          } else {
            localStorage.setItem(key, val);
          }
        });
        if (callback) callback();
      }
    }
  };

  // --- ЧИСТЫЙ СТАРТОВЫЙ ШАБЛОН ---
  const DEFAULT_SHORTCUTS = [];

  const STATE = {
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
    layoutZenMode: false
  };

  let editingIndex = -1;
  let dragSrcIndex = null;
  let dragCategorySrcId = null;

  // --- ИНИЦИАЛИЗАЦИЯ ЭЛЕМЕНТОВ ИМПОРТА / ЭКСПОРТА ---
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const importFileInput = document.getElementById('import-file-input');

  // --- ЧАСЫ И ДАТА ---
  const clockElement = document.getElementById('clock');
  const dateElement = document.getElementById('date-display');

  // --- ПОГОДА ---
  const weatherWidget = document.getElementById('weather-widget');
  const weatherTemp = document.getElementById('weather-temp');
  const weatherIcon = document.getElementById('weather-icon');
  const weatherDetails = document.getElementById('weather-details');
  const showWeatherCb = document.getElementById('show-weather-checkbox');
  const weatherCityInput = document.getElementById('weather-city-input');
  const weatherInputStatus = document.getElementById('weather-input-status');
  const weatherSubsettings = document.getElementById('weather-subsettings');

  function updateClockAndDate() {
    const now = new Date();
    
    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    let ampm = '';

    if (STATE.format12h) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
    }
    hours = String(hours).padStart(2, '0');

    let timeString = `${hours}:${minutes}`;
    if (STATE.showSeconds) {
      timeString += `:${seconds}`;
    }

    if (clockElement) {
      if (ampm) {
        // Оборачиваем AM/PM в span с уменьшенным шрифтом для красивого вида и исключения наложений
        clockElement.textContent = timeString;
        const ampmSpan = document.createElement('span');
        ampmSpan.className = 'clock-ampm';
        ampmSpan.textContent = ampm.trim();
        clockElement.appendChild(ampmSpan);
      } else {
        clockElement.textContent = timeString;
      }
    }

    if (dateElement) {
      if (STATE.showDate) {
        dateElement.style.display = 'block';
        let dayName = '';
        let monthName = '';
        let dateString = '';
        
        if (STATE.language === 'ru') {
          const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
          const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
          dayName = days[now.getDay()];
          const dayNum = now.getDate();
          monthName = months[now.getMonth()];
          dateString = `${dayName}, ${dayNum} ${monthName}`;
        } else {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          dayName = days[now.getDay()];
          const dayNum = now.getDate();
          monthName = months[now.getMonth()];
          dateString = `${dayName}, ${monthName} ${dayNum}`;
        }
        
        dateElement.textContent = dateString;
      } else {
        dateElement.style.display = 'none';
      }
    }
  }
  setInterval(updateClockAndDate, 1000);
  updateClockAndDate();

  // --- ПОИСК С ДИНАМИЧЕСКИМ ПЕРЕНАПРАВЛЕНИЕМ ---
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        const engines = {
          google: "https://www.google.com/search?q=",
          yandex: "https://yandex.ru/search/?text=",
          brave: "https://search.brave.com/search?q=",
          duckduckgo: "https://duckduckgo.com/?q=",
          qwant: "https://www.qwant.com/?q=",
          bing: "https://www.bing.com/search?q=",
          startpage: "https://www.startpage.com/do/search?q="
        };
        let baseUrl = engines[STATE.searchEngine];
        if (!baseUrl && STATE.searchEngine && STATE.searchEngine.startsWith('custom_')) {
          const customEng = STATE.customSearchEngines ? STATE.customSearchEngines.find(eng => eng.id === STATE.searchEngine) : null;
          if (customEng) {
            baseUrl = customEng.queryUrl;
          }
        }
        if (!baseUrl) {
          baseUrl = engines.duckduckgo;
        }
        window.location.href = baseUrl + encodeURIComponent(query);
      }
    });
  }

  // --- НАЖАТИЕ НА ВИДЖЕТ ПОГОДЫ ---
  if (weatherWidget) {
    weatherWidget.addEventListener('click', (e) => {
      if (document.body.classList.contains('layout-edit-mode')) return;
      const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
      
      if (!STATE.weatherCity) {
        alert(dict.weatherNoCityAlert);
        return;
      }
      
      if (confirm(dict.weatherOpenMeteoConfirm)) {
        let url;
        const cityName = STATE.weatherCoords.resolvedName || STATE.weatherCity;
        const lat = STATE.weatherCoords.lat;
        const lon = STATE.weatherCoords.lon;
        const lang = STATE.language === 'ru' ? 'ru' : 'en';
        
        // Используем wttr.in (открытый, некоммерческий и приватный сервис, не отслеживающий данные)
        if (lat && lon) {
          url = `https://wttr.in/${lat},${lon}?lang=${lang}`;
        } else {
          url = `https://wttr.in/${encodeURIComponent(cityName)}?lang=${lang}`;
        }
        window.open(url, '_blank');
      }
    });
  }

  // --- УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ И МОДАЛЬНЫМ ОКНОМ ---
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('settings-open-btn');
  const closeBtn = document.getElementById('settings-close-btn');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.classList.add('active');
      editingIndex = -1;
      renderModalShortcutsList();
      if (STATE.showWeather && STATE.weatherCoords && STATE.weatherCoords.resolvedName) {
        updateStatusText("success", STATE.weatherCoords.resolvedName);
      } else {
        updateStatusText("");
      }
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  // Настройки сетки макета
  const sizeSelect = document.getElementById('shortcut-size-select');
  const columnsSelect = document.getElementById('shortcut-columns-select');
  const languageSelect = document.getElementById('language-select');
  const searchEngineSelect = document.getElementById('search-engine-select');
  const themeSelect = document.getElementById('theme-select');

  if (sizeSelect) {
    sizeSelect.addEventListener('change', (e) => {
      STATE.size = e.target.value;
      saveState();
      renderShortcuts();
    });
  }

  if (columnsSelect) {
    columnsSelect.addEventListener('change', (e) => {
      STATE.columns = parseInt(e.target.value, 10);
      saveState();
      renderShortcuts();
    });
  }

  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      STATE.language = e.target.value;
      saveState();
      applyLanguage(STATE.language);
      updateClockAndDate();
      renderModalShortcutsList();
      
      if (STATE.showWeather) {
        updateWeatherWidget();
        if (STATE.weatherCity) {
          handleCityInputChange();
        }
      }
    });
  }

  if (searchEngineSelect) {
    searchEngineSelect.addEventListener('change', (e) => {
      STATE.searchEngine = e.target.value;
      saveState();
      updateSearchEngineUI();
    });
  }

  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      STATE.theme = e.target.value;
      if (STATE.theme === 'adaptive' && STATE.customBackground && !STATE.adaptiveThemeData) {
        AdaptiveThemeManager.generateThemeFromWallpaper(STATE.customBackground)
          .then(themeData => {
            STATE.adaptiveThemeData = themeData;
            saveState();
            applyTheme();
          })
          .catch(err => {
            console.error("Error generating adaptive theme:", err);
            STATE.adaptiveThemeData = AdaptiveThemeManager.getFallbackTheme(true);
            saveState();
            applyTheme();
          });
      } else {
        saveState();
        applyTheme();
      }
    });
  }

  // Форма создания нового ярлыка
  const newIconInput = document.getElementById('new-shortcut-icon-file');
  const addForm = document.getElementById('add-shortcut-form');
  const newNameInput = document.getElementById('new-shortcut-name');
  const newUrlInput = document.getElementById('new-shortcut-url');

  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = newNameInput.value.trim();
      let url = newUrlInput.value.trim();

      if (name && url) {
        if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }

        const saveShortcut = (customIcon) => {
          STATE.shortcuts.push({
            id: "sc_" + Date.now() + Math.random().toString(36).substr(2, 5),
            name,
            url,
            customIcon
          });
          saveState();
          renderShortcuts();
          renderModalShortcutsList();

          addForm.reset();
          
          const iconLabel = document.querySelector('.input-icon-upload-label');
          if (iconLabel) {
            iconLabel.style.color = '';
            iconLabel.title = TRANSLATIONS[STATE.language].uploadIconTitle;
          }
        };

        const file = newIconInput ? newIconInput.files[0] : null;
        if (file) {
          compressImage(file, 128, 128, 0.85, (result) => {
            saveShortcut(result);
          });
        } else {
          saveShortcut(null);
        }
      }
    });
  }

  if (newIconInput) {
    newIconInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const iconLabel = document.querySelector('.input-icon-upload-label');
      if (file && iconLabel) {
        iconLabel.title = file.name;
        iconLabel.style.color = '#4caf50';
      }
    });
  }

  // --- УПРАВЛЕНИЕ ОБОЯМИ ---
  const bgFileInput = document.getElementById('bg-file-input');
  const bgResetBtn = document.getElementById('bg-reset-btn');

  if (bgFileInput) {
    bgFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, 2560, 1440, 0.8, (result) => {
          STATE.customBackground = result;
          if (STATE.theme === 'adaptive') {
            AdaptiveThemeManager.generateThemeFromWallpaper(result)
              .then(themeData => {
                STATE.adaptiveThemeData = themeData;
                saveState();
                applyBackground();
                applyTheme();
              })
              .catch(err => {
                console.error("Error generating adaptive theme:", err);
                STATE.adaptiveThemeData = AdaptiveThemeManager.getFallbackTheme(true);
                saveState();
                applyBackground();
                applyTheme();
              });
          } else {
            saveState();
            applyBackground();
          }
        });
      }
    });
  }

  if (bgResetBtn) {
    bgResetBtn.addEventListener('click', () => {
      STATE.customBackground = null;
      STATE.adaptiveThemeData = null;
      saveState();
      applyBackground();
      applyTheme();
    });
  }

  function compressImage(file, maxWidth, maxHeight, quality, callback) {
    if (!file) {
      callback(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        callback(compressedBase64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function applyBackground() {
    if (STATE.customBackground) {
      document.body.style.backgroundImage = `url(${STATE.customBackground})`;
    } else {
      document.body.style.backgroundImage = 'none';
    }
  }

  function applyTheme() {
    document.body.classList.remove('theme-light', 'theme-nord', 'theme-adaptive', 'theme-dark');
    document.documentElement.removeAttribute('style');

    if (STATE.theme === 'light') {
      document.body.classList.add('theme-light');
    } else if (STATE.theme === 'adaptive') {
      document.body.classList.add('theme-adaptive');
      if (STATE.customBackground && STATE.adaptiveThemeData) {
        AdaptiveThemeManager.applyThemeToCss(STATE.adaptiveThemeData);
      } else {
        const defaultTheme = AdaptiveThemeManager.getFallbackTheme(true);
        AdaptiveThemeManager.applyThemeToCss(defaultTheme);
      }
    } else {
      document.body.classList.add('theme-dark');
    }
  }

  function applyClockVisibility() {
    const clockContainer = document.querySelector('.clock-container');
    const clockSubsettings = document.getElementById('clock-subsettings');
    
    if (STATE.showClock) {
      if (clockContainer) clockContainer.style.display = 'flex';
      if (clockSubsettings) clockSubsettings.style.display = 'flex';
    } else {
      if (clockContainer) clockContainer.style.display = 'none';
      if (clockSubsettings) clockSubsettings.style.display = 'none';
    }
  }

  // --- УПРАВЛЕНИЕ ДИНАМИЧЕСКОЙ ИКОНКОЙ ВКЛАДКИ ---
  const faviconFileInput = document.getElementById('favicon-file-input');
  const faviconResetBtn = document.getElementById('favicon-reset-btn');

  if (faviconFileInput) {
    faviconFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, 128, 128, 0.85, (result) => {
          STATE.customFavicon = result;
          saveState();
          applyFavicon();
        });
      }
    });
  }

  if (faviconResetBtn) {
    faviconResetBtn.addEventListener('click', () => {
      STATE.customFavicon = null;
      saveState();
      applyFavicon();
    });
  }

  function applyFavicon() {
    const faviconLink = document.querySelector('.page-favicon');
    if (faviconLink) {
      faviconLink.href = STATE.customFavicon || 'assets/favicon.png';
    }
  }

  // --- ДИНАМИЧЕСКАЯ ЛОКАЛИЗАЦИЯ ИНТЕРФЕЙСА ---
  function applyLanguage(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (dict[key]) {
        el.title = dict[key];
      }
    });
  }

  // --- УПРАВЛЕНИЕ ТУМБЛЕРАМИ ЧАСОВ И ДАТЫ ---
  const showClockCb = document.getElementById('show-clock-checkbox');
  const showDateCb = document.getElementById('show-date-checkbox');
  const timeFormatCb = document.getElementById('time-format-checkbox');
  const showSecondsCb = document.getElementById('show-seconds-checkbox');

  if (showClockCb) {
    showClockCb.addEventListener('change', (e) => {
      STATE.showClock = e.target.checked;
      saveState();
      applyClockVisibility();
    });
  }

  if (showDateCb) {
    showDateCb.addEventListener('change', (e) => {
      STATE.showDate = e.target.checked;
      saveState();
      updateClockAndDate();
    });
  }

  if (timeFormatCb) {
    timeFormatCb.addEventListener('change', (e) => {
      STATE.format12h = e.target.checked;
      saveState();
      updateClockAndDate();
    });
  }

  const layoutIosModeCb = document.getElementById('layout-ios-mode');
  if (layoutIosModeCb) {
    layoutIosModeCb.addEventListener('change', (e) => {
      STATE.layoutIosMode = e.target.checked;
      saveState();
      if (STATE.layoutIosMode) {
        document.body.classList.add('mode-ios');
      } else {
        document.body.classList.remove('mode-ios');
      }
      applyLayoutPositions();
      renderShortcuts();
    });
  }



  const layoutStealthModeCb = document.getElementById('layout-stealth-mode');
  if (layoutStealthModeCb) {
    layoutStealthModeCb.addEventListener('change', (e) => {
      STATE.layoutStealthMode = e.target.checked;
      saveState();
      if (STATE.layoutStealthMode) {
        document.body.classList.add('stealth-mode');
      } else {
        document.body.classList.remove('stealth-mode');
      }
    });
  }

  const checkUpdatesCb = document.getElementById('check-updates-checkbox');
  if (checkUpdatesCb) {
    checkUpdatesCb.addEventListener('change', (e) => {
      STATE.checkUpdates = e.target.checked;
      saveState();
      if (STATE.checkUpdates) {
        checkForUpdates();
      } else {
        const notification = document.getElementById('update-notification');
        if (notification) notification.style.display = 'none';
      }
    });
  }

  const layoutZenModeCb = document.getElementById('layout-zen-mode');
  if (layoutZenModeCb) {
    layoutZenModeCb.addEventListener('change', (e) => {
      STATE.layoutZenMode = e.target.checked;
      saveState();
      
      if (STATE.layoutZenMode) {
        document.body.classList.add('mode-zen');
      } else {
        document.body.classList.remove('mode-zen');
      }
      
      const iosCb = document.getElementById('layout-ios-mode');
      const stealthCb = document.getElementById('layout-stealth-mode');
      if (iosCb) iosCb.disabled = STATE.layoutZenMode;
      if (stealthCb) stealthCb.disabled = STATE.layoutZenMode;
    });
  }

  if (showSecondsCb) {
    showSecondsCb.addEventListener('change', (e) => {
      STATE.showSeconds = e.target.checked;
      saveState();
      updateClockAndDate();
    });
  }

  // --- УПРАВЛЕНИЕ ПОГОДОЙ ---
  if (showWeatherCb) {
    showWeatherCb.addEventListener('change', (e) => {
      STATE.showWeather = e.target.checked;
      saveState();
      applyWeatherVisibility();
      
      if (STATE.showWeather) {
        if (STATE.weatherCoords && STATE.weatherCoords.lat !== null) {
          updateWeatherWidget();
        } else if (STATE.weatherCity) {
          handleCityInputChange();
        }
      } else {
        if (weatherInputStatus) weatherInputStatus.textContent = "";
      }
    });
  }

  if (weatherCityInput) {
    weatherCityInput.addEventListener('input', handleCityInputChange);
  }

  let geocodeTimeout = null;

  function handleCityInputChange() {
    if (!STATE.showWeather) return;

    const cityName = weatherCityInput.value.trim();
    STATE.weatherCity = cityName;
    saveState();

    if (geocodeTimeout) clearTimeout(geocodeTimeout);

    if (!cityName) {
      STATE.weatherCoords = { lat: null, lon: null, resolvedName: "" };
      STATE.weatherCache = { temp: "", code: null, desc: "", timestamp: 0 };
      saveState();
      updateWeatherWidget();
      updateStatusText("");
      return;
    }

    updateStatusText("searching");

    geocodeTimeout = setTimeout(() => {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=${STATE.language === 'ru' ? 'ru' : 'en'}`;

      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error('Geocoding API error');
          return response.json();
        })
        .then(data => {
          if (!STATE.showWeather) return;
          
          const results = data.results;
          if (results && results.length > 0) {
            const bestMatch = results[0];
            const lat = bestMatch.latitude;
            const lon = bestMatch.longitude;
            
            const name = bestMatch.name;
            const countryCode = bestMatch.country_code ? bestMatch.country_code.toUpperCase() : "";
            const admin1 = bestMatch.admin1 || "";
            
            let resolvedName = name;
            if (admin1 && countryCode) {
              resolvedName = `${name} (${admin1}, ${countryCode})`;
            } else if (countryCode) {
              resolvedName = `${name} (${countryCode})`;
            }

            STATE.weatherCoords = {
              lat: lat,
              lon: lon,
              resolvedName: resolvedName
            };
            STATE.weatherCache = { temp: "", code: null, desc: "", timestamp: 0 };
            saveState();

            updateStatusText("success", resolvedName);
            updateWeatherWidget();
          } else {
            STATE.weatherCoords = { lat: null, lon: null, resolvedName: "" };
            STATE.weatherCache = { temp: "", code: null, desc: "", timestamp: 0 };
            saveState();
            updateStatusText("notfound");
            updateWeatherWidget();
          }
        })
        .catch(err => {
          console.error(err);
          if (!STATE.showWeather) return;
          updateStatusText("error");
        });
    }, 800);
  }

  function updateStatusText(status, resolvedName = "") {
    if (!weatherInputStatus) return;
    
    weatherInputStatus.className = "weather-input-status";
    
    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

    if (status === "searching") {
      weatherInputStatus.classList.add("status-searching");
      weatherInputStatus.textContent = dict.weatherStatusSearching || "Searching...";
    } else if (status === "success") {
      weatherInputStatus.classList.add("status-success");
      weatherInputStatus.textContent = `${dict.weatherStatusFound || "Found"}: ${resolvedName}`;
    } else if (status === "notfound") {
      weatherInputStatus.classList.add("status-error");
      weatherInputStatus.textContent = dict.weatherStatusNotFound || "City not found";
    } else if (status === "error") {
      weatherInputStatus.classList.add("status-error");
      weatherInputStatus.textContent = dict.weatherStatusError || "Error loading weather";
    } else {
      weatherInputStatus.textContent = "";
    }
  }

  function applyWeatherVisibility() {
    if (STATE.showWeather) {
      if (weatherWidget) weatherWidget.style.display = 'flex';
      if (weatherSubsettings) weatherSubsettings.style.display = 'flex';
    } else {
      if (weatherWidget) weatherWidget.style.display = 'none';
      if (weatherSubsettings) weatherSubsettings.style.display = 'none';
    }
  }

  function updateWeatherWidget() {
    if (!STATE.showWeather) {
      return;
    }

    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

    if (!STATE.weatherCoords || STATE.weatherCoords.lat === null || STATE.weatherCoords.lon === null) {
      if (weatherTemp) weatherTemp.textContent = '--°C';
      if (weatherIcon) weatherIcon.textContent = '❓';
      if (weatherDetails) weatherDetails.textContent = dict.weatherNoCity || 'No city set';
      return;
    }

    const now = Date.now();
    const cacheAge = now - STATE.weatherCache.timestamp;
    if (cacheAge < 1800000 && STATE.weatherCache.temp !== "") {
      renderWeatherFromCache();
      return;
    }

    if (weatherDetails) {
      weatherDetails.textContent = dict.weatherLoading || 'Loading...';
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${STATE.weatherCoords.lat}&longitude=${STATE.weatherCoords.lon}&current_weather=true&timezone=auto`;

    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error('Weather API error');
        return response.json();
      })
      .then(data => {
        if (!STATE.showWeather) return;
        const current = data.current_weather;
        if (current) {
          const temp = Math.round(current.temperature) + '°C';
          const code = current.weathercode;
          const emoji = getWeatherEmoji(code);
          const desc = getWeatherDescription(code, STATE.language);

          STATE.weatherCache = {
            temp: temp,
            code: code,
            desc: desc,
            timestamp: Date.now()
          };
          saveState();
          renderWeatherFromCache();
        }
      })
      .catch(err => {
        console.error(err);
        if (weatherDetails) {
          weatherDetails.textContent = dict.weatherStatusError || 'Error loading weather';
        }
      });
  }

  function renderWeatherFromCache() {
    if (weatherTemp) weatherTemp.textContent = STATE.weatherCache.temp;
    if (weatherIcon) weatherIcon.textContent = getWeatherEmoji(STATE.weatherCache.code);
    if (weatherDetails) {
      const desc = getWeatherDescription(STATE.weatherCache.code, STATE.language);
      let cityName = STATE.weatherCoords.resolvedName || STATE.weatherCity;
      if (cityName.includes('(')) {
        cityName = cityName.split('(')[0].trim();
      }
      weatherDetails.textContent = '';
      weatherDetails.appendChild(document.createTextNode(desc));
      weatherDetails.appendChild(document.createElement('br'));
      weatherDetails.appendChild(document.createTextNode(cityName));
    }
  }

  function getWeatherEmoji(code) {
    if (code === 0) return '☀️';
    if (code === 1) return '🌤️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code === 45 || code === 48) return '🌫️';
    if ([51, 53, 55, 56, 57].includes(code)) return '🌧️';
    if ([61, 63, 65, 66, 67].includes(code)) return '🌧️';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
    if ([80, 81, 82].includes(code)) return '🌦️';
    if ([95, 96, 99].includes(code)) return '⛈️';
    return '⛅';
  }

  function getWeatherDescription(code, lang) {
    const isRu = lang === 'ru';
    if (code === 0) return isRu ? 'Ясно' : 'Clear';
    if (code === 1) return isRu ? 'Преимущественно ясно' : 'Mainly clear';
    if (code === 2) return isRu ? 'Переменная облачность' : 'Partly cloudy';
    if (code === 3) return isRu ? 'Пасмурно' : 'Overcast';
    if (code === 45 || code === 48) return isRu ? 'Туман' : 'Fog';
    if ([51, 53, 55].includes(code)) return isRu ? 'Морось' : 'Drizzle';
    if ([61, 63, 65].includes(code)) return isRu ? 'Дождь' : 'Rain';
    if ([66, 67].includes(code)) return isRu ? 'Ледяной дождь' : 'Freezing rain';
    if ([71, 73, 75].includes(code)) return isRu ? 'Снегопад' : 'Snowfall';
    if (code === 77) return isRu ? 'Снежная крупа' : 'Snow grains';
    if ([80, 81, 82].includes(code)) return isRu ? 'Ливень' : 'Rain showers';
    if ([85, 86].includes(code)) return isRu ? 'Снежный ливень' : 'Snow showers';
    if ([95, 96, 99].includes(code)) return isRu ? 'Гроза' : 'Thunderstorm';
    return isRu ? 'Умеренно' : 'Moderate';
  }

  // --- УПРАВЛЕНИЕ ПАПКАМИ (ДРЕВОВИДНАЯ ИЕРАРХИЯ) ---
  const expandedFolders = new Set();
  let draggedId = null;

  function migrateToNested(flatShortcuts, categoriesOrFolders) {
    if (!Array.isArray(flatShortcuts)) return [];
    
    // Check if it is already nested
    const isAlreadyNested = flatShortcuts.some(s => s && s.isFolder);
    if (isAlreadyNested) {
      flatShortcuts.forEach(item => {
        if (!item.id) {
          item.id = (item.isFolder ? "f_" : "sc_") + Math.random().toString(36).substr(2, 9);
        }
        if (item.isFolder && item.children) {
          item.children.forEach(child => {
            if (!child.id) {
              child.id = "sc_" + Math.random().toString(36).substr(2, 9);
            }
          });
        }
      });
      return flatShortcuts;
    }

    const nested = [];
    const foldersList = categoriesOrFolders || [];
    
    // Create folders
    const folderMap = {};
    foldersList.forEach(f => {
      if (f.id !== 'default') {
        folderMap[f.id] = {
          id: f.id,
          name: f.name,
          isFolder: true,
          children: []
        };
        nested.push(folderMap[f.id]);
      }
    });

    // Populate shortcuts
    flatShortcuts.forEach(s => {
      const folderId = s.folder || s.category || 'default';
      const itemObj = {
        id: s.id || "sc_" + Math.random().toString(36).substr(2, 9),
        name: s.name,
        url: s.url,
        customIcon: s.customIcon || null
      };

      if (folderId === 'default') {
        nested.push(itemObj);
      } else if (folderMap[folderId]) {
        folderMap[folderId].children.push(itemObj);
      } else {
        nested.push(itemObj);
      }
    });

    return nested;
  }

  function moveNestedItem(draggedId, targetId, action) {
    let draggedItem = null;
    
    // Find dragged item and remove it
    let rootIdx = STATE.shortcuts.findIndex(s => s.id === draggedId);
    if (rootIdx !== -1) {
      draggedItem = STATE.shortcuts.splice(rootIdx, 1)[0];
    } else {
      for (let f of STATE.shortcuts) {
        if (f.isFolder && f.children) {
          let childIdx = f.children.findIndex(s => s.id === draggedId);
          if (childIdx !== -1) {
            draggedItem = f.children.splice(childIdx, 1)[0];
            break;
          }
        }
      }
    }
    
    if (!draggedItem) return;

    if (action === 'merge') {
      let targetIdx = STATE.shortcuts.findIndex(s => s.id === targetId);
      if (targetIdx !== -1) {
        const targetItem = STATE.shortcuts[targetIdx];
        if (targetItem.isFolder) {
          if (!targetItem.children) targetItem.children = [];
          targetItem.children.push(draggedItem);
        } else {
          // Merge two shortcuts to create a folder
          const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
          const name = prompt(currentDict.addCategoryPrompt) || "Folder";
          const newFolder = {
            id: "f_" + Date.now() + Math.random().toString(36).substr(2, 5),
            name: name.trim(),
            isFolder: true,
            children: [targetItem, draggedItem]
          };
          STATE.shortcuts[targetIdx] = newFolder;
        }
      }
    } else {
      // action is 'before' or 'after'
      let targetIdx = STATE.shortcuts.findIndex(s => s.id === targetId);
      if (targetIdx !== -1) {
        const insertIdx = action === 'before' ? targetIdx : targetIdx + 1;
        STATE.shortcuts.splice(insertIdx, 0, draggedItem);
      } else {
        for (let f of STATE.shortcuts) {
          if (f.isFolder && f.children) {
            let childIdx = f.children.findIndex(s => s.id === targetId);
            if (childIdx !== -1) {
              const insertIdx = action === 'before' ? childIdx : childIdx + 1;
              f.children.splice(insertIdx, 0, draggedItem);
              break;
            }
          }
        }
      }
    }
  }

  function findShortcutOrFolderById(id) {
    let item = STATE.shortcuts.find(s => s.id === id);
    if (item) return item;
    for (let f of STATE.shortcuts) {
      if (f.isFolder && f.children) {
        let child = f.children.find(s => s.id === id);
        if (child) return child;
      }
    }
    return null;
  }

  function isFolderContainingTarget(folder, targetId) {
    if (!folder.children) return false;
    return folder.children.some(child => child.id === targetId);
  }

  function openFolder(folderId) {
    const folder = STATE.shortcuts.find(f => f.isFolder && f.id === folderId);
    if (!folder) return;
    
    const folderModal = document.getElementById('folder-modal');
    const titleEl = document.getElementById('folder-modal-title');
    if (titleEl) {
      titleEl.textContent = folder.name;
    }
    if (folderModal) {
      folderModal.dataset.folderId = folderId;
      renderFolderShortcuts(folderId);
      folderModal.classList.add('active');
    }
  }

  function closeFolder() {
    const folderModal = document.getElementById('folder-modal');
    if (folderModal) {
      folderModal.classList.remove('active');
      delete folderModal.dataset.folderId;
    }
  }

  function renderFolderShortcuts(folderId) {
    const folderShortcutsContainer = document.getElementById('folder-shortcuts-container');
    if (!folderShortcutsContainer) return;
    folderShortcutsContainer.innerHTML = '';
    
    const folder = STATE.shortcuts.find(f => f.isFolder && f.id === folderId);
    if (!folder || !folder.children) return;
    
    let itemWidth = 85; 
    if (STATE.size === "small") itemWidth = 85;
    if (STATE.size === "medium") itemWidth = 98;
    if (STATE.size === "large") itemWidth = 110;
    const gap = 16;
    const maxColumns = STATE.columns;
    const actualColumns = Math.min(folder.children.length, maxColumns);
    const containerMaxWidth = (itemWidth * actualColumns) + (gap * (actualColumns - 1)) + 20;
    folderShortcutsContainer.style.maxWidth = `${containerMaxWidth}px`;
    
    const fragment = document.createDocumentFragment();
    
    folder.children.forEach((item) => {
      const card = document.createElement('a');
      card.href = item.url;
      card.className = `shortcut-card size-${STATE.size}`;
      card.title = item.name;
      
      const img = document.createElement('img');
      img.className = 'shortcut-icon';
      img.alt = '';
      
      let hostname = '';
      try { hostname = new URL(item.url).hostname; } catch (e) { hostname = item.url; }
      img.src = item.customIcon || `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
      
      img.onerror = () => {
        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>';
      };
      
      const span = document.createElement('span');
      span.className = 'shortcut-label';
      span.textContent = item.name;
      
      card.appendChild(img);
      card.appendChild(span);
      fragment.appendChild(card);
    });
    
    folderShortcutsContainer.appendChild(fragment);
  }

  const folderModal = document.getElementById('folder-modal');
  const folderCloseBtn = document.getElementById('folder-modal-close');
  if (folderCloseBtn && folderModal) {
    folderCloseBtn.addEventListener('click', closeFolder);
    folderModal.addEventListener('click', (e) => {
      if (e.target === folderModal) closeFolder();
    });
  }

  function renderModalShortcutsList() {
    const modalList = document.getElementById('modal-shortcuts-list');
    if (!modalList) return;
    modalList.innerHTML = '';

    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

    if (STATE.shortcuts.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.color = 'rgba(255,255,255,0.3)';
      emptyDiv.style.fontSize = '11px';
      emptyDiv.style.textAlign = 'center';
      emptyDiv.style.padding = '12px';
      emptyDiv.textContent = currentDict.listEmpty;
      modalList.appendChild(emptyDiv);
      return;
    }

    const fragment = document.createDocumentFragment();

    STATE.shortcuts.forEach((item) => {
      if (item.isFolder) {
        // Рендерим папку в настройках
        const folderRow = document.createElement('div');
        folderRow.className = 'modal-folder-row';
        folderRow.dataset.id = item.id;
        folderRow.setAttribute('draggable', true);
        
        setupDragAndDropListeners(folderRow, item, false);

        const folderHeader = document.createElement('div');
        folderHeader.className = 'modal-folder-header';

        const arrow = document.createElement('span');
        arrow.className = 'folder-arrow';
        const isExpanded = expandedFolders.has(item.id);
        arrow.textContent = isExpanded ? '▼' : '▶';
        arrow.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isExpanded) {
            expandedFolders.delete(item.id);
          } else {
            expandedFolders.add(item.id);
          }
          renderModalShortcutsList();
        });
        folderHeader.appendChild(arrow);

        const folderNameSpan = document.createElement('span');
        folderNameSpan.className = 'modal-folder-name';
        folderNameSpan.textContent = item.name;
        folderHeader.appendChild(folderNameSpan);

        const actions = document.createElement('div');
        actions.className = 'modal-folder-actions';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'btn btn-edit';
        renameBtn.title = currentDict.btnEdit;
        renameBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>`;
        renameBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const newName = prompt(currentDict.renameCategoryPrompt, item.name);
          if (newName && newName.trim()) {
            item.name = newName.trim();
            saveState();
            renderShortcuts();
            renderModalShortcutsList();
          }
        });
        actions.appendChild(renameBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-delete';
        deleteBtn.title = currentDict.btnDelete;
        deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>`;
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(currentDict.deleteCategoryConfirm)) {
            const deleteChildren = confirm(currentDict.deleteShortcutsConfirm);
            if (deleteChildren) {
              const idx = STATE.shortcuts.indexOf(item);
              STATE.shortcuts.splice(idx, 1);
            } else {
              const idx = STATE.shortcuts.indexOf(item);
              STATE.shortcuts.splice(idx, 1, ...(item.children || []));
            }
            saveState();
            renderShortcuts();
            renderModalShortcutsList();
          }
        });
        actions.appendChild(deleteBtn);

        folderRow.appendChild(folderHeader);
        folderRow.appendChild(actions);
        fragment.appendChild(folderRow);

        if (isExpanded) {
          const childrenContainer = document.createElement('div');
          childrenContainer.className = 'modal-folder-children';
          
          if (item.children && item.children.length > 0) {
            item.children.forEach((child) => {
              const childRow = renderShortcutRow(child, true, item.id);
              childrenContainer.appendChild(childRow);
            });
          } else {
            const emptyChildren = document.createElement('div');
            emptyChildren.className = 'modal-shortcut-item-empty';
            emptyChildren.textContent = currentDict.listEmpty;
            childrenContainer.appendChild(emptyChildren);
          }
          fragment.appendChild(childrenContainer);
        }
      } else {
        // Рендерим обычный ярлык в корне
        const shortcutRow = renderShortcutRow(item, false, null);
        fragment.appendChild(shortcutRow);
      }
    });

    modalList.appendChild(fragment);
  }

  function renderShortcutRow(item, isChild, parentId) {
    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    
    const row = document.createElement('div');
    row.className = 'modal-shortcut-item';
    if (isChild) {
      row.classList.add('child-item');
      row.dataset.parentId = parentId;
      row.dataset.isChild = 'true';
    }
    row.dataset.id = item.id;

    if (editingIndex === item.id) {
      row.setAttribute('draggable', false);
      let tempIconBase64 = item.customIcon;

      const editContainer = document.createElement('div');
      editContainer.className = 'modal-shortcut-edit-container';
      if (tempIconBase64) {
        editContainer.classList.add('has-custom-icon');
      }

      const fieldsWrapper = document.createElement('div');
      fieldsWrapper.className = 'inline-edit-fields';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = item.name;
      nameInput.className = 'settings-input inline-input';
      nameInput.placeholder = currentDict.namePlaceholder;

      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.value = item.url;
      urlInput.className = 'settings-input inline-input';
      urlInput.placeholder = currentDict.urlPlaceholder;

      fieldsWrapper.appendChild(nameInput);
      fieldsWrapper.appendChild(urlInput);

      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'inline-edit-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-inline-cancel';
      cancelBtn.textContent = currentDict.btnCancel;
      cancelBtn.addEventListener('click', () => {
        editingIndex = -1;
        renderModalShortcutsList();
      });

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-inline-save';
      saveBtn.textContent = currentDict.btnSave;

      const inlineIconInput = document.createElement('input');
      inlineIconInput.type = 'file';
      inlineIconInput.accept = 'image/*';
      inlineIconInput.style.display = 'none';
      inlineIconInput.id = `edit-shortcut-icon-file-${item.id}`;

      const inlineIconLabel = document.createElement('label');
      inlineIconLabel.htmlFor = `edit-shortcut-icon-file-${item.id}`;
      inlineIconLabel.className = 'btn-square-upload';
      inlineIconLabel.title = currentDict.uploadIconTitle;

      const uploadImg = document.createElement('img');
      uploadImg.src = 'assets/upload-icon.png';
      uploadImg.alt = 'Upload';
      inlineIconLabel.appendChild(uploadImg);

      const inlineIconResetBtn = document.createElement('button');
      inlineIconResetBtn.className = 'btn btn-inline-cancel btn-inline-reset';
      inlineIconResetBtn.style.color = '#ff6b6b';
      inlineIconResetBtn.textContent = currentDict.resetBtn;

      inlineIconResetBtn.addEventListener('click', () => {
        tempIconBase64 = null;
        inlineIconLabel.title = currentDict.uploadIconTitle;
        inlineIconLabel.style.borderColor = '';
        editContainer.classList.remove('has-custom-icon');
      });

      inlineIconInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          inlineIconLabel.title = file.name;
          inlineIconLabel.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          compressImage(file, 128, 128, 0.85, (result) => {
            tempIconBase64 = result;
            editContainer.classList.add('has-custom-icon');
          });
        }
      });

      actionsWrapper.appendChild(cancelBtn);
      actionsWrapper.appendChild(saveBtn);
      actionsWrapper.appendChild(inlineIconResetBtn);
      actionsWrapper.appendChild(inlineIconLabel);
      actionsWrapper.appendChild(inlineIconInput); 

      saveBtn.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        let newUrl = urlInput.value.trim();

        if (newName && newUrl) {
          if (!/^https?:\/\//i.test(newUrl)) {
            newUrl = 'https://' + newUrl;
          }

          item.name = newName;
          item.url = newUrl;
          item.customIcon = tempIconBase64;
          
          saveState();
          editingIndex = -1;
          renderShortcuts();
          renderModalShortcutsList();
        }
      });

      editContainer.appendChild(fieldsWrapper);
      editContainer.appendChild(actionsWrapper);
      row.appendChild(editContainer);

    } else {
      row.setAttribute('draggable', true);
      setupDragAndDropListeners(row, item, isChild);

      const info = document.createElement('div');
      info.className = 'modal-shortcut-info';

      const name = document.createElement('span');
      name.className = 'modal-shortcut-name';
      name.textContent = item.name;

      const url = document.createElement('span');
      url.className = 'modal-shortcut-url';
      url.textContent = item.url;

      info.appendChild(name);
      info.appendChild(url);

      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'modal-shortcut-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-edit';
      editBtn.title = currentDict.btnEdit;
      editBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>`;
      editBtn.addEventListener('click', () => {
        editingIndex = item.id;
        renderModalShortcutsList();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-delete';
      deleteBtn.title = currentDict.btnDelete;
      deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>`;
      deleteBtn.addEventListener('click', () => {
        if (isChild) {
          for (let f of STATE.shortcuts) {
            if (f.id === parentId) {
              const idx = f.children.indexOf(item);
              if (idx !== -1) f.children.splice(idx, 1);
              break;
            }
          }
        } else {
          const idx = STATE.shortcuts.indexOf(item);
          if (idx !== -1) STATE.shortcuts.splice(idx, 1);
        }
        saveState();
        renderShortcuts();
        renderModalShortcutsList();
      });

      actionsWrapper.appendChild(editBtn);
      actionsWrapper.appendChild(deleteBtn);

      row.appendChild(info);
      row.appendChild(actionsWrapper);
    }

    return row;
  }

  function getDropAction(e, targetEl, isChild, isDraggedFolder, isTargetFolder) {
    const rect = targetEl.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const height = rect.height;

    // Folders cannot be dropped inside other folders or merged to make a folder
    if (isDraggedFolder) {
      if (relativeY < height / 2) {
        return 'before';
      } else {
        return 'after';
      }
    }

    // A child item inside a folder cannot have nested folders/children
    if (isChild) {
      if (relativeY < height / 2) {
        return 'before';
      } else {
        return 'after';
      }
    }

    // For root shortcuts or folder targets:
    if (relativeY < height * 0.25) {
      return 'before';
    } else if (relativeY > height * 0.75) {
      return 'after';
    } else {
      return 'merge';
    }
  }

  function setupDragAndDropListeners(element, item, isChild) {
    element.addEventListener('dragstart', (e) => {
      draggedId = item.id;
      e.dataTransfer.effectAllowed = 'move';
      element.classList.add('dragging');
    });

    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
      const modalList = document.getElementById('modal-shortcuts-list');
      if (modalList) {
        const items = modalList.querySelectorAll('.modal-shortcut-item, .modal-folder-row');
        items.forEach(el => el.classList.remove('drag-sort-before', 'drag-sort-after', 'drag-merge'));
      }
    });

    element.addEventListener('dragover', (e) => {
      if (!draggedId || draggedId === item.id) return;
      
      const draggedItem = findShortcutOrFolderById(draggedId);
      const isDraggedFolder = draggedItem ? draggedItem.isFolder : false;

      if (isDraggedFolder && isFolderContainingTarget(draggedItem, item.id)) {
        return;
      }

      e.preventDefault();
      
      const dropAction = getDropAction(e, element, isChild, isDraggedFolder, item.isFolder);
      
      if (dropAction === 'before') {
        element.classList.add('drag-sort-before');
        element.classList.remove('drag-sort-after', 'drag-merge');
      } else if (dropAction === 'after') {
        element.classList.add('drag-sort-after');
        element.classList.remove('drag-sort-before', 'drag-merge');
      } else if (dropAction === 'merge') {
        element.classList.add('drag-merge');
        element.classList.remove('drag-sort-before', 'drag-sort-after');
      }
    });

    element.addEventListener('dragleave', () => {
      element.classList.remove('drag-sort-before', 'drag-sort-after', 'drag-merge');
    });

    element.addEventListener('drop', (e) => {
      if (!draggedId || draggedId === item.id) return;
      e.preventDefault();
      element.classList.remove('drag-sort-before', 'drag-sort-after', 'drag-merge');
      
      const draggedItem = findShortcutOrFolderById(draggedId);
      const isDraggedFolder = draggedItem ? draggedItem.isFolder : false;
      const dropAction = getDropAction(e, element, isChild, isDraggedFolder, item.isFolder);
      
      moveNestedItem(draggedId, item.id, dropAction);
      saveState();
      renderShortcuts();
      renderModalShortcutsList();
    });
  }

  // Навешиваем слушатель на пустой фон контейнера ярлыков в настройках
  const settingsModalList = document.getElementById('modal-shortcuts-list');
  if (settingsModalList) {
    settingsModalList.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    settingsModalList.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.target === settingsModalList && draggedId) {
        let draggedItem = null;
        let rootIdx = STATE.shortcuts.findIndex(s => s.id === draggedId);
        if (rootIdx !== -1) {
          draggedItem = STATE.shortcuts.splice(rootIdx, 1)[0];
        } else {
          for (let f of STATE.shortcuts) {
            if (f.isFolder && f.children) {
              let childIdx = f.children.findIndex(s => s.id === draggedId);
              if (childIdx !== -1) {
                draggedItem = f.children.splice(childIdx, 1)[0];
                break;
              }
            }
          }
        }
        if (draggedItem) {
          STATE.shortcuts.push(draggedItem);
          saveState();
          renderShortcuts();
          renderModalShortcutsList();
        }
      }
    });
  }

  // --- Вспомогательная функция для проверки браузера Brave ---
  async function isBraveBrowser() {
    // Первичная проверка через API Brave
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      try {
        return await navigator.brave.isBrave();
      } catch (e) {}
    }
    // Запасная проверка через Client Hints (navigator.userAgentData)
    if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
      try {
        const hints = await navigator.userAgentData.getHighEntropyValues(['brands']);
        return hints.brands.some(brand => brand.brand === 'Brave');
      } catch (e) {}
    }
    return false;
  }

  // --- ЭКСПОРТ И ИМПОРТ НАСТРОЕК (JSON-БЭКАП) ---
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      storage.getAll(async (allData) => {
        const dataStr = JSON.stringify(allData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        // Ожидаем результат проверки на Brave
        const isBrave = await isBraveBrowser();
        const exportFileName = isBrave ? 'brave_new_tab_backup.json' : 'strict_compact_tab_backup.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
      });
    });
  }

  if (btnImport && importFileInput) {
    btnImport.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) {
        importFileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          // Очистка от BOM-символов (\uFEFF) и лишних пробелов
          const cleanText = event.target.result.trim().replace(/^\uFEFF/, '');
          const data = JSON.parse(cleanText);

          if (!data) {
            throw new Error("Invalid backup format: parsed data is null or empty");
          }

          let shortcuts = [];
          let folders = [{ id: "default", name: "General" }];
          let columns = 10;
          let size = 'small';
          let format12h = false;
          let showSeconds = false;
          let showDate = true;
          let theme = 'dark';
          let adaptiveThemeData = null;
          let layoutPositions = null;
          let layoutGridSnap = false;
          let layoutGridSize = 20;
          let showClock = true;
          let showWeather = false;
          let weatherCity = '';
          let weatherCoords = { lat: null, lon: null, resolvedName: '' };
          let weatherCache = { temp: '', code: null, desc: '', timestamp: 0 };
          let customBackground = null;
          let customFavicon = null;
          let language = 'en';
          let searchEngine = 'duckduckgo';
          let customSearchEngines = [];
          let checkUpdates = false;
          let layoutZenMode = false;

          // Если импортируется плоский массив ярлыков (старый формат)
          if (Array.isArray(data)) {
            shortcuts = data;
          } else if (typeof data === 'object') {
            // Если импортируется сложный объект настроек (новый формат)
            shortcuts = Array.isArray(data.shortcuts) ? data.shortcuts : DEFAULT_SHORTCUTS;
            folders = Array.isArray(data.folders) ? data.folders : (Array.isArray(data.categories) ? data.categories : [{ id: "default", name: "General" }]);
            columns = data.columns ?? 10;
            size = data.size ?? 'small';
            
            if (data.format12h !== undefined && data.format12h !== null) {
              format12h = data.format12h;
            } else if (data.timeFormat === '12h') {
              format12h = true;
            }

            showSeconds = data.showSeconds ?? false;
            showDate = data.showDate ?? true;
            theme = data.theme ?? 'dark';
            if (theme === 'nord') theme = 'dark';
            adaptiveThemeData = data.adaptiveThemeData ?? null;
            layoutPositions = data.layoutPositions ?? null;
            layoutGridSnap = data.layoutGridSnap ?? false;
            layoutGridSize = data.layoutGridSize ?? 20;
            showClock = data.showClock ?? true;
            showWeather = data.showWeather ?? false;
            weatherCity = data.weatherCity ?? '';
            weatherCoords = data.weatherCoords ?? { lat: null, lon: null, resolvedName: '' };
            weatherCache = data.weatherCache ?? { temp: '', code: null, desc: '', timestamp: 0 };
            customBackground = data.customBackground ?? null;
            customFavicon = data.customFavicon ?? null;
            language = data.language ?? 'en';
            searchEngine = data.searchEngine ?? 'duckduckgo';
            customSearchEngines = data.customSearchEngines ?? [];
            checkUpdates = data.checkUpdates ?? false;
            layoutZenMode = data.layoutZenMode ?? false;
          } else {
            throw new Error("Invalid backup format: data must be an object or array");
          }

          // Обязательная фильтрация ярлыков (отсеиваем null и не-объекты)
          shortcuts = shortcuts.filter(s => s && typeof s === 'object');
          
          // Конвертируем плоскую структуру в древовидную
          const migratedShortcuts = migrateToNested(shortcuts, folders);

          const cleanedData = {
            shortcuts: migratedShortcuts,
            columns,
            size,
            format12h,
            showSeconds,
            showDate,
            customBackground,
            customFavicon,
            language,
            searchEngine,
            theme,
            adaptiveThemeData,
            layoutPositions,
            layoutGridSnap,
            layoutGridSize,
            showClock,
            showWeather,
            weatherCity,
            weatherCoords,
            weatherCache,
            customSearchEngines,
            checkUpdates,
            layoutZenMode
          };

          // Сохраняем в localStorage / Chrome Storage
          storage.clearAndSet(cleanedData, () => {
            const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
            alert(dict.importSuccess || "Import successful!");
            window.location.reload();
          });

        } catch (err) {
          console.error("Import error details:", err);
          const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
          alert(dict.importError);
          importFileInput.value = '';
        }
      };

      reader.onerror = () => {
        const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
        alert(dict.importReadError);
        importFileInput.value = '';
      };

      reader.readAsText(file);
    });
  }

  function isNewerVersion(current, latest) {
    const parse = v => v.replace(/^v/, '').replace(/[^0-9.]/g, '').split('.').map(Number);
    const currParts = parse(current);
    const latParts = parse(latest);
    for (let i = 0; i < Math.max(currParts.length, latParts.length); i++) {
      const c = currParts[i] || 0;
      const l = latParts[i] || 0;
      if (l > c) return true;
      if (c > l) return false;
    }
    return false;
  }

  function checkForUpdates() {
    if (!STATE.checkUpdates) return;
    
    const now = Date.now();
    const lastCheck = localStorage.getItem('lastUpdateCheck') || 0;
    const cachedVersion = localStorage.getItem('cachedLatestVersion');
    
    // Кэш на 1 час для предотвращения лимитов запросов GitHub API
    if (now - lastCheck < 3600000 && cachedVersion) {
      handleUpdateResult(cachedVersion);
      return;
    }
    
    fetch('https://api.github.com/repos/dodry-question/my-new-tab/releases/latest')
      .then(res => {
        if (!res.ok) throw new Error("GitHub API error");
        return res.json();
      })
      .then(data => {
        if (data && data.tag_name) {
          localStorage.setItem('lastUpdateCheck', now);
          localStorage.setItem('cachedLatestVersion', data.tag_name);
          handleUpdateResult(data.tag_name);
        }
      })
      .catch(err => console.error("Error checking updates:", err));
  }

  function handleUpdateResult(latestVersion) {
    const currentVersion = '1.10.6';
    if (isNewerVersion(currentVersion, latestVersion)) {
      const notification = document.getElementById('update-notification');
      const updateText = document.getElementById('update-text');
      const updateLink = document.getElementById('update-link');
      if (notification && updateText) {
        const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
        updateText.textContent = (dict.updateAvailable || "New version available: ") + latestVersion;
        if (updateLink) {
          updateLink.textContent = dict.updateDownload || "Download";
        }
        notification.style.display = 'flex';
      }
    } else {
      const notification = document.getElementById('update-notification');
      if (notification) notification.style.display = 'none';
    }
  }

  // --- ФУНКЦИИ ОБРАБОТКИ ДАННЫХ И ОТРИСОВКИ ---

  function loadState() {
    storage.get(['shortcuts', 'categories', 'folders', 'columns', 'size', 'customBackground', 'customFavicon', 'language', 'searchEngine', 'showDate', 'format12h', 'showSeconds', 'theme', 'adaptiveThemeData', 'layoutPositions', 'layoutGridSnap', 'layoutGridSize', 'layoutIosMode', 'layoutStealthMode', 'showClock', 'showWeather', 'weatherCity', 'weatherCoords', 'weatherCache', 'customSearchEngines', 'checkUpdates', 'layoutZenMode'], (result) => {
      STATE.shortcuts = migrateToNested(result.shortcuts ?? DEFAULT_SHORTCUTS, result.folders ?? result.categories);
      STATE.customSearchEngines = result.customSearchEngines ?? [];
      STATE.columns = result.columns ?? 10;
      STATE.size = result.size ?? "small";
      STATE.customBackground = result.customBackground ?? null;
      STATE.customFavicon = result.customFavicon ?? null;
      if (STATE.customFavicon === null) {
        localStorage.removeItem('customFavicon');
      } else {
        localStorage.setItem('customFavicon', JSON.stringify(STATE.customFavicon));
      }
      STATE.language = result.language ?? "en";
      STATE.searchEngine = result.searchEngine ?? "duckduckgo";
      STATE.showDate = result.showDate ?? true;
      STATE.format12h = result.format12h ?? false;
      STATE.showSeconds = result.showSeconds ?? false;
      STATE.theme = result.theme ?? "dark";
      if (STATE.theme === 'nord') STATE.theme = 'dark';
      STATE.adaptiveThemeData = result.adaptiveThemeData ?? null;
      STATE.layoutPositions = result.layoutPositions ?? null;
      STATE.layoutGridSnap = result.layoutGridSnap ?? false;
      STATE.layoutGridSize = result.layoutGridSize ?? 20;
      STATE.layoutIosMode = result.layoutIosMode ?? false;
      STATE.layoutStealthMode = result.layoutStealthMode ?? false;
      STATE.showClock = result.showClock ?? true;
      STATE.showWeather = result.showWeather ?? false;
      STATE.weatherCity = result.weatherCity ?? "";
      STATE.weatherCoords = result.weatherCoords ?? { lat: null, lon: null, resolvedName: "" };
      STATE.weatherCache = result.weatherCache ?? { temp: "", code: null, desc: "", timestamp: 0 };
      STATE.checkUpdates = result.checkUpdates ?? false;
      STATE.layoutZenMode = result.layoutZenMode ?? false;

      if (sizeSelect) sizeSelect.value = STATE.size;
      if (columnsSelect) columnsSelect.value = STATE.columns;
      if (languageSelect) languageSelect.value = STATE.language;
      if (searchEngineSelect) searchEngineSelect.value = STATE.searchEngine;
      if (themeSelect) themeSelect.value = STATE.theme;

      if (showClockCb) showClockCb.checked = STATE.showClock;
      if (showDateCb) showDateCb.checked = STATE.showDate;
      if (timeFormatCb) timeFormatCb.checked = STATE.format12h;
      if (showSecondsCb) showSecondsCb.checked = STATE.showSeconds;
      if (showWeatherCb) showWeatherCb.checked = STATE.showWeather;
      if (weatherCityInput) weatherCityInput.value = STATE.weatherCity;
      if (layoutIosModeCb) layoutIosModeCb.checked = STATE.layoutIosMode;
      const layoutStealthModeCb = document.getElementById('layout-stealth-mode');
      if (layoutStealthModeCb) layoutStealthModeCb.checked = STATE.layoutStealthMode;
      const checkUpdatesCb = document.getElementById('check-updates-checkbox');
      if (checkUpdatesCb) checkUpdatesCb.checked = STATE.checkUpdates;
      const layoutZenModeCb = document.getElementById('layout-zen-mode');
      if (layoutZenModeCb) layoutZenModeCb.checked = STATE.layoutZenMode;

      if (STATE.layoutIosMode) {
        document.body.classList.add('mode-ios');
      } else {
        document.body.classList.remove('mode-ios');
      }

      if (STATE.layoutStealthMode) {
        document.body.classList.add('stealth-mode');
      } else {
        document.body.classList.remove('stealth-mode');
      }

      if (STATE.layoutZenMode) {
        document.body.classList.add('mode-zen');
        if (layoutIosModeCb) layoutIosModeCb.disabled = true;
        if (layoutStealthModeCb) layoutStealthModeCb.disabled = true;
      } else {
        document.body.classList.remove('mode-zen');
        if (layoutIosModeCb) layoutIosModeCb.disabled = false;
        if (layoutStealthModeCb) layoutStealthModeCb.disabled = false;
      }

      applyBackground();
      applyFavicon();
      applyTheme();
      document.body.style.setProperty('--grid-size', STATE.layoutGridSize + 'px');
      applyLayoutPositions();
      applyClockVisibility();
      applyWeatherVisibility();
      applyLanguage(STATE.language);
      populateSearchEnginesSelect();
      updateSearchEngineUI();
      updateClockAndDate();
      updateWeatherWidget();
      renderShortcuts();

      if (STATE.showWeather && STATE.weatherCoords && STATE.weatherCoords.resolvedName) {
        updateStatusText("success", STATE.weatherCoords.resolvedName);
      }

      // Запуск проверки версий (только если галочка активна)
      if (STATE.checkUpdates) {
        checkForUpdates();
      }
    });
  }

  function saveState() {
    storage.set({
      shortcuts: STATE.shortcuts,
      columns: STATE.columns,
      size: STATE.size,
      customBackground: STATE.customBackground,
      customFavicon: STATE.customFavicon,
      language: STATE.language,
      searchEngine: STATE.searchEngine,
      showDate: STATE.showDate,
      format12h: STATE.format12h,
      showSeconds: STATE.showSeconds,
      theme: STATE.theme,
      adaptiveThemeData: STATE.adaptiveThemeData,
      layoutPositions: STATE.layoutPositions,
      layoutGridSnap: STATE.layoutGridSnap,
      layoutGridSize: STATE.layoutGridSize,
      layoutIosMode: STATE.layoutIosMode,
      layoutStealthMode: STATE.layoutStealthMode,
      showClock: STATE.showClock,
      showWeather: STATE.showWeather,
      weatherCity: STATE.weatherCity,
      weatherCoords: STATE.weatherCoords,
      weatherCache: STATE.weatherCache,
      customSearchEngines: STATE.customSearchEngines,
      checkUpdates: STATE.checkUpdates,
      layoutZenMode: STATE.layoutZenMode
    });
  }

  function updateSearchEngineUI() {
    const select = document.getElementById('search-engine-select');
    if (select) {
      select.value = STATE.searchEngine;
    }
    
    let logoSrc = 'assets/search_' + STATE.searchEngine + '.png';
    let isCustom = false;
    let customLogo = null;
    
    if (STATE.searchEngine && STATE.searchEngine.startsWith('custom_')) {
      const customEng = STATE.customSearchEngines ? STATE.customSearchEngines.find(e => e.id === STATE.searchEngine) : null;
      if (customEng) {
        isCustom = true;
        customLogo = customEng.logo || 'assets/favicon.png';
      }
    }

    const logo = document.getElementById('search-engine-logo');
    if (logo) {
      logo.src = isCustom ? customLogo : logoSrc;
      if (STATE.searchEngine === 'brave') {
        logo.classList.add('inverted');
      } else {
        logo.classList.remove('inverted');
      }
    }
    const settingsSearchLogo = document.getElementById('settings-search-logo');
    if (settingsSearchLogo) {
      settingsSearchLogo.src = isCustom ? customLogo : logoSrc;
      if (STATE.searchEngine === 'brave') {
        settingsSearchLogo.classList.add('inverted');
      } else {
        settingsSearchLogo.classList.remove('inverted');
      }
    }
  }

  function moveShortcut(fromAbsoluteIndex, toAbsoluteIndex) {
    const [movedItem] = STATE.shortcuts.splice(fromAbsoluteIndex, 1);
    STATE.shortcuts.splice(toAbsoluteIndex, 0, movedItem);
    saveState();
    renderShortcuts();
    renderModalShortcutsList();
  }

  function handleAutoscroll(e) {
    const listContainer = document.getElementById('modal-shortcuts-list');
    if (!listContainer) return;
    
    const rect = listContainer.getBoundingClientRect();
    const mouseY = e.clientY;
    
    const threshold = 40; 
    const scrollSpeed = 6;  

    if (mouseY < rect.top + threshold) {
      listContainer.scrollTop -= scrollSpeed;
    } else if (mouseY > rect.bottom - threshold) {
      listContainer.scrollTop += scrollSpeed;
    }
  }

  const container = document.getElementById('shortcuts-container');
  
  function renderShortcuts() {
    if (!container) return;
    container.innerHTML = '';

    let itemWidth = 85; 
    if (STATE.size === "small") itemWidth = 85;
    if (STATE.size === "medium") itemWidth = 98;
    if (STATE.size === "large") itemWidth = 110;

    const gap = 16;
    const maxColumns = STATE.columns;
    const totalItemsCount = STATE.shortcuts.length;
    const actualColumns = Math.min(totalItemsCount, maxColumns);
    
    if (document.body.classList.contains('mode-ios')) {
      container.style.maxWidth = '100%';
    } else {
      const containerMaxWidth = (itemWidth * actualColumns) + (gap * (actualColumns - 1)) + 20;
      container.style.maxWidth = `${containerMaxWidth}px`;
    }

    const fragment = document.createDocumentFragment();

    STATE.shortcuts.forEach((item) => {
      if (!item) return;

      if (item.isFolder) {
        // Render folder card
        const card = document.createElement('div');
        card.className = `shortcut-card size-${STATE.size} folder-card`;
        card.dataset.folderId = item.id;
        card.title = item.name;

        const iconContainer = document.createElement('div');
        iconContainer.className = `shortcut-icon folder-icon-grid`;
        
        const folderShortcuts = item.children || [];
        const previewShortcuts = folderShortcuts.slice(0, 4);

        previewShortcuts.forEach((s) => {
          const miniImg = document.createElement('img');
          miniImg.className = 'folder-mini-icon';
          let hostname = '';
          try { hostname = new URL(s.url).hostname; } catch(e) { hostname = s.url; }
          miniImg.src = s.customIcon || `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
          miniImg.onerror = () => {
            miniImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>';
          };
          iconContainer.appendChild(miniImg);
        });

        if (previewShortcuts.length === 0) {
          iconContainer.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="grid-column: span 2; grid-row: span 2; margin: auto; opacity: 0.7;">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>`;
        }

        const span = document.createElement('span');
        span.className = 'shortcut-label';
        span.textContent = item.name;

        card.appendChild(iconContainer);
        card.appendChild(span);

        // Open folder modal on click
        card.addEventListener('click', (e) => {
          if (document.body.classList.contains('layout-edit-mode')) return;
          openFolder(item.id);
        });

        fragment.appendChild(card);
      } else {
        // Render regular shortcut card
        const card = document.createElement('a');
        card.href = item.url;
        card.className = `shortcut-card size-${STATE.size}`;
        card.title = item.name;
        card.dataset.id = item.id;

        const img = document.createElement('img');
        img.className = 'shortcut-icon';
        img.alt = '';

        let hostname = '';
        try { hostname = new URL(item.url).hostname; } catch (e) { hostname = item.url; }
        img.src = item.customIcon || `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;

        img.onerror = () => {
          img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>';
        };

        const span = document.createElement('span');
        span.className = 'shortcut-label';
        span.textContent = item.name;

        card.appendChild(img);
        card.appendChild(span);
        fragment.appendChild(card);
      }
    });

    container.appendChild(fragment);
  }



  // --- АДАПТИВНЫЙ МЕНЕДЖЕР ТЕМ ---
  const AdaptiveThemeManager = {
    getLib() {
      return window.materialColorUtilities || null;
    },

    async generateThemeFromWallpaper(imageSrc, isDark = null) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 50;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 50, 50);

            const imgData = ctx.getImageData(0, 0, 50, 50).data;
            let r = 0, g = 0, b = 0, count = 0;
            const pixels = [];
            
            for (let i = 0; i < imgData.length; i += 4) {
              const alpha = imgData[i + 3];
              if (alpha > 150) {
                const pr = imgData[i];
                const pg = imgData[i + 1];
                const pb = imgData[i + 2];
                
                r += pr;
                g += pg;
                b += pb;
                count++;

                // Создаем ARGB из пикселя для квантизатора (Celebrity Quantizer)
                if (alpha >= 255) {
                  const argb = ((255 << 24) | (pr << 16) | (pg << 8) | pb) >>> 0;
                  pixels.push(argb);
                }
              }
            }
            
            const avgR = count > 0 ? Math.round(r / count) : 128;
            const avgG = count > 0 ? Math.round(g / count) : 128;
            const avgB = count > 0 ? Math.round(b / count) : 128;
            
            const luminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
            const themeMode = isDark !== null ? isDark : (luminance < 140);

            const lib = this.getLib();
            let sourceColorArgb;

            if (lib && lib.QuantizerCelebi && lib.Score) {
              // Квантизируем пиксели и выбираем лучший цвет
              const quantized = lib.QuantizerCelebi.quantize(pixels, 128);
              const scored = lib.Score.score(quantized);
              if (scored && scored.length > 0) {
                sourceColorArgb = scored[0];
              } else {
                sourceColorArgb = ((255 << 24) | (avgR << 16) | (avgG << 8) | avgB) >>> 0;
              }
            } else {
              sourceColorArgb = ((255 << 24) | (avgR << 16) | (avgG << 8) | avgB) >>> 0;
            }

            const themeData = this.buildScheme(sourceColorArgb, themeMode);
            resolve(themeData);
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = (err) => {
          reject(new Error("Не удалось загрузить изображение: " + err));
        };

        img.src = imageSrc;
      });
    },

    buildScheme(sourceColorArgb, isDark) {
      const lib = this.getLib();

      if (!lib) {
        return this.getFallbackTheme(isDark);
      }

      const theme = lib.themeFromSourceColor(sourceColorArgb);
      const scheme = isDark ? theme.schemes.dark : theme.schemes.light;

      return {
        isDark: isDark,
        sourceColor: this.argbToHex(sourceColorArgb),
        primary: this.argbToHex(scheme.primary),
        primaryRgb: this.argbToRgbComponents(scheme.primary),
        onPrimary: this.argbToHex(scheme.onPrimary),
        secondary: this.argbToHex(scheme.secondary),
        secondaryRgb: this.argbToRgbComponents(scheme.secondary),
        onSecondary: this.argbToHex(scheme.onSecondary),
        surface: this.argbToHex(scheme.surface),
        surfaceRgb: this.argbToRgbComponents(scheme.surface),
        onSurface: this.argbToHex(scheme.onSurface),
        onSurfaceRgb: this.argbToRgbComponents(scheme.onSurface),
        outline: this.argbToHex(scheme.outline),
        outlineRgb: this.argbToRgbComponents(scheme.outline)
      };
    },

    applyThemeToCss(themeData) {
      const root = document.documentElement;
      
      root.style.setProperty('--adapt-primary', themeData.primary);
      root.style.setProperty('--adapt-primary-rgb', themeData.primaryRgb);
      root.style.setProperty('--adapt-on-primary', themeData.onPrimary);
      
      root.style.setProperty('--adapt-secondary', themeData.secondary);
      root.style.setProperty('--adapt-secondary-rgb', themeData.secondaryRgb);
      root.style.setProperty('--adapt-on-secondary', themeData.onSecondary);
      
      root.style.setProperty('--adapt-surface', themeData.surface);
      root.style.setProperty('--adapt-surface-rgb', themeData.surfaceRgb);
      root.style.setProperty('--adapt-on-surface', themeData.onSurface);
      root.style.setProperty('--adapt-on-surface-rgb', themeData.onSurfaceRgb);
      
      root.style.setProperty('--adapt-outline', themeData.outline);
      root.style.setProperty('--adapt-outline-rgb', themeData.outlineRgb);

      if (themeData.isDark) {
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
      } else {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
      }
    },

    argbToHex(argb) {
      const r = (argb >> 16) & 255;
      const g = (argb >> 8) & 255;
      const b = argb & 255;
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    },

    argbToRgbComponents(argb) {
      const r = (argb >> 16) & 255;
      const g = (argb >> 8) & 255;
      const b = argb & 255;
      return `${r}, ${g}, ${b}`;
    },

    getFallbackTheme(isDark) {
      return isDark ? {
        isDark: true,
        primary: '#ffffff',
        primaryRgb: '255, 255, 255',
        onPrimary: '#000000',
        secondary: '#aaaaaa',
        secondaryRgb: '170, 170, 170',
        onSecondary: '#ffffff',
        surface: '#121212',
        surfaceRgb: '18, 18, 18',
        onSurface: '#e0e0e0',
        onSurfaceRgb: '224, 224, 224',
        outline: '#333333',
        outlineRgb: '51, 51, 51'
      } : {
        isDark: false,
        primary: '#000000',
        primaryRgb: '0, 0, 0',
        onPrimary: '#ffffff',
        secondary: '#555555',
        secondaryRgb: '85, 85, 85',
        onSecondary: '#000000',
        surface: '#f5f5f7',
        surfaceRgb: '245, 245, 247',
        onSurface: '#1d1d1f',
        onSurfaceRgb: '29, 29, 31',
        outline: '#e2e2e7',
        outlineRgb: '226, 226, 231'
      };
    }
  };

  // --- РАСПОЛОЖЕНИЕ ЭЛЕМЕНТОВ (LAYOUT DRAG & DROP) ---
  let activeDragElement = null;
  let dragOffset = { x: 0, y: 0 };
  let hasDragged = false;
  let tempPositions = {};
  let layoutGridSnap = null;
  let layoutGridSize = null;
  
  let activeResizeElement = null;
  let resizeStartCoords = { x: 0, y: 0 };
  let resizeStartDimensions = { w: 0, h: 0 };

  function getWidgetKey(element) {
    if (element.id === 'widget-clock') return 'clock';
    if (element.id === 'weather-widget') return 'weather';
    if (element.id === 'search-form') return 'search';
    if (element.id === 'widget-shortcuts') return 'shortcuts';
    return null;
  }

  function applyLayoutPositions() {
    const isIos = document.body.classList.contains('mode-ios');
    const widgets = document.querySelectorAll('.draggable-widget');
    widgets.forEach(widget => {
      const key = getWidgetKey(widget);
      if (key && STATE.layoutPositions && STATE.layoutPositions[key]) {
        const pos = STATE.layoutPositions[key];
        widget.style.position = 'absolute';
        widget.style.margin = '0';
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
        widget.style.transform = 'none';
        widget.style.left = pos.left + '%';
        widget.style.top = pos.top + '%';
        
        if (isIos) {
          const defaultSizes = {
            clock: { w: 8, h: 8 },
            weather: { w: 6, h: 6 },
            search: { w: 8, h: 8 },
            shortcuts: { w: 16, h: 16 }
          };
          const wCells = pos.widthCells || defaultSizes[key].w;
          const hCells = pos.heightCells || defaultSizes[key].h;
          
          widget.style.width = `calc(${wCells} * var(--grid-size, 20px))`;
          widget.style.height = `calc(${hCells} * var(--grid-size, 20px))`;
          
          if (wCells >= hCells * 1.4) {
            widget.classList.add('widget-wide');
          } else {
            widget.classList.remove('widget-wide');
          }
        } else {
          widget.style.width = '';
          widget.style.height = '';
          widget.classList.remove('widget-wide');
        }
      } else {
        widget.style.position = '';
        widget.style.margin = '';
        widget.style.right = '';
        widget.style.bottom = '';
        widget.style.transform = '';
        widget.style.left = '';
        widget.style.top = '';
        widget.style.width = '';
        widget.style.height = '';
        widget.classList.remove('widget-wide');
      }
    });
  }

  function initLayoutDragAndDrop() {
    // Динамически создаем направляющие линии примагничивания, если их нет в DOM
    if (!document.getElementById('guide-line-x')) {
      const guideX = document.createElement('div');
      guideX.id = 'guide-line-x';
      guideX.className = 'guide-line guide-line-x';
      document.body.appendChild(guideX);
    }
    if (!document.getElementById('guide-line-y')) {
      const guideY = document.createElement('div');
      guideY.id = 'guide-line-y';
      guideY.className = 'guide-line guide-line-y';
      document.body.appendChild(guideY);
    }

    const widgets = document.querySelectorAll('.draggable-widget');
    
    widgets.forEach(widget => {
      widget.addEventListener('mousedown', onDragStart);
      widget.addEventListener('touchstart', onDragStart, { passive: false });
    });
    
    document.addEventListener('mousemove', (e) => {
      if (activeResizeElement) {
        onResizeMove(e);
      } else {
        onDragMove(e);
      }
    });
    document.addEventListener('touchmove', (e) => {
      if (activeResizeElement) {
        onResizeMove(e);
      } else {
        onDragMove(e);
      }
    }, { passive: false });
    
    document.addEventListener('mouseup', () => {
      if (activeResizeElement) {
        onResizeEnd();
      } else {
        onDragEnd();
      }
    });
    document.addEventListener('touchend', () => {
      if (activeResizeElement) {
        onResizeEnd();
      } else {
        onDragEnd();
      }
    });
  }

  function onDragStart(e) {
    if (!document.body.classList.contains('layout-edit-mode')) return;
    
    const widget = e.currentTarget;
    activeDragElement = widget;
    hasDragged = false;

    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    
    const rect = widget.getBoundingClientRect();
    
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
    
    widget.style.position = 'absolute';
    widget.style.margin = '0';
    widget.style.transform = 'none';
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    widget.style.left = rect.left + 'px';
    widget.style.top = rect.top + 'px';
  }

  function onDragMove(e) {
    if (!activeDragElement) return;
    hasDragged = true;

    if (e.cancelable) {
      e.preventDefault();
    }

    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    
    let newLeft = clientX - dragOffset.x;
    let newTop = clientY - dragOffset.y;
    
    // Сначала обычная сетка привязки (если активна)
    if (layoutGridSnap && layoutGridSnap.checked) {
      const gridSize = parseInt(layoutGridSize.value) || 20;
      newLeft = Math.round(newLeft / gridSize) * gridSize;
      newTop = Math.round(newTop / gridSize) * gridSize;
    }
    
    // Получаем оригинальные физические размеры элемента без учета CSS-масштабирования (scale)
    const widgetWidth = activeDragElement.offsetWidth;
    const widgetHeight = activeDragElement.offsetHeight;
    const key = getWidgetKey(activeDragElement);
    
    // Если перетаскивается блок ярлыков в классическом режиме, фиксируем его горизонтальное положение строго по центру.
    // В режиме iOS разрешаем свободное перемещение по горизонтали.
    if (key === 'shortcuts' && !document.body.classList.contains('mode-ios')) {
      newLeft = (window.innerWidth - widgetWidth) / 2;
    }
    
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    
    const snapThreshold = 15; // Расстояние притяжения в пикселях (как в PowerPoint/Figma)
    let snappedX = false;
    let snappedY = false;
    
    // 1. Притягивание к вертикальной оси центра экрана (для всех виджетов, кроме ярлыков в классическом режиме)
    // Магнитится по 3 точкам: левый край, центр, правый край к центральной вертикали
    if (key !== 'shortcuts' || document.body.classList.contains('mode-ios')) {
      const distCenterX = Math.abs((newLeft + widgetWidth / 2) - viewportCenterX);
      const distLeftX = Math.abs(newLeft - viewportCenterX);
      const distRightX = Math.abs((newLeft + widgetWidth) - viewportCenterX);
      
      const minDistX = Math.min(distCenterX, distLeftX, distRightX);
      
      if (minDistX < snapThreshold) {
        if (minDistX === distCenterX) {
          newLeft = viewportCenterX - widgetWidth / 2; // Примагнитить по центру
        } else if (minDistX === distLeftX) {
          newLeft = viewportCenterX; // Разместить справа от оси (левый край на оси)
        } else {
          newLeft = viewportCenterX - widgetWidth; // Разместить слева от оси (правый край на оси)
        }
        snappedX = true;
      }
    }
    
    // 2. Притягивание к горизонтальной оси центра экрана (для всех виджетов, включая ярлыки)
    // Магнитится по 3 точкам: верхний край, центр, нижний край к центральной горизонтали
    const distCenterY = Math.abs((newTop + widgetHeight / 2) - viewportCenterY);
    const distTopY = Math.abs(newTop - viewportCenterY);
    const distBottomY = Math.abs((newTop + widgetHeight) - viewportCenterY);
    
    const minDistY = Math.min(distCenterY, distTopY, distBottomY);
    
    if (minDistY < snapThreshold) {
      if (minDistY === distCenterY) {
        newTop = viewportCenterY - widgetHeight / 2; // Примагнитить по центру
      } else if (minDistY === distTopY) {
        newTop = viewportCenterY; // Разместить под осью (верхний край на оси)
      } else {
        newTop = viewportCenterY - widgetHeight; // Разместить над осью (нижний край на оси)
      }
      snappedY = true;
    }
    
    // Управление подсветкой осей
    const guideLineX = document.getElementById('guide-line-x');
    const guideLineY = document.getElementById('guide-line-y');
    
    if (guideLineX) {
      if (snappedX) {
        guideLineX.classList.add('active');
      } else {
        guideLineX.classList.remove('active');
      }
    }
    
    if (guideLineY) {
      if (snappedY) {
        guideLineY.classList.add('active');
      } else {
        guideLineY.classList.remove('active');
      }
    }
    
    // Дополнительный визуальный эффект на самом элементе при магнитной стыковке
    if (snappedX || snappedY) {
      activeDragElement.classList.add('widget-snapped');
    } else {
      activeDragElement.classList.remove('widget-snapped');
    }
    
    const minLeft = 0;
    const minTop = 0;
    const maxLeft = window.innerWidth - widgetWidth;
    const maxTop = window.innerHeight - widgetHeight;
    
    if (newLeft < minLeft) newLeft = minLeft;
    if (newLeft > maxLeft) newLeft = maxLeft;
    if (newTop < minTop) newTop = minTop;
    if (newTop > maxTop) newTop = maxTop;
    
    activeDragElement.style.left = newLeft + 'px';
    activeDragElement.style.top = newTop + 'px';
  }

  function onDragEnd() {
    if (!activeDragElement) return;
    
    const key = getWidgetKey(activeDragElement);
    if (key && hasDragged) {
      // Используем offsetLeft и offsetTop вместо getBoundingClientRect()
      // Это полностью исключает смещения, вызванные CSS-эффектом transform: scale(1.02)
      const layoutLeft = activeDragElement.offsetLeft;
      const layoutTop = activeDragElement.offsetTop;
      
      if (!tempPositions[key]) {
        tempPositions[key] = {};
      }
      tempPositions[key].left = (layoutLeft / window.innerWidth) * 100;
      tempPositions[key].top = (layoutTop / window.innerHeight) * 100;
    }
    
    // Сбрасываем эффекты и скрываем линии
    activeDragElement.classList.remove('widget-snapped');
    const guideLineX = document.getElementById('guide-line-x');
    const guideLineY = document.getElementById('guide-line-y');
    if (guideLineX) guideLineX.classList.remove('active');
    if (guideLineY) guideLineY.classList.remove('active');
    
    activeDragElement = null;
  }

  function onResizeStart(e) {
    e.stopPropagation();
    e.preventDefault();
    if (!document.body.classList.contains('layout-edit-mode')) return;

    const handle = e.currentTarget;
    const widget = handle.parentElement;
    activeResizeElement = widget;

    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

    resizeStartCoords.x = clientX;
    resizeStartCoords.y = clientY;
    resizeStartDimensions.w = widget.offsetWidth;
    resizeStartDimensions.h = widget.offsetHeight;
  }

  function onResizeMove(e) {
    if (!activeResizeElement) return;
    if (e.cancelable) {
      e.preventDefault();
    }

    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - resizeStartCoords.x;
    const deltaY = clientY - resizeStartCoords.y;

    let newWidth = resizeStartDimensions.w + deltaX;
    let newHeight = resizeStartDimensions.h + deltaY;

    const gridSize = parseInt(layoutGridSize.value) || 20;

    // Сетка привязки при изменении размеров
    if (layoutGridSnap && layoutGridSnap.checked) {
      newWidth = Math.round(newWidth / gridSize) * gridSize;
      newHeight = Math.round(newHeight / gridSize) * gridSize;
    }

    const key = getWidgetKey(activeResizeElement);
    
    // Безопасные минимальные границы в сетке
    const defaultMinCells = {
      clock: { w: 4, h: 4 },
      weather: { w: 4, h: 4 },
      search: { w: 6, h: 3 },
      shortcuts: { w: 6, h: 6 }
    };
    
    const minCells = defaultMinCells[key] || { w: 4, h: 4 };
    const minWidth = minCells.w * gridSize;
    const minHeight = minCells.h * gridSize;

    if (newWidth < minWidth) newWidth = minWidth;
    if (newHeight < minHeight) newHeight = minHeight;

    activeResizeElement.style.width = newWidth + 'px';
    activeResizeElement.style.height = newHeight + 'px';

    const wCells = Math.round(newWidth / gridSize);
    const hCells = Math.round(newHeight / gridSize);

    // Добавляем класс широкого виджета для перестроения контента
    if (wCells >= hCells * 1.4) {
      activeResizeElement.classList.add('widget-wide');
    } else {
      activeResizeElement.classList.remove('widget-wide');
    }

    if (key) {
      if (!tempPositions[key]) {
        // Если временных координат еще нет, инициализируем
        const leftPct = (activeResizeElement.offsetLeft / window.innerWidth) * 100;
        const topPct = (activeResizeElement.offsetTop / window.innerHeight) * 100;
        tempPositions[key] = { left: leftPct, top: topPct };
      }
      const prevW = tempPositions[key].widthCells;
      tempPositions[key].widthCells = wCells;
      tempPositions[key].heightCells = hCells;

      // Оптимизация: перерисовываем ярлыки только если число колонок в сетке изменилось
      if (key === 'shortcuts' && prevW !== wCells) {
        renderShortcuts();
      }
    }
  }

  function onResizeEnd() {
    if (!activeResizeElement) return;
    activeResizeElement = null;
  }

  function removeResizeHandles() {
    const handles = document.querySelectorAll('.widget-resize-handle');
    handles.forEach(h => h.remove());
  }

  // --- ИНИЦИАЛИЗАЦИЯ КНОПОК РАСПОЛОЖЕНИЯ ---
  const btnEditLayout = document.getElementById('btn-edit-layout');
  const btnResetLayout = document.getElementById('btn-reset-layout');
  const layoutSaveBtn = document.getElementById('layout-save-btn');
  const layoutCancelBtn = document.getElementById('layout-cancel-btn');
  const layoutEditControls = document.getElementById('layout-edit-controls');
  const settingsModal = document.getElementById('settings-modal');

  layoutGridSnap = document.getElementById('layout-grid-snap');
  layoutGridSize = document.getElementById('layout-grid-size');

  if (layoutGridSnap) {
    layoutGridSnap.addEventListener('change', () => {
      const active = layoutGridSnap.checked;
      if (layoutGridSize) {
        layoutGridSize.style.display = active ? 'inline-block' : 'none';
      }
      if (active) {
        document.body.classList.add('layout-grid-active');
        const size = layoutGridSize ? layoutGridSize.value : 20;
        document.body.style.setProperty('--grid-size', size + 'px');
      } else {
        document.body.classList.remove('layout-grid-active');
        document.body.style.removeProperty('--grid-size');
      }
    });
  }

  if (layoutGridSize) {
    layoutGridSize.addEventListener('change', () => {
      const size = layoutGridSize.value;
      document.body.style.setProperty('--grid-size', size + 'px');
    });
  }

  if (btnEditLayout) {
    btnEditLayout.addEventListener('click', () => {
      if (settingsModal) settingsModal.classList.remove('active');
      
      document.body.classList.add('layout-edit-mode');
      if (layoutEditControls) layoutEditControls.style.display = 'flex';
      
      // Инициализируем настройки сетки из STATE
      if (layoutGridSnap) {
        layoutGridSnap.checked = STATE.layoutGridSnap;
      }
      if (layoutGridSize) {
        layoutGridSize.value = STATE.layoutGridSize || 20;
        layoutGridSize.style.display = STATE.layoutGridSnap ? 'inline-block' : 'none';
      }
      if (STATE.layoutGridSnap) {
        document.body.classList.add('layout-grid-active');
        document.body.style.setProperty('--grid-size', (STATE.layoutGridSize || 20) + 'px');
      } else {
        document.body.classList.remove('layout-grid-active');
        document.body.style.removeProperty('--grid-size');
      }

      tempPositions = {};
      const widgets = document.querySelectorAll('.draggable-widget');
      
      // Сначала измеряем координаты ВСЕХ элементов, пока они находятся в естественном потоке!
      // Это полностью предотвращает схлопывание высоты страницы и преждевременный сдвиг последующих элементов.
      const rects = Array.from(widgets).map(w => w.getBoundingClientRect());
      
      widgets.forEach((widget, index) => {
        const key = getWidgetKey(widget);
        const rect = rects[index];
        
        if (key) {
          if (STATE.layoutPositions && STATE.layoutPositions[key]) {
            tempPositions[key] = { ...STATE.layoutPositions[key] };
          } else {
            // Если сохраненного положения еще нет, инициализируем его на основе текущих экранных координат
            tempPositions[key] = {
              left: (rect.left / window.innerWidth) * 100,
              top: (rect.top / window.innerHeight) * 100
            };
          }
        }
        
        widget.style.position = 'absolute';
        widget.style.margin = '0';
        widget.style.transform = 'none';
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
        widget.style.left = rect.left + 'px';
        widget.style.top = rect.top + 'px';

        // Добавляем ручки изменения размера в режиме iOS
        if (document.body.classList.contains('mode-ios')) {
          const oldHandle = widget.querySelector('.widget-resize-handle');
          if (oldHandle) oldHandle.remove();
          
          const handle = document.createElement('div');
          handle.className = 'widget-resize-handle';
          widget.appendChild(handle);
          
          handle.addEventListener('mousedown', onResizeStart);
          handle.addEventListener('touchstart', onResizeStart, { passive: false });
        }
      });
    });
  }

  if (layoutSaveBtn) {
    layoutSaveBtn.addEventListener('click', () => {
      if (!STATE.layoutPositions) STATE.layoutPositions = {};
      
      const widgets = document.querySelectorAll('.draggable-widget');
      widgets.forEach(widget => {
        const key = getWidgetKey(widget);
        if (key && tempPositions[key]) {
          STATE.layoutPositions[key] = tempPositions[key];
        }
      });
      
      // Сохраняем состояние сетки
      if (layoutGridSnap) {
        STATE.layoutGridSnap = layoutGridSnap.checked;
      }
      if (layoutGridSize) {
        STATE.layoutGridSize = parseInt(layoutGridSize.value) || 20;
      }

      saveState();
      
      document.body.classList.remove('layout-edit-mode');
      document.body.classList.remove('layout-grid-active');
      document.body.style.setProperty('--grid-size', STATE.layoutGridSize + 'px');
      if (layoutEditControls) layoutEditControls.style.display = 'none';
      removeResizeHandles();
      applyLayoutPositions();
    });
  }

  if (layoutCancelBtn) {
    layoutCancelBtn.addEventListener('click', () => {
      document.body.classList.remove('layout-edit-mode');
      document.body.classList.remove('layout-grid-active');
      document.body.style.setProperty('--grid-size', STATE.layoutGridSize + 'px');
      if (layoutEditControls) layoutEditControls.style.display = 'none';
      removeResizeHandles();
      applyLayoutPositions();
    });
  }

  if (btnResetLayout) {
    btnResetLayout.addEventListener('click', () => {
      STATE.layoutPositions = null;
      STATE.layoutGridSnap = false;
      STATE.layoutGridSize = 20;
      saveState();
      
      document.body.classList.remove('layout-edit-mode');
      document.body.classList.remove('layout-grid-active');
      document.body.style.setProperty('--grid-size', '20px');
      if (layoutEditControls) layoutEditControls.style.display = 'none';
      removeResizeHandles();
      applyLayoutPositions();
    });
  }

  // --- УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЬСКИМИ ПОИСКОВИКАМИ ---
  function populateSearchEnginesSelect() {
    const select = document.getElementById('search-engine-select');
    if (!select) return;
    
    const currentVal = STATE.searchEngine;
    select.innerHTML = '';
    
    const defaultEngines = [
      { id: 'duckduckgo', name: 'DuckDuckGo' },
      { id: 'yandex', name: 'Yandex' },
      { id: 'google', name: 'Google' },
      { id: 'brave', name: 'Brave' },
      { id: 'bing', name: 'Bing' },
      { id: 'qwant', name: 'Qwant' },
      { id: 'startpage', name: 'Startpage' }
    ];
    
    defaultEngines.forEach(eng => {
      const opt = document.createElement('option');
      opt.value = eng.id;
      opt.textContent = eng.name;
      select.appendChild(opt);
    });
    
    if (STATE.customSearchEngines && Array.isArray(STATE.customSearchEngines)) {
      STATE.customSearchEngines.forEach(eng => {
        const opt = document.createElement('option');
        opt.value = eng.id;
        opt.textContent = eng.name;
        select.appendChild(opt);
      });
    }
    
    select.value = currentVal;
    
    if (select.selectedIndex === -1) {
      select.value = 'duckduckgo';
      STATE.searchEngine = 'duckduckgo';
      saveState();
    }
  }

  function renderCustomSearchEngines() {
    const list = document.getElementById('custom-engines-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (!STATE.customSearchEngines || STATE.customSearchEngines.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.fontSize = '0.8rem';
      emptyMsg.style.opacity = '0.6';
      emptyMsg.style.padding = '4px 0';
      emptyMsg.textContent = STATE.language === 'ru' ? 'Нет пользовательских поисковиков' : 'No custom search engines';
      list.appendChild(emptyMsg);
      return;
    }
    
    STATE.customSearchEngines.forEach(eng => {
      const item = document.createElement('div');
      item.className = 'custom-engine-item';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';
      item.style.padding = '6px';
      item.style.borderBottom = '1px solid var(--border-color, #444)';
      item.style.gap = '8px';
      
      const leftPart = document.createElement('div');
      leftPart.style.display = 'flex';
      leftPart.style.alignItems = 'center';
      leftPart.style.gap = '8px';
      leftPart.style.overflow = 'hidden';
      
      const logoImg = document.createElement('img');
      logoImg.src = eng.logo || 'assets/favicon.png';
      logoImg.style.width = '16px';
      logoImg.style.height = '16px';
      logoImg.style.objectFit = 'contain';
      
      const details = document.createElement('div');
      details.style.overflow = 'hidden';
      details.style.textOverflow = 'ellipsis';
      details.style.whiteSpace = 'nowrap';
      
      const name = document.createElement('div');
      name.style.fontWeight = '600';
      name.style.fontSize = '0.8rem';
      name.textContent = eng.name;
      
      const url = document.createElement('div');
      url.style.fontSize = '0.7rem';
      url.style.opacity = '0.5';
      url.style.overflow = 'hidden';
      url.style.textOverflow = 'ellipsis';
      url.textContent = eng.queryUrl;
      
      details.appendChild(name);
      details.appendChild(url);
      leftPart.appendChild(logoImg);
      leftPart.appendChild(details);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger-action';
      deleteBtn.style.padding = '2px 6px';
      deleteBtn.style.fontSize = '0.75rem';
      deleteBtn.textContent = STATE.language === 'ru' ? 'Удалить' : 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (STATE.searchEngine === eng.id) {
          STATE.searchEngine = 'duckduckgo';
        }
        STATE.customSearchEngines = STATE.customSearchEngines.filter(e => e.id !== eng.id);
        saveState();
        populateSearchEnginesSelect();
        updateSearchEngineUI();
        renderCustomSearchEngines();
      });
      
      item.appendChild(leftPart);
      item.appendChild(deleteBtn);
      list.appendChild(item);
    });
  }

  function initCustomSearchEngines() {
    const toggleBtn = document.getElementById('btn-toggle-custom-engines');
    const panel = document.getElementById('custom-engines-panel');
    const form = document.getElementById('add-custom-engine-form');
    const nameInput = document.getElementById('custom-engine-name');
    const queryInput = document.getElementById('custom-engine-query');
    const fileInput = document.getElementById('custom-engine-logo-file');
    const statusText = document.getElementById('custom-engine-logo-status');
    
    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        if (panel.style.display === 'none') {
          panel.style.display = 'flex';
          renderCustomSearchEngines();
        } else {
          panel.style.display = 'none';
        }
      });
    }
    
    if (fileInput && statusText) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          statusText.textContent = TRANSLATIONS[STATE.language].logoLoadedStatus || 'Selected';
          statusText.style.color = '#4caf50';
        } else {
          statusText.textContent = '';
        }
      });
    }
    
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        let queryUrl = queryInput.value.trim();
        
        if (name && queryUrl) {
          if (!/^https?:\/\//i.test(queryUrl)) {
            queryUrl = 'https://' + queryUrl;
          }
          
          const newId = 'custom_' + Date.now();
          
          const saveEngine = (logo) => {
            if (!STATE.customSearchEngines) STATE.customSearchEngines = [];
            STATE.customSearchEngines.push({
              id: newId,
              name,
              queryUrl,
              logo
            });
            saveState();
            populateSearchEnginesSelect();
            renderCustomSearchEngines();
            
            form.reset();
            if (statusText) statusText.textContent = '';
          };
          
          const file = fileInput ? fileInput.files[0] : null;
          if (file) {
            compressImage(file, 64, 64, 0.85, (result) => {
              saveEngine(result);
            });
          } else {
            saveEngine(null);
          }
        }
      });
    }
  }

  initLayoutDragAndDrop();

  initCustomSearchEngines();

  loadState();
});