import { renderTopbar } from './clock-topbar.js';

import { applyMistWidgets, isMistHeadWidget, getWidgetKey, applyLayoutPositions, clearCustomLayoutStyles, layoutGridSnap, layoutGridSize, tempPositions, tempMistWidgets, setLayoutGridSnap, setLayoutGridSize, setTempPositions, setTempMistWidgets } from './layout-widgets.js';

import { compressImage } from './appearance.js';

import { saveState, renderShortcuts, updateSearchEngineUI } from './state-render.js';
import { initLayoutDragAndDrop, onResizeStart, removeResizeHandles } from './layout-dnd.js';

import { renderModalShortcutsList } from './modal-shortcuts.js';

import { SearchUI } from '../services/search-ui.js';

import { STATE } from '../state/store.js';

import { normalizeMistWidgets } from '../src/utils.js';

import { TRANSLATIONS } from '../i18n/translations.js';

// --- ИНИЦИАЛИЗАЦИЯ КНОПОК РАСПОЛОЖЕНИЯ ---
const btnEditLayout = document.getElementById('btn-edit-layout');
const btnResetLayout = document.getElementById('btn-reset-layout');
const layoutSaveBtn = document.getElementById('layout-save-btn');
const layoutCancelBtn = document.getElementById('layout-cancel-btn');
const layoutEditControls = document.getElementById('layout-edit-controls');
const settingsModal = document.getElementById('settings-modal');

setLayoutGridSnap(document.getElementById('layout-grid-snap'));
setLayoutGridSize(document.getElementById('layout-grid-size'));

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

    setTempPositions({});

    // Mist: редактируются ТОЛЬКО два независимых виджета — «Время» и «Поиск».
    // Каждый остаётся в потоке и сдвигается СВОИМИ CSS-переменными,
    // поэтому абсолютного позиционирования (и измерений) не нужно.
    const mistEditMode = document.body.classList.contains('mode-mist');
    if (mistEditMode) {
      setTempMistWidgets(normalizeMistWidgets(STATE.mistHeadOffset));
      applyMistWidgets(tempMistWidgets);
    }

    const widgets = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.draggable-widget'));
    
    // Сначала измеряем координаты ВСЕХ элементов, пока они находятся в естественном потоке!
    // Это полностью предотвращает схлопывание высоты страницы и преждевременный сдвиг последующих элементов.
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

// --- УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЬСКИМИ ПОИСКОВИКАМИ ---
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

export {
  layoutEditControls,
  populateSearchEnginesSelect,
  renderCustomSearchEngines,
  initCustomSearchEngines
};

