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
    applyMistPreset();
    // Смена пресета — абсолютные кастомные координаты сбрасываем
    // до значений нового пресета, чтобы элементы не «уезжали»
    clearCustomLayoutStyles();
    // …и сдвиги обоих независимых виджетов возвращаем в ноль.
    // saveState() теперь ПОСЛЕ сброса: раньше он стоял выше и записывал
    // старые сдвиги, из-за чего на следующей вкладке виджеты возвращались
    // на прежние координаты и сброс пресета не сохранялся
    STATE.mistHeadOffset = normalizeMistWidgets(null);
    tempMistWidgets = normalizeMistWidgets(null);
    applyLayoutPositions();
    renderShortcuts();
    renderTopbar();
    saveState();
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

