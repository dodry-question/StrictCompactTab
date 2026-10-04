import { renderShortcuts } from './state-render.js';

import { isMistHeadWidget, mistWidgetKey, dragOffset, applyMistWidgets, getWidgetKey, RESIZE_BASE_SIZE, resizeStartCoords, resizeStartDimensions, IOS_RESIZE_MIN_CELLS, RESIZE_MIN_WIDTH, applyClockScale } from './layout-widgets.js';

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
  
  const snapThreshold = 15; // Р Р°СЃСЃС‚РѕСЏРЅРёРµ РїСЂРёС‚СЏР¶РµРЅРёСЏ РІ РїРёРєСЃРµР»СЏС… (РєР°Рє РІ PowerPoint/Figma)
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
        newLeft = viewportCenterX; // Р Р°Р·РјРµСЃС‚РёС‚СЊ СЃРїСЂР°РІР° РѕС‚ РѕСЃРё (Р»РµРІС‹Р№ РєСЂР°Р№ РЅР° РѕСЃРё)
      } else {
        newLeft = viewportCenterX - widgetWidth; // Р Р°Р·РјРµСЃС‚РёС‚СЊ СЃР»РµРІР° РѕС‚ РѕСЃРё (РїСЂР°РІС‹Р№ РєСЂР°Р№ РЅР° РѕСЃРё)
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
      newTop = viewportCenterY; // Р Р°Р·РјРµСЃС‚РёС‚СЊ РїРѕРґ РѕСЃСЊСЋ (РІРµСЂС…РЅРёР№ РєСЂР°Р№ РЅР° РѕСЃРё)
    } else {
      newTop = viewportCenterY - widgetHeight; // Р Р°Р·РјРµСЃС‚РёС‚СЊ РЅР°Рґ РѕСЃСЊСЋ (РЅРёР¶РЅРёР№ РєСЂР°Р№ РЅР° РѕСЃРё)
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

export {
  initLayoutDragAndDrop,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  setInlineWidgetSize,
  round2,
  onResizeMove,
  onResizeEnd,
  removeResizeHandles
};

