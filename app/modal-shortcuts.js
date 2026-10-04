import { findShortcutOrFolderById, moveNestedItem, isFolderContainingTarget } from './shortcuts-migration.js';

import { refreshAfterCategoryChange, ensureSettingsCategoryId, findCategoryById, moveItemToCategory, populateCategorySelects, renderCategoryTabsBar, renderCategoryHeader, getCategoryItems, buildCategoryOptions } from './categories-settings.js';

import { compressImage } from './appearance.js';

import { STATE } from '../state/store.js';

import { TRANSLATIONS } from '../i18n/translations.js';

function renderModalShortcutsList() {
  const modalList = document.getElementById('modal-shortcuts-list');
  if (!modalList) return;

  ensureSettingsCategoryId();
  renderCategoryTabsBar();
  renderCategoryHeader();

  modalList.innerHTML = '';

  const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
  const category = findCategoryById(settingsCategoryId);
  const items = getCategoryItems(category);

  if (items.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'modal-list-empty';
    emptyDiv.textContent = currentDict.listEmpty;
    modalList.appendChild(emptyDiv);
    populateCategorySelects();
    justDroppedId = null;
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const isChild = !!category;
    const shortcutRow = renderShortcutRow(item, isChild, isChild ? category.id : null);
    fragment.appendChild(shortcutRow);
  });

  modalList.appendChild(fragment);
  populateCategorySelects();
  justDroppedId = null;
}
function renderShortcutRow(item, isChild, parentId) {
  const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
  
  const row = document.createElement('div');
  row.className = 'modal-shortcut-item';
  if (justDroppedId === item.id) {
    row.classList.add('just-dropped');
  }
  if (isChild) {
    row.classList.add('child-item');
    row.dataset.parentId = parentId;
    row.dataset.isChild = 'true';
  }
  row.dataset.id = item.id;

  if (editingIndex === item.id) {
    row.setAttribute('draggable', 'false');
    let tempIconBase64 = item.customIcon;

    const editContainer = document.createElement('div');
    editContainer.className = 'modal-shortcut-edit-container';
    if (tempIconBase64) {
      editContainer.classList.add('has-custom-icon');
    }

    const fieldsWrapper = document.createElement('div');
    fieldsWrapper.className = 'inline-edit-fields';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = item.name;
    nameInput.className = 'settings-input inline-input';
    nameInput.placeholder = currentDict.namePlaceholder;

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = item.url;
    urlInput.className = 'settings-input inline-input';
    urlInput.placeholder = currentDict.urlPlaceholder;

    // Выпадающий список: категория ярлыка — её можно изменить
    // прямо при редактировании на любую существующую
    const catSelect = document.createElement('select');
    catSelect.className = 'settings-select inline-input edit-category-select';
    catSelect.dataset.current = isChild ? parentId : 'main';
    catSelect.setAttribute('aria-label', currentDict.shortcutCategoryLabel || 'Category');
    catSelect.title = currentDict.shortcutCategoryLabel || 'Category';
    buildCategoryOptions(catSelect, catSelect.dataset.current);

    fieldsWrapper.appendChild(nameInput);
    fieldsWrapper.appendChild(urlInput);
    fieldsWrapper.appendChild(catSelect);

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'inline-edit-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-inline-cancel';
    cancelBtn.textContent = currentDict.btnCancel;
    cancelBtn.addEventListener('click', () => {
      editingIndex = -1;
      renderModalShortcutsList();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-inline-save';
    saveBtn.textContent = currentDict.btnSave;

    const inlineIconInput = document.createElement('input');
    inlineIconInput.type = 'file';
    inlineIconInput.accept = 'image/*';
    inlineIconInput.style.display = 'none';
    inlineIconInput.id = `edit-shortcut-icon-file-${item.id}`;

    const inlineIconLabel = document.createElement('label');
    inlineIconLabel.htmlFor = `edit-shortcut-icon-file-${item.id}`;
    inlineIconLabel.className = 'btn-square-upload';
    inlineIconLabel.title = currentDict.uploadIconTitle;

    const uploadImg = document.createElement('img');
    uploadImg.src = 'assets/upload-icon.png';
    uploadImg.alt = 'Upload';
    inlineIconLabel.appendChild(uploadImg);

    const inlineIconResetBtn = document.createElement('button');
    inlineIconResetBtn.className = 'btn btn-inline-cancel btn-inline-reset';
    inlineIconResetBtn.style.color = '#ff6b6b';
    inlineIconResetBtn.textContent = currentDict.resetBtn;

    inlineIconResetBtn.addEventListener('click', () => {
      tempIconBase64 = null;
      inlineIconLabel.title = currentDict.uploadIconTitle;
      inlineIconLabel.style.borderColor = '';
      editContainer.classList.remove('has-custom-icon');
    });

    inlineIconInput.addEventListener('change', (e) => {
      const file = /** @type {HTMLInputElement} */ (e.target).files[0];
      if (file) {
        inlineIconLabel.title = file.name;
        inlineIconLabel.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        compressImage(file, 128, 128, 0.85, (result) => {
          tempIconBase64 = result;
          editContainer.classList.add('has-custom-icon');
        });
      }
    });

    actionsWrapper.appendChild(cancelBtn);
    actionsWrapper.appendChild(saveBtn);
    actionsWrapper.appendChild(inlineIconResetBtn);
    actionsWrapper.appendChild(inlineIconLabel);
    actionsWrapper.appendChild(inlineIconInput); 

    saveBtn.addEventListener('click', () => {
      const newName = nameInput.value.trim();
      let newUrl = urlInput.value.trim();

      if (newName && newUrl) {
        if (!/^https?:\/\//i.test(newUrl)) {
          newUrl = 'https://' + newUrl;
        }

        item.name = newName;
        item.url = newUrl;
        item.customIcon = tempIconBase64;

        // Категория изменена — переносим ярлык в выбранную
        const newCatId = catSelect.value;
        const currentCatId = isChild ? parentId : 'main';
        if (newCatId !== currentCatId) {
          moveItemToCategory(item.id, newCatId, true);
          settingsCategoryId = newCatId;
        }

        saveState();
        editingIndex = -1;
        renderShortcuts();
        renderModalShortcutsList();
      }
    });

    editContainer.appendChild(fieldsWrapper);
    editContainer.appendChild(actionsWrapper);
    row.appendChild(editContainer);

  } else {
    row.setAttribute('draggable', 'true');
    setupDragAndDropListeners(row, item, isChild);

    const info = document.createElement('div');
    info.className = 'modal-shortcut-info';

    const name = document.createElement('span');
    name.className = 'modal-shortcut-name';
    name.textContent = item.name;

    const url = document.createElement('span');
    url.className = 'modal-shortcut-url';
    url.textContent = item.url;

    info.appendChild(name);
    info.appendChild(url);

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'modal-shortcut-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-edit';
    editBtn.title = currentDict.btnEdit;
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>`;
    editBtn.addEventListener('click', () => {
      editingIndex = item.id;
      renderModalShortcutsList();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-delete';
    deleteBtn.title = currentDict.btnDelete;
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>`;
    deleteBtn.addEventListener('click', () => {
      if (isChild) {
        for (let f of STATE.shortcuts) {
          if (f.id === parentId) {
            const idx = f.children.indexOf(item);
            if (idx !== -1) f.children.splice(idx, 1);
            break;
          }
        }
      } else {
        const idx = STATE.shortcuts.indexOf(item);
        if (idx !== -1) STATE.shortcuts.splice(idx, 1);
      }
      saveState();
      renderShortcuts();
      renderModalShortcutsList();
    });

    actionsWrapper.appendChild(editBtn);
    actionsWrapper.appendChild(deleteBtn);

    row.appendChild(info);
    row.appendChild(actionsWrapper);
  }

  return row;
}

function getDropAction(e, targetEl, isChild, isDraggedFolder, isTargetFolder) {
  const rect = targetEl.getBoundingClientRect();
  const relativeY = e.clientY - rect.top;
  const height = rect.height;

  // Folders cannot be dropped inside other folders or merged to make a folder.
  // Also, children inside a folder cannot have nested folders/children.
  if (isDraggedFolder || isChild) {
    return (relativeY < height / 2) ? 'before' : 'after';
  }

  // For root-level items:
  if (isTargetFolder) {
    // Pushing into folders (merge) is common, keep the merge zone relatively wide (40%)
    if (relativeY < height * 0.3) {
      return 'before';
    } else if (relativeY > height * 0.7) {
      return 'after';
    } else {
      return 'merge';
    }
  } else {
    // Merging two shortcuts to create a folder is rarer, keep the merge zone narrow (20%)
    // to make reordering easier and prevent accidental folder prompts.
    if (relativeY < height * 0.4) {
      return 'before';
    } else if (relativeY > height * 0.6) {
      return 'after';
    } else {
      return 'merge';
    }
  }
}

function setupDragAndDropListeners(element, item, isChild) {
  element.addEventListener('dragstart', (e) => {
    draggedId = item.id;
    e.dataTransfer.effectAllowed = 'move';
    // Defer class additions to prevent Chrome from aborting drag start due to instant layout reflow
    setTimeout(() => {
      element.classList.add('dragging');
      const modalList = document.getElementById('modal-shortcuts-list');
      if (modalList) {
        modalList.classList.add('list-dragging');
      }
    }, 0);
  });

  element.addEventListener('dragend', () => {
    element.classList.remove('dragging');
    const modalList = document.getElementById('modal-shortcuts-list');
    if (modalList) {
      modalList.classList.remove('list-dragging');
      const items = modalList.querySelectorAll('.modal-shortcut-item, .modal-folder-row');
      items.forEach(el => el.classList.remove('drag-sort-before', 'drag-sort-after', 'drag-merge'));
    }
  });

  element.addEventListener('dragover', (e) => {
    if (!draggedId || draggedId === item.id) return;
    
    const draggedItem = findShortcutOrFolderById(draggedId);
    const isDraggedFolder = draggedItem ? draggedItem.isFolder : false;

    // Folders cannot contain other folders (no nested folders allowed)
    if (isDraggedFolder && (isChild || isFolderContainingTarget(draggedItem, item.id))) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    const dropAction = getDropAction(e, element, isChild, isDraggedFolder, item.isFolder);
    
    if (dropAction === 'before') {
      element.classList.add('drag-sort-before');
      element.classList.remove('drag-sort-after', 'drag-merge');
    } else if (dropAction === 'after') {
      element.classList.add('drag-sort-after');
      element.classList.remove('drag-sort-before', 'drag-merge');
    } else if (dropAction === 'merge') {
      element.classList.add('drag-merge');
      element.classList.remove('drag-sort-before', 'drag-sort-after');
    }
  });

  element.addEventListener('dragleave', (e) => {
    e.stopPropagation();
    if (e.relatedTarget && element.contains(e.relatedTarget)) {
      return;
    }
    element.classList.remove('drag-sort-before', 'drag-sort-after', 'drag-merge');
  });

  element.addEventListener('drop', (e) => {
    if (!draggedId || draggedId === item.id) return;
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-sort-before', 'drag-sort-after', 'drag-merge');
    
    const draggedItem = findShortcutOrFolderById(draggedId);
    const isDraggedFolder = draggedItem ? draggedItem.isFolder : false;

    // Folders cannot be placed inside folder children
    if (isDraggedFolder && isChild) {
      return;
    }

    const dropAction = getDropAction(e, element, isChild, isDraggedFolder, item.isFolder);
    
    if (moveNestedItem(draggedId, item.id, dropAction)) {
      justDroppedId = draggedId;
      saveState();
      renderShortcuts();
      renderModalShortcutsList();
    }
  });
}

// РќР°РІРµС€РёРІР°РµРј СЃР»СѓС€Р°С‚РµР»СЊ РЅР° РїСѓСЃС‚РѕР№ С„РѕРЅ РєРѕРЅС‚РµР№РЅРµСЂР° СЏСЂР»С‹РєРѕРІ РІ РЅР°СЃС‚СЂРѕР№РєР°С…
const settingsModalList = document.getElementById('modal-shortcuts-list');
if (settingsModalList) {
  settingsModalList.addEventListener('dragover', (e) => {
    const targetRow = /** @type {Element} */ (e.target).closest('.modal-shortcut-item, .modal-folder-row');
    if (!targetRow && draggedId) {
      e.preventDefault();
    }
  });
  settingsModalList.addEventListener('drop', (e) => {
    const targetRow = /** @type {Element} */ (e.target).closest('.modal-shortcut-item, .modal-folder-row');
    if (!targetRow && draggedId) {
      e.preventDefault();
      // Пустое место списка — перенос ярлыка в текущую категорию (в конец)
      if (moveItemToCategory(draggedId, settingsCategoryId, true)) {
        justDroppedId = draggedId;
        refreshAfterCategoryChange();
      } else {
        renderModalShortcutsList();
      }
    }
  });
}

export {
  renderModalShortcutsList,
  renderShortcutRow,
  getDropAction,
  setupDragAndDropListeners
};

