document.addEventListener('DOMContentLoaded', () => {

  // --- СЛОВАРЬ ПЕРЕВОДОВ (ЛОКАЛИЗАЦИЯ) ---
  const TRANSLATIONS = {
    en: {
      searchPlaceholder: "Search the web...",
      searchBtnTitle: "Search",
      settingsTitle: "Screen Settings",
      addShortcutTitle: "Add New Shortcut",
      namePlaceholder: "Name",
      urlPlaceholder: "URL Link",
      addBtn: "Add",
      uploadIconTitle: "Upload custom icon (optional)",
      gridDisplayTitle: "Grid Display",
      shortcutSizeLabel: "Shortcut Size",
      sizeSmall: "Small (85x85px)",
      sizeMedium: "Medium (98x98px)",
      sizeLarge: "Large (110x110px)",
      columnsLabel: "Max in row",
      bgImageTitle: "Background Image",
      chooseFileBtn: "Choose File",
      resetBtn: "Reset",
      tabFaviconTitle: "Tab Favicon",
      chooseIconBtn: "Choose Icon",
      clockDateSettingsTitle: "Clock and Date Settings",
      showDateLabel: "Show date and day of the week",
      format12hLabel: "12-hour format (AM/PM)",
      showSecondsLabel: "Display seconds",
      backupTitle: "Backup Configuration",
      exportBtn: "Export",
      importBtn: "Import",
      manageShortcutsTitle: "Manage Shortcuts",
      listEmpty: "Shortcuts list is empty",
      btnEdit: "Edit",
      btnDelete: "Delete",
      btnSave: "Save",
      btnCancel: "Cancel",
      importSuccess: "Import successful!",
      importError: "Import error. Make sure the file is a correct JSON backup.",
      importReadError: "Error reading the backup file.",
      
      // Локализация вкладок/категорий
      shortcutCategoryLabel: "Category",
      addCategoryTitle: "Add Category",
      defaultCategoryName: "General",
      addCategoryPrompt: "Enter new category name:",
      renameCategoryPrompt: "Rename category to:",
      deleteCategoryConfirm: "Are you sure you want to delete this category? All its shortcuts will be moved to General."
    },
    ru: {
      searchPlaceholder: "Искать в интернете...",
      searchBtnTitle: "Искать",
      settingsTitle: "Настройки экрана",
      addShortcutTitle: "Добавить новый ярлык",
      namePlaceholder: "Название",
      urlPlaceholder: "Ссылка URL",
      addBtn: "Добавить",
      uploadIconTitle: "Загрузить иконку (опционально)",
      gridDisplayTitle: "Отображение сетки",
      shortcutSizeLabel: "Размер ярлыков",
      sizeSmall: "Маленький (85x85px)",
      sizeMedium: "Средний (98x98px)",
      sizeLarge: "Крупный (110x110px)",
      columnsLabel: "В ряду (макс.)",
      bgImageTitle: "Фоновое изображение",
      chooseFileBtn: "Выбрать файл",
      resetBtn: "Сбросить",
      tabFaviconTitle: "Иконка вкладки",
      chooseIconBtn: "Выбрать иконку",
      clockDateSettingsTitle: "Настройки часов и даты",
      showDateLabel: "Показывать дату и день недели",
      format12hLabel: "12-часовой формат (AM/PM)",
      showSecondsLabel: "Отображать секунды",
      backupTitle: "Резервное копирование",
      exportBtn: "Экспорт",
      importBtn: "Импорт",
      manageShortcutsTitle: "Управление ярлыками",
      listEmpty: "Список ярлыков пуст",
      btnEdit: "Редактировать",
      btnDelete: "Удалить",
      btnSave: "Сохранить",
      btnCancel: "Отмена",
      importSuccess: "Импорт успешно выполнен!",
      importError: "Ошибка при импорте. Убедитесь, что выбран правильный файл резервной копии JSON.",
      importReadError: "Ошибка при чтении файла бэкапа.",
      
      // Локализация вкладок/категорий
      shortcutCategoryLabel: "Категория",
      addCategoryTitle: "Добавить категорию",
      defaultCategoryName: "Общая",
      addCategoryPrompt: "Введите название новой категории:",
      renameCategoryPrompt: "Переименовать категорию в:",
      deleteCategoryConfirm: "Вы уверены, что хотите удалить эту категорию? Все её ярлыки будут перенесены в Общую."
    }
  };

  // --- РАСШИРЕННАЯ СИСТЕМА ХРАНЕНИЯ (с поддержкой бэкапов) ---
  const storage = {
    get: (keys, callback) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(keys, callback);
      } else {
        const result = {};
        const isArray = Array.isArray(keys);
        const queryKeys = isArray ? keys : [keys];
        
        queryKeys.forEach(key => {
          const value = localStorage.getItem(key);
          result[key] = value ? JSON.parse(value) : null;
        });
        callback(isArray ? result : result[keys]);
      }
    },
    set: (data, callback) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(data, callback);
      } else {
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, JSON.stringify(data[key]));
        });
        if (callback) callback();
      }
    },
    getAll: (callback) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(null, callback);
      } else {
        const result = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          try {
            result[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            result[key] = localStorage.getItem(key);
          }
        }
        callback(result);
      }
    },
    clearAndSet: (data, callback) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.clear(() => {
          chrome.storage.local.set(data, callback);
        });
      } else {
        localStorage.clear();
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, JSON.stringify(data[key]));
        });
        if (callback) callback();
      }
    }
  };

  // --- ЧИСТЫЙ СТАРТОВЫЙ ШАБЛОН ---
  const DEFAULT_SHORTCUTS = [];

  const STATE = {
    shortcuts: [],
    categories: [{ id: "default", name: "General" }],
    activeCategory: "default", // Активная категория на главном экране
    activeSettingsCategory: "default", // Активная категория в панели настроек
    columns: 10,
    size: "small",
    customBackground: null,
    customFavicon: null,
    language: "en",
    showDate: true,
    format12h: false,
    showSeconds: false
  };

  let editingIndex = -1;
  let dragSrcIndex = null;
  let dragCategorySrcId = null;

  // --- ИНИЦИАЛИЗАЦИЯ ЭЛЕМЕНТОВ ИМПОРТА / ЭКСПОРТА ---
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const importFileInput = document.getElementById('import-file-input');

  // --- ЧАСЫ И ДАТА ---
  const clockElement = document.getElementById('clock');
  const dateElement = document.getElementById('date-display');

  function updateClockAndDate() {
    const now = new Date();
    
    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    let ampm = '';

    if (STATE.format12h) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
    }
    hours = String(hours).padStart(2, '0');

    let timeString = `${hours}:${minutes}`;
    if (STATE.showSeconds) {
      timeString += `:${seconds}`;
    }
    timeString += ampm;

    if (clockElement) {
      clockElement.textContent = timeString;
    }

    if (dateElement) {
      if (STATE.showDate) {
        dateElement.style.display = 'block';
        let dayName = '';
        let monthName = '';
        let dateString = '';
        
        if (STATE.language === 'ru') {
          const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
          const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
          dayName = days[now.getDay()];
          const dayNum = now.getDate();
          monthName = months[now.getMonth()];
          dateString = `${dayName}, ${dayNum} ${monthName}`;
        } else {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          dayName = days[now.getDay()];
          const dayNum = now.getDate();
          monthName = months[now.getMonth()];
          dateString = `${dayName}, ${monthName} ${dayNum}`;
        }
        
        dateElement.textContent = dateString;
      } else {
        dateElement.style.display = 'none';
      }
    }
  }
  setInterval(updateClockAndDate, 1000);
  updateClockAndDate();

  // --- ПОИСК DUCKDUCKGO ---
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      }
    });
  }

  // --- УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ И МОДАЛЬНЫМ ОКНОМ ---
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('settings-open-btn');
  const closeBtn = document.getElementById('settings-close-btn');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.classList.add('active');
      editingIndex = -1;
      renderSettingsCategories();
      renderModalShortcutsList();
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  // Настройки сетки макета
  const sizeSelect = document.getElementById('shortcut-size-select');
  const columnsSelect = document.getElementById('shortcut-columns-select');
  const languageSelect = document.getElementById('language-select');

  if (sizeSelect) {
    sizeSelect.addEventListener('change', (e) => {
      STATE.size = e.target.value;
      saveState();
      renderShortcuts();
    });
  }

  if (columnsSelect) {
    columnsSelect.addEventListener('change', (e) => {
      STATE.columns = parseInt(e.target.value, 10);
      saveState();
      renderShortcuts();
    });
  }

  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      STATE.language = e.target.value;
      saveState();
      applyLanguage(STATE.language);
      updateClockAndDate();
      populateCategorySelects();
      renderSettingsCategories();
      renderMainCategories();
      renderModalShortcutsList();
    });
  }

  // Форма создания нового ярлыка
  const newIconInput = document.getElementById('new-shortcut-icon-file');
  const addForm = document.getElementById('add-shortcut-form');
  const newNameInput = document.getElementById('new-shortcut-name');
  const newUrlInput = document.getElementById('new-shortcut-url');
  const newCategorySelect = document.getElementById('new-shortcut-category');

  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = newNameInput.value.trim();
      let url = newUrlInput.value.trim();
      const category = newCategorySelect ? newCategorySelect.value : "default";

      if (name && url) {
        if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }

        const saveShortcut = (customIcon) => {
          STATE.shortcuts.push({ name, url, customIcon, category });
          saveState();
          renderShortcuts();
          renderModalShortcutsList();

          addForm.reset();
          populateCategorySelects(); // Восстанавливаем дефолтное выбранное значение селекта
          
          const iconLabel = document.querySelector('.add-shortcut-form .btn-square-upload');
          if (iconLabel) {
            iconLabel.style.borderColor = '';
            iconLabel.title = TRANSLATIONS[STATE.language].uploadIconTitle;
          }
        };

        const file = newIconInput ? newIconInput.files[0] : null;
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            saveShortcut(event.target.result);
          };
          reader.readAsDataURL(file);
        } else {
          saveShortcut(null);
        }
      }
    });
  }

  if (newIconInput) {
    newIconInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const iconLabel = document.querySelector('.add-shortcut-form .btn-square-upload');
      if (file && iconLabel) {
        iconLabel.title = file.name;
        iconLabel.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      }
    });
  }

  // --- УПРАВЛЕНИЕ ОБОЯМИ ---
  const bgFileInput = document.getElementById('bg-file-input');
  const bgResetBtn = document.getElementById('bg-reset-btn');

  if (bgFileInput) {
    bgFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          STATE.customBackground = event.target.result;
          saveState();
          applyBackground();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (bgResetBtn) {
    bgResetBtn.addEventListener('click', () => {
      STATE.customBackground = null;
      saveState();
      applyBackground();
    });
  }

  function applyBackground() {
    if (STATE.customBackground) {
      document.body.style.backgroundImage = `url(${STATE.customBackground})`;
    } else {
      document.body.style.backgroundImage = 'none';
    }
  }

  // --- УПРАВЛЕНИЕ ДИНАМИЧЕСКОЙ ИКОНКОЙ ВКЛАДКИ ---
  const faviconFileInput = document.getElementById('favicon-file-input');
  const faviconResetBtn = document.getElementById('favicon-reset-btn');

  if (faviconFileInput) {
    faviconFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          STATE.customFavicon = event.target.result;
          saveState();
          applyFavicon();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (faviconResetBtn) {
    faviconResetBtn.addEventListener('click', () => {
      STATE.customFavicon = null;
      saveState();
      applyFavicon();
    });
  }

  function applyFavicon() {
    const faviconLink = document.querySelector('.page-favicon');
    if (faviconLink) {
      faviconLink.href = STATE.customFavicon || 'favicon.png';
    }
  }

  // --- ДИНАМИЧЕСКАЯ ЛОКАЛИЗАЦИЯ ИНТЕРФЕЙСА ---
  function applyLanguage(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (dict[key]) {
        el.title = dict[key];
      }
    });
  }

  // --- УПРАВЛЕНИЕ ТУМБЛЕРАМИ ЧАСОВ И ДАТЫ ---
  const showDateCb = document.getElementById('show-date-checkbox');
  const timeFormatCb = document.getElementById('time-format-checkbox');
  const showSecondsCb = document.getElementById('show-seconds-checkbox');

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

  if (showSecondsCb) {
    showSecondsCb.addEventListener('change', (e) => {
      STATE.showSeconds = e.target.checked;
      saveState();
      updateClockAndDate();
    });
  }

  // --- УПРАВЛЕНИЕ КАТЕГОРИЯМИ ---
  const btnAddCategory = document.getElementById('btn-add-category');
  if (btnAddCategory) {
    btnAddCategory.addEventListener('click', () => {
      const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
      const catName = prompt(currentDict.addCategoryPrompt);
      if (catName && catName.trim()) {
        const newId = "cat_" + Date.now();
        STATE.categories.push({ id: newId, name: catName.trim() });
        saveState();
        renderSettingsCategories();
        renderMainCategories();
        populateCategorySelects();
      }
    });
  }

  function populateCategorySelects() {
    const selects = [newCategorySelect];
    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

    selects.forEach(select => {
      if (select) {
        select.innerHTML = '';
        STATE.categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = cat.id === 'default' ? currentDict.defaultCategoryName : cat.name;
          select.appendChild(opt);
        });
      }
    });
  }

  function renderSettingsCategories() {
    const tabsContainer = document.getElementById('settings-categories-tabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

    STATE.categories.forEach((cat, index) => {
      const tab = document.createElement('div');
      tab.className = 'settings-category-tab';
      if (cat.id === STATE.activeSettingsCategory) {
        tab.classList.add('active');
      }
      tab.textContent = cat.id === 'default' ? currentDict.defaultCategoryName : cat.name;
      
      // Сделать вкладки-категории перетаскиваемыми (кроме дефолтной, но для порядка разрешаем перемещать все)
      tab.setAttribute('draggable', true);
      tab.dataset.id = cat.id;
      tab.dataset.index = index;

      tab.addEventListener('click', () => {
        STATE.activeSettingsCategory = cat.id;
        renderSettingsCategories();
        renderModalShortcutsList();
      });

      // Перетаскивание категорий (Drag & Drop)
      tab.addEventListener('dragstart', (e) => {
        dragCategorySrcId = cat.id;
        e.dataTransfer.effectAllowed = 'move';
        tab.classList.add('dragging');
      });

      tab.addEventListener('dragend', () => {
        tab.classList.remove('dragging');
        const items = tabsContainer.querySelectorAll('.settings-category-tab');
        items.forEach(item => item.classList.remove('drag-over'));
      });

      tab.addEventListener('dragover', (e) => {
        e.preventDefault();
        tab.classList.add('drag-over');
      });

      tab.addEventListener('dragleave', () => {
        tab.classList.remove('drag-over');
      });

      tab.addEventListener('drop', (e) => {
        e.preventDefault();
        tab.classList.remove('drag-over');
        const targetIndex = parseInt(tab.dataset.index, 10);
        const srcIndex = STATE.categories.findIndex(c => c.id === dragCategorySrcId);
        
        if (srcIndex !== -1 && srcIndex !== targetIndex) {
          const [movedCat] = STATE.categories.splice(srcIndex, 1);
          STATE.categories.splice(targetIndex, 0, movedCat);
          saveState();
          renderSettingsCategories();
          renderMainCategories();
          populateCategorySelects();
        }
      });

      // Двойной клик для переименования категории
      tab.addEventListener('dblclick', () => {
        if (cat.id === 'default') return;
        const newName = prompt(currentDict.renameCategoryPrompt, cat.name);
        if (newName && newName.trim()) {
          cat.name = newName.trim();
          saveState();
          renderSettingsCategories();
          renderMainCategories();
          populateCategorySelects();
        }
      });

      // Правый клик для удаления категории
      tab.addEventListener('contextmenu', (e) => {
        if (cat.id === 'default') return;
        e.preventDefault();
        const confirmDelete = confirm(currentDict.deleteCategoryConfirm);
        if (confirmDelete) {
          STATE.categories = STATE.categories.filter(c => c.id !== cat.id);
          
          // Перенос ярлыков удаленной категории в General ("default")
          STATE.shortcuts.forEach(s => {
            if (s.category === cat.id) {
              s.category = 'default';
            }
          });

          if (STATE.activeCategory === cat.id) STATE.activeCategory = 'default';
          if (STATE.activeSettingsCategory === cat.id) STATE.activeSettingsCategory = 'default';

          saveState();
          renderShortcuts();
          renderSettingsCategories();
          renderMainCategories();
          populateCategorySelects();
          renderModalShortcutsList();
        }
      });

      tabsContainer.appendChild(tab);
    });
  }

  function renderMainCategories() {
    const mainTabsContainer = document.getElementById('main-categories-container');
    if (!mainTabsContainer) return;
    mainTabsContainer.innerHTML = '';

    // Если создана ТОЛЬКО ОДНА категория (дефолтная), то скрываем панель переключателей
    if (STATE.categories.length <= 1) {
      mainTabsContainer.style.display = 'none';
      return;
    }

    mainTabsContainer.style.display = 'flex';
    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

    STATE.categories.forEach(cat => {
      const tab = document.createElement('div');
      tab.className = 'main-category-tab';
      if (cat.id === STATE.activeCategory) {
        tab.classList.add('active');
      }
      tab.textContent = cat.id === 'default' ? currentDict.defaultCategoryName : cat.name;

      tab.addEventListener('click', () => {
        STATE.activeCategory = cat.id;
        renderMainCategories();
        renderShortcuts();
      });

      mainTabsContainer.appendChild(tab);
    });
  }

  // Навигация колесиком мыши (скролл) по категориям вне открытого модального окна
  window.addEventListener('wheel', (e) => {
    if (modal && modal.classList.contains('active')) return;
    if (STATE.categories.length <= 1) return;

    // Убедимся, что жест прокрутки достаточно выраженный по оси Y
    if (Math.abs(e.deltaY) < 15) return;

    const currentIndex = STATE.categories.findIndex(c => c.id === STATE.activeCategory);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.deltaY > 0) {
      nextIndex = (currentIndex + 1) % STATE.categories.length;
    } else {
      nextIndex = (currentIndex - 1 + STATE.categories.length) % STATE.categories.length;
    }

    STATE.activeCategory = STATE.categories[nextIndex].id;
    renderMainCategories();
    renderShortcuts();
  }, { passive: true });


  // --- ЭКСПОРТ И ИМПОРТ НАСТРОЕК (JSON-БЭКАП) ---
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      storage.getAll((allData) => {
        const dataStr = JSON.stringify(allData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileName = 'brave_new_tab_backup.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
      });
    });
  }

  if (btnImport && importFileInput) {
    btnImport.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) {
        importFileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);

          const shortcuts = Array.isArray(data.shortcuts) ? data.shortcuts : DEFAULT_SHORTCUTS;
          const categories = Array.isArray(data.categories) ? data.categories : [{ id: "default", name: "General" }];
          
          // Безопасный парсинг ярлыков с пропущенным полем category
          shortcuts.forEach(s => {
            if (!s.category) s.category = "default";
          });

          const columns = data.columns ?? 10;
          const size = data.size ?? 'small';
          
          let format12h = false;
          if (data.format12h !== undefined && data.format12h !== null) {
            format12h = data.format12h;
          } else if (data.timeFormat === '12h') {
            format12h = true;
          }

          const showSeconds = data.showSeconds ?? false;
          const showDate = data.showDate ?? true;
          const customBackground = data.customBackground ?? null;
          const customFavicon = data.customFavicon ?? null;
          const language = data.language ?? 'en';

          const cleanedData = {
            shortcuts,
            categories,
            columns,
            size,
            format12h,
            showSeconds,
            showDate,
            customBackground,
            customFavicon,
            language
          };

          storage.clearAndSet(cleanedData, () => {
            window.location.reload();
          });

        } catch (err) {
          alert(TRANSLATIONS[STATE.language].importError);
          importFileInput.value = '';
        }
      };

      reader.onerror = () => {
        alert(TRANSLATIONS[STATE.language].importReadError);
        importFileInput.value = '';
      };

      reader.readAsText(file);
    });
  }

  // --- ФУНКЦИИ ОБРАБОТКИ ДАННЫХ И ОТРИСОВКИ ---

  function loadState() {
    storage.get(['shortcuts', 'categories', 'columns', 'size', 'customBackground', 'customFavicon', 'language', 'showDate', 'format12h', 'showSeconds'], (result) => {
      STATE.shortcuts = result.shortcuts ?? DEFAULT_SHORTCUTS;
      STATE.categories = result.categories ?? [{ id: "default", name: "General" }];
      STATE.columns = result.columns ?? 10;
      STATE.size = result.size ?? "small";
      STATE.customBackground = result.customBackground ?? null;
      STATE.customFavicon = result.customFavicon ?? null;
      STATE.language = result.language ?? "en";
      STATE.showDate = result.showDate ?? true;
      STATE.format12h = result.format12h ?? false;
      STATE.showSeconds = result.showSeconds ?? false;

      // Обеспечение наличия свойства category у ярлыков
      STATE.shortcuts.forEach(s => {
        if (!s.category) s.category = "default";
      });

      if (sizeSelect) sizeSelect.value = STATE.size;
      if (columnsSelect) columnsSelect.value = STATE.columns;
      if (languageSelect) languageSelect.value = STATE.language;

      if (showDateCb) showDateCb.checked = STATE.showDate;
      if (timeFormatCb) timeFormatCb.checked = STATE.format12h;
      if (showSecondsCb) showSecondsCb.checked = STATE.showSeconds;

      applyBackground();
      applyFavicon();
      applyLanguage(STATE.language);
      updateClockAndDate();
      populateCategorySelects();
      renderMainCategories();
      renderShortcuts();
    });
  }

  function saveState() {
    storage.set({
      shortcuts: STATE.shortcuts,
      categories: STATE.categories,
      columns: STATE.columns,
      size: STATE.size,
      customBackground: STATE.customBackground,
      customFavicon: STATE.customFavicon,
      language: STATE.language,
      showDate: STATE.showDate,
      format12h: STATE.format12h,
      showSeconds: STATE.showSeconds
    });
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
    container.innerHTML = '';

    // Фильтруем ярлыки для вывода, только если категорий больше 1
    const filteredShortcuts = STATE.categories.length > 1
      ? STATE.shortcuts.filter(s => s.category === STATE.activeCategory)
      : STATE.shortcuts;

    let itemWidth = 85; 
    if (STATE.size === "small") itemWidth = 85;
    if (STATE.size === "medium") itemWidth = 98;
    if (STATE.size === "large") itemWidth = 110;

    const gap = 16;
    const maxColumns = STATE.columns;
    const actualColumns = Math.min(filteredShortcuts.length, maxColumns);
    
    const containerMaxWidth = (itemWidth * actualColumns) + (gap * (actualColumns - 1));
    container.style.maxWidth = `${containerMaxWidth}px`;

    filteredShortcuts.forEach((item) => {
      const card = document.createElement('a');
      card.href = item.url;
      card.className = `shortcut-card size-${STATE.size}`;
      card.title = item.name;

      const img = document.createElement('img');
      img.className = 'shortcut-icon';
      img.alt = '';

      let hostname = '';
      try {
        hostname = new URL(item.url).hostname;
      } catch (e) {
        hostname = item.url;
      }

      img.src = item.customIcon || `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;

      img.onerror = () => {
        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>';
      };

      const span = document.createElement('span');
      span.className = 'shortcut-label';
      span.textContent = item.name;

      card.appendChild(img);
      card.appendChild(span);
      container.appendChild(card);
    });
  }

  const modalList = document.getElementById('modal-shortcuts-list');

  function renderModalShortcutsList() {
    if (!modalList) return;
    modalList.innerHTML = '';

    const currentDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

    // Показываем только ярлыки, принадлежащие выбранной в настройках категории
    const filteredShortcuts = STATE.shortcuts.filter(s => s.category === STATE.activeSettingsCategory);

    if (filteredShortcuts.length === 0) {
      modalList.innerHTML = `<div style="color: rgba(255,255,255,0.3); font-size: 11px; text-align: center; padding: 12px;">${currentDict.listEmpty}</div>`;
      return;
    }

    filteredShortcuts.forEach((item) => {
      // Ищем абсолютный индекс ярлыка в главном массиве STATE.shortcuts
      const absoluteIndex = STATE.shortcuts.indexOf(item);

      const row = document.createElement('div');
      row.className = 'modal-shortcut-item';

      if (editingIndex === absoluteIndex) {
        row.setAttribute('draggable', false);

        const editContainer = document.createElement('div');
        editContainer.className = 'modal-shortcut-edit-container';

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

        // Поле выбора категории ярлыка при инлайн-редактировании
        const catSelect = document.createElement('select');
        catSelect.className = 'settings-input inline-input';
        STATE.categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = cat.id === 'default' ? currentDict.defaultCategoryName : cat.name;
          catSelect.appendChild(opt);
        });
        catSelect.value = item.category || 'default';

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
        inlineIconInput.id = `edit-shortcut-icon-file-${absoluteIndex}`;

        const inlineIconLabel = document.createElement('label');
        inlineIconLabel.htmlFor = `edit-shortcut-icon-file-${absoluteIndex}`;
        inlineIconLabel.className = 'btn-square-upload';
        inlineIconLabel.title = currentDict.uploadIconTitle;

        const uploadImg = document.createElement('img');
        uploadImg.src = 'upload-icon.png';
        uploadImg.alt = 'Upload';

        inlineIconLabel.appendChild(uploadImg);
        inlineIconLabel.appendChild(inlineIconInput);

        inlineIconInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            inlineIconLabel.title = file.name;
            inlineIconLabel.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }
        });

        actionsWrapper.appendChild(cancelBtn);
        actionsWrapper.appendChild(saveBtn);
        actionsWrapper.appendChild(inlineIconLabel);

        saveBtn.addEventListener('click', () => {
          const newName = nameInput.value.trim();
          let newUrl = urlInput.value.trim();
          const newCat = catSelect.value;

          if (newName && newUrl) {
            if (!/^https?:\/\//i.test(newUrl)) {
              newUrl = 'https://' + newUrl;
            }

            const file = inlineIconInput.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                STATE.shortcuts[absoluteIndex] = { name: newName, url: newUrl, customIcon: event.target.result, category: newCat };
                saveState();
                editingIndex = -1;
                renderShortcuts();
                renderModalShortcutsList();
              };
              reader.readAsDataURL(file);
            } else {
              const existingIcon = STATE.shortcuts[absoluteIndex].customIcon || null;
              STATE.shortcuts[absoluteIndex] = { name: newName, url: newUrl, customIcon: existingIcon, category: newCat };
              saveState();
              editingIndex = -1;
              renderShortcuts();
              renderModalShortcutsList();
            }
          }
        });

        editContainer.appendChild(fieldsWrapper);
        editContainer.appendChild(actionsWrapper);
        row.appendChild(editContainer);

      } else {
        row.setAttribute('draggable', true);
        row.dataset.absoluteIndex = absoluteIndex;

        row.addEventListener('dragstart', (e) => {
          dragSrcIndex = absoluteIndex;
          e.dataTransfer.effectAllowed = 'move';
          row.classList.add('dragging');
        });

        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          const items = modalList.querySelectorAll('.modal-shortcut-item');
          items.forEach(item => item.classList.remove('drag-over'));
        });

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          row.classList.add('drag-over');
          handleAutoscroll(e);
        });

        row.addEventListener('dragleave', () => {
          row.classList.remove('drag-over');
        });

        row.addEventListener('drop', (e) => {
          e.preventDefault();
          row.classList.remove('drag-over');
          
          const targetAbsoluteIndex = parseInt(row.dataset.absoluteIndex, 10);
          if (dragSrcIndex !== null && dragSrcIndex !== targetAbsoluteIndex) {
            moveShortcut(dragSrcIndex, targetAbsoluteIndex);
          }
        });

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
        editBtn.textContent = currentDict.btnEdit;
        editBtn.addEventListener('click', () => {
          editingIndex = absoluteIndex;
          renderModalShortcutsList();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-delete';
        deleteBtn.textContent = currentDict.btnDelete;
        deleteBtn.addEventListener('click', () => {
          STATE.shortcuts.splice(absoluteIndex, 1);
          saveState();
          renderShortcuts();
          renderModalShortcutsList();
        });

        actionsWrapper.appendChild(editBtn);
        actionsWrapper.appendChild(deleteBtn);

        row.appendChild(info);
        row.appendChild(actionsWrapper);
      }

      modalList.appendChild(row);
    });
  }

  loadState();
});