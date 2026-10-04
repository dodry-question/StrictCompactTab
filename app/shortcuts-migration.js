import { TRANSLATIONS } from '../i18n/translations.js';

// --- МИГРАЦИЯ СТРУКТУРЫ ЯРЛЫКОВ (ОБРАТНАЯ СОВМЕСТИМОСТЬ) ---
// Старые версии хранили данные по-разному:
//   • плоский список ярлыков с полями folder / category / group;
//   • отдельные ключи folders / categories / groups: [{ id, name }];
//   • folders / groups c вложениями: [{ id, name, items|shortcuts|children: [...] }];
//   • новый вложенный формат: [{ id, name, isFolder: true, children: [...] }].
// extractCategoryMeta собирает описание категорий из ЛЮБОГО из этих форматов,
// ничего не теряя (включая ссылки и иконки ярлыков).
function extractCategoryMeta(raw) {
  const meta = [];
  if (!raw || typeof raw !== 'object') return meta;

  const pushItems = (target, items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const known = new Set(target.items.map(i => i && i.id).filter(Boolean));
    items.forEach(item => {
      if (!item || typeof item !== 'object') return;
      if (item.id && known.has(item.id)) return;
      target.items.push(item);
      if (item.id) known.add(item.id);
    });
  };

  // Префикс источника обязателен: idx считается ВНУТРИ каждого ключа,
  // и без префикса категория из categories и категория из folders
  // получали один и тот же id cat_0 и сливались в одну
  [['categories', raw.categories], ['folders', raw.folders], ['groups', raw.groups]].forEach(([sourceName, src]) => {
    if (!Array.isArray(src)) return;
    src.forEach((entry, idx) => {
      if (!entry || typeof entry !== 'object') return;
      const id = entry.id || ('cat_' + sourceName + '_' + idx);
      const name = entry.name || entry.title || id;
      const items = Array.isArray(entry.items) ? entry.items
        : (Array.isArray(entry.shortcuts) ? entry.shortcuts
          : (Array.isArray(entry.children) ? entry.children : null));

      let target = meta.find(m => m.id === id);
      if (!target) {
        target = { id, name, items: [] };
        meta.push(target);
      } else if (!items || items.length === 0) {
        target.name = name;
      }
      pushItems(target, items);
    });
  });

  return meta;
}

// Приводит любой список категорий (легаси или нормализованный) к единому виду
function normalizeCategoryMeta(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(entry => entry && typeof entry === 'object')
    .map((entry, idx) => ({
      id: entry.id || ('cat_' + idx),
      name: entry.name || entry.title || ('Category ' + (idx + 1)),
      items: Array.isArray(entry.items) ? entry.items
        : (Array.isArray(entry.shortcuts) ? entry.shortcuts
          : (Array.isArray(entry.children) ? entry.children : []))
    }));
}

