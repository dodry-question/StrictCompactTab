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
          // fallback на en, как в остальном проекте: без него невалидный язык роняет панель
          iconLabel.title = (TRANSLATIONS[STATE.language] || TRANSLATIONS.en).uploadIconTitle;
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

