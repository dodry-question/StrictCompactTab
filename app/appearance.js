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