function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function migrateToNested(flatShortcuts, categoriesOrFolders) {
  if (!Array.isArray(flatShortcuts)) flatShortcuts = [];
  const meta = normalizeCategoryMeta(categoriesOrFolders);

  const isAlreadyNested = flatShortcuts.some(s => s && (s.isFolder || Array.isArray(s.children)));

  // 1) Уже вложенный формат: проставляем id и дополняем категориями,
  //    описанными только в старых ключах folders / categories / groups.
  if (isAlreadyNested) {
    flatShortcuts.forEach(item => {
      if (!item || typeof item !== 'object') return;
      if (!item.id) item.id = (item.isFolder ? "f_" : "sc_") + Math.random().toString(36).substr(2, 9);
      if (item.isFolder) {
        // children у папки должен быть массивом ВСЕГДА: moveItemToCategory
        // делает target.children.push(item) и падает без массива
        if (!Array.isArray(item.children)) item.children = [];
        item.children.forEach(child => {
          if (child && !child.id) child.id = "sc_" + Math.random().toString(36).substr(2, 9);
        });
      }
    });

    meta.forEach(m => {
      if (m.id === 'default') return;
      if (flatShortcuts.some(f => f && f.isFolder && f.id === m.id)) return;
      // Категория существовала, но в списке ярлыков её не было — восстанавливаем
      // вместе с содержимым из m.items, иначе ссылки и иконки терялись
      const children = m.items.map(raw => ({
        id: raw && raw.id ? raw.id : generateId('sc_'),
        name: raw && raw.name,
        url: raw && raw.url,
        customIcon: (raw && raw.customIcon) || null
      }));
      flatShortcuts.push({ id: m.id, name: m.name, isFolder: true, children });
    });

    return flatShortcuts;
  }

  // 2) Старый плоский формат: раскладываем ярлыки по категориям.
  const nested = [];
  const folderMap = {};

  meta.forEach(f => {
    if (f.id === 'default' || folderMap[f.id]) return;
    folderMap[f.id] = { id: f.id, name: f.name, isFolder: true, children: [] };
    nested.push(folderMap[f.id]);
  });

  // Ярлыки, лежащие прямо внутри категорий (старые groups/folders с вложениями)
  const flat = flatShortcuts.slice();
  const knownIds = new Set(flat.map(s => s && s.id).filter(Boolean));
  meta.forEach(m => {
    m.items.forEach(raw => {
      if (!raw || typeof raw !== 'object') return;
      if (raw.id && knownIds.has(raw.id)) return;
      const copy = Object.assign({}, raw, { id: raw.id || generateId('sc_') });
      copy.__category = m.id;
      flat.push(copy);
      knownIds.add(copy.id);
    });
  });

  flat.forEach(s => {
    if (!s || typeof s !== 'object') return;
    const folderId = s.__category || s.folder || s.category || s.group || 'default';

    const itemObj = {};
    Object.keys(s).forEach(key => {
      if (key === 'folder' || key === 'category' || key === 'group' || key === '__category') return;
      itemObj[key] = s[key];
    });
    itemObj.id = s.id || generateId('sc_');
    itemObj.name = s.name;
    itemObj.url = s.url;
    itemObj.customIcon = s.customIcon || null;

    if (folderId !== 'default' && !folderMap[folderId]) {
      // Ярлык ссылается на неизвестную категорию — воссоздаём её, ничего не теряем
      folderMap[folderId] = { id: folderId, name: folderId, isFolder: true, children: [] };
      nested.push(folderMap[folderId]);
    }

    if (folderId === 'default') {
      nested.push(itemObj);
    } else {
      folderMap[folderId].children.push(itemObj);
    }
  });

  return nested;
}

function moveNestedItem(draggedId, targetId, action) {
  const targetItem = findShortcutOrFolderById(targetId);
  if (!targetItem) return false;

  let folderName = "";
  if (action === 'merge' && !targetItem.isFolder) {
    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
    const name = prompt(currentDict.addCategoryPrompt);
    if (name === null) return false; // User canceled, abort operation
    folderName = name.trim() || "Folder";
  }

  let draggedItem = null;
  
  // Find dragged item and remove it
  let rootIdx = STATE.shortcuts.findIndex(s => s.id === draggedId);
  if (rootIdx !== -1) {
    draggedItem = STATE.shortcuts.splice(rootIdx, 1)[0];
  } else {
    for (let f of STATE.shortcuts) {
      if (f.isFolder && f.children) {
        let childIdx = f.children.findIndex(s => s.id === draggedId);
        if (childIdx !== -1) {
          draggedItem = f.children.splice(childIdx, 1)[0];
          break;
        }
      }
    }
  }
  
  if (!draggedItem) return false;

  if (action === 'merge') {
    let targetIdx = STATE.shortcuts.findIndex(s => s.id === targetId);
    if (targetIdx !== -1) {
      const target = STATE.shortcuts[targetIdx];
      if (target.isFolder) {
        if (!target.children) target.children = [];
        target.children.push(draggedItem);
      } else {
        // Merge two shortcuts to create a folder using pre-prompted folderName
        const newFolder = {
          id: "f_" + Date.now() + Math.random().toString(36).substr(2, 5),
          name: folderName,
          isFolder: true,
          children: [target, draggedItem]
        };
        STATE.shortcuts[targetIdx] = newFolder;
      }
    }
  } else {
    // action is 'before' or 'after'
    let targetIdx = STATE.shortcuts.findIndex(s => s.id === targetId);
    if (targetIdx !== -1) {
      const insertIdx = action === 'before' ? targetIdx : targetIdx + 1;
      STATE.shortcuts.splice(insertIdx, 0, draggedItem);
    } else {
      for (let f of STATE.shortcuts) {
        if (f.isFolder && f.children) {
          let childIdx = f.children.findIndex(s => s.id === targetId);
          if (childIdx !== -1) {
            const insertIdx = action === 'before' ? childIdx : childIdx + 1;
            f.children.splice(insertIdx, 0, draggedItem);
            break;
          }
        }
      }
    }
  }
  return true;
}

function findShortcutOrFolderById(id) {
  let item = STATE.shortcuts.find(s => s.id === id);
  if (item) return item;
  for (let f of STATE.shortcuts) {
    if (f.isFolder && f.children) {
      let child = f.children.find(s => s.id === id);
      if (child) return child;
    }
  }
  return null;
}

function isFolderContainingTarget(folder, targetId) {
  if (!folder.children) return false;
  return folder.children.some(child => child.id === targetId);
}

function openFolder(folderId) {
  const folder = STATE.shortcuts.find(f => f.isFolder && f.id === folderId);
  if (!folder) return;
  
  const folderModal = document.getElementById('folder-modal');
  const titleEl = document.getElementById('folder-modal-title');
  if (titleEl) {
    titleEl.textContent = folder.name;
  }
  if (folderModal) {
    folderModal.dataset.folderId = folderId;
    renderFolderShortcuts(folderId);
    folderModal.classList.add('active');
    setTimeout(() => {
      const container = document.getElementById('folder-shortcuts-container');
      if (container) {
        const firstShortcut = container.querySelector('a');
        if (firstShortcut) {
          firstShortcut.focus();
          return;
        }
      }
      const closeBtn = document.getElementById('folder-modal-close');
      if (closeBtn) closeBtn.focus();
    }, 50);
  }
}

function closeFolder() {
  const folderModal = document.getElementById('folder-modal');
  if (folderModal) {
    folderModal.classList.remove('active');
    delete folderModal.dataset.folderId;
  }
}

function renderFolderShortcuts(folderId) {
  const folderShortcutsContainer = document.getElementById('folder-shortcuts-container');
  if (!folderShortcutsContainer) return;
  folderShortcutsContainer.innerHTML = '';
  
  const folder = STATE.shortcuts.find(f => f.isFolder && f.id === folderId);
  if (!folder || !folder.children) return;
  
  let itemWidth = 85; 
  if (STATE.size === "small") itemWidth = 85;
  if (STATE.size === "medium") itemWidth = 98;
  if (STATE.size === "large") itemWidth = 110;
  const gap = 16;
  const maxColumns = STATE.columns;
  const actualColumns = Math.min(folder.children.length, maxColumns);
  const containerMaxWidth = (itemWidth * actualColumns) + (gap * (actualColumns - 1)) + 20;
  folderShortcutsContainer.style.maxWidth = `${containerMaxWidth}px`;
  
  const fragment = document.createDocumentFragment();
  
  folder.children.forEach((item) => {
    const card = document.createElement('a');
    card.href = item.url;
    card.className = `shortcut-card size-${STATE.size}`;
    card.title = item.name;
    
    const img = document.createElement('img');
    img.className = 'shortcut-icon';
    img.alt = '';

    window.ShortcutIcons.attach(img, item, 128);
    
    const span = document.createElement('span');
    span.className = 'shortcut-label';
    span.textContent = item.name;
    
    card.appendChild(img);
    card.appendChild(span);
    fragment.appendChild(card);
  });
  
  folderShortcutsContainer.appendChild(fragment);
}

const folderModal = document.getElementById('folder-modal');
const folderCloseBtn = document.getElementById('folder-modal-close');
if (folderCloseBtn && folderModal) {
  folderCloseBtn.addEventListener('click', closeFolder);
  folderModal.addEventListener('click', (e) => {
    if (e.target === folderModal) closeFolder();
  });
}

// Мосты для потребителей (categories-settings, state-render — классические;
// backup-validate, backup-updates, input-keys, modal-shortcuts — уже модули) —
// уберём в фазе 3 шага «в».
window.extractCategoryMeta = extractCategoryMeta;
window.generateId = generateId;
window.migrateToNested = migrateToNested;
window.moveNestedItem = moveNestedItem;
window.findShortcutOrFolderById = findShortcutOrFolderById;
window.isFolderContainingTarget = isFolderContainingTarget;
window.closeFolder = closeFolder;
window.folderModal = folderModal;
export {
  extractCategoryMeta,
  normalizeCategoryMeta,
  generateId,
  migrateToNested,
  moveNestedItem,
  findShortcutOrFolderById,
  isFolderContainingTarget,
  openFolder,
  closeFolder,
  renderFolderShortcuts,
  folderModal,
  folderCloseBtn
};

