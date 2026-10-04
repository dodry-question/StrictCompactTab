import { saveState, renderShortcuts } from './state-render.js';

import { updateClockAndDate, renderTopbar, mistPresetSelect, mistPerRowSelect, mistZenZone, setActiveCategory } from './clock-topbar.js';

import { applyLayoutPositions, clearCustomLayoutStyles, setTempMistWidgets } from './layout-widgets.js';

import { applyClockVisibility, syncModeToggles, applyMistMode, applyMistPreset } from './appearance.js';

import { checkForUpdates } from './backup-updates.js';

import { STATE } from '../state/store.js';

import { normalizeMistWidgets } from '../src/utils.js';

// --- УПРАВЛЕНИЕ ТУМБЛЕРАМИ ЧАСОВ И ДАТЫ ---
const showClockCb = /** @type {HTMLInputElement} */ (document.getElementById('show-clock-checkbox'));
const showDateCb = /** @type {HTMLInputElement} */ (document.getElementById('show-date-checkbox'));
const timeFormatCb = /** @type {HTMLInputElement} */ (document.getElementById('time-format-checkbox'));
const showSecondsCb = /** @type {HTMLInputElement} */ (document.getElementById('show-seconds-checkbox'));

if (showClockCb) {
  showClockCb.addEventListener('change', (e) => {
    STATE.showClock = /** @type {HTMLInputElement} */ (e.target).checked;
    saveState();
    applyClockVisibility();
  });
}

if (showDateCb) {
  showDateCb.addEventListener('change', (e) => {
    STATE.showDate = /** @type {HTMLInputElement} */ (e.target).checked;
    saveState();
    updateClockAndDate();
  });
}

if (timeFormatCb) {
  timeFormatCb.addEventListener('change', (e) => {
    STATE.format12h = /** @type {HTMLInputElement} */ (e.target).checked;
    saveState();
    updateClockAndDate();
  });
}

const layoutIosModeCb = /** @type {HTMLInputElement} */ (document.getElementById('layout-ios-mode'));
if (layoutIosModeCb) {
  layoutIosModeCb.addEventListener('change', (e) => {
    STATE.layoutIosMode = /** @type {HTMLInputElement} */ (e.target).checked;
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



const layoutStealthModeCb = /** @type {HTMLInputElement} */ (document.getElementById('layout-stealth-mode'));
if (layoutStealthModeCb) {
  layoutStealthModeCb.addEventListener('change', (e) => {
    STATE.layoutStealthMode = /** @type {HTMLInputElement} */ (e.target).checked;
    saveState();
    if (STATE.layoutStealthMode) {
      document.body.classList.add('stealth-mode');
    } else {
      document.body.classList.remove('stealth-mode');
    }
  });
}

const checkUpdatesCb = /** @type {HTMLInputElement} */ (document.getElementById('check-updates-checkbox'));
if (checkUpdatesCb) {
  checkUpdatesCb.addEventListener('change', (e) => {
    STATE.checkUpdates = /** @type {HTMLInputElement} */ (e.target).checked;
    saveState();
    if (STATE.checkUpdates) {
      checkForUpdates();
    } else {
      const notification = document.getElementById('update-notification');
      if (notification) notification.style.display = 'none';
    }
  });
}

const layoutZenModeCb = /** @type {HTMLInputElement} */ (document.getElementById('layout-zen-mode'));
if (layoutZenModeCb) {
  layoutZenModeCb.addEventListener('change', (e) => {
    STATE.layoutZenMode = /** @type {HTMLInputElement} */ (e.target).checked;
    saveState();
    
    if (STATE.layoutZenMode) {
      document.body.classList.add('mode-zen');
    } else {
      document.body.classList.remove('mode-zen');
    }
    
    syncModeToggles();
  });
}

// --- ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА MIST ---
const layoutMistModeCb = /** @type {HTMLInputElement} */ (document.getElementById('layout-mist-mode'));
if (layoutMistModeCb) {
  layoutMistModeCb.addEventListener('change', (e) => {
    STATE.layoutMistMode = /** @type {HTMLInputElement} */ (e.target).checked;

    if (STATE.layoutMistMode) {
// Mist несовместим со Стелс- и iOS-режимами (у них конфликтующие стили)
      STATE.layoutIosMode = false;
      STATE.layoutStealthMode = false;
      const iosCb = /** @type {HTMLInputElement} */ (document.getElementById('layout-ios-mode'));
      const stealthCb = /** @type {HTMLInputElement} */ (document.getElementById('layout-stealth-mode'));
      if (iosCb) iosCb.checked = false;
      if (stealthCb) stealthCb.checked = false;
      document.body.classList.remove('mode-ios', 'stealth-mode');
      setActiveCategory('main');
    }

    saveState();
    applyMistMode();
  });
}

// --- УПРАВЛЕНИЕ ПРЕСЕТАМИ КОМПОНОВКИ MIST ---
if (mistPresetSelect) {
  mistPresetSelect.addEventListener('change', (e) => {
    // Значения <select> в index.html: center | split | zen (см. AppState.mistPreset)
    STATE.mistPreset = /** @type {any} */ (/** @type {HTMLSelectElement} */ (e.target).value);
    applyMistPreset();
    // Смена пресета — абсолютные кастомные координаты сбрасываем
    // до значений нового пресета, чтобы элементы не «уезжали»
    clearCustomLayoutStyles();
    // …и сдвиги обоих независимых виджетов возвращаем в ноль.
    // saveState() теперь ПОСЛЕ сброса: раньше он стоял выше и записывал
    // старые сдвиги, из-за чего на следующей вкладке виджеты возвращались
    // на прежние координаты и сброс пресета не сохранялся
    STATE.mistHeadOffset = normalizeMistWidgets(null);
    setTempMistWidgets(normalizeMistWidgets(null));
    applyLayoutPositions();
    renderShortcuts();
    renderTopbar();
    saveState();
  });
}

if (mistPerRowSelect) {
  mistPerRowSelect.addEventListener('change', (e) => {
    STATE.mistPerRow = parseInt(/** @type {HTMLSelectElement} */ (e.target).value, 10) || 6;
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
    let overPanel;
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
    STATE.showSeconds = /** @type {HTMLInputElement} */ (e.target).checked;
    saveState();
    updateClockAndDate();
  });
}

export {
  showClockCb,
  showDateCb,
  timeFormatCb,
  showSecondsCb,
  layoutIosModeCb,
  revealMistZenShortcuts,
  scheduleHideMistZenShortcuts,
  revealMistZenByWheel
};

