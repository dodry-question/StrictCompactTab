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
      themeNord: "Nord",
      showClockLabel: "Show Clock and Date",
      weatherSettingsTitle: "Weather Settings",
      showWeatherLabel: "Show Weather Widget",
      weatherCityLabel: "City Name",
      weatherCityPlaceholder: "Enter city (e.g. Moscow, Moscow Oblast, RU)",
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
      searchEngineLabel: "Search Engine"
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
      themeNord: "Nord (Арктическая)",
      showClockLabel: "Показывать часы и дату",
      weatherSettingsTitle: "Настройки погоды",
      showWeatherLabel: "Показывать погоду",
      weatherCityLabel: "Город",
      weatherCityPlaceholder: "Введите город (например, Москва, Московская обл., RU)",
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
      searchEngineLabel: "Поисковая система"
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
    timeString += ampm;

    if (clockElement) {
      clockElement.textContent = timeString;
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
      saveState();
      applyTheme();
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
          saveState();
          applyBackground();
        });
      }
    });
  }

  if (bgResetBtn) {
    bgResetBtn.addEventListener('click', () => {
      STATE.customBackground = null;
      saveState();
      applyBackground();
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
    document.body.classList.remove('theme-light', 'theme-nord');
    if (STATE.theme === 'light') {
      document.body.classList.add('theme-light');
    } else if (STATE.theme === 'nord') {
      document.body.classList.add('theme-nord');
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
      if (weatherDetails) weatherDetails.textContent = dict.weatherCityPlaceholder || 'Enter city';
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
          const customBackground = data.customBackground ?? null;
          const customFavicon = data.customFavicon ?? null;
          const language = data.language ?? 'en';
          const searchEngine = data.searchEngine ?? 'duckduckgo';
          const theme = data.theme ?? 'dark';
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
    storage.get(['shortcuts', 'categories', 'columns', 'size', 'customBackground', 'customFavicon', 'language', 'searchEngine', 'showDate', 'format12h', 'showSeconds', 'theme', 'showClock', 'showWeather', 'weatherCity', 'weatherCoords', 'weatherCache'], (result) => {
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

      applyBackground();
      applyFavicon();
      applyTheme();
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
    
    const containerMaxWidth = (itemWidth * actualColumns) + (gap * (actualColumns - 1));
    container.style.maxWidth = `${containerMaxWidth}px`;

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

        inlineIconInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            inlineIconLabel.title = file.name;
            inlineIconLabel.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            compressImage(file, 128, 128, 0.85, (result) => {
              tempIconBase64 = result;
            });
          }
        });

        actionsWrapper.appendChild(cancelBtn);
        actionsWrapper.appendChild(saveBtn);
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

  loadState();
});