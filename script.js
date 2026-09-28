document.addEventListener('DOMContentLoaded', () => {
  const { formatDateLine, getTopbarCityName, normalizeMistWidgets } = window.AppUtils;

  // --- РЎР›РћР’РђР Р¬ РџР•Р Р•Р’РћР”РћР’ (Р›РћРљРђР›РР—РђР¦РРЇ) ---
  const TRANSLATIONS = window.TRANSLATIONS;

  // --- Р РђРЎРЁРР Р•РќРќРђРЇ РЎРРЎРўР•РњРђ РҐР РђРќР•РќРРЇ (СЃ РїРѕРґРґРµСЂР¶РєРѕР№ Р±СЌРєР°РїРѕРІ) ---
  const storage = window.storage;

  // --- Р§РРЎРўР«Р™ РЎРўРђР РўРћР’Р«Р™ РЁРђР±Р›РћРќ ---
  const DEFAULT_SHORTCUTS = window.DEFAULT_SHORTCUTS;
  const STATE = window.STATE;
  const MIST_WIDGET_KEYS = window.MIST_WIDGET_KEYS;

  // Геометрия Flex-потока пилюль — ТОЛЬКО режим Mist (в стандартном режиме
  // работает исходная CSS-сетка, см. getGridMetrics) — должна совпадать с CSS:
  //   body.mode-mist .shortcuts-container { display: flex; flex-wrap: wrap; gap: 8px 10px; }
  //   .mist-pill { padding: 8px 16px; font-size: 14.5px; gap: 8px;
  //                max-width: min(300px, 100%) }
  // Ширина пилюли считается по тексту: короткие названия («VK», «ав») дают
  // короткие пилюли, длинные — растут до max-width и переносятся потоком.
  const MIST_CELL_GAP = 10;   // колонка контейнера (gap: 8px 10px)
  const MIST_ROW_GAP = 8;     // ряд контейнера (gap: 8px 10px)
  const MIST_PAD = 10;        // padding контейнера пилюль (10px)
  const MIST_MAX_W = 700;     // предельная ширина центрального блока (px)
  const MIST_CELL_W = 115;    // виртуальная ячейка настройки «Ярлыков в ряду»

  // Клавиатурная навигация: динамическая модель зон (см. rebuildNavModel).
  // Объявлено здесь же, чтобы model была готова к первой отрисовке.
  const NAV_ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const NAV_KEYS = NAV_ARROWS.concat(['Home', 'End']);
  const NAV_ZONE_ROOTS = {
    widgets: ['widget-clock', 'weather-widget'],
    search: ['search-form'],
    tabs: ['mist-tabs'],
    grid: ['shortcuts-container']
  };
  let navModel = null;

  let editingIndex = -1;
  let dragSrcIndex = null;
  let dragCategorySrcId = null;

  // --- РРќРР¦РРђР›РР—РђР¦РРЇ Р­Р›Р•РњР•РќРўРћР’ РРњРџРћР РўРђ / Р­РљРЎРџРћР РўРђ ---
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const importFileInput = document.getElementById('import-file-input');

  // --- Р§РђРЎР« Р Р”РђРўРђ ---
  const clockElement = document.getElementById('clock');
  const dateElement = document.getElementById('date-display');

  // --- РџРћР“РћР”Рђ ---
  const weatherWidget = document.getElementById('weather-widget');
  const weatherTemp = document.getElementById('weather-temp');
  const weatherIcon = document.getElementById('weather-icon');
  const weatherDetails = document.getElementById('weather-details');
  const showWeatherCb = document.getElementById('show-weather-checkbox');
  const weatherCityInput = document.getElementById('weather-city-input');
  const weatherInputStatus = document.getElementById('weather-input-status');
  const weatherSubsettings = document.getElementById('weather-subsettings');

  // --- Р Р•Р–РРњ MIST (РЎС‚РµРєР»СЏРЅРЅС‹Р№ РјРёРЅРёРјР°Р»РёР·Рј) ---
  const mistTabsEl = document.getElementById('mist-tabs');
  const mistPresetSelect = document.getElementById('mist-preset-select');
  const mistPerRowSelect = document.getElementById('mist-per-row-select');
  const mistZenZone = document.getElementById('mist-zen-zone');
  // Top Bar: единая строка «дата • температура, описание, город» в верхнем углу
  const mistTopbarEl = document.getElementById('mist-topbar');
  let activeCategory = 'main';

  // --- TOP BAR: дата и погода строго в ОДНУ горизонтальную строку ---
  // В центральном режиме (Default Mist / SCT) — верхний левый угол,
  // в режиме Mist Left/Split — верхний правый угол (позиция задаётся в CSS)
  function renderTopbar() {
    if (!mistTopbarEl) return;

    const showDate = !!(STATE.showClock && STATE.showDate);
    const showWeather = !!(STATE.showWeather &&
      STATE.weatherCoords && STATE.weatherCoords.lat !== null &&
      STATE.weatherCache && STATE.weatherCache.temp);
    const inEditMode = document.body.classList.contains('layout-edit-mode');
    // Режим Mist: дата и день недели показываются строго ПОД часами,
    // поэтому в Top Bar остаётся только погода (правый верхний угол)
    const isMist = document.body.classList.contains('mode-mist');
    const topbarDate = showDate && !isMist;

    const dateLine = showDate ? formatDateLine(STATE) : '';
    const weatherLine = showWeather
      ? `${STATE.weatherCache.temp}|${STATE.weatherCache.code}|${getTopbarCityName(STATE)}`
      : '';

    // Перерисовываем только при реальном изменении содержимого
    const signature = [
      STATE.language, dateLine, weatherLine,
      isMist ? 'mist' : 'std',
      inEditMode ? 'edit' : 'view'
    ].join('::');
    if (mistTopbarEl.dataset.signature === signature) return;
    mistTopbarEl.dataset.signature = signature;

    if (inEditMode || (!topbarDate && !showWeather)) {
      mistTopbarEl.innerHTML = '';
      mistTopbarEl.style.display = 'none';
      document.body.classList.remove('has-topbar');
      return;
    }

    const frag = document.createDocumentFragment();

    if (topbarDate) {
      const dateSpan = document.createElement('span');
      dateSpan.className = 'topbar-part topbar-date';
      dateSpan.textContent = dateLine;
      frag.appendChild(dateSpan);
    }

    if (topbarDate && showWeather) {
      const sep = document.createElement('span');
      sep.className = 'topbar-sep';
      sep.textContent = '•';
      frag.appendChild(sep);
    }

    if (showWeather) {
      const tempSpan = document.createElement('span');
      tempSpan.className = 'topbar-part topbar-temp';
      tempSpan.textContent = STATE.weatherCache.temp;
      frag.appendChild(tempSpan);

      const descSpan = document.createElement('span');
      descSpan.className = 'topbar-part topbar-desc';
      const desc = getWeatherDescription(STATE.weatherCache.code, STATE.language);
      const city = getTopbarCityName(STATE);
      descSpan.textContent = city ? `${desc}, ${city}` : desc;
      frag.appendChild(descSpan);
    }

    mistTopbarEl.innerHTML = '';
    mistTopbarEl.appendChild(frag);
    mistTopbarEl.style.display = 'flex';
    document.body.classList.add('has-topbar');
  }

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
        // РћР±РѕСЂР°С‡РёРІР°РµРј AM/PM РІ span СЃ СѓРјРµРЅСЊС€РµРЅРЅС‹Рј С€СЂРёС„С‚РѕРј РґР»СЏ РєСЂР°СЃРёРІРѕРіРѕ РІРёРґР° Рё РёСЃРєР»СЋС‡РµРЅРёСЏ РЅР°Р»РѕР¶РµРЅРёР№
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
        dateElement.textContent = formatDateLine(STATE, now);
      } else {
        dateElement.style.display = 'none';
      }
    }

    // Top Bar (дата + погода одной строкой) обновляется вместе с часами
    renderTopbar();
  }
  setInterval(updateClockAndDate, 1000);
  updateClockAndDate();

  // --- РџРћРРЎРљ РЎ Р”РРќРђРњРР§Р•РЎРљРРњ РџР•Р Р•РќРђРџР РђР’Р›Р•РќРР•Рњ ---
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = window.SearchService.buildSearchUrl(
          query,
          STATE.searchEngine,
          STATE.customSearchEngines
        );
      }
    });
  }

  // Открытие подробного прогноза во внутренней выдвижной панели.
  if (weatherWidget) window.WeatherDrawer.init(STATE, TRANSLATIONS);

  // --- РЈРџР РђР’Р›Р•РќРР• РРќРўР•Р Р¤Р•Р™РЎРћРњ Р РњРћР”РђР›Р¬РќР«Рњ РћРљРќРћРњ ---
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('settings-open-btn');
  const closeBtn = document.getElementById('settings-close-btn');

  function closeSettings() {
    if (modal) modal.classList.remove('active');
  }

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.classList.add('active');
      editingIndex = -1;
      // Настройки открываем сразу на категории, которая активна на экране
      settingsCategoryId = (activeCategory && (activeCategory === 'main' || findCategoryById(activeCategory)))
        ? activeCategory
        : 'main';
      renderModalShortcutsList();
      if (STATE.showWeather && STATE.weatherCoords && STATE.weatherCoords.resolvedName) {
        updateStatusText("success", STATE.weatherCoords.resolvedName);
      } else {
        updateStatusText("");
      }
      setTimeout(() => {
        const firstInput = document.getElementById('new-shortcut-name');
        if (firstInput) firstInput.focus();
      }, 50);
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', closeSettings);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSettings();
    });
  }

  // РќР°СЃС‚СЂРѕР№РєРё СЃРµС‚РєРё РјР°РєРµС‚Р°
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

  // Р¤РѕСЂРјР° СЃРѕР·РґР°РЅРёСЏ РЅРѕРІРѕРіРѕ СЏСЂР»С‹РєР°
  const newIconInput = document.getElementById('new-shortcut-icon-file');
  const addForm = document.getElementById('add-shortcut-form');
  const newNameInput = document.getElementById('new-shortcut-name');
  const newUrlInput = document.getElementById('new-shortcut-url');
  const newCatSelect = document.getElementById('new-shortcut-category');

  // Селект категории формы добавления: по умолчанию всегда следует за категорией,
  // открытой в настройках; после ручного выбора пользователем — держит его,
  // пока тот же не сменит категорию (или не добавит ярлык)
  let addCatCustom = false;
  let addCatSelectedFor = null;

  if (newCatSelect) {
    newCatSelect.addEventListener('change', () => { addCatCustom = true; });
  }

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
          const newShortcut = {
            id: "sc_" + Date.now() + Math.random().toString(36).substr(2, 5),
            name,
            url,
            customIcon
          };
          // Категория выбирается в выпадающем списке формы добавления
          const catSelect = document.getElementById('new-shortcut-category');
          const catId = (catSelect && catSelect.value) || settingsCategoryId || 'main';
          const targetCategory = catId === 'main' ? null : findCategoryById(catId);
          if (targetCategory) {
            targetCategory.children.push(newShortcut);
          } else {
            STATE.shortcuts.push(newShortcut);
          }
          saveState();
          renderShortcuts();

          // Сброс формы ДО перерисовки: после добавления селект категории
          // снова следует за категорией, открытой в настройках
          addForm.reset();
          addCatCustom = false;

          renderModalShortcutsList();
          
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

  // --- РЈРџР РђР’Р›Р•РќРР• РћР‘РћРЇРњР ---
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
    // Р¤Р»Р°Рі РЅР°Р»РёС‡РёСЏ РѕР±РѕРµРІ: РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РІ СЂРµР¶РёРјРµ Mist, С‡С‚РѕР±С‹ РЅРµ РїРµСЂРµРєСЂС‹РІР°С‚СЊ РёС… РїРѕРґСЃРІРµС‚РєРѕР№
    document.body.classList.toggle('has-wallpaper', !!STATE.customBackground);
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

  // --- Р Р•Р–РРњ MIST: РџР РРњР•РќР•РќРР• Р РЎРРќРҐР РћРќРР—РђР¦РРЇ РўРЈРњР‘Р›Р•Р РћР’ ---
  function applyMistMode() {
    document.body.classList.toggle('mode-mist', STATE.layoutMistMode);
    applyMistPreset();
    syncModeToggles();
    renderShortcuts();
    applyLayoutPositions();
    // Дата переезжает из Top Bar под часы (и обратно) сразу, а не через секунду
    renderTopbar();
  }

  // РџСЂРёРјРµРЅСЏРµС‚ РІС‹Р±СЂР°РЅРЅС‹Р№ РїСЂРµСЃРµС‚ РєРѕРјРїРѕРЅРѕРІРєРё Mist Рё РїРѕРєР°Р·С‹РІР°РµС‚/СЃРєСЂС‹РІР°РµС‚ РїРѕРґСЂР°Р·РґРµР»С‹ РЅР°СЃС‚СЂРѕРµРє
  function applyMistPreset() {
    const preset = STATE.mistPreset || 'center';
    document.body.classList.remove('mist-preset-center', 'mist-preset-split', 'mist-preset-zen');
    document.body.classList.add('mist-preset-' + preset);

    const sub = document.getElementById('mist-subsettings');
    if (sub) sub.style.display = STATE.layoutMistMode ? 'flex' : 'none';

    // Сбрасываем состояние «показать ярлыки» у пресета Zen Drop при смене пресета
    if (preset !== 'zen') {
      document.body.classList.remove('mist-zen-revealed');
    }

    syncClockDomPosition();
  }

  // Часы входят в ЕДИНЫЙ композиционный блок Mist (#mist-module):
  // часы → поисковая строка → ярлыки идут одной колонкой с gap самого модуля,
  // без «авто-разрывов», которые раньше делили свободное место между часами
  // и поиском и разрывали блок. Вне Mist часы возвращаются на исходное место
  // в body (абсолютный угол), поэтому классическая/iOS вёрстка не меняется.
  function syncClockDomPosition() {
    const clock = document.getElementById('widget-clock');
    const mod = document.getElementById('mist-module');
    if (!clock || !mod) return;

    if (document.body.classList.contains('mode-mist')) {
      if (clock.parentElement === mod) return;
      const search = document.getElementById('search-form');
      if (search && search.parentElement === mod) mod.insertBefore(clock, search);
      else mod.insertBefore(clock, mod.firstChild);
      return;
    }

    if (clock.parentElement !== mod) return;
    const weather = document.getElementById('weather-widget');
    if (weather && weather.parentElement === document.body) {
      document.body.insertBefore(clock, weather);
    } else {
      document.body.insertBefore(clock, mod);
    }
  }

  // РЎР»РµРґРёС‚ Р·Р° РІР·Р°РёРјРѕРёСЃРєР»СЋС‡РµРЅРёРµРј СЂРµР¶РёРјРѕРІ Рё Р±Р»РѕРєРёСЂСѓРµС‚ РЅРµСЃРѕРІРјРµСЃС‚РёРјС‹Рµ РїРµСЂРµРєР»СЋС‡Р°С‚РµР»Рё
  function syncModeToggles() {
    const iosCb = document.getElementById('layout-ios-mode');
    const stealthCb = document.getElementById('layout-stealth-mode');
    const zenCb = document.getElementById('layout-zen-mode');
    const mistCb = document.getElementById('layout-mist-mode');
    const editLayoutBtn = document.getElementById('btn-edit-layout');
    const resetLayoutBtn = document.getElementById('btn-reset-layout');
    const sizeSelect = document.getElementById('shortcut-size-select');
    const columnsSelect = document.getElementById('shortcut-columns-select');

    const zenOn = STATE.layoutZenMode;
    const mistOn = STATE.layoutMistMode;

    if (zenCb) zenCb.disabled = mistOn;
    if (mistCb) mistCb.disabled = zenOn;

    // iOS- Рё РЎС‚РµР»СЃ-СЂРµР¶РёРјС‹ РЅРµСЃРѕРІРјРµСЃС‚РёРјС‹ РЅРё СЃ Zen, РЅРё СЃ Mist
    if (iosCb) iosCb.disabled = zenOn || mistOn;
    if (stealthCb) stealthCb.disabled = zenOn || mistOn;

    // Параметры классической сетки в Mist отключены (там строгая CSS-сетка)
    if (sizeSelect) sizeSelect.disabled = mistOn;
    if (columnsSelect) columnsSelect.disabled = mistOn;

    // Редактирование макета в Mist ДОСТУПНО: двигаются и масштабируются
    // ДВА независимых виджета — «Время» и «Поиск»
    if (editLayoutBtn) editLayoutBtn.disabled = false;
    if (resetLayoutBtn) resetLayoutBtn.disabled = false;
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

    renderTopbar();
  }

  // --- РЈРџР РђР’Р›Р•РќРР• Р”РРќРђРњРР§Р•РЎРљРћР™ РРљРћРќРљРћР™ Р’РљР›РђР”РљР ---
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

  // --- Р”РРќРђРњРР§Р•РЎРљРђРЇ Р›РћРљРђР›РР—РђР¦РРЇ РРќРўР•Р Р¤Р•Р™РЎРђ ---
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

    // Дата и погода в Top Bar зависят от языка
    renderTopbar();

    // Названия категорий в выпадающих списках тоже зависят от языка
    populateCategorySelects();
  }

  // --- РЈРџР РђР’Р›Р•РќРР• РўРЈРњР‘Р›Р•Р РђРњР Р§РђРЎРћР’ Р Р”РђРўР« ---
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
      
      syncModeToggles();
    });
  }

  // --- РџР•Р Р•РљР›Р®Р§РђРўР•Р›Р¬ Р Р•Р–РРњРђ MIST ---
  const layoutMistModeCb = document.getElementById('layout-mist-mode');
  if (layoutMistModeCb) {
    layoutMistModeCb.addEventListener('change', (e) => {
      STATE.layoutMistMode = e.target.checked;

      if (STATE.layoutMistMode) {
        // Mist РЅРµСЃРѕРІРјРµСЃС‚РёРј СЃРѕ РЎС‚РµР»СЃ- Рё iOS-СЂРµР¶РёРјР°РјРё (Сѓ РЅРёС… РєРѕРЅС„Р»РёРєС‚СѓСЋС‰РёРµ СЃС‚РёР»Рё)
        STATE.layoutIosMode = false;
        STATE.layoutStealthMode = false;
        const iosCb = document.getElementById('layout-ios-mode');
        const stealthCb = document.getElementById('layout-stealth-mode');
        if (iosCb) iosCb.checked = false;
        if (stealthCb) stealthCb.checked = false;
        document.body.classList.remove('mode-ios', 'stealth-mode');
        activeCategory = 'main';
      }

      saveState();
      applyMistMode();
    });
  }

  // --- РЈРџР РђР’Р›Р•РќРР• РџР Р•РЎР•РўРђРњР РљРћРњРџРћРќРћР’РљР MIST ---
  if (mistPresetSelect) {
    mistPresetSelect.addEventListener('change', (e) => {
      STATE.mistPreset = e.target.value;
      saveState();
      applyMistPreset();
      // Смена пресета — абсолютные кастомные координаты сбрасываем
      // до значений нового пресета, чтобы элементы не «уезжали»
      clearCustomLayoutStyles();
      // …и сдвиги обоих независимых виджетов возвращаем в ноль
      STATE.mistHeadOffset = normalizeMistWidgets(null);
      tempMistWidgets = normalizeMistWidgets(null);
      applyLayoutPositions();
      renderShortcuts();
      renderTopbar();
    });
  }

  if (mistPerRowSelect) {
    mistPerRowSelect.addEventListener('change', (e) => {
      STATE.mistPerRow = parseInt(e.target.value, 10) || 6;
      saveState();
      renderShortcuts();
    });
  }

  // --- ПРЕСЕТ «УЛЬТРА-МИНИМАЛ» (ZEN DROP): ПОЯВЛЕНИЕ ЯРЛОКОВ У НИЖНЕГО КРАЯ ---
  const mistShortcutsWrapper = document.getElementById('widget-shortcuts');
  let mistZenHideTimer = null;

  function revealMistZenShortcuts() {
    if (mistZenHideTimer) {
      clearTimeout(mistZenHideTimer);
      mistZenHideTimer = null;
    }
    document.body.classList.add('mist-zen-revealed');
  }

  function scheduleHideMistZenShortcuts(e) {
    const to = e && e.relatedTarget;
    if (to && mistZenZone && mistZenZone.contains(to)) return;
    if (to && mistShortcutsWrapper && mistShortcutsWrapper.contains(to)) return;
    if (mistZenHideTimer) clearTimeout(mistZenHideTimer);
    // Небольшая задержка, чтобы курсор успевал перейти между зоной и подсказками
    mistZenHideTimer = setTimeout(() => document.body.classList.remove('mist-zen-revealed'), 240);
  }

  // Колесо в скрытом Mist: показываем панель сразу и в любой точке экрана,
  // после паузы возвращаем «спрятанный» вид (если курсор не остался над ней)
  let mistZenWheelHideTimer = null;

  function revealMistZenByWheel() {
    if (!document.body.classList.contains('mode-mist')) return;
    if (!document.body.classList.contains('mist-preset-zen')) return;

    revealMistZenShortcuts();

    if (mistZenWheelHideTimer) clearTimeout(mistZenWheelHideTimer);
    mistZenWheelHideTimer = setTimeout(() => {
      mistZenWheelHideTimer = null;
      let overPanel = false;
      try {
        overPanel = (mistShortcutsWrapper && mistShortcutsWrapper.matches(':hover')) ||
          (mistZenZone && mistZenZone.matches(':hover'));
      } catch (err) {
        overPanel = false;
      }
      if (!overPanel) document.body.classList.remove('mist-zen-revealed');
    }, 2600);
  }

  if (mistZenZone) {
    mistZenZone.addEventListener('mouseenter', revealMistZenShortcuts);
    mistZenZone.addEventListener('click', revealMistZenShortcuts);
    mistZenZone.addEventListener('mouseleave', scheduleHideMistZenShortcuts);
  }

  if (mistShortcutsWrapper) {
    mistShortcutsWrapper.addEventListener('mouseenter', revealMistZenShortcuts);
    mistShortcutsWrapper.addEventListener('mouseleave', scheduleHideMistZenShortcuts);
  }

  if (showSecondsCb) {
    showSecondsCb.addEventListener('change', (e) => {
      STATE.showSeconds = e.target.checked;
      saveState();
      updateClockAndDate();
    });
  }

  // --- РЈРџР РђР’Р›Р•РќРР• РџРћР“РћР”РћР™ ---
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

    renderTopbar();
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
      renderTopbar();
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

    renderTopbar();
  }

  function getWeatherEmoji(code) {
    return window.WeatherService.getWeatherEmoji(code);
  }

  function getWeatherDescription(code, lang) {
    return window.WeatherService.getWeatherDescription(code, lang);
  }

  // --- РЈРџР РђР’Р›Р•РќРР• РџРђРџРљРђРњР (Р”Р Р•Р’РћР’РР”РќРђРЇ РР•Р РђР РҐРРЇ) ---
  const expandedFolders = new Set();
  let draggedId = null;
  let justDroppedId = null;

  // --- МИГРАЦИЯ СТРУКТУРЫ ЯРЛЫКОВ (ОБРАТНАЯ СОВМЕСТИМОСТЬ) ---
  // Старые версии хранили данные по-разному:
  //   • плоский список ярлыков с полями folder / category / group;
  //   • отдельные ключи folders / categories / groups: [{ id, name }];
  //   • folders / groups c вложениями: [{ id, name, items|shortcuts|children: [...] }];
  //   • новый вложенный формат: [{ id, name, isFolder: true, children: [...] }].
  // extractCategoryMeta собирает описание категорий из ЛЮБОГО из этих форматов,
  // ничего не теряя (включая ссылки и иконки ярлыков).
  function extractCategoryMeta(raw) {
    const meta = [];
    if (!raw || typeof raw !== 'object') return meta;

    const pushItems = (target, items) => {
      if (!Array.isArray(items) || items.length === 0) return;
      const known = new Set(target.items.map(i => i && i.id).filter(Boolean));
      items.forEach(item => {
        if (!item || typeof item !== 'object') return;
        if (item.id && known.has(item.id)) return;
        target.items.push(item);
        if (item.id) known.add(item.id);
      });
    };

    [raw.categories, raw.folders, raw.groups].forEach(src => {
      if (!Array.isArray(src)) return;
      src.forEach((entry, idx) => {
        if (!entry || typeof entry !== 'object') return;
        const id = entry.id || ('cat_' + idx);
        const name = entry.name || entry.title || id;
        const items = Array.isArray(entry.items) ? entry.items
          : (Array.isArray(entry.shortcuts) ? entry.shortcuts
            : (Array.isArray(entry.children) ? entry.children : null));

        let target = meta.find(m => m.id === id);
        if (!target) {
          target = { id, name, items: [] };
          meta.push(target);
        } else if (!items || items.length === 0) {
          target.name = name;
        }
        pushItems(target, items);
      });
    });

    return meta;
  }

  // Приводит любой список категорий (легаси или нормализованный) к единому виду
  function normalizeCategoryMeta(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter(entry => entry && typeof entry === 'object')
      .map((entry, idx) => ({
        id: entry.id || ('cat_' + idx),
        name: entry.name || entry.title || ('Category ' + (idx + 1)),
        items: Array.isArray(entry.items) ? entry.items
          : (Array.isArray(entry.shortcuts) ? entry.shortcuts
            : (Array.isArray(entry.children) ? entry.children : []))
      }));
  }

  function generateId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function migrateToNested(flatShortcuts, categoriesOrFolders) {
    if (!Array.isArray(flatShortcuts)) flatShortcuts = [];
    const meta = normalizeCategoryMeta(categoriesOrFolders);

    const isAlreadyNested = flatShortcuts.some(s => s && (s.isFolder || Array.isArray(s.children)));

    // 1) Уже вложенный формат: проставляем id и дополняем категориями,
    //    описанными только в старых ключах folders / categories / groups.
    if (isAlreadyNested) {
      flatShortcuts.forEach(item => {
        if (!item || typeof item !== 'object') return;
        if (!item.id) item.id = (item.isFolder ? "f_" : "sc_") + Math.random().toString(36).substr(2, 9);
        if (item.isFolder && Array.isArray(item.children)) {
          item.children.forEach(child => {
            if (child && !child.id) child.id = "sc_" + Math.random().toString(36).substr(2, 9);
          });
        }
      });

      meta.forEach(m => {
        if (m.id === 'default') return;
        if (flatShortcuts.some(f => f && f.isFolder && f.id === m.id)) return;
        // Категория существовала, но в списке ярлыков её не было — восстанавливаем
        flatShortcuts.push({ id: m.id, name: m.name, isFolder: true, children: [] });
      });

      return flatShortcuts;
    }

    // 2) Старый плоский формат: раскладываем ярлыки по категориям.
    const nested = [];
    const folderMap = {};

    meta.forEach(f => {
      if (f.id === 'default' || folderMap[f.id]) return;
      folderMap[f.id] = { id: f.id, name: f.name, isFolder: true, children: [] };
      nested.push(folderMap[f.id]);
    });

    // Ярлыки, лежащие прямо внутри категорий (старые groups/folders с вложениями)
    const flat = flatShortcuts.slice();
    const knownIds = new Set(flat.map(s => s && s.id).filter(Boolean));
    meta.forEach(m => {
      m.items.forEach(raw => {
        if (!raw || typeof raw !== 'object') return;
        if (raw.id && knownIds.has(raw.id)) return;
        const copy = Object.assign({}, raw, { id: raw.id || generateId('sc_') });
        copy.__category = m.id;
        flat.push(copy);
        knownIds.add(copy.id);
      });
    });

    flat.forEach(s => {
      if (!s || typeof s !== 'object') return;
      const folderId = s.__category || s.folder || s.category || s.group || 'default';

      const itemObj = {};
      Object.keys(s).forEach(key => {
        if (key === 'folder' || key === 'category' || key === 'group' || key === '__category') return;
        itemObj[key] = s[key];
      });
      itemObj.id = s.id || generateId('sc_');
      itemObj.name = s.name;
      itemObj.url = s.url;
      itemObj.customIcon = s.customIcon || null;

      if (folderId !== 'default' && !folderMap[folderId]) {
        // Ярлык ссылается на неизвестную категорию — воссоздаём её, ничего не теряем
        folderMap[folderId] = { id: folderId, name: folderId, isFolder: true, children: [] };
        nested.push(folderMap[folderId]);
      }

      if (folderId === 'default') {
        nested.push(itemObj);
      } else {
        folderMap[folderId].children.push(itemObj);
      }
    });

    return nested;
  }

  function moveNestedItem(draggedId, targetId, action) {
    const targetItem = findShortcutOrFolderById(targetId);
    if (!targetItem) return false;

    let folderName = "";
    if (action === 'merge' && !targetItem.isFolder) {
      const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
      const name = prompt(currentDict.addCategoryPrompt);
      if (name === null) return false; // User canceled, abort operation
      folderName = name.trim() || "Folder";
    }

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
    
    if (!draggedItem) return false;

    if (action === 'merge') {
      let targetIdx = STATE.shortcuts.findIndex(s => s.id === targetId);
      if (targetIdx !== -1) {
        const target = STATE.shortcuts[targetIdx];
        if (target.isFolder) {
          if (!target.children) target.children = [];
          target.children.push(draggedItem);
        } else {
          // Merge two shortcuts to create a folder using pre-prompted folderName
          const newFolder = {
            id: "f_" + Date.now() + Math.random().toString(36).substr(2, 5),
            name: folderName,
            isFolder: true,
            children: [target, draggedItem]
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
    return true;
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
      setTimeout(() => {
        const container = document.getElementById('folder-shortcuts-container');
        if (container) {
          const firstShortcut = container.querySelector('a');
          if (firstShortcut) {
            firstShortcut.focus();
            return;
          }
        }
        const closeBtn = document.getElementById('folder-modal-close');
        if (closeBtn) closeBtn.focus();
      }, 50);
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

  // ---------- УПРАВЛЕНИЕ КАТЕГОРИЯМИ (раздел настроек «Категории») ----------
  // Категории — это вкладки-разделы: создание, переименование, удаление,
  // порядок и перетаскивание ярлыков между ними.
  let settingsCategoryId = 'main';

  function getCategoryList() {
    return (STATE.shortcuts || []).filter(s => s && s.isFolder);
  }

  function findCategoryById(id) {
    if (!id || id === 'main') return null;
    return (STATE.shortcuts || []).find(s => s && s.isFolder && s.id === id) || null;
  }

  function getCategoryItems(category) {
    if (category) return (category.children || []).filter(s => s && !s.isFolder);
    return (STATE.shortcuts || []).filter(s => s && !s.isFolder);
  }

  function getParentCategoryId(itemId) {
    for (const f of (STATE.shortcuts || [])) {
      if (f && f.isFolder && Array.isArray(f.children) && f.children.some(c => c && c.id === itemId)) {
        return f.id;
      }
    }
    return 'main';
  }

  function ensureSettingsCategoryId() {
    if (settingsCategoryId !== 'main' && !findCategoryById(settingsCategoryId)) {
      settingsCategoryId = 'main';
    }
  }

  // --- Выпадающие списки категорий (форма добавления и режим редактирования) ---
  function buildCategoryOptions(select, selectedId) {
    if (!select) return;
    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

    const options = [{ id: 'main', name: dict.mistHomeTab || 'Home' }]
      .concat(getCategoryList().map(c => ({ id: c.id, name: c.name })));

    select.innerHTML = '';
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.id;
      el.textContent = opt.name;
      select.appendChild(el);
    });

    const wanted = (selectedId && options.some(o => o.id === selectedId)) ? selectedId : 'main';
    select.value = wanted;
    if (select.selectedIndex === -1) select.value = 'main';
    select.title = dict.shortcutCategoryLabel || 'Category';
  }

  // Обновляет все выпадающие списки категорий (создание/переименование/удаление)
  function populateCategorySelects() {
    const addSelect = document.getElementById('new-shortcut-category');
    if (addSelect) {
      // Категория в настройках сменилась — список снова следует за ней
      if (addCatSelectedFor !== settingsCategoryId) {
        addCatCustom = false;
        addCatSelectedFor = settingsCategoryId;
      }
      const preferred = (addCatCustom && addSelect.value)
        ? addSelect.value
        : (settingsCategoryId || 'main');
      buildCategoryOptions(addSelect, (preferred === 'main' || findCategoryById(preferred)) ? preferred : 'main');
    }
    document.querySelectorAll('.edit-category-select').forEach(sel => {
      buildCategoryOptions(sel, sel.dataset.current || 'main');
    });
  }

  function refreshAfterCategoryChange() {
    saveState();
    renderShortcuts();
    renderModalShortcutsList();
  }

  function createCategory() {
    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    const name = prompt(dict.addCategoryPrompt, '');
    if (name === null) return null;
    const trimmed = (name || '').trim() || dict.defaultCategoryName || 'Category';
    const category = { id: generateId('f_'), name: trimmed, isFolder: true, children: [] };
    STATE.shortcuts.push(category);
    settingsCategoryId = category.id;
    refreshAfterCategoryChange();
    return category;
  }

  function renameCategory(categoryId) {
    const category = findCategoryById(categoryId);
    if (!category) return;
    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    const name = prompt(dict.renameCategoryPrompt, category.name);
    if (name === null) return;
    category.name = (name || '').trim() || category.name;
    refreshAfterCategoryChange();
  }

  function deleteCategory(categoryId) {
    const category = findCategoryById(categoryId);
    if (!category) return;
    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    if (!confirm(dict.deleteCategoryConfirm)) return;

    const idx = STATE.shortcuts.indexOf(category);
    if (idx === -1) return;

    const deleteChildren = confirm(dict.deleteShortcutsConfirm);
    if (deleteChildren) {
      STATE.shortcuts.splice(idx, 1);
    } else {
      // Ярлыки не теряем — переносим их на «Главную» на место категории
      STATE.shortcuts.splice(idx, 1, ...(category.children || []));
    }
    if (settingsCategoryId === categoryId) settingsCategoryId = 'main';
    refreshAfterCategoryChange();
  }

  function moveCategory(categoryId, delta) {
    const idx = STATE.shortcuts.findIndex(s => s && s.isFolder && s.id === categoryId);
    if (idx === -1) return;

    let swapIdx = -1;
    if (delta < 0) {
      for (let i = idx - 1; i >= 0; i--) {
        if (STATE.shortcuts[i] && STATE.shortcuts[i].isFolder) { swapIdx = i; break; }
      }
    } else {
      for (let i = idx + 1; i < STATE.shortcuts.length; i++) {
        if (STATE.shortcuts[i] && STATE.shortcuts[i].isFolder) { swapIdx = i; break; }
      }
    }
    if (swapIdx === -1) return;

    const current = STATE.shortcuts[idx];
    STATE.shortcuts[idx] = STATE.shortcuts[swapIdx];
    STATE.shortcuts[swapIdx] = current;
    refreshAfterCategoryChange();
  }

  // Достаёт ярлык из любой категории (или с «Главной»)
  function removeItemById(itemId) {
    const rootIdx = STATE.shortcuts.findIndex(s => s && s.id === itemId);
    if (rootIdx !== -1) return STATE.shortcuts.splice(rootIdx, 1)[0];

    for (const f of STATE.shortcuts) {
      if (f && f.isFolder && Array.isArray(f.children)) {
        const childIdx = f.children.findIndex(s => s && s.id === itemId);
        if (childIdx !== -1) return f.children.splice(childIdx, 1)[0];
      }
    }
    return null;
  }

  // Перемещение ярлыка в другую категорию (categoryId === 'main' — на «Главную»)
  function moveItemToCategory(itemId, categoryId, forceAppend) {
    if (!itemId || itemId === categoryId) return false;
    const target = findCategoryById(categoryId);
    if (categoryId !== 'main' && !target) return false;

    // Категории внутрь категорий не переносятся
    const isCategory = (STATE.shortcuts || []).some(s => s && s.isFolder && s.id === itemId);
    if (isCategory) return false;

    if (!forceAppend && getParentCategoryId(itemId) === categoryId) return false;

    const item = removeItemById(itemId);
    if (!item) return false;

    if (target) target.children.push(item);
    else STATE.shortcuts.push(item);
    return true;
  }

  function renderCategoryTabsBar() {
    const bar = document.getElementById('category-tabs-bar');
    if (!bar) return;
    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    bar.innerHTML = '';

    const tabs = [{ id: 'main', name: dict.mistHomeTab || 'Home' }]
      .concat(getCategoryList().map(c => ({ id: c.id, name: c.name })));

    tabs.forEach(tab => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'category-tab-chip' + (tab.id === settingsCategoryId ? ' active' : '');
      chip.dataset.categoryId = tab.id;
      chip.textContent = tab.name;
      chip.title = dict.categoryDropHint;

      chip.addEventListener('click', () => {
        settingsCategoryId = tab.id;
        editingIndex = -1;
        renderModalShortcutsList();
      });

      // Перетаскивание ярлыка на вкладку категории = перемещение в неё
      chip.addEventListener('dragover', (e) => {
        if (!draggedId || draggedId === tab.id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        chip.classList.add('drop-target');
      });
      chip.addEventListener('dragleave', () => {
        chip.classList.remove('drop-target');
      });
      chip.addEventListener('drop', (e) => {
        if (!draggedId) return;
        e.preventDefault();
        e.stopPropagation();
        chip.classList.remove('drop-target');
        if (moveItemToCategory(draggedId, tab.id, false)) {
          justDroppedId = draggedId;
          settingsCategoryId = tab.id;
          editingIndex = -1;
          refreshAfterCategoryChange();
        }
      });

      bar.appendChild(chip);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'category-tab-chip category-tab-add';
    addBtn.textContent = '+ ' + (dict.addCategoryBtn || 'New category');
    addBtn.title = dict.addCategoryTitle || 'Add category';
    addBtn.addEventListener('click', () => createCategory());
    bar.appendChild(addBtn);
  }

  function renderCategoryHeader() {
    const header = document.getElementById('category-active-header');
    if (!header) return;
    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    header.innerHTML = '';

    const category = findCategoryById(settingsCategoryId);
    const items = getCategoryItems(category);
    const categories = getCategoryList();
    const index = category ? categories.findIndex(c => c.id === category.id) : -1;

    const title = document.createElement('span');
    title.className = 'category-header-name';
    title.textContent = category ? category.name : (dict.mistHomeTab || 'Home');
    header.appendChild(title);

    const count = document.createElement('span');
    count.className = 'category-header-count';
    count.textContent = String(items.length);
    count.title = dict.listEmpty;
    header.appendChild(count);

    const actions = document.createElement('div');
    actions.className = 'category-header-actions';

    const makeBtn = (className, title, svg) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn category-action-btn ' + className;
      btn.title = title;
      btn.innerHTML = svg;
      actions.appendChild(btn);
      return btn;
    };

    const svgPencil = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
    const svgTrash = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    const svgLeft = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
    const svgRight = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

    if (category) {
      const leftBtn = makeBtn('category-move-left', dict.moveCategoryLeftBtn || 'Move left', svgLeft);
      leftBtn.disabled = index <= 0;
      leftBtn.addEventListener('click', () => moveCategory(category.id, -1));

      const rightBtn = makeBtn('category-move-right', dict.moveCategoryRightBtn || 'Move right', svgRight);
      rightBtn.disabled = index >= categories.length - 1;
      rightBtn.addEventListener('click', () => moveCategory(category.id, 1));

      const renameBtn = makeBtn('category-rename', dict.renameCategoryBtn || 'Rename', svgPencil);
      renameBtn.addEventListener('click', () => renameCategory(category.id));

      const deleteBtn = makeBtn('category-delete btn-delete', dict.deleteCategoryBtn || 'Delete', svgTrash);
      deleteBtn.addEventListener('click', () => deleteCategory(category.id));
    }

    header.appendChild(actions);
  }

  function renderModalShortcutsList() {
    const modalList = document.getElementById('modal-shortcuts-list');
    if (!modalList) return;

    ensureSettingsCategoryId();
    renderCategoryTabsBar();
    renderCategoryHeader();

    modalList.innerHTML = '';

    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    const category = findCategoryById(settingsCategoryId);
    const items = getCategoryItems(category);

    if (items.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'modal-list-empty';
      emptyDiv.textContent = currentDict.listEmpty;
      modalList.appendChild(emptyDiv);
      populateCategorySelects();
      justDroppedId = null;
      return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const isChild = !!category;
      const shortcutRow = renderShortcutRow(item, isChild, isChild ? category.id : null);
      fragment.appendChild(shortcutRow);
    });

    modalList.appendChild(fragment);
    populateCategorySelects();
    justDroppedId = null;
  }
  function renderShortcutRow(item, isChild, parentId) {
    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    
    const row = document.createElement('div');
    row.className = 'modal-shortcut-item';
    if (justDroppedId === item.id) {
      row.classList.add('just-dropped');
    }
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

      // Выпадающий список: категория ярлыка — её можно изменить
      // прямо при редактировании на любую существующую
      const catSelect = document.createElement('select');
      catSelect.className = 'settings-select inline-input edit-category-select';
      catSelect.dataset.current = isChild ? parentId : 'main';
      catSelect.setAttribute('aria-label', currentDict.shortcutCategoryLabel || 'Category');
      catSelect.title = currentDict.shortcutCategoryLabel || 'Category';
      buildCategoryOptions(catSelect, catSelect.dataset.current);

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

          // Категория изменена — переносим ярлык в выбранную
          const newCatId = catSelect.value;
          const currentCatId = isChild ? parentId : 'main';
          if (newCatId !== currentCatId) {
            moveItemToCategory(item.id, newCatId, true);
            settingsCategoryId = newCatId;
          }

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

    // Folders cannot be dropped inside other folders or merged to make a folder.
    // Also, children inside a folder cannot have nested folders/children.
    if (isDraggedFolder || isChild) {
      return (relativeY < height / 2) ? 'before' : 'after';
    }

    // For root-level items:
    if (isTargetFolder) {
      // Pushing into folders (merge) is common, keep the merge zone relatively wide (40%)
      if (relativeY < height * 0.3) {
        return 'before';
      } else if (relativeY > height * 0.7) {
        return 'after';
      } else {
        return 'merge';
      }
    } else {
      // Merging two shortcuts to create a folder is rarer, keep the merge zone narrow (20%)
      // to make reordering easier and prevent accidental folder prompts.
      if (relativeY < height * 0.4) {
        return 'before';
      } else if (relativeY > height * 0.6) {
        return 'after';
      } else {
        return 'merge';
      }
    }
  }

  function setupDragAndDropListeners(element, item, isChild) {
    element.addEventListener('dragstart', (e) => {
      draggedId = item.id;
      e.dataTransfer.effectAllowed = 'move';
      // Defer class additions to prevent Chrome from aborting drag start due to instant layout reflow
      setTimeout(() => {
        element.classList.add('dragging');
        const modalList = document.getElementById('modal-shortcuts-list');
        if (modalList) {
          modalList.classList.add('list-dragging');
        }
      }, 0);
    });

    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
      const modalList = document.getElementById('modal-shortcuts-list');
      if (modalList) {
        modalList.classList.remove('list-dragging');
        const items = modalList.querySelectorAll('.modal-shortcut-item, .modal-folder-row');
        items.forEach(el => el.classList.remove('drag-sort-before', 'drag-sort-after', 'drag-merge'));
      }
    });

    element.addEventListener('dragover', (e) => {
      if (!draggedId || draggedId === item.id) return;
      
      const draggedItem = findShortcutOrFolderById(draggedId);
      const isDraggedFolder = draggedItem ? draggedItem.isFolder : false;

      // Folders cannot contain other folders (no nested folders allowed)
      if (isDraggedFolder && (isChild || isFolderContainingTarget(draggedItem, item.id))) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      
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

    element.addEventListener('dragleave', (e) => {
      e.stopPropagation();
      if (e.relatedTarget && element.contains(e.relatedTarget)) {
        return;
      }
      element.classList.remove('drag-sort-before', 'drag-sort-after', 'drag-merge');
    });

    element.addEventListener('drop', (e) => {
      if (!draggedId || draggedId === item.id) return;
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('drag-sort-before', 'drag-sort-after', 'drag-merge');
      
      const draggedItem = findShortcutOrFolderById(draggedId);
      const isDraggedFolder = draggedItem ? draggedItem.isFolder : false;

      // Folders cannot be placed inside folder children
      if (isDraggedFolder && isChild) {
        return;
      }

      const dropAction = getDropAction(e, element, isChild, isDraggedFolder, item.isFolder);
      
      if (moveNestedItem(draggedId, item.id, dropAction)) {
        justDroppedId = draggedId;
        saveState();
        renderShortcuts();
        renderModalShortcutsList();
      }
    });
  }

  // РќР°РІРµС€РёРІР°РµРј СЃР»СѓС€Р°С‚РµР»СЊ РЅР° РїСѓСЃС‚РѕР№ С„РѕРЅ РєРѕРЅС‚РµР№РЅРµСЂР° СЏСЂР»С‹РєРѕРІ РІ РЅР°СЃС‚СЂРѕР№РєР°С…
  const settingsModalList = document.getElementById('modal-shortcuts-list');
  if (settingsModalList) {
    settingsModalList.addEventListener('dragover', (e) => {
      const targetRow = e.target.closest('.modal-shortcut-item, .modal-folder-row');
      if (!targetRow && draggedId) {
        e.preventDefault();
      }
    });
    settingsModalList.addEventListener('drop', (e) => {
      const targetRow = e.target.closest('.modal-shortcut-item, .modal-folder-row');
      if (!targetRow && draggedId) {
        e.preventDefault();
        // Пустое место списка — перенос ярлыка в текущую категорию (в конец)
        if (moveItemToCategory(draggedId, settingsCategoryId, true)) {
          justDroppedId = draggedId;
          refreshAfterCategoryChange();
        } else {
          renderModalShortcutsList();
        }
      }
    });
  }

  // --- Р’СЃРїРѕРјРѕРіР°С‚РµР»СЊРЅР°СЏ С„СѓРЅРєС†РёСЏ РґР»СЏ РїСЂРѕРІРµСЂРєРё Р±СЂР°СѓР·РµСЂР° Brave ---
  async function isBraveBrowser() {
    // РџРµСЂРІРёС‡РЅР°СЏ РїСЂРѕРІРµСЂРєР° С‡РµСЂРµР· API Brave
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      try {
        return await navigator.brave.isBrave();
      } catch (e) {}
    }
    // Р—Р°РїР°СЃРЅР°СЏ РїСЂРѕРІРµСЂРєР° С‡РµСЂРµР· Client Hints (navigator.userAgentData)
    if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
      try {
        const hints = await navigator.userAgentData.getHighEntropyValues(['brands']);
        return hints.brands.some(brand => brand.brand === 'Brave');
      } catch (e) {}
    }
    return false;
  }

  // --- Р­РљРЎРџРћР Рў Р РРњРџРћР Рў РќРђРЎРўР РћР•Рљ (JSON-Р‘Р­РљРђРџ) ---
  // Структурированная экспортная форма: категории со своими ярлыками
  // + вложенный список shortcuts (обратно совместим со старыми версиями,
  //   которым нужны ключи shortcuts и folders).
  function buildBackupPayload(allData) {
    const raw = (allData && typeof allData === 'object') ? allData : {};
    const nested = migrateToNested(
      Array.isArray(raw.shortcuts) ? raw.shortcuts : [],
      extractCategoryMeta(raw)
    );

    const categories = [];
    nested.forEach(item => {
      if (item && item.isFolder) {
        categories.push({
          id: item.id,
          name: item.name,
          items: (item.children || []).slice()
        });
      }
    });

    return Object.assign({}, raw, {
      format: 'strict-compact-tab-backup',
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      shortcuts: nested,
      categories: categories,
      // Легаси-ключ для старых версий расширения
      folders: categories.map(c => ({ id: c.id, name: c.name }))
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      storage.getAll(async (allData) => {
        const dataStr = JSON.stringify(buildBackupPayload(allData), null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        // РћР¶РёРґР°РµРј СЂРµР·СѓР»СЊС‚Р°С‚ РїСЂРѕРІРµСЂРєРё РЅР° Brave
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
          // РћС‡РёСЃС‚РєР° РѕС‚ BOM-СЃРёРјРІРѕР»РѕРІ (\uFEFF) Рё Р»РёС€РЅРёС… РїСЂРѕР±РµР»РѕРІ
          const cleanText = event.target.result.trim().replace(/^\uFEFF/, '');
          const data = JSON.parse(cleanText);

          if (!data) {
            throw new Error("Invalid backup format: parsed data is null or empty");
          }

          let shortcuts = [];
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

          // Р•СЃР»Рё РёРјРїРѕСЂС‚РёСЂСѓРµС‚СЃСЏ РїР»РѕСЃРєРёР№ РјР°СЃСЃРёРІ СЏСЂР»С‹РєРѕРІ (СЃС‚Р°СЂС‹Р№ С„РѕСЂРјР°С‚)
          if (Array.isArray(data)) {
            shortcuts = data;
          } else if (typeof data === 'object') {
            // Р•СЃР»Рё РёРјРїРѕСЂС‚РёСЂСѓРµС‚СЃСЏ СЃР»РѕР¶РЅС‹Р№ РѕР±СЉРµРєС‚ РЅР°СЃС‚СЂРѕРµРє (РЅРѕРІС‹Р№ С„РѕСЂРјР°С‚)
            shortcuts = Array.isArray(data.shortcuts) ? data.shortcuts : DEFAULT_SHORTCUTS;
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

          // РћР±СЏР·Р°С‚РµР»СЊРЅР°СЏ С„РёР»СЊС‚СЂР°С†РёСЏ СЏСЂР»С‹РєРѕРІ (РѕС‚СЃРµРёРІР°РµРј null Рё РЅРµ-РѕР±СЉРµРєС‚С‹)
          shortcuts = shortcuts.filter(s => s && typeof s === 'object');
          
          // Миграция: folders / categories / groups любого прошлого формата
          // автоматически превращаются в текущую структуру категорий
          const categoryMeta = extractCategoryMeta(data);
          const migratedShortcuts = migrateToNested(shortcuts, categoryMeta);

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
            layoutZenMode,
            layoutIosMode: data.layoutIosMode ?? false,
            layoutStealthMode: data.layoutStealthMode ?? false,
            layoutMistMode: data.layoutMistMode ?? false,
            mistPreset: data.mistPreset ?? 'center',
            mistPerRow: data.mistPerRow ?? 6,
            mistHeadOffset: normalizeMistWidgets(data.mistHeadOffset)
          };

          // РЎРѕС…СЂР°РЅСЏРµРј РІ localStorage / Chrome Storage
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
    
    // РљСЌС€ РЅР° 1 С‡Р°СЃ РґР»СЏ РїСЂРµРґРѕС‚РІСЂР°С‰РµРЅРёСЏ Р»РёРјРёС‚РѕРІ Р·Р°РїСЂРѕСЃРѕРІ GitHub API
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
    const currentVersion = '1.10.7';
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

  // --- Р¤РЈРќРљР¦РР РћР‘Р РђР‘РћРўРљР Р”РђРќРќР«РҐ Р РћРўР РРЎРћР’РљР ---

  function loadState() {
    storage.get(['shortcuts', 'categories', 'folders', 'groups', 'columns', 'size', 'customBackground', 'customFavicon', 'language', 'searchEngine', 'showDate', 'format12h', 'showSeconds', 'theme', 'adaptiveThemeData', 'layoutPositions', 'layoutGridSnap', 'layoutGridSize', 'layoutIosMode', 'layoutStealthMode', 'showClock', 'showWeather', 'weatherCity', 'weatherCoords', 'weatherCache', 'customSearchEngines', 'checkUpdates', 'layoutZenMode', 'layoutMistMode', 'mistPreset', 'mistPerRow', 'mistHeadOffset'], (result) => {
      STATE.shortcuts = migrateToNested(result.shortcuts ?? DEFAULT_SHORTCUTS, extractCategoryMeta(result));
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
      STATE.layoutMistMode = result.layoutMistMode ?? false;
      STATE.mistPreset = result.mistPreset ?? "center";
      STATE.mistPerRow = result.mistPerRow ?? 6;
      STATE.mistHeadOffset = normalizeMistWidgets(result.mistHeadOffset);

      // Р—Р°С‰РёС‚Р° РѕС‚ РєРѕРЅС„Р»РёРєС‚СѓСЋС‰РµРіРѕ СЃРѕСЃС‚РѕСЏРЅРёСЏ РІ РёРјРїРѕСЂС‚РёСЂРѕРІР°РЅРЅРѕР№ СЂРµР·РµСЂРІРЅРѕР№ РєРѕРїРёРё:
      // Zen вЂ” СЃР°РјС‹Р№ СЃС‚СЂРѕРіРёР№ СЂРµР¶РёРј, РїРѕСЌС‚РѕРјСѓ РѕРЅ РёРјРµРµС‚ РїСЂРёРѕСЂРёС‚РµС‚ РЅР°Рґ Mist
      if (STATE.layoutZenMode && STATE.layoutMistMode) {
        STATE.layoutMistMode = false;
      }

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
      const layoutMistModeCb = document.getElementById('layout-mist-mode');
      if (layoutMistModeCb) layoutMistModeCb.checked = STATE.layoutMistMode;
      if (mistPresetSelect) mistPresetSelect.value = STATE.mistPreset;
      if (mistPerRowSelect) mistPerRowSelect.value = STATE.mistPerRow;

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
      } else {
        document.body.classList.remove('mode-zen');
      }

      // Mist Рё Zen РІР·Р°РёРјРѕРёСЃРєР»СЋС‡Р°СЋС‰РёРµ; iOS- Рё РЎС‚РµР»СЃ-СЂРµР¶РёРјС‹ РѕС‚РєР»СЋС‡Р°СЋС‚СЃСЏ РІ РѕР±РѕРёС…
      if (STATE.layoutMistMode) {
        document.body.classList.add('mode-mist');
        STATE.layoutIosMode = false;
        STATE.layoutStealthMode = false;
        document.body.classList.remove('mode-ios', 'stealth-mode');
        if (layoutIosModeCb) layoutIosModeCb.checked = false;
        if (layoutStealthModeCb) layoutStealthModeCb.checked = false;
      } else {
        document.body.classList.remove('mode-mist');
      }

      applyMistPreset();
      syncModeToggles();

      applyBackground();
      applyFavicon();
      applyTheme();
      document.body.style.setProperty('--grid-size', STATE.layoutGridSize + 'px');

      // Новая вкладка стартует в ТОМ ЖЕ СОСТОЯНИИ макета, что и после
      // «Сбросить макет»: снимаются следы режима редактирования/сетки и
      // любые кастомные инлайн-стили (position: absolute, фикс. ширины/
      // высоты, сдвиги). Сохранённые координаты при этом НЕ теряются — они
      // применяются сразу после, в applyLayoutPositions(), ровно так же,
      // как это делает обработчик сброса.
      document.body.classList.remove('layout-edit-mode');
      document.body.classList.remove('layout-grid-active');
      if (layoutEditControls) layoutEditControls.style.display = 'none';
      removeResizeHandles();
      clearCustomLayoutStyles();

      applyLayoutPositions();
      applyClockVisibility();
      applyWeatherVisibility();
      applyLanguage(STATE.language);
      populateSearchEnginesSelect();
      updateSearchEngineUI();
      updateClockAndDate();
      updateWeatherWidget();
      renderShortcuts();
      // Список ярлыков в модалке — как и после «Сбросить макет»
      renderModalShortcutsList();

      if (STATE.showWeather && STATE.weatherCoords && STATE.weatherCoords.resolvedName) {
        updateStatusText("success", STATE.weatherCoords.resolvedName);
      }

      // Р—Р°РїСѓСЃРє РїСЂРѕРІРµСЂРєРё РІРµСЂСЃРёР№ (С‚РѕР»СЊРєРѕ РµСЃР»Рё РіР°Р»РѕС‡РєР° Р°РєС‚РёРІРЅР°)
      if (STATE.checkUpdates) {
        checkForUpdates();
      }

      document.documentElement.classList.remove('state-loading');
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
      layoutZenMode: STATE.layoutZenMode,
      layoutMistMode: STATE.layoutMistMode,
      mistPreset: STATE.mistPreset,
      mistPerRow: STATE.mistPerRow,
      mistHeadOffset: normalizeMistWidgets(STATE.mistHeadOffset)
    });
  }

  function updateSearchEngineUI() {
    window.SearchUI.updateSearchEngineUI(STATE);
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

    // Единая система категорий (вкладок): группы ярлыков (бывшие папки)
    // показываются горизонтальными вкладками и в классическом SCT, и в Mist
    const tabs = buildTabs();
    const activeTab = getActiveTab(tabs);
    const activeItems = activeTab ? activeTab.items : [];

    renderCategoryTabs(tabs);
    // Порядок панели и сетки в DOM = визуальному порядку (Tab/стрелки)
    syncTabsDomPosition();

    if (document.body.classList.contains('mode-mist')) {
      renderMistPills(activeItems);
      stabilizeShortcutsHeight(tabs);
      rebuildNavModel();
      return;
    }

    container.innerHTML = '';

    const metrics = getGridMetrics(activeItems.length);

    if (document.body.classList.contains('mode-ios')) {
      container.style.maxWidth = '100%';
      container.style.removeProperty('--grid-cols');
      container.style.removeProperty('--cell-size');
    } else {
      // Центральный блок ограничен шириной самой длинной категории:
      // сетка колонок не должна переполняться и обрезаться (overflow-x: hidden)
      container.style.maxWidth = `${metrics.maxWidth}px`;
      // Метрики виртуальной сетки (используются как эталон размеров плитки)
      container.style.setProperty('--grid-cols', String(metrics.columns));
      container.style.setProperty('--cell-size', `${metrics.itemWidth}px`);
    }

    window.ShortcutRenderer.appendClassicCards(activeItems, STATE.size, container);
    stabilizeShortcutsHeight(tabs);
    rebuildNavModel();
  }

  // ---------- КАТЕГОРИИ (ВКЛАДКИ) ----------

  function buildTabs() {
    const result = window.ShortcutCategories.buildTabs(
      STATE.shortcuts,
      STATE.language,
      TRANSLATIONS,
      activeCategory
    );
    activeCategory = result.activeCategory;
    return result.tabs;
  }

  function getActiveTab(tabs) {
    return window.ShortcutCategories.getActiveTab(tabs, activeCategory);
  }

  // Метрики классической сетки: жёсткие равные колонки (display: grid),
  // одинаковая ширина плиток и фиксированный отступ gap: 12px.
  // --grid-cols / --cell-size задают CSS: repeat(var(--grid-cols), var(--cell-size))
  function getGridMetrics(count) {
    return window.ShortcutLayout.getGridMetrics(
      count,
      STATE.size,
      STATE.columns,
      window.innerWidth
    );
  }

  // Фиксирует высоту области ярлыков: она одинакова для ВСЕХ категорий,
  // поэтому панель вкладок и ярлыки не «пыгают» при переключении.
  // В классике число рядов считается по колонкам CSS-сетки, в Mist — по
  // названиям и доступной ширине (flex flow). Расчёт детерминирован и не
  // зависит от getBoundingClientRect — высота одинакова и в браузере,
  // и в тестовом окружении без layout.
  let lastFixedHeight = 0;
  let cachedMistRowHeight = 0;
  let cachedClassicRowHeight = 0;

  // Доступная ширина под поток пилюль (только режим Mist). В браузере берём
  // модуль — его ширина не зависит от того, какая категория открыта; иначе
  // тот же предел, что задаёт CSS (--mist-max-w / MIST_MAX_W).
  function flowContentWidth() {
    const pad = MIST_PAD * 2; // внутренний отступ контейнера (10px × 2)
    const mod = document.getElementById('mist-module');
    if (mod && mod.clientWidth > 0) return Math.max(180, mod.clientWidth - pad);
    const cap = parseFloat(container && container.style.maxWidth);
    const limit = cap > 0 ? cap : MIST_MAX_W;
    return Math.max(180, limit - pad);
  }

  // Метрики пилюли для оценки её ширины по названию (без layout):
  // .mist-pill { padding: 8px 16px; border: 1px; icon 19px; gap 8px;
  //              font-size: 14.5px; max-width: min(300px, 100%) }
  function mistChipMetrics() {
    return {
      minW: 0, padX: 34, icon: 19, innerGap: 8, labelPad: 0,
      gap: MIST_CELL_GAP, charW: 7.6, maxText: 239, maxW: 300
    };
  }

  // Оценка ширины пилюли по длине названия — без layout, поэтому
  // результат одинаков в браузере и в jsdom (высота не «прыгает»)
  function flowChipWidth(name, cfg) {
    const text = Math.min((name || '').length * cfg.charW, cfg.maxText) + cfg.labelPad;
    const natural = cfg.padX + cfg.icon + cfg.innerGap + text;
    return Math.max(cfg.minW, Math.min(cfg.maxW, natural));
  }

  // Сколько строк займёт категория в потоке (жадная укладка строк)
  function countFlowRows(names, availW, cfg) {
    let rows = 1;
    let used = 0;
    names.forEach((name) => {
      const w = Math.min(availW, flowChipWidth(name, cfg));
      if (used > 0 && used + cfg.gap + w > availW) {
        rows += 1;
        used = w;
      } else {
        used = used === 0 ? w : used + cfg.gap + w;
      }
    });
    return Math.max(1, rows);
  }

  function stabilizeShortcutsHeight(tabs) {
    if (!container) return;

    if (document.body.classList.contains('mode-ios')) {
      container.style.height = '';
      lastFixedHeight = 0;
      return;
    }

    const isMist = document.body.classList.contains('mode-mist');
    const list = tabs || [];
    let rows = 0;
    let rowHeight = 0;
    let padding = 24; // двойной внутренний отступ контейнера

    if (isMist) {
      // --- Mist: органичный Flex-поток, высоту задаёт ТОЛЬКО CSS ---
      // Инлайн-высоту сетке ярлыков НЕ навязываем: она применялась бы как
      // фиксированный размер и на свежей вкладке считалась ДО отрисовки
      // пилюль (offsetHeight ещё 0) — высота выходила меньше контента, и в
      //низу появлялся лишний скролл-блок/«полоса». После «Сбросить макет»
      // такой высоты нет (clearCustomLayoutStyles её снимает, а повторный
      // рендер не возвращает) — состояние загрузки теперь совпадает с ним
      // ПОЛНОСТЬЮ: никакого position: absolute, ширин/высот и расчётов
      // mistHeadOffset для сетки, только чистый flex-поток.
      lastFixedHeight = 0;
      container.style.height = '';
      return;
    } else {
      // --- Стандартный режим: классическая CSS-сетка, ряды = колонки ---
      // Высота ряда: измеряем уже отрисованную плитку (браузер), без layout —
      // квадратная плитка (width === height) + gap: 12px.
      const card = container.querySelector('.shortcut-card');
      if (card && card.offsetHeight) {
        cachedClassicRowHeight = card.offsetHeight + 12;
      }
      rowHeight = cachedClassicRowHeight || (getGridMetrics(1).itemWidth + 12);
      padding = 24; // 12px × 2

      list.forEach(tab => {
        const items = (tab.items || []).filter(i => i && !i.isFolder);
        if (!items.length) return;
        const m = getGridMetrics(items.length);
        rows = Math.max(rows, Math.ceil(items.length / Math.max(1, m.columns)));
      });
    }

    // Во всём приложении нет ни одного ярлыка — держим прежнюю высоту,
    // чтобы панель категорий не съезжала
    if (!rows) {
      rows = lastFixedHeight
        ? Math.max(1, Math.round((lastFixedHeight - padding) / rowHeight))
        : 1;
    }

    const needed = Math.round(rows * rowHeight + padding);
    const cap = Math.max(160, Math.round(window.innerHeight * (isMist ? 0.46 : 0.52)));
    const height = Math.min(needed, cap);

    // Высота уже зафиксирована — ничего не перезаписываем (без «дёрганий»)
    if (height === lastFixedHeight) return;
    lastFixedHeight = height;
    container.style.height = `${height}px`;
  }

  // ---------- РЕНДЕР MIST: FLEX-ПОТОК «ПИЛЮЛЬ» ----------
  // Пилюли кладутся ПРЯМО в контейнер (без рядов-обёрток): контейнер —
  // это Flexbox с переносом (flex-wrap), ширина каждой пилюли ПО ТЕКСТУ.
  // Никаких одинаковых колонок, пустых ячеек и «лесенок»: короткие
  // названия дают короткие пилюли, длинные — аккуратно переносятся.

  function renderMistPills(items) {
    if (!container) return;
    container.innerHTML = '';
    container.style.maxWidth = '';

    const list = (Array.isArray(items) ? items : []).filter(item => item && !item.isFolder);
    // Настройка «Ярлыков в ряду» ограничивает ширину центрального блока:
    // виртуальная ячейка × ряд + padding − gap, но не больше MIST_MAX_W.
    // Переменная вешается на body, чтобы её видел и сам модуль (#mist-module)
    const perRow = Math.max(1, parseInt(STATE.mistPerRow, 10) || 6);
    document.body.style.setProperty(
      '--mist-max-w',
      Math.min(MIST_MAX_W,
        perRow * MIST_CELL_W + MIST_PAD * 2 - MIST_CELL_GAP) + 'px'
    );

    const fragment = document.createDocumentFragment();
    list.forEach(item => fragment.appendChild(createMistPill(item)));
    container.appendChild(fragment);
  }

  // Переключение активной категории (вкладки) — в классике и в Mist
  function selectCategory(tabId, index, focusTab) {
    if (activeCategory === tabId) {
      if (focusTab) focusTabByIndex(index);
      return;
    }

    activeCategory = tabId;
    renderShortcuts();

    if (focusTab) focusTabByIndex(index);
  }

  function focusTabByIndex(index) {
    if (!mistTabsEl) return;
    const buttons = mistTabsEl.querySelectorAll('.mist-tab');
    if (buttons[index]) buttons[index].focus();
  }

  function renderCategoryTabs(tabs) {
    window.ShortcutRenderer.renderCategoryTabs(
      mistTabsEl,
      tabs,
      activeCategory,
      (tabId, index, focusTab) => selectCategory(tabId, index, focusTab)
    );
  }

  // Клавиатура чипа категории: Left/Right — соседние категории (циклически),
  // Где панель категорий лежит физически относительно сетки ярлыков.
  // Классика и Mist-сплит: вкладки СВЕРХУ (сплит — прямо под поиском),
  // Mist-центр и Zen: вкладки СНИЗУ под сеткой.
  function tabsPanelAboveGrid() {
    if (!document.body.classList.contains('mode-mist')) return true;
    return document.body.classList.contains('mist-preset-split') ||
      document.body.classList.contains('mist-preset-center') ||
      document.body.classList.contains('mist-preset-zen');
  }

  // Порядок в DOM обязан совпадать с визуальным порядком, иначе Tab
  // «прыгает» не туда: вкладки сверху → первые в DOM, снизу → последние
  function syncTabsDomPosition() {
    if (!mistTabsEl || !container) return;
    const wrap = mistTabsEl.parentElement;
    if (!wrap || wrap !== container.parentElement) return;
    const tabsFirst = wrap.firstElementChild === mistTabsEl;
    const wantTabsFirst = tabsPanelAboveGrid();
    if (tabsFirst === wantTabsFirst) return;
    if (wantTabsFirst) wrap.insertBefore(mistTabsEl, container);
    else wrap.insertBefore(container, mistTabsEl);
  }

  // ---------- НАВИГАЦИЯ ПО СЕТКЕ ЯРЛЫКОВ СТРЕЛКАМИ ----------

  function gridShortcutItems() {
    return container ? Array.from(container.querySelectorAll('.shortcut-card, .mist-pill')) : [];
  }

  // Сколько карточек помещается в один ряд (считаем по верхним координатам)
  function gridItemsPerRow(items) {
    if (!items.length) return 1;
    const firstTop = items[0].offsetTop;
    let perRow = 0;
    while (perRow < items.length && items[perRow].offsetTop === firstTop) perRow++;
    return perRow > 0 ? perRow : 1;
  }

  // ---------- КЛАВИАТУРНАЯ НАВИГАЦИЯ: ДИНАМИЧЕСКАЯ МОДЕЛЬ ЗОН ----------
  // Структура DOM меняется от режима Layout (Standard / Left / Zen / Mist):
  // панель категорий оказывается то НАД сеткой, то ПОД ней, часы, поиск и
  // виджеты лежат в разных узлах. Готовые «связи» между узлами хранить нельзя —
  // после смены режима они ведут не туда. Поэтому список фокусируемых элементов
  // (Search / Categories / Grid / Widgets) пересобирается заново: при каждой
  // отрисовке интерфейса (renderShortcuts) и перед каждым нажатием клавиши.

  // Видим ли элемент — вместе со всеми предками (display: none родителя
  // по вычисленным стилям самого элемента не виден)
  function navVisible(el) {
    if (!el || el.isConnected === false) return false;
    let node = el;
    while (node && node.nodeType === 1) {
      const st = window.getComputedStyle(node);
      if (st.display === 'none' || st.visibility === 'hidden') return false;
      node = node.parentElement;
    }
    return true;
  }

  // Фокусируемые элементы внутри корня (в DOM-порядке)
  function navFocusables(root) {
    if (!root) return [];
    const sel = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), ' +
      'select:not([disabled]), textarea:not([disabled]), button:not([disabled]), ' +
      '[tabindex="0"], [contenteditable]';
    return Array.from(root.querySelectorAll(sel))
      .filter((el) => el.tabIndex !== -1 && navVisible(el));
  }

  function navZoneRoots(key) {
    return (NAV_ZONE_ROOTS[key] || [])
      .map((id) => document.getElementById(id))
      .filter(Boolean);
  }

  // Порядок зон СВЕРХУ-ВНИЗ. Опора — режим Layout (в тестовом окружении
  // и в скрытых блоках измерить нечего), в браузере порядок уточняется
  // по реальным координатам элементов.
  function navZoneOrder() {
    const above = tabsPanelAboveGrid();
    const fallback = ['widgets', 'search'].concat(above ? ['tabs', 'grid'] : ['grid', 'tabs']);
    const tops = {};
    let measured = 0;
    fallback.forEach((key) => {
      let top = null;
      navZoneRoots(key).forEach((el) => {
        if (!navVisible(el)) return;
        const r = el.getBoundingClientRect();
        if (r && r.top > 0) top = top === null ? r.top : Math.min(top, r.top);
      });
      tops[key] = top;
      if (top !== null) measured += 1;
    });
    if (measured !== fallback.length) return fallback;
    return fallback.slice().sort((a, b) => tops[a] - tops[b]);
  }

  function navZoneItems(key) {
    if (key === 'widgets') {
      return navZoneRoots('widgets').filter(navVisible).map((el) => {
        // Часы/погода не кликабельны по умолчанию: tabindex=-1 делает их
        // доступными для программного фокуса, не меняя порядок Tab
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        return el;
      });
    }
    if (key === 'grid') return gridShortcutItems().filter(navVisible);
    const roots = navZoneRoots(key).filter(navVisible);
    if (!roots.length) return [];
    // У чипов категорий roving tabindex (неактивные = -1), поэтому берём их
    // напрямую: стрелками доступны ВСЕ чипы, а в Tab — только активный
    if (key === 'tabs') {
      return Array.from(roots[0].querySelectorAll('.mist-tab')).filter(navVisible);
    }
    return navFocusables(roots[0]);
  }

  // Пересборка модели: зоны в визуальном порядке + метрика сетки ярлыков
  function rebuildNavModel() {
    const zones = [];
    navZoneOrder().forEach((key) => {
      const items = navZoneItems(key);
      if (!items.length) return;
      zones.push({ key, items, roots: navZoneRoots(key) });
    });
    const gridZone = zones.find((z) => z.key === 'grid');
    const gridItems = gridZone ? gridZone.items : [];
    navModel = {
      zones,
      gridItems,
      gridPerRow: gridItems.length ? gridItemsPerRow(gridItems) : 1
    };
    return navModel;
  }

  function navFocus(el) {
    if (el && typeof el.focus === 'function') el.focus();
  }

  function navActiveTabElement() {
    if (!mistTabsEl) return null;
    return mistTabsEl.querySelector('.mist-tab.active') || mistTabsEl.querySelector('.mist-tab');
  }

  // Вход в зону с нужной стороны: ближайший к границе элемент
  function navZoneEntry(zone, dir) {
    if (!zone) return null;
    if (zone.key === 'tabs') return navActiveTabElement() || zone.items[0];
    if (zone.key === 'search') {
      return zone.items.find((el) => el.tagName === 'INPUT') || zone.items[0];
    }
    if (zone.key === 'widgets') return zone.items[0];
    return dir > 0 ? zone.items[0] : zone.items[zone.items.length - 1];
  }

  // Переход в соседнюю зону сверху/снизу. За крайней зоной клавиша лишь
  // гасится — фокус не «улетает» и страница не скроллится.
  function navJumpZone(model, zi, dir, e) {
    const nz = zi + dir;
    e.preventDefault();
    if (nz < 0 || nz >= model.zones.length) return true;
    navFocus(navZoneEntry(model.zones[nz], dir));
    return true;
  }

  // Единый обработчик клавиатуры навигации. Возвращает true, если клавиша
  // «наша» (даже когда default намеренно не подавляем — например, каретка
  // в поле ввода), и false, если событие нужно отдать другим обработчикам.
  function navHandleKeydown(e) {
    const key = e.key;
    const isTab = key === 'Tab';
    if (!isTab && !NAV_KEYS.includes(key)) return false;
    if (e.ctrlKey || e.altKey || e.metaKey) return false;

    const model = rebuildNavModel();
    if (!model.zones.length) return false;

    const anchor = (e.target && e.target.nodeType === 1) ? e.target : document.activeElement;
    const inputType = anchor && anchor.tagName === 'INPUT' ? (anchor.type || 'text').toLowerCase() : '';
    const textLike = anchor && anchor.tagName === 'INPUT' &&
      ['text', 'search', 'url', 'email'].includes(inputType);
    // Поле, где стрелки значимы для содержимого (textarea, число, файл…)
    const hardEntry = anchor && (
      anchor.tagName === 'TEXTAREA' || anchor.isContentEditable ||
      (anchor.tagName === 'INPUT' && !textLike)
    );
    if (hardEntry) return true;
    // Строка поиска: Left/Right и Home/End двигают каретку, не зоны
    if (textLike && !isTab && key !== 'ArrowUp' && key !== 'ArrowDown') return true;

    // Какая зона держит якорь
    let zi = -1;
    let ii = -1;
    for (let i = 0; i < model.zones.length; i += 1) {
      const z = model.zones[i];
      const idx = z.items.indexOf(anchor);
      if (idx >= 0) { zi = i; ii = idx; break; }
      if (z.roots.some((r) => r.contains && r.contains(anchor))) { zi = i; ii = 0; break; }
    }

    // --- Tab: сквозной переход между зонами в визуальном порядке ---
    if (isTab) {
      if (zi < 0) return false;
      if (!e.shiftKey && anchor === searchInput && model.zones[zi].key === 'search') {
        const tabsZone = model.zones.find((item) => item.key === 'tabs');
        const activeTab = tabsZone && navActiveTabElement();
        if (activeTab) {
          e.preventDefault();
          navFocus(activeTab);
          return true;
        }
      }

      const flat = [];
      const bounds = [];
      model.zones.forEach((z) => {
        const start = flat.length;
        // roving tabindex и tabindex=-1 (виджеты) в обход Tab не входят —
        // они достижимы стрелками, а Tab идёт по обычному порядку зон
        z.items.forEach((it) => { if (it.tabIndex !== -1) flat.push(it); });
        bounds.push({ start, end: flat.length - 1 });
      });
      if (!flat.length) return false;
      let cur = flat.indexOf(anchor);
      if (cur < 0) cur = e.shiftKey ? bounds[zi].end : bounds[zi].start;
      const next = e.shiftKey ? cur - 1 : cur + 1;
      // За крайним элементом клавиша отдаётся браузеру — фокус уходит со страницы
      if (next < 0 || next >= flat.length) return false;
      e.preventDefault();
      navFocus(flat[next]);
      return true;
    }

    const zone = zi >= 0 ? model.zones[zi] : null;

    // --- Фокус вне зон (страница, служебные узлы): точка входа — поиск ---
    if (!zone) {
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        const entry = model.zones.find((z) => z.key === 'search') || model.zones[0];
        e.preventDefault();
        navFocus(navZoneEntry(entry, 1));
        return true;
      }
      return false; // Left/Right и Home/End уходят глобальным хоткеям
    }

    // --- Панель категорий: Left/Right/Home/End переключают категорию ---
    if (zone.key === 'tabs' &&
        (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End')) {
      const buttons = zone.items;
      if (buttons.length < 2) return false;
      let ni = buttons.indexOf(anchor);
      if (ni < 0) ni = 0;
      if (key === 'ArrowRight') ni = (ni + 1) % buttons.length;
      else if (key === 'ArrowLeft') ni = (ni - 1 + buttons.length) % buttons.length;
      else if (key === 'Home') ni = 0;
      else ni = buttons.length - 1;
      e.preventDefault();
      selectCategory(buttons[ni].dataset.tabId, ni, true);
      return true;
    }

    // --- Home/End: границы текущей зоны ---
    if (key === 'Home' || key === 'End') {
      e.preventDefault();
      navFocus(key === 'Home' ? zone.items[0] : zone.items[zone.items.length - 1]);
      return true;
    }

    const dir = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0;

    // --- Сетка ярлыков: движение по рядам ---
    if (zone.key === 'grid') {
      const items = zone.items;
      const perRow = model.gridPerRow;

      if (dir) {
        const next = ii + dir * perRow;
        if (next >= 0 && next < items.length) {
          e.preventDefault();
          navFocus(items[next]);
          return true;
        }
        // Верхний/нижний ряд → зона выше/ниже (поиск, категории, виджеты)
        return navJumpZone(model, zi, dir, e);
      }

      const col = ii % perRow;
      const rowStart = ii - col;
      const rowEnd = Math.min(rowStart + perRow, items.length) - 1;
      let target = -1;
      if (key === 'ArrowRight') {
        target = ii < rowEnd ? ii + 1 : (rowEnd + 1 < items.length ? rowEnd + 1 : -1);
      } else {
        target = ii > rowStart ? ii - 1 : (rowStart - perRow >= 0 ? rowStart - 1 : -1);
      }
      e.preventDefault();
      if (target >= 0) navFocus(items[target]);
      return true;
    }

    // --- Остальные зоны: Up/Down всегда ведут в соседнюю зону ---
    if (dir) return navJumpZone(model, zi, dir, e);

    // --- Left/Right внутри зоны (кнопки поиска, виджеты) ---
    const next = key === 'ArrowRight' ? ii + 1 : ii - 1;
    e.preventDefault();
    if (next >= 0 && next < zone.items.length) navFocus(zone.items[next]);
    return true;
  }
  function createMistPill(item) {
    const pill = document.createElement('a');
    pill.className = 'mist-pill';
    pill.href = item.url;
    pill.title = item.name;

    const img = document.createElement('img');
    img.className = 'mist-pill-icon';
    img.alt = '';

    let hostname = '';
    try { hostname = new URL(item.url).hostname; } catch (e) { hostname = item.url; }
    img.src = item.customIcon || `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
    img.onerror = () => {
      img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>';
    };

    const span = document.createElement('span');
    span.className = 'mist-pill-label';
    span.textContent = item.name;

    pill.appendChild(img);
    pill.appendChild(span);
    return pill;
  }





  // --- РђР”РђРџРўРР’РќР«Р™ РњР•РќР•Р”Р–Р•Р  РўР•Рњ ---
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

                // РЎРѕР·РґР°РµРј ARGB РёР· РїРёРєСЃРµР»СЏ РґР»СЏ РєРІР°РЅС‚РёР·Р°С‚РѕСЂР° (Celebrity Quantizer)
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
              // РљРІР°РЅС‚РёР·РёСЂСѓРµРј РїРёРєСЃРµР»Рё Рё РІС‹Р±РёСЂР°РµРј Р»СѓС‡С€РёР№ С†РІРµС‚
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

  // --- Р РђРЎРџРћР›РћР–Р•РќРР• Р­Р›Р•РњР•РќРўРћР’ (LAYOUT DRAG & DROP) ---
  let activeDragElement = null;
  let dragOffset = { x: 0, y: 0 };
  let hasDragged = false;
  let tempPositions = {};
  let layoutGridSnap = null;
  let layoutGridSize = null;

  // --- MIST: ДВА независимых виджета «Время» и «Поиск» ---
  // Часы и поиск — отдельные виджеты: каждый двигается и меняет размер
  // сам по себе, поэтому блок можно разнести по экрану как угодно.
  let tempMistWidgets = normalizeMistWidgets(null);
  let mistHeadDrag = null;

  function isMistHeadWidget(widget) {
    if (!widget || !document.body.classList.contains('mode-mist')) return false;
    return widget.classList.contains('clock-container') || widget.id === 'search-form';
  }

  // Ключ виджета внутри карты mistHeadOffset: 'clock' | 'search' | null
  function mistWidgetKey(widget) {
    if (!widget) return null;
    if (widget.id === 'search-form') return 'search';
    if (widget.classList.contains('clock-container')) return 'clock';
    return null;
  }

  let activeResizeElement = null;
  let resizeStartCoords = { x: 0, y: 0 };
  let resizeStartDimensions = { w: 0, h: 0 };
  let resizeStartScale = 1;

  // Стартовые размеры для ресайза: jsdom/скрытые элементы отдают нули,
  // тогда берём эталонные габариты (пропорции всё равно сохранятся)
  const RESIZE_BASE_SIZE = {
    clock: { w: 450, h: 110 },
    weather: { w: 300, h: 90 },
    search: { w: 580, h: 40 },
    shortcuts: { w: 600, h: 400 }
  };

  // Минимальная ширина виджета при пропорциональном ресайзе вне iOS.
  const RESIZE_MIN_WIDTH = {
    clock: 200,
    weather: 140,
    search: 260,
    shortcuts: 320
  };

  const IOS_RESIZE_MIN_CELLS = {
    clock: { w: 4, h: 6 },
    weather: { w: 4, h: 6 },
    search: { w: 7, h: 5 },
    shortcuts: { w: 8, h: 6 }
  };

  function getWidgetKey(element) {
    if (element.id === 'widget-clock') return 'clock';
    if (element.id === 'weather-widget') return 'weather';
    if (element.id === 'search-form') return 'search';
    if (element.id === 'widget-shortcuts') return 'shortcuts';
    return null;
  }

  // Инлайн-свойства, которые задают кастомную позицию/размер элемента
  const CUSTOM_POSITION_PROPS = ['position', 'top', 'left', 'right', 'bottom', 'transform',
    'margin', 'width', 'height', 'max-width', 'max-height'];

  // Полностью снимает кастомные позиционные стили (top/left/transform/…)
  // у поиска, часов, погоды, панели категорий и сетки ярлыков —
  // элементы возвращаются в дефолтную сетку Flex/Grid текущего пресета
  function clearCustomLayoutStyles() {
    const targets = document.querySelectorAll(
      '.draggable-widget, .clock-container, .weather-container, .search-form, .shortcuts-wrapper, #mist-tabs, #shortcuts-container'
    );
    targets.forEach(el => {
      CUSTOM_POSITION_PROPS.forEach(prop => el.style.removeProperty(prop));
      // Сдвиги и размеры независимых виджетов в режиме Mist
      el.style.removeProperty('--mist-head-x');
      el.style.removeProperty('--mist-head-y');
      el.style.removeProperty('--clock-scale');
    });
  }

  // --- MIST: независимые виджеты «Время» и «Поиск» ---
  // Сдвиг каждого виджета живёт в СВОЕЙ CSS-переменной, размер — в
  // инлайн-стиле, масштаб часов — в --clock-scale. Ничего не связано
  // с соседним виджетом, поэтому верстка не «уезжает» у второго.
  function mistHeadElements() {
    return [
      document.querySelector('.clock-container'),
      document.getElementById('search-form')
    ].filter(Boolean);
  }

  // Применяет карту { clock: {...}, search: {...} } к обоим виджетам
  function applyMistWidgets(map) {
    const inMist = document.body.classList.contains('mode-mist');
    const norm = normalizeMistWidgets(map);
    const moduleElement = document.getElementById('mist-module');
    if (!inMist && moduleElement) {
      moduleElement.style.removeProperty('--mist-panel-x');
      moduleElement.style.removeProperty('--mist-panel-y');
      moduleElement.style.removeProperty('--mist-panel-width');
    }

    mistHeadElements().forEach(el => {
      const key = mistWidgetKey(el) || 'clock';
      // Вне Mist чистим только «хвосты» сдвига — размеры/масштаб часов
      // в классическом режиме задаёт applyLayoutPositions()
      const off = inMist ? norm[key] : { x: 0, y: 0, w: 0, h: 0, s: 1 };

      if (off.x || off.y) {
        el.style.setProperty('--mist-head-x', off.x + 'px');
        el.style.setProperty('--mist-head-y', off.y + 'px');
      } else {
        el.style.removeProperty('--mist-head-x');
        el.style.removeProperty('--mist-head-y');
      }

      if (!inMist) return;

      if (key === 'clock') {
        // Часы масштабируются ЦЕЛИКОМ: шрифт и контейнер (CSS calc) растут вместе
        applyClockScale(el, off.s);
      } else {
        if (moduleElement) {
          moduleElement.style.setProperty('--mist-panel-x', (off.x || 0) + 'px');
          moduleElement.style.setProperty('--mist-panel-y', (off.y || 0) + 'px');
          if (off.w > 0) moduleElement.style.setProperty('--mist-panel-width', off.w + 'px');
          else moduleElement.style.removeProperty('--mist-panel-width');
        }

        if (off.w > 0 && off.h > 0) {
          // Поиск — собственные габариты (CSS заданы через !important)
          el.style.setProperty('width', off.w + 'px', 'important');
          el.style.setProperty('max-width', off.w + 'px', 'important');
          el.style.setProperty('height', off.h + 'px', 'important');
          el.style.setProperty('max-height', off.h + 'px', 'important');
        } else {
          el.style.removeProperty('width');
          el.style.removeProperty('max-width');
          el.style.removeProperty('height');
          el.style.removeProperty('max-height');
        }
      }
    });
  }

  function applyLayoutPositions() {
    const isIos = document.body.classList.contains('mode-ios');
    // Режимы Mist/Split задают композицию сами: абсолютные кастомные координаты,
    // сохранённые в классическом режиме, здесь СБРАСЫВАЕМ до пресетных значений,
    // иначе элементы «уезжают» и ломают верстку при переключении
    const isMist = document.body.classList.contains('mode-mist');
    const widgets = document.querySelectorAll('.draggable-widget');
    widgets.forEach(widget => {
      const key = getWidgetKey(widget);
      const pos = (!isMist && key && STATE.layoutPositions && STATE.layoutPositions[key])
        ? STATE.layoutPositions[key]
        : null;
      if (pos) {
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
        } else if (key === 'clock') {
          // Часы: габариты считает CSS от --clock-scale (пропорции сохраняются)
          widget.style.width = '';
          widget.style.height = '';
          widget.style.removeProperty('max-width');
          widget.classList.remove('widget-wide');
        } else {
          // Остальные виджеты: собственные габариты из режима редактирования
          const w = Number(pos.widthPx) || 0;
          const h = Number(pos.heightPx) || 0;
          widget.style.width = w > 0 ? w + 'px' : '';
          widget.style.height = h > 0 ? h + 'px' : '';
          widget.style.maxWidth = w > 0 ? w + 'px' : '';
          widget.style.maxHeight = h > 0 ? h + 'px' : '';
          widget.classList.remove('widget-wide');
        }

        // Масштаб часов при ресайзе (пропорции часы/дата сохраняются)
        applyClockScale(widget, pos.scale);
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
        widget.style.removeProperty('max-width');
        widget.style.removeProperty('max-height');
        widget.classList.remove('widget-wide');
        applyClockScale(widget, 1);
      }
    });

    // В Mist часы и поиск живут как ДВА независимых виджета:
    // у каждого свой сдвиг и свой размер
    if (isMist) {
      applyMistWidgets(STATE.mistHeadOffset);
    } else {
      // Вне Mist эти сдвиги не нужны — убираем переменные,
      // чтобы классическая раскладка осталась без следов
      applyMistWidgets(null);
    }
  }

  // Масштаб часов: 1 — исходный размер, иначе CSS-переменная
  // переиспользуется в calc() для шрифта и габаритов контейнера
  function applyClockScale(widget, scale) {
    if (!widget || !widget.classList.contains('clock-container')) return;
    const s = Number(scale);
    if (isFinite(s) && s > 0 && Math.abs(s - 1) > 1e-6) {
      widget.style.setProperty('--clock-scale', String(s));
    } else {
      widget.style.removeProperty('--clock-scale');
    }
  }

  function initLayoutDragAndDrop() {
    // Р”РёРЅР°РјРёС‡РµСЃРєРё СЃРѕР·РґР°РµРј РЅР°РїСЂР°РІР»СЏСЋС‰РёРµ Р»РёРЅРёРё РїСЂРёРјР°РіРЅРёС‡РёРІР°РЅРёСЏ, РµСЃР»Рё РёС… РЅРµС‚ РІ DOM
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

    // В Mist редактируются ТОЛЬКО два независимых виджета — «Время» и «Поиск»;
    // сетка ярлыков и панель категорий в режиме редактирования неподвижны
    if (document.body.classList.contains('mode-mist')) {
      if (!isMistHeadWidget(widget)) return;

      const mistClientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
      const mistClientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
      const mk = mistWidgetKey(widget) || 'clock';
      const cur = tempMistWidgets[mk] || { x: 0, y: 0, w: 0, h: 0, s: 1 };

      mistHeadDrag = {
        el: widget,
        key: mk,
        startX: mistClientX,
        startY: mistClientY,
        baseX: cur.x,
        baseY: cur.y,
        rect: widget.getBoundingClientRect()
      };
      activeDragElement = widget;
      hasDragged = false;
      return;
    }

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
    // Mist: двигаем ТОЛЬКО тот виджет, который схватили — часы и поиск
    // независимы и никогда не едут вместе
    if (mistHeadDrag) {
      if (e.cancelable) e.preventDefault();
      hasDragged = true;

      const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

      let dx = clientX - mistHeadDrag.startX;
      let dy = clientY - mistHeadDrag.startY;

      // Привязка к сетке (если включена в режиме редактирования)
      if (layoutGridSnap && layoutGridSnap.checked) {
        const gridSize = parseInt(layoutGridSize && layoutGridSize.value, 10) || 20;
        dx = Math.round(dx / gridSize) * gridSize;
        dy = Math.round(dy / gridSize) * gridSize;
      }

      const r = mistHeadDrag.rect;

      // Центрирование по горизонтали (ванильная логика SCT): виджет
      // притягивается к вертикальной оси центра экрана — как и в классике
      let snappedCenterX = false;
      const axisX = window.innerWidth / 2;
      const centerX = r.left + dx + (r.width || 0) / 2;
      if (Math.abs(centerX - axisX) < 15) {
        dx += axisX - centerX;
        snappedCenterX = true;
      }

      // Виджет не должен уехать за пределы экрана
      const minDx = -r.left;
      const maxDx = Math.max(minDx, window.innerWidth - r.right);
      const minDy = -r.top;
      const maxDy = Math.max(minDy, window.innerHeight - r.bottom);
      dx = Math.min(Math.max(dx, minDx), maxDx);
      dy = Math.min(Math.max(dy, minDy), maxDy);

      // Сдвиг записывается ТОЛЬКО в тот виджет, который тащим мышью
      const dragKey = mistHeadDrag.key || 'clock';
      tempMistWidgets[dragKey] = Object.assign({}, tempMistWidgets[dragKey] || { x: 0, y: 0, w: 0, h: 0, s: 1 }, {
        x: mistHeadDrag.baseX + dx,
        y: mistHeadDrag.baseY + dy
      });
      applyMistWidgets(tempMistWidgets);

      const gX = document.getElementById('guide-line-x');
      const gY = document.getElementById('guide-line-y');
      if (gX) gX.classList.toggle('active', snappedCenterX);
      if (gY) gY.classList.remove('active');
      if (mistHeadDrag.el) mistHeadDrag.el.classList.toggle('widget-snapped', snappedCenterX);
      return;
    }

    if (!activeDragElement) return;
    hasDragged = true;

    if (e.cancelable) {
      e.preventDefault();
    }

    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    
    let newLeft = clientX - dragOffset.x;
    let newTop = clientY - dragOffset.y;
    
    // РЎРЅР°С‡Р°Р»Р° РѕР±С‹С‡РЅР°СЏ СЃРµС‚РєР° РїСЂРёРІСЏР·РєРё (РµСЃР»Рё Р°РєС‚РёРІРЅР°)
    if (layoutGridSnap && layoutGridSnap.checked) {
      const gridSize = parseInt(layoutGridSize.value) || 20;
      newLeft = Math.round(newLeft / gridSize) * gridSize;
      newTop = Math.round(newTop / gridSize) * gridSize;
    }
    
    // РџРѕР»СѓС‡Р°РµРј РѕСЂРёРіРёРЅР°Р»СЊРЅС‹Рµ С„РёР·РёС‡РµСЃРєРёРµ СЂР°Р·РјРµСЂС‹ СЌР»РµРјРµРЅС‚Р° Р±РµР· СѓС‡РµС‚Р° CSS-РјР°СЃС€С‚Р°Р±РёСЂРѕРІР°РЅРёСЏ (scale)
    const widgetWidth = activeDragElement.offsetWidth;
    const widgetHeight = activeDragElement.offsetHeight;
    const key = getWidgetKey(activeDragElement);
    
    // Р•СЃР»Рё РїРµСЂРµС‚Р°СЃРєРёРІР°РµС‚СЃСЏ Р±Р»РѕРє СЏСЂР»С‹РєРѕРІ РІ РєР»Р°СЃСЃРёС‡РµСЃРєРѕРј СЂРµР¶РёРјРµ, С„РёРєСЃРёСЂСѓРµРј РµРіРѕ РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРµ РїРѕР»РѕР¶РµРЅРёРµ СЃС‚СЂРѕРіРѕ РїРѕ С†РµРЅС‚СЂСѓ.
    // Р’ СЂРµР¶РёРјРµ iOS СЂР°Р·СЂРµС€Р°РµРј СЃРІРѕР±РѕРґРЅРѕРµ РїРµСЂРµРјРµС‰РµРЅРёРµ РїРѕ РіРѕСЂРёР·РѕРЅС‚Р°Р»Рё.
    if (key === 'shortcuts' && !document.body.classList.contains('mode-ios')) {
      newLeft = (window.innerWidth - widgetWidth) / 2;
    }
    
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    
    const snapThreshold = 15; // Р Р°СЃСЃС‚РѕСЏРЅРёРµ РїСЂРёС‚СЏР¶РµРЅРёСЏ РІ РїРёРєСЃРµР»СЏС… (РєР°Рє РІ PowerPoint/Figma)
    let snappedX = false;
    let snappedY = false;
    
    // 1. РџСЂРёС‚СЏРіРёРІР°РЅРёРµ Рє РІРµСЂС‚РёРєР°Р»СЊРЅРѕР№ РѕСЃРё С†РµРЅС‚СЂР° СЌРєСЂР°РЅР° (РґР»СЏ РІСЃРµС… РІРёРґР¶РµС‚РѕРІ, РєСЂРѕРјРµ СЏСЂР»С‹РєРѕРІ РІ РєР»Р°СЃСЃРёС‡РµСЃРєРѕРј СЂРµР¶РёРјРµ)
    // РњР°РіРЅРёС‚РёС‚СЃСЏ РїРѕ 3 С‚РѕС‡РєР°Рј: Р»РµРІС‹Р№ РєСЂР°Р№, С†РµРЅС‚СЂ, РїСЂР°РІС‹Р№ РєСЂР°Р№ Рє С†РµРЅС‚СЂР°Р»СЊРЅРѕР№ РІРµСЂС‚РёРєР°Р»Рё
    if (key !== 'shortcuts' || document.body.classList.contains('mode-ios')) {
      const distCenterX = Math.abs((newLeft + widgetWidth / 2) - viewportCenterX);
      const distLeftX = Math.abs(newLeft - viewportCenterX);
      const distRightX = Math.abs((newLeft + widgetWidth) - viewportCenterX);
      
      const minDistX = Math.min(distCenterX, distLeftX, distRightX);
      
      if (minDistX < snapThreshold) {
        if (minDistX === distCenterX) {
          newLeft = viewportCenterX - widgetWidth / 2; // РџСЂРёРјР°РіРЅРёС‚РёС‚СЊ РїРѕ С†РµРЅС‚СЂСѓ
        } else if (minDistX === distLeftX) {
          newLeft = viewportCenterX; // Р Р°Р·РјРµСЃС‚РёС‚СЊ СЃРїСЂР°РІР° РѕС‚ РѕСЃРё (Р»РµРІС‹Р№ РєСЂР°Р№ РЅР° РѕСЃРё)
        } else {
          newLeft = viewportCenterX - widgetWidth; // Р Р°Р·РјРµСЃС‚РёС‚СЊ СЃР»РµРІР° РѕС‚ РѕСЃРё (РїСЂР°РІС‹Р№ РєСЂР°Р№ РЅР° РѕСЃРё)
        }
        snappedX = true;
      }
    }
    
    // 2. РџСЂРёС‚СЏРіРёРІР°РЅРёРµ Рє РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕР№ РѕСЃРё С†РµРЅС‚СЂР° СЌРєСЂР°РЅР° (РґР»СЏ РІСЃРµС… РІРёРґР¶РµС‚РѕРІ, РІРєР»СЋС‡Р°СЏ СЏСЂР»С‹РєРё)
    // РњР°РіРЅРёС‚РёС‚СЃСЏ РїРѕ 3 С‚РѕС‡РєР°Рј: РІРµСЂС…РЅРёР№ РєСЂР°Р№, С†РµРЅС‚СЂ, РЅРёР¶РЅРёР№ РєСЂР°Р№ Рє С†РµРЅС‚СЂР°Р»СЊРЅРѕР№ РіРѕСЂРёР·РѕРЅС‚Р°Р»Рё
    const distCenterY = Math.abs((newTop + widgetHeight / 2) - viewportCenterY);
    const distTopY = Math.abs(newTop - viewportCenterY);
    const distBottomY = Math.abs((newTop + widgetHeight) - viewportCenterY);
    
    const minDistY = Math.min(distCenterY, distTopY, distBottomY);
    
    if (minDistY < snapThreshold) {
      if (minDistY === distCenterY) {
        newTop = viewportCenterY - widgetHeight / 2; // РџСЂРёРјР°РіРЅРёС‚РёС‚СЊ РїРѕ С†РµРЅС‚СЂСѓ
      } else if (minDistY === distTopY) {
        newTop = viewportCenterY; // Р Р°Р·РјРµСЃС‚РёС‚СЊ РїРѕРґ РѕСЃСЊСЋ (РІРµСЂС…РЅРёР№ РєСЂР°Р№ РЅР° РѕСЃРё)
      } else {
        newTop = viewportCenterY - widgetHeight; // Р Р°Р·РјРµСЃС‚РёС‚СЊ РЅР°Рґ РѕСЃСЊСЋ (РЅРёР¶РЅРёР№ РєСЂР°Р№ РЅР° РѕСЃРё)
      }
      snappedY = true;
    }
    
    // РЈРїСЂР°РІР»РµРЅРёРµ РїРѕРґСЃРІРµС‚РєРѕР№ РѕСЃРµР№
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
    
    // Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ РІРёР·СѓР°Р»СЊРЅС‹Р№ СЌС„С„РµРєС‚ РЅР° СЃР°РјРѕРј СЌР»РµРјРµРЅС‚Рµ РїСЂРё РјР°РіРЅРёС‚РЅРѕР№ СЃС‚С‹РєРѕРІРєРµ
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
    // Mist: сдвиг перетащенного виджета уже записан в tempMistWidgets
    if (mistHeadDrag) {
      const draggedEl = mistHeadDrag.el;
      mistHeadDrag = null;
      activeDragElement = null;
      hasDragged = false;
      if (draggedEl) draggedEl.classList.remove('widget-snapped');
      const gX = document.getElementById('guide-line-x');
      const gY = document.getElementById('guide-line-y');
      if (gX) gX.classList.remove('active');
      if (gY) gY.classList.remove('active');
      return;
    }

    if (!activeDragElement) return;
    
    const key = getWidgetKey(activeDragElement);
    if (key && hasDragged) {
      // РСЃРїРѕР»СЊР·СѓРµРј offsetLeft Рё offsetTop РІРјРµСЃС‚Рѕ getBoundingClientRect()
      // Р­С‚Рѕ РїРѕР»РЅРѕСЃС‚СЊСЋ РёСЃРєР»СЋС‡Р°РµС‚ СЃРјРµС‰РµРЅРёСЏ, РІС‹Р·РІР°РЅРЅС‹Рµ CSS-СЌС„С„РµРєС‚РѕРј transform: scale(1.02)
      const layoutLeft = activeDragElement.offsetLeft;
      const layoutTop = activeDragElement.offsetTop;
      
      if (!tempPositions[key]) {
        tempPositions[key] = {};
      }
      tempPositions[key].left = (layoutLeft / window.innerWidth) * 100;
      tempPositions[key].top = (layoutTop / window.innerHeight) * 100;
    }
    
    // РЎР±СЂР°СЃС‹РІР°РµРј СЌС„С„РµРєС‚С‹ Рё СЃРєСЂС‹РІР°РµРј Р»РёРЅРёРё
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

    const base = RESIZE_BASE_SIZE[getWidgetKey(widget)] || { w: 300, h: 100 };

    resizeStartCoords.x = clientX;
    resizeStartCoords.y = clientY;
    // Габариты «как есть» (ноль не берём — иначе пропорции посчитать нечем)
    resizeStartDimensions.w = widget.offsetWidth > 0 ? widget.offsetWidth : base.w;
    resizeStartDimensions.h = widget.offsetHeight > 0 ? widget.offsetHeight : base.h;
    // Масштаб часов на момент старта — новый считается от него
    resizeStartScale = parseFloat(widget.style.getPropertyValue('--clock-scale')) || 1;
  }

  // Габариты виджета задаём инлайн-стилем с !important: в режиме Mist
  // размеры описаны в CSS тоже через !important и должны перекрываться
  function setInlineWidgetSize(el, w, h) {
    if (!el) return;
    const pw = Math.round(w) + 'px';
    const ph = Math.round(h) + 'px';
    el.style.setProperty('width', pw, 'important');
    el.style.setProperty('max-width', pw, 'important');
    el.style.setProperty('height', ph, 'important');
    el.style.setProperty('max-height', ph, 'important');
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
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

    const w0 = resizeStartDimensions.w;
    const h0 = resizeStartDimensions.h;
    const key = getWidgetKey(activeResizeElement);
    const gridSize = parseInt(layoutGridSize && layoutGridSize.value, 10) || 20;
    const isIos = document.body.classList.contains('mode-ios');
    const inMist = document.body.classList.contains('mode-mist');
    let newWidth;
    let newHeight;
    let widgetScale;

    if (isIos) {
      const minCells = IOS_RESIZE_MIN_CELLS[key] || { w: 3, h: 3 };
      const maxWidth = Math.max(120, window.innerWidth - 40);
      const maxHeight = Math.max(100, window.innerHeight - 40);
      const minWidth = Math.min(minCells.w * gridSize, maxWidth);
      const minHeight = Math.min(minCells.h * gridSize, maxHeight);

      newWidth = w0 + deltaX;
      newHeight = h0 + deltaY;
      if (layoutGridSnap && layoutGridSnap.checked) {
        newWidth = Math.round(newWidth / gridSize) * gridSize;
        newHeight = Math.round(newHeight / gridSize) * gridSize;
      }
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

      const widthScale = w0 > 0 ? newWidth / w0 : 1;
      const heightScale = h0 > 0 ? newHeight / h0 : 1;
      widgetScale = resizeStartScale * Math.min(widthScale, heightScale);
    } else {
      // В остальных режимах сохраняем пропорциональное изменение размера.
      const denom = (w0 * w0 + h0 * h0) || 1;
      let scale = 1 + (deltaX * w0 + deltaY * h0) / denom;
      const minWidth = RESIZE_MIN_WIDTH[key] || 160;
      const maxWidth = Math.max(minWidth, window.innerWidth - 40);

      newWidth = w0 * scale;
      if (layoutGridSnap && layoutGridSnap.checked) {
        newWidth = Math.round(newWidth / gridSize) * gridSize;
      }
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      scale = w0 > 0 ? newWidth / w0 : 1;
      newHeight = h0 * scale;
      widgetScale = resizeStartScale * scale;
    }

    if (key === 'clock') {
      // Часы масштабируем ЦЕЛИКОМ: --clock-scale двигает и шрифт, и
      // габариты контейнера (CSS calc) — внешний вид не «рассыхается»
      applyClockScale(activeResizeElement, widgetScale);
      if (isIos) setInlineWidgetSize(activeResizeElement, newWidth, newHeight);
    } else {
      setInlineWidgetSize(activeResizeElement, newWidth, newHeight);
    }

    const wCells = round2(newWidth / gridSize);
    const hCells = round2(newHeight / gridSize);

    // Р”РѕР±Р°РІР»СЏРµРј РєР»Р°СЃСЃ С€РёСЂРѕРєРѕРіРѕ РІРёРґР¶РµС‚Р° РґР»СЏ РїРµСЂРµСЃС‚СЂРѕРµРЅРёСЏ РєРѕРЅС‚РµРЅС‚Р°
    if (wCells >= hCells * 1.4) {
      activeResizeElement.classList.add('widget-wide');
    } else {
      activeResizeElement.classList.remove('widget-wide');
    }

    // В Mist размер пишется в СВОЙ виджет карты mistHeadOffset
    if (inMist) {
      const mk = mistWidgetKey(activeResizeElement);
      if (mk) {
        const cur = tempMistWidgets[mk] || { x: 0, y: 0, w: 0, h: 0, s: 1 };
        const next = Object.assign({}, cur);
        if (mk === 'clock') {
          next.s = widgetScale;
        } else {
          next.w = Math.round(newWidth);
          next.h = Math.round(newHeight);
        }
        tempMistWidgets[mk] = next;
        applyMistWidgets(tempMistWidgets);
      }
      return;
    }

    if (key) {
      if (!tempPositions[key]) {
        // Р•СЃР»Рё РІСЂРµРјРµРЅРЅС‹С… РєРѕРѕСЂРґРёРЅР°С‚ РµС‰Рµ РЅРµС‚, РёРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј
        const leftPct = (activeResizeElement.offsetLeft / window.innerWidth) * 100;
        const topPct = (activeResizeElement.offsetTop / window.innerHeight) * 100;
        tempPositions[key] = { left: leftPct, top: topPct };
      }
      const prevW = tempPositions[key].widthCells;
      tempPositions[key].widthCells = wCells;
      tempPositions[key].heightCells = hCells;
      tempPositions[key].widthPx = Math.round(newWidth);
      tempPositions[key].heightPx = Math.round(newHeight);
      tempPositions[key].scale = key === 'clock' ? widgetScale : 1;

      // РћРїС‚РёРјРёР·Р°С†РёСЏ: РїРµСЂРµСЂРёСЃРѕРІС‹РІР°РµРј СЏСЂР»С‹РєРё С‚РѕР»СЊРєРѕ РµСЃР»Рё С‡РёСЃР»Рѕ РєРѕР»РѕРЅРѕРє РІ СЃРµС‚РєРµ РёР·РјРµРЅРёР»РѕСЃСЊ
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

  // --- РРќРР¦РРђР›РР—РђР¦РРЇ РљРќРћРџРћРљ Р РђРЎРџРћР›РћР–Р•РќРРЇ ---
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
      renderTopbar();
      if (layoutEditControls) layoutEditControls.style.display = 'flex';
      
      // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј РЅР°СЃС‚СЂРѕР№РєРё СЃРµС‚РєРё РёР· STATE
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

      // Mist: редактируются ТОЛЬКО два независимых виджета — «Время» и «Поиск».
      // Каждый остаётся в потоке и сдвигается СВОИМИ CSS-переменными,
      // поэтому абсолютного позиционирования (и измерений) не нужно.
      const mistEditMode = document.body.classList.contains('mode-mist');
      if (mistEditMode) {
        tempMistWidgets = normalizeMistWidgets(STATE.mistHeadOffset);
        applyMistWidgets(tempMistWidgets);
      }

      const widgets = document.querySelectorAll('.draggable-widget');
      
      // РЎРЅР°С‡Р°Р»Р° РёР·РјРµСЂСЏРµРј РєРѕРѕСЂРґРёРЅР°С‚С‹ Р’РЎР•РҐ СЌР»РµРјРµРЅС‚РѕРІ, РїРѕРєР° РѕРЅРё РЅР°С…РѕРґСЏС‚СЃСЏ РІ РµСЃС‚РµСЃС‚РІРµРЅРЅРѕРј РїРѕС‚РѕРєРµ!
      // Р­С‚Рѕ РїРѕР»РЅРѕСЃС‚СЊСЋ РїСЂРµРґРѕС‚РІСЂР°С‰Р°РµС‚ СЃС…Р»РѕРїС‹РІР°РЅРёРµ РІС‹СЃРѕС‚С‹ СЃС‚СЂР°РЅРёС†С‹ Рё РїСЂРµР¶РґРµРІСЂРµРјРµРЅРЅС‹Р№ СЃРґРІРёРі РїРѕСЃР»РµРґСѓСЋС‰РёС… СЌР»РµРјРµРЅС‚РѕРІ.
      const rects = Array.from(widgets).map(w => w.getBoundingClientRect());
      const isIosMode = document.body.classList.contains('mode-ios');
      
      widgets.forEach((widget, index) => {
        // Резайз доступен во всех режимах. Во Mist — только у редактируемых
        // виджетов (часы/поиск); сетка ярлыков и погода в редактировании неподвижны.
        const wantResizeHandle = mistEditMode ? isMistHeadWidget(widget) : true;

        // В Mist виджеты не «абсолютизируем» — каждый двигается сам по себе
        if (!mistEditMode) {

        const key = getWidgetKey(widget);
        const rect = rects[index];
        
        if (key) {
          if (STATE.layoutPositions && STATE.layoutPositions[key]) {
            tempPositions[key] = { ...STATE.layoutPositions[key] };
          } else {
            // Р•СЃР»Рё СЃРѕС…СЂР°РЅРµРЅРЅРѕРіРѕ РїРѕР»РѕР¶РµРЅРёСЏ РµС‰Рµ РЅРµС‚, РёРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј РµРіРѕ РЅР° РѕСЃРЅРѕРІРµ С‚РµРєСѓС‰РёС… СЌРєСЂР°РЅРЅС‹С… РєРѕРѕСЂРґРёРЅР°С‚
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
        }

        // Ручка изменения размера — вторичный уголок карточки
        if (wantResizeHandle || isIosMode) {
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
      if (document.body.classList.contains('mode-mist')) {
        // Mist: сохраняем сдвиги И размеры двух независимых виджетов — «Время» и «Поиск»
        STATE.mistHeadOffset = normalizeMistWidgets(tempMistWidgets);
      } else {
        if (!STATE.layoutPositions) STATE.layoutPositions = {};

        const widgets = document.querySelectorAll('.draggable-widget');
        widgets.forEach(widget => {
          const key = getWidgetKey(widget);
          if (key && tempPositions[key]) {
            STATE.layoutPositions[key] = tempPositions[key];
          }
        });
      }
      
      // РЎРѕС…СЂР°РЅСЏРµРј СЃРѕСЃС‚РѕСЏРЅРёРµ СЃРµС‚РєРё
      if (layoutGridSnap) {
        STATE.layoutGridSnap = layoutGridSnap.checked;
      }
      if (layoutGridSize) {
        STATE.layoutGridSize = parseInt(layoutGridSize.value) || 20;
      }

      saveState();
      
      document.body.classList.remove('layout-edit-mode');
      document.body.classList.remove('layout-grid-active');
      renderTopbar();
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
      renderTopbar();
      document.body.style.setProperty('--grid-size', STATE.layoutGridSize + 'px');
      if (layoutEditControls) layoutEditControls.style.display = 'none';
      removeResizeHandles();
      applyLayoutPositions();
    });
  }

  if (btnResetLayout) {
    btnResetLayout.addEventListener('click', () => {
      STATE.layoutPositions = null;
      STATE.mistHeadOffset = normalizeMistWidgets(null);
      STATE.layoutGridSnap = false;
      STATE.layoutGridSize = 20;
      saveState();
      
      document.body.classList.remove('layout-edit-mode');
      document.body.classList.remove('layout-grid-active');
      renderTopbar();
      document.body.style.setProperty('--grid-size', '20px');
      if (layoutEditControls) layoutEditControls.style.display = 'none';
      removeResizeHandles();
      // Полная очистка кастомных координат: часы, поиск, погода,
      // панель категорий и сетка ярлыков возвращаются в дефолтную раскладку
      clearCustomLayoutStyles();
      applyLayoutPositions();
      renderShortcuts();
      renderModalShortcutsList();
    });
  }

  // --- РЈРџР РђР’Р›Р•РќРР• РџРћР›Р¬Р—РћР’РђРўР•Р›Р¬РЎРљРРњР РџРћРРЎРљРћР’РРљРђРњР ---
  function populateSearchEnginesSelect() {
    window.SearchUI.populateSearchEnginesSelect(STATE, saveState);
  }

  function renderCustomSearchEngines() {
    window.SearchUI.renderCustomSearchEngines(STATE, {
      saveState,
      populateSearchEnginesSelect,
      updateSearchEngineUI,
      renderCustomSearchEngines
    });
  }

  function initCustomSearchEngines() {
    window.SearchUI.initCustomSearchEngines(STATE, TRANSLATIONS, {
      saveState,
      populateSearchEnginesSelect,
      renderCustomSearchEngines,
      compressImage
    });
  }

  initLayoutDragAndDrop();

  initCustomSearchEngines();

  // Пересчёт метрик сетки и Top Bar при изменении размера окна
  let resizeRenderTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeRenderTimer);
    resizeRenderTimer = setTimeout(() => {
      renderShortcuts();
      renderTopbar();
    }, 150);
  });

  // --- ГЛОБАЛЬНОЕ ПЕРЕКЛЮЧЕНИЕ КАТЕГОРИЙ КОЛЕСИКОМ МЫШИ ---
  // Работает на ВСЕЙ странице (обработчик на window), а не только над панелью.
  // Прокрутка настроек, модалок и реально скроллируемых областей не перехватывается.
  let lastCategoryWheelAt = 0;

  function canScrollVertically(startEl, deltaY) {
    let el = startEl;
    while (el && el !== document.body && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        if (el.scrollHeight > el.clientHeight + 1) {
          const maxScroll = el.scrollHeight - el.clientHeight;
          if (deltaY > 0 && el.scrollTop < maxScroll - 1) return true;
          if (deltaY < 0 && el.scrollTop > 1) return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  }

  window.addEventListener('wheel', (e) => {
    if (!e || !e.deltaY) return;
    if (document.body.classList.contains('weather-drawer-open')) return;

    // Не мешаем прокрутке внутри настроек и модальных окон
    if ((modal && modal.classList.contains('active')) ||
        (folderModal && folderModal.classList.contains('active')) ||
        document.body.classList.contains('layout-edit-mode')) {
      return;
    }

    // Скрытый Mist (Zen Drop): колесо в ЛЮБОЙ точке экрана мгновенно
    // показывает ярлыки с категориями, даже если курсор над ними не наведён
    revealMistZenByWheel();

    if (!mistTabsEl || mistTabsEl.style.display === 'none') return;
    if (canScrollVertically(e.target, e.deltaY)) return;

    const buttons = Array.from(mistTabsEl.querySelectorAll('.mist-tab'));
    if (buttons.length < 2) return;

    // Один «щелчок» колеса — одна категория, без проскоков
    const now = Date.now();
    if (now - lastCategoryWheelAt < 120) return;
    lastCategoryWheelAt = now;

    const currentIndex = buttons.findIndex(b => b.classList.contains('active'));
    const dir = e.deltaY > 0 ? 1 : -1;
    const nextIndex = (currentIndex + dir + buttons.length) % buttons.length;

    e.preventDefault();
    selectCategory(buttons[nextIndex].dataset.tabId, nextIndex, false);
  }, { passive: false });

  loadState();

  // --- РЈРџР РђР’Р›Р•РќРР• Р¤РћРљРЈРЎРћРњ Р Р”РћРЎРўРЈРџРќРћРЎРўР¬Р® (TAB / ESCAPE) ---
  function getKeyboardFocusableElements(container) {
    return Array.from(container.querySelectorAll(
      'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
    )).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.tabIndex !== -1;
    });
  }

  // Единственный слушатель клавиатуры на document: локальные keydown-обработчики
  // (панель категорий, сетка ярлыков) убраны — одно событие = одно решение.
  document.addEventListener('keydown', (e) => {
    // 1. Р›РѕРіРёРєР° РґР»СЏ Р°РєС‚РёРІРЅРѕРіРѕ РјРѕРґР°Р»СЊРЅРѕРіРѕ РѕРєРЅР° РїР°РїРєРё
    if (folderModal && folderModal.classList.contains('active')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        const folderId = folderModal.dataset.folderId;
        closeFolder();
        if (folderId) {
          setTimeout(() => {
            const card = document.querySelector(`.folder-card[data-folder-id="${folderId}"]`);
            if (card) card.focus();
          }, 50);
        }
        return;
      }

      if (e.key === 'Tab') {
        const focusables = getKeyboardFocusableElements(folderModal);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !folderModal.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !folderModal.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      return;
    }

    // 2. Р›РѕРіРёРєР° РґР»СЏ Р°РєС‚РёРІРЅРѕРіРѕ РјРѕРґР°Р»СЊРЅРѕРіРѕ РѕРєРЅР° РЅР°СЃС‚СЂРѕРµРє
    if (modal && modal.classList.contains('active')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSettings();
        const openBtn = document.getElementById('settings-open-btn');
        if (openBtn) {
          setTimeout(() => openBtn.focus(), 50);
        }
        return;
      }

      if (e.key === 'Tab') {
        const focusables = getKeyboardFocusableElements(modal);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modal.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modal.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      return;
    }

    // 3. Р’С‹С…РѕРґ РёР· СЂРµР¶РёРјР° РІРІРѕРґР° (blur input/textarea) РїСЂРё РЅР°Р¶Р°С‚РёРё Escape
    if (e.key === 'Escape') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.hasAttribute('contenteditable'))) {
        e.preventDefault();
        activeEl.blur();
      }
      return;
    }

    // 3.5. Клавиатурная навигация по зонам (Поиск / Категории / Ярлыки /
    //      Виджеты): модель зон пересобирается на каждый keydown, поэтому
    //      сквозные переходы работают в любом режиме Layout.
    if (navHandleKeydown(e)) return;

    // 4. Р“Р»РѕР±Р°Р»СЊРЅС‹Рµ С…РѕС‚РєРµРё СЂРµР¶РёРјР° Mist (Р±С‹СЃС‚СЂРѕРµ РїРµСЂРµРєР»СЋС‡РµРЅРёРµ РєР°С‚РµРіРѕСЂРёР№/РїР°РїРѕРє)
    if (!document.body.classList.contains('mode-ios') && !document.body.classList.contains('mode-zen')) {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
      const isModalOpen = (modal && modal.classList.contains('active')) || (folderModal && folderModal.classList.contains('active'));
      // Фокус на панели категорий или на ярлыке — навигацию берут их обработчики
      const inTabs = !!activeEl && !!mistTabsEl && mistTabsEl.contains(activeEl);
      const inGrid = !!activeEl && !!container && container.contains(activeEl);

      if (!isInputActive && !isModalOpen && !inTabs && !inGrid && mistTabsEl && mistTabsEl.style.display !== 'none') {
        const buttons = Array.from(mistTabsEl.querySelectorAll('.mist-tab'));
        if (buttons.length >= 2) {
          const currentIndex = buttons.findIndex(b => b.classList.contains('active'));

          // РЎС‚СЂРµР»РєРё Left / Right РїРµСЂРµРєР»СЋС‡Р°СЋС‚ Р°РєС‚РёРІРЅСѓСЋ РєР°С‚РµРіРѕСЂРёСЋ
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = (currentIndex - 1 + buttons.length) % buttons.length;
            selectCategory(buttons[prev].dataset.tabId, prev, false);
            return;
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = (currentIndex + 1) % buttons.length;
            selectCategory(buttons[next].dataset.tabId, next, false);
            return;
          }

          // Р¦РёС„СЂС‹ 1, 2, 3... РїРµСЂРµС…РѕРґСЏС‚ РїСЂСЏРјРѕ РЅР° СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓСЋС‰СѓСЋ РїР°РїРєСѓ
          if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const numIndex = parseInt(e.key, 10) - 1;
            if (numIndex < buttons.length) {
              e.preventDefault();
              selectCategory(buttons[numIndex].dataset.tabId, numIndex, false);
              return;
            }
          }
        }
      }
    }
  });
});