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
      
      // Локализация вкладок/категорий
      shortcutCategoryLabel: "Category",
      addCategoryTitle: "Add Category",
      defaultCategoryName: "General",
      addCategoryPrompt: "Enter new category name:",
      renameCategoryPrompt: "Rename category to:",
      deleteCategoryConfirm: "Are you sure you want to delete this category? All its shortcuts will be moved to General.",
      searchEngineLabel: "Search Engine",
      iosModeLabel: "iOS Widget Mode (Square tiles)"
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
      
      // Локализация вкладок/категорий
      shortcutCategoryLabel: "Категория",
      addCategoryTitle: "Добавить категорию",
      defaultCategoryName: "Общая",
      addCategoryPrompt: "Введите название новой категории:",
      renameCategoryPrompt: "Переименовать категорию в:",
      deleteCategoryConfirm: "Вы уверены, что хотите удалить эту категорию? Все её ярлыки будут перенесены в Общую.",
      searchEngineLabel: "Поисковая система",
      iosModeLabel: "Режим виджетов iOS (Квадратные плитки)"
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
          result[key] = value ? JSON.parse(value) : null;
        });
        callback(isArray ? result : result[keys]);
      }
    },
    set: (data, callback) => {
      if (data && data.hasOwnProperty('customFavicon')) {
        if (data.customFavicon === null) {
          localStorage.removeItem('customFavicon');
        } else {
          localStorage.setItem('customFavicon', JSON.stringify(data.customFavicon));
        }
      }
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(data, callback);
      } else {
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, JSON.stringify(data[key]));
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
          localStorage.setItem('customFavicon', JSON.stringify(data.customFavicon));
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
          localStorage.setItem(key, JSON.stringify(data[key]));
        });
        if (callback) callback();
      }
    }
  };

  // --- ЧИСТЫЙ СТАРТОВЫЙ ШАБЛОН ---
  const DEFAULT_SHORTCUTS = [];

  const STATE = {
    shortcuts: [],
    categories: [{ id: "default", name: "General" }],
    activeCategory: "default",
    activeSettingsCategory: "default",
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
    weatherCache: { temp: "", code: null, desc: "", timestamp: 0 }
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
        clockElement.innerHTML = `${timeString}<span class="clock-ampm">${ampm.trim()}</span>`;
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
        const baseUrl = engines[STATE.searchEngine] || engines.duckduckgo;
        window.location.href = baseUrl + encodeURIComponent(query);
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
      renderSettingsCategories();
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
      populateCategorySelects();
      renderSettingsCategories();
      renderMainCategories();
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
  const newCategorySelect = document.getElementById('new-shortcut-category');

  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = newNameInput.value.trim();
      let url = newUrlInput.value.trim();
      const category = newCategorySelect ? newCategorySelect.value : "default";

      if (name && url) {
        if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }

        const saveShortcut = (customIcon) => {
          STATE.shortcuts.push({ name, url, customIcon, category });
          saveState();
          renderShortcuts();
          renderModalShortcutsList();

          addForm.reset();
          populateCategorySelects();
          
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
      weatherDetails.innerHTML = `${desc}<br>${cityName}`;
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

  // --- УПРАВЛЕНИЕ КАТЕГОРИЯМИ ---
  const btnAddCategory = document.getElementById('btn-add-category');
  if (btnAddCategory) {
    btnAddCategory.addEventListener('click', () => {
      const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
      const catName = prompt(currentDict.addCategoryPrompt);
      if (catName && catName.trim()) {
        const newId = "cat_" + Date.now();
        STATE.categories.push({ id: newId, name: catName.trim() });
        saveState();
        renderSettingsCategories();
        renderMainCategories();
        populateCategorySelects();
      }
    });
  }

  function populateCategorySelects() {
    const selects = [newCategorySelect];
    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

    selects.forEach(select => {
      if (select) {
        select.innerHTML = '';
        const fragment = document.createDocumentFragment();
        STATE.categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = cat.id === 'default' ? currentDict.defaultCategoryName : cat.name;
          fragment.appendChild(opt);
        });
        select.appendChild(fragment);
      }
    });
  }

  function renderSettingsCategories() {
    const tabsContainer = document.getElementById('settings-categories-tabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    const fragment = document.createDocumentFragment();

    STATE.categories.forEach((cat, index) => {
      const tab = document.createElement('div');
      tab.className = 'settings-category-tab';
      if (cat.id === STATE.activeSettingsCategory) {
        tab.classList.add('active');
      }
      tab.textContent = cat.id === 'default' ? currentDict.defaultCategoryName : cat.name;
      
      tab.setAttribute('draggable', true);
      tab.dataset.id = cat.id;
      tab.dataset.index = index;

      tab.addEventListener('click', () => {
        STATE.activeSettingsCategory = cat.id;
        renderSettingsCategories();
        renderModalShortcutsList();
      });

      tab.addEventListener('dragstart', (e) => {
        dragCategorySrcId = cat.id;
        e.dataTransfer.effectAllowed = 'move';
        tab.classList.add('dragging');
      });

      tab.addEventListener('dragend', () => {
        tab.classList.remove('dragging');
        const items = tabsContainer.querySelectorAll('.settings-category-tab');
        items.forEach(item => item.classList.remove('drag-over'));
      });

      tab.addEventListener('dragover', (e) => {
        e.preventDefault();
        tab.classList.add('drag-over');
      });

      tab.addEventListener('dragleave', () => {
        tab.classList.remove('drag-over');
      });

      tab.addEventListener('drop', (e) => {
        e.preventDefault();
        tab.classList.remove('drag-over');
        const targetIndex = parseInt(tab.dataset.index, 10);
        const srcIndex = STATE.categories.findIndex(c => c.id === dragCategorySrcId);
        
        if (srcIndex !== -1 && srcIndex !== targetIndex) {
          const [movedCat] = STATE.categories.splice(srcIndex, 1);
          STATE.categories.splice(targetIndex, 0, movedCat);
          saveState();
          renderSettingsCategories();
          renderMainCategories();
          populateCategorySelects();
        }
      });

      tab.addEventListener('dblclick', () => {
        if (cat.id === 'default') return;
        const newName = prompt(currentDict.renameCategoryPrompt, cat.name);
        if (newName && newName.trim()) {
          cat.name = newName.trim();
          saveState();
          renderSettingsCategories();
          renderMainCategories();
          populateCategorySelects();
        }
      });

      tab.addEventListener('contextmenu', (e) => {
        if (cat.id === 'default') return;
        e.preventDefault();
        const confirmDelete = confirm(currentDict.deleteCategoryConfirm);
        if (confirmDelete) {
          STATE.categories = STATE.categories.filter(c => c.id !== cat.id);
          
          STATE.shortcuts.forEach(s => {
            if (s.category === cat.id) {
              s.category = 'default';
            }
          });

          if (STATE.activeCategory === cat.id) STATE.activeCategory = 'default';
          if (STATE.activeSettingsCategory === cat.id) STATE.activeSettingsCategory = 'default';

          saveState();
          renderShortcuts();
          renderSettingsCategories();
          renderMainCategories();
          populateCategorySelects();
          renderModalShortcutsList();
        }
      });

      fragment.appendChild(tab);
    });

    tabsContainer.appendChild(fragment);
  }

  function renderMainCategories() {
    const mainTabsContainer = document.getElementById('main-categories-container');
    if (!mainTabsContainer) return;
    mainTabsContainer.innerHTML = '';

    if (STATE.categories.length <= 1) {
      mainTabsContainer.style.display = 'none';
      return;
    }

    mainTabsContainer.style.display = 'flex';
    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    const fragment = document.createDocumentFragment();

    STATE.categories.forEach(cat => {
      const tab = document.createElement('div');
      tab.className = 'main-category-tab';
      if (cat.id === STATE.activeCategory) {
        tab.classList.add('active');
      }
      tab.textContent = cat.id === 'default' ? currentDict.defaultCategoryName : cat.name;

      tab.addEventListener('click', () => {
        switchMainCategory(cat.id);
      });

      fragment.appendChild(tab);
    });

    mainTabsContainer.appendChild(fragment);
  }

  function switchMainCategory(newCategoryId) {
    const shortcutsContainer = document.getElementById('shortcuts-container');
    if (shortcutsContainer) {
      shortcutsContainer.classList.add('fade-out');
      setTimeout(() => {
        STATE.activeCategory = newCategoryId;
        renderMainCategories();
        renderShortcuts();
        
        // Принудительный Reflow, чтобы зафиксировать состояние opacity: 0
        void shortcutsContainer.offsetHeight; 
        
        shortcutsContainer.classList.remove('fade-out');
      }, 150);
    } else {
      STATE.activeCategory = newCategoryId;
      renderMainCategories();
      renderShortcuts();
    }
  }

  window.addEventListener('wheel', (e) => {
    if (modal && modal.classList.contains('active')) return;
    if (STATE.categories.length <= 1) return;

    if (Math.abs(e.deltaY) < 15) return;

    const currentIndex = STATE.categories.findIndex(c => c.id === STATE.activeCategory);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.deltaY > 0) {
      nextIndex = (currentIndex + 1) % STATE.categories.length;
    } else {
      nextIndex = (currentIndex - 1 + STATE.categories.length) % STATE.categories.length;
    }

    switchMainCategory(STATE.categories[nextIndex].id);
  }, { passive: true });

  // --- ЭКСПОРТ И ИМПОРТ НАСТРОЕК (JSON-БЭКАП) ---
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      storage.getAll((allData) => {
        const dataStr = JSON.stringify(allData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileName = 'brave_new_tab_backup.json';
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
          const data = JSON.parse(event.target.result);

          const shortcuts = Array.isArray(data.shortcuts) ? data.shortcuts : DEFAULT_SHORTCUTS;
          const categories = Array.isArray(data.categories) ? data.categories : [{ id: "default", name: "General" }];
          
          shortcuts.forEach(s => {
            if (!s.category) s.category = "default";
          });

          const columns = data.columns ?? 10;
          const size = data.size ?? 'small';
          
          let format12h = false;
          if (data.format12h !== undefined && data.format12h !== null) {
            format12h = data.format12h;
          } else if (data.timeFormat === '12h') {
            format12h = true;
          }

          const showSeconds = data.showSeconds ?? false;
          const showDate = data.showDate ?? true;
          let theme = data.theme ?? 'dark';
          if (theme === 'nord') theme = 'dark';
          const adaptiveThemeData = data.adaptiveThemeData ?? null;
          const layoutPositions = data.layoutPositions ?? null;
          const layoutGridSnap = data.layoutGridSnap ?? false;
          const layoutGridSize = data.layoutGridSize ?? 20;
          const showClock = data.showClock ?? true;
          const showWeather = data.showWeather ?? false;
          const weatherCity = data.weatherCity ?? '';
          const weatherCoords = data.weatherCoords ?? { lat: null, lon: null, resolvedName: '' };
          const weatherCache = data.weatherCache ?? { temp: '', code: null, desc: '', timestamp: 0 };

          const cleanedData = {
            shortcuts,
            categories,
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
            weatherCache
          };

          storage.clearAndSet(cleanedData, () => {
            window.location.reload();
          });

        } catch (err) {
          alert(TRANSLATIONS[STATE.language].importError);
          importFileInput.value = '';
        }
      };

      reader.onerror = () => {
        alert(TRANSLATIONS[STATE.language].importReadError);
        importFileInput.value = '';
      };

      reader.readAsText(file);
    });
  }

  // --- ФУНКЦИИ ОБРАБОТКИ ДАННЫХ И ОТРИСОВКИ ---

  function loadState() {
    storage.get(['shortcuts', 'categories', 'columns', 'size', 'customBackground', 'customFavicon', 'language', 'searchEngine', 'showDate', 'format12h', 'showSeconds', 'theme', 'adaptiveThemeData', 'layoutPositions', 'layoutGridSnap', 'layoutGridSize', 'layoutIosMode', 'showClock', 'showWeather', 'weatherCity', 'weatherCoords', 'weatherCache'], (result) => {
      STATE.shortcuts = result.shortcuts ?? DEFAULT_SHORTCUTS;
      STATE.categories = result.categories ?? [{ id: "default", name: "General" }];
      STATE.columns = result.columns ?? 10;
      STATE.size = result.size ?? "small";
      STATE.customBackground = result.customBackground ?? null;
      STATE.customFavicon = result.customFavicon ?? null;
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
      STATE.showClock = result.showClock ?? true;
      STATE.showWeather = result.showWeather ?? false;
      STATE.weatherCity = result.weatherCity ?? "";
      STATE.weatherCoords = result.weatherCoords ?? { lat: null, lon: null, resolvedName: "" };
      STATE.weatherCache = result.weatherCache ?? { temp: "", code: null, desc: "", timestamp: 0 };

      STATE.shortcuts.forEach(s => {
        if (!s.category) s.category = "default";
      });

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

      if (STATE.layoutIosMode) {
        document.body.classList.add('mode-ios');
      } else {
        document.body.classList.remove('mode-ios');
      }

      applyBackground();
      applyFavicon();
      applyTheme();
      document.body.style.setProperty('--grid-size', STATE.layoutGridSize + 'px');
      applyLayoutPositions();
      applyClockVisibility();
      applyWeatherVisibility();
      applyLanguage(STATE.language);
      updateSearchEngineUI();
      updateClockAndDate();
      updateWeatherWidget();
      populateCategorySelects();
      renderMainCategories();
      renderShortcuts();

      if (STATE.showWeather && STATE.weatherCoords && STATE.weatherCoords.resolvedName) {
        updateStatusText("success", STATE.weatherCoords.resolvedName);
      }
    });
  }

  function saveState() {
    storage.set({
      shortcuts: STATE.shortcuts,
      categories: STATE.categories,
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
      showClock: STATE.showClock,
      showWeather: STATE.showWeather,
      weatherCity: STATE.weatherCity,
      weatherCoords: STATE.weatherCoords,
      weatherCache: STATE.weatherCache
    });
  }

  function updateSearchEngineUI() {
    const select = document.getElementById('search-engine-select');
    if (select) {
      select.value = STATE.searchEngine;
    }
    const logo = document.getElementById('search-engine-logo');
    if (logo) {
      logo.src = 'assets/search_' + STATE.searchEngine + '.png';
      if (STATE.searchEngine === 'brave') {
        logo.classList.add('inverted');
      } else {
        logo.classList.remove('inverted');
      }
    }
    const settingsSearchLogo = document.getElementById('settings-search-logo');
    if (settingsSearchLogo) {
      settingsSearchLogo.src = 'assets/search_' + STATE.searchEngine + '.png';
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

    const filteredShortcuts = STATE.categories.length > 1
      ? STATE.shortcuts.filter(s => s.category === STATE.activeCategory)
      : STATE.shortcuts;

    let itemWidth = 85; 
    if (STATE.size === "small") itemWidth = 85;
    if (STATE.size === "medium") itemWidth = 98;
    if (STATE.size === "large") itemWidth = 110;

    const gap = 16;
    const maxColumns = STATE.columns;
    const actualColumns = Math.min(filteredShortcuts.length, maxColumns);
    
    if (document.body.classList.contains('mode-ios')) {
      container.style.maxWidth = '100%';
    } else {
      // Добавляем запас (+20px): 16px для компенсации padding (8px с каждой стороны) контейнера и +4px для погрешностей субпиксельного рендеринга на масштабированных экранах.
      // Это гарантирует, что последний ярлык в ряду никогда не перенесется на следующую строку.
      const containerMaxWidth = (itemWidth * actualColumns) + (gap * (actualColumns - 1)) + 20;
      container.style.maxWidth = `${containerMaxWidth}px`;
    }

    const fragment = document.createDocumentFragment();

    filteredShortcuts.forEach((item) => {
      const card = document.createElement('a');
      card.href = item.url;
      card.className = `shortcut-card size-${STATE.size}`;
      card.title = item.name;

      const img = document.createElement('img');
      img.className = 'shortcut-icon';
      img.alt = '';

      let hostname = '';
      try {
        hostname = new URL(item.url).hostname;
      } catch (e) {
        hostname = item.url;
      }

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

    container.appendChild(fragment);
  }

  const modalList = document.getElementById('modal-shortcuts-list');

  function renderModalShortcutsList() {
    if (!modalList) return;
    modalList.innerHTML = '';

    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

    const filteredShortcuts = STATE.shortcuts.filter(s => s.category === STATE.activeSettingsCategory);

    if (filteredShortcuts.length === 0) {
      modalList.innerHTML = `<div style="color: rgba(255,255,255,0.3); font-size: 11px; text-align: center; padding: 12px;">${currentDict.listEmpty}</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    filteredShortcuts.forEach((item) => {
      const absoluteIndex = STATE.shortcuts.indexOf(item);

      const row = document.createElement('div');
      row.className = 'modal-shortcut-item';

      if (editingIndex === absoluteIndex) {
        row.setAttribute('draggable', false);

        const editContainer = document.createElement('div');
        editContainer.className = 'modal-shortcut-edit-container';

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

        const catSelect = document.createElement('select');
        catSelect.className = 'settings-input inline-input';
        STATE.categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = cat.id === 'default' ? currentDict.defaultCategoryName : cat.name;
          catSelect.appendChild(opt);
        });
        catSelect.value = item.category || 'default';

        fieldsWrapper.appendChild(nameInput);
        fieldsWrapper.appendChild(urlInput);
        fieldsWrapper.appendChild(catSelect);

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
        inlineIconInput.id = `edit-shortcut-icon-file-${absoluteIndex}`;

        const inlineIconLabel = document.createElement('label');
        inlineIconLabel.htmlFor = `edit-shortcut-icon-file-${absoluteIndex}`;
        inlineIconLabel.className = 'btn-square-upload';
        inlineIconLabel.title = currentDict.uploadIconTitle;

        const uploadImg = document.createElement('img');
        uploadImg.src = 'assets/upload-icon.png';
        uploadImg.alt = 'Upload';

        inlineIconLabel.appendChild(uploadImg);

        let tempIconBase64 = item.customIcon;

        const inlineIconResetBtn = document.createElement('button');
        inlineIconResetBtn.className = 'btn btn-inline-cancel';
        inlineIconResetBtn.style.color = '#ff6b6b';
        inlineIconResetBtn.textContent = currentDict.resetBtn;
        inlineIconResetBtn.style.display = tempIconBase64 ? 'inline-block' : 'none';

        inlineIconResetBtn.addEventListener('click', () => {
          tempIconBase64 = null;
          inlineIconLabel.title = currentDict.uploadIconTitle;
          inlineIconLabel.style.borderColor = '';
          inlineIconResetBtn.style.display = 'none';
        });

        inlineIconInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            inlineIconLabel.title = file.name;
            inlineIconLabel.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            compressImage(file, 128, 128, 0.85, (result) => {
              tempIconBase64 = result;
              inlineIconResetBtn.style.display = 'inline-block';
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
          const newCat = catSelect.value;

          if (newName && newUrl) {
            if (!/^https?:\/\//i.test(newUrl)) {
              newUrl = 'https://' + newUrl;
            }

            STATE.shortcuts[absoluteIndex] = { 
              name: newName, 
              url: newUrl, 
              customIcon: tempIconBase64, 
              category: newCat 
            };
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
        row.dataset.absoluteIndex = absoluteIndex;

        row.addEventListener('dragstart', (e) => {
          dragSrcIndex = absoluteIndex;
          e.dataTransfer.effectAllowed = 'move';
          row.classList.add('dragging');
        });

        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          const items = modalList.querySelectorAll('.modal-shortcut-item');
          items.forEach(item => item.classList.remove('drag-over'));
        });

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          row.classList.add('drag-over');
          handleAutoscroll(e);
        });

        row.addEventListener('dragleave', () => {
          row.classList.remove('drag-over');
        });

        row.addEventListener('drop', (e) => {
          e.preventDefault();
          row.classList.remove('drag-over');
          
          const targetAbsoluteIndex = parseInt(row.dataset.absoluteIndex, 10);
          if (dragSrcIndex !== null && dragSrcIndex !== targetAbsoluteIndex) {
            moveShortcut(dragSrcIndex, targetAbsoluteIndex);
          }
        });

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
          editingIndex = absoluteIndex;
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
          STATE.shortcuts.splice(absoluteIndex, 1);
          saveState();
          renderShortcuts();
          renderModalShortcutsList();
        });

        actionsWrapper.appendChild(editBtn);
        actionsWrapper.appendChild(deleteBtn);

        row.appendChild(info);
        row.appendChild(actionsWrapper);
      }

      fragment.appendChild(row);
    });

    modalList.appendChild(fragment);
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

  initLayoutDragAndDrop();

  loadState();
});