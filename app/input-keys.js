import { navHandleKeydown } from './navigation.js';

import { ShortcutCategories } from '../services/shortcut-categories.js';

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
  // Открытая панель расписания — обычная прокручиваемая область
  if (document.body.classList.contains('schedule-open')) return;

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

  const buttons = Array.from(/** @type {NodeListOf<HTMLElement>} */ (mistTabsEl.querySelectorAll('.mist-tab')));
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

// --- РЈРџР РђР’Р›Р•РќРР• Р¤РћРљРЈРЎРћРњ Р Р”РћРЎРўРЈРџРќРћРЎРўР¬Р® (TAB / ESCAPE) ---
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
          const card = /** @type {HTMLElement} */ (document.querySelector(`.folder-card[data-folder-id="${folderId}"]`));
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
    const activeEl = /** @type {HTMLElement} */ (document.activeElement);
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

  // 3.6. Цифровые хоткеи категорий: 1…9 — по порядку вкладок, 0 — десятая.
  //      Работают в любом режиме Layout, пока панель категорий видима
  //      (при одной категории она скрыта), и не мешают вводу текста,
  //      модальным окнам, шторке погоды и режиму редактирования.
  // activeEl/isInputActive объявлены ЗДЕСЬ, на уровне обработчика. Раньше
  // isInputActive жил внутри вложенного блока ниже, и обращение к нему выше
  // бросало ReferenceError — цифровые хоткеи категорий не работали вообще.
  const activeEl = /** @type {HTMLElement} */ (document.activeElement);
  const isInputActive = !!(activeEl &&
    (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable));
  const isModalOpen = (modal && modal.classList.contains('active')) ||
    (folderModal && folderModal.classList.contains('active'));
  const weatherDrawerOpen = document.body.classList.contains('weather-drawer-open');
  const schedulePanelOpen = document.body.classList.contains('schedule-open');
  const categoryButtons = mistTabsEl && mistTabsEl.style.display !== 'none'
    ? Array.from(/** @type {NodeListOf<HTMLElement>} */ (mistTabsEl.querySelectorAll('.mist-tab')))
    : [];
  const digitIndex = ShortcutCategories.getHotkeyIndex(e.key, categoryButtons.length);

  if (digitIndex >= 0 && digitIndex < categoryButtons.length &&
      !isInputActive && !isModalOpen && !weatherDrawerOpen && !schedulePanelOpen &&
      !document.body.classList.contains('layout-edit-mode') &&
      !e.ctrlKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    // Пресет Zen Drop: панель скрыта до взаимодействия — показываем её,
    // иначе переход по цифре остаётся незамеченным (как и у колеса мыши)
    revealMistZenByWheel();
    selectCategory(categoryButtons[digitIndex].dataset.tabId, digitIndex, false);
    return;
  }

  // 4. Р“Р»РѕР±Р°Р»СЊРЅС‹Рµ С…РѕС‚РєРµРё СЂРµР¶РёРјР° Mist (Р±С‹СЃС‚СЂРѕРµ РїРµСЂРµРєР»СЋС‡РµРЅРёРµ РєР°С‚РµРіРѕСЂРёР№/РїР°РїРѕРє)
  if (!document.body.classList.contains('mode-ios') && !document.body.classList.contains('mode-zen')) {
    // activeEl, isInputActive и isModalOpen уже объявлены выше по обработчику
    // Фокус на панели категорий или на ярлыке — навигацию берут их обработчики
    const inTabs = !!activeEl && !!mistTabsEl && mistTabsEl.contains(activeEl);
    const inGrid = !!activeEl && !!container && container.contains(activeEl);

    if (!isInputActive && !isModalOpen && !inTabs && !inGrid && mistTabsEl && mistTabsEl.style.display !== 'none') {
      const buttons = Array.from(/** @type {NodeListOf<HTMLElement>} */ (mistTabsEl.querySelectorAll('.mist-tab')));
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

      }
    }
  }
});

// Внешних потребителей нет (проверено по поиску) — мосты window.* не нужны.
export { canScrollVertically, getKeyboardFocusableElements };
