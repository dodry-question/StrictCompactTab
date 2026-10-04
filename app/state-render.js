import { syncScheduleEnabled } from './schedule.js';

import { showClockCb, showDateCb, timeFormatCb, showSecondsCb, layoutIosModeCb } from './mist-toggles.js';

import { layoutEditControls, populateSearchEnginesSelect } from './controls.js';

import { rebuildNavModel } from './navigation.js';

import { removeResizeHandles } from './layout-dnd.js';

import { checkForUpdates } from './backup-updates.js';

import { renderModalShortcutsList } from './modal-shortcuts.js';

import { ShortcutRenderer } from '../services/shortcut-renderer.js';

import { SearchUI } from '../services/search-ui.js';

import { storage } from '../storage/storage.js';

import { STATE, store } from '../state/store.js';

import { normalizeMistWidgets } from '../src/utils.js';

import { TRANSLATIONS } from '../i18n/translations.js';

// --- Р¤РЈРќРљР¦РР РћР‘Р РђР‘РћРўРљР Р”РђРќРќР«РҐ Р РћРўР РРЎРћР’РљР ---

// Легаси-ключи от версий до 1.10.5. После успешной миграции их нужно удалить,
// иначе удалённые пользователем категории воскресают на каждой новой вкладке
// пустыми вкладками: migrateToNested восстанавливает папку из categories/
// folders/groups, которых уже нет среди shortcuts.
const LEGACY_CATEGORY_KEYS = ['folders', 'categories', 'groups'];

function loadState() {
  // Ключи чтения задаёт store (persistKeys + легаси-ключи миграций) —
  // раньше список был продублирован здесь и в saveState
  store.load(LEGACY_CATEGORY_KEYS, (result) => {
  try {
    STATE.shortcuts = migrateToNested(result.shortcuts ?? DEFAULT_SHORTCUTS, extractCategoryMeta(result));
    STATE.customSearchEngines = result.customSearchEngines ?? [];
    STATE.columns = result.columns ?? 10;
    STATE.size = result.size ?? "small";
    STATE.customBackground = result.customBackground ?? null;
    STATE.customFavicon = result.customFavicon ?? null;
    if (STATE.customFavicon === null) {
      localStorage.removeItem('customFavicon');
    } else {
      // Формат СЫРОЙ, как пишет storage/storage.js для строк: favicon-loader.js
      // читает это значение синхронно в <head> и принимает оба формата, но
      // два писателя должны использовать один
      localStorage.setItem('customFavicon', STATE.customFavicon);
    }
    STATE.language = TRANSLATIONS[result.language] ? result.language : "en";
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
    STATE.scheduleEnabled = result.scheduleEnabled ?? false;
    STATE.scheduleGroup = result.scheduleGroup ?? null;

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
    const layoutStealthModeCb = /** @type {HTMLInputElement} */ (document.getElementById('layout-stealth-mode'));
    if (layoutStealthModeCb) layoutStealthModeCb.checked = STATE.layoutStealthMode;
    const checkUpdatesCb = /** @type {HTMLInputElement} */ (document.getElementById('check-updates-checkbox'));
    if (checkUpdatesCb) checkUpdatesCb.checked = STATE.checkUpdates;
    const layoutZenModeCb = /** @type {HTMLInputElement} */ (document.getElementById('layout-zen-mode'));
    if (layoutZenModeCb) layoutZenModeCb.checked = STATE.layoutZenMode;
    const layoutMistModeCb = /** @type {HTMLInputElement} */ (document.getElementById('layout-mist-mode'));
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
    syncScheduleEnabled();

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

    // Миграция выполнена — легаси-ключи больше не нужны. Иначе удалённые
    // категории восстанавливались бы пустыми на каждой новой вкладке
    if (LEGACY_CATEGORY_KEYS.some(key => result[key] != null)) {
      const drop = {};
      LEGACY_CATEGORY_KEYS.forEach(key => { drop[key] = null; });
      storage.set(drop);
    }
  } catch (error) {
    // Страница не должна остаться пустой: html.state-loading скрывает всё
    // содержимое, и без finally любой сбой здесь давал бы вечный чёрный экран
    console.error('loadState: не удалось применить состояние', error);
  } finally {
    document.documentElement.classList.remove('state-loading');
  }
  });
}

function saveState() {
  // Ключи сохранения задаёт store (PERSIST_KEYS — тот же список, что при
  // чтении). Нормализация mistHeadOffset осталась здесь: в хранилище
  // уходит безопасная геометрия, состояние при этом не трогаем
  store.save({ mistHeadOffset: normalizeMistWidgets(STATE.mistHeadOffset) });
}

function updateSearchEngineUI() {
  SearchUI.updateSearchEngineUI(STATE);
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

  ShortcutRenderer.appendClassicCards(activeItems, STATE.size, container);
  stabilizeShortcutsHeight(tabs);
  rebuildNavModel();
}

// Мосты для потребителей (saveState зовут ~10 файлов, loadState вызывается
// на верхнем уровне input-keys, container читает categories-tabs и др.) —
// уберём в фазе 3 шага «в».
window.loadState = loadState;
window.saveState = saveState;
window.updateSearchEngineUI = updateSearchEngineUI;
window.renderShortcuts = renderShortcuts;
window.container = container;
export {
  LEGACY_CATEGORY_KEYS,
  loadState,
  saveState,
  updateSearchEngineUI,
  moveShortcut,
  handleAutoscroll,
  renderShortcuts,
  container
};

