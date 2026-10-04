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
  const addSelect = /** @type {HTMLSelectElement} */ (document.getElementById('new-shortcut-category'));
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
  /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.edit-category-select')).forEach(sel => {
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

// settingsCategoryId переприсваивают settings-panel и modal-shortcuts —
// ACCESSOR, иначе десинк. Мосты функций — для modal-shortcuts/settings-panel/
// appearance; уберём в фазе 3 шага «в».
Object.defineProperty(window, 'settingsCategoryId', {
  get: () => settingsCategoryId,
  set: (value) => { settingsCategoryId = value; },
  configurable: true
});
window.refreshAfterCategoryChange = refreshAfterCategoryChange;
window.ensureSettingsCategoryId = ensureSettingsCategoryId;
window.findCategoryById = findCategoryById;
window.moveItemToCategory = moveItemToCategory;
window.populateCategorySelects = populateCategorySelects;
window.renderCategoryTabsBar = renderCategoryTabsBar;
window.renderCategoryHeader = renderCategoryHeader;
window.getCategoryItems = getCategoryItems;
window.buildCategoryOptions = buildCategoryOptions;
export {
  settingsCategoryId,
  getCategoryList,
  findCategoryById,
  getCategoryItems,
  getParentCategoryId,
  ensureSettingsCategoryId,
  buildCategoryOptions,
  populateCategorySelects,
  refreshAfterCategoryChange,
  createCategory,
  renameCategory,
  deleteCategory,
  moveCategory,
  removeItemById,
  moveItemToCategory,
  renderCategoryTabsBar,
  renderCategoryHeader
};

