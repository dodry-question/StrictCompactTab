import { initLayoutDragAndDrop, onResizeStart, removeResizeHandles } from './layout-dnd.js';

import { renderModalShortcutsList } from './modal-shortcuts.js';

import { SearchUI } from '../services/search-ui.js';

import { STATE } from '../state/store.js';

import { normalizeMistWidgets } from '../src/utils.js';

import { TRANSLATIONS } from '../i18n/translations.js';

// --- РРќРР¦РРђР›РР—РђР¦РРЇ РљРќРћРџРћРљ Р РђРЎРџРћР›РћР–Р•РќРРЇ ---
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

    const widgets = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.draggable-widget'));
    
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

      const widgets = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.draggable-widget'));
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

// --- РЈРџР РђР’Р›Р•РќРР• РџРћР›Р¬Р—РћР’РђРўР•Р›Р¬РЎРљРРњР РџРћРРЎРљРћР’РРљРђРњР ---
function populateSearchEnginesSelect() {
  SearchUI.populateSearchEnginesSelect(STATE, saveState);
}

function renderCustomSearchEngines() {
  SearchUI.renderCustomSearchEngines(STATE, {
    saveState,
    populateSearchEnginesSelect,
    updateSearchEngineUI,
    renderCustomSearchEngines
  });
}

function initCustomSearchEngines() {
  SearchUI.initCustomSearchEngines(STATE, TRANSLATIONS, {
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

// Мосты для классических потребителей (state-render, probe в app-load.test) —
// уберём в фазе 3 шага «в» при переходе потребителей на import.
window.layoutEditControls = layoutEditControls;
window.populateSearchEnginesSelect = populateSearchEnginesSelect;
window.initCustomSearchEngines = initCustomSearchEngines;
export {
  layoutEditControls,
  populateSearchEnginesSelect,
  renderCustomSearchEngines,
  initCustomSearchEngines
};

