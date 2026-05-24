document.addEventListener('DOMContentLoaded', () => {

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

  // --- ЧИСТЫЙ СТАРТОВЫЙ ШАБЛОН (Пустая конфигурация по умолчанию) ---
  const DEFAULT_SHORTCUTS = [];

  const STATE = {
    shortcuts: [],
    columns: 10,
    size: "small", // "small" (85x85px) является размером по умолчанию
    customBackground: null,
    showDate: true,
    format12h: false,
    showSeconds: false
  };

  let editingIndex = -1;
  let dragSrcIndex = null;

  // --- ИНИЦИАЛИЗАЦИЯ ЭЛЕМЕНТОВ ИМПОРТА / ЭКСПОРТА ---
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const importFileInput = document.getElementById('import-file-input');

  // --- ЧАСЫ И ДАТА (С тумблерами и локализации) ---
  const clockElement = document.getElementById('clock');
  const dateElement = document.getElementById('date-display');

  function updateClockAndDate() {
    const now = new Date();
    
    // 1. Форматирование времени
    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    let ampm = '';

    if (STATE.format12h) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // Преобразование 0 в 12 для 12-часового формата
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

    // 2. Форматирование даты
    if (dateElement) {
      if (STATE.showDate) {
        dateElement.style.display = 'block';
        const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        
        const dayName = days[now.getDay()];
        const dayNum = now.getDate();
        const monthName = months[now.getMonth()];
        
        dateElement.textContent = `${dayName}, ${dayNum} ${monthName}`;
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

  // Загрузка кастомного файла иконки для формы создания
  const newIconInput = document.getElementById('new-shortcut-icon-file');

  // Форма создания нового ярлыка
  const addForm = document.getElementById('add-shortcut-form');
  const newNameInput = document.getElementById('new-shortcut-name');
  const newUrlInput = document.getElementById('new-shortcut-url');

  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = newNameInput.value.trim();
      let url = newUrlInput.value.trim();

      if (name && url) {
        if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }

        const saveShortcut = (customIcon) => {
          STATE.shortcuts.push({ name, url, customIcon });
          saveState();
          renderShortcuts();
          renderModalShortcutsList();

          addForm.reset();
          
          // Сбрасываем рамку квадратной кнопки загрузки после добавления
          const iconLabel = document.querySelector('.add-shortcut-form .btn-square-upload');
          if (iconLabel) {
            iconLabel.style.borderColor = '';
            iconLabel.title = 'Загрузить иконку (опционально)';
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

  // Изменение границы квадратной кнопки загрузки при выборе файла в форме добавления
  if (newIconInput) {
    newIconInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const iconLabel = document.querySelector('.add-shortcut-form .btn-square-upload');
      if (file && iconLabel) {
        iconLabel.title = `Выбрана иконка: ${file.name}`;
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
      document.body.style.backgroundImage = 'none'; // По умолчанию черный экран
    }
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

  // --- ЭКСПОРТ И СТАБИЛЬНЫЙ ИМПОРТ НАСТРОЕК (JSON-БЭКАП) ---
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

          // Безопасный разбор ключей с жесткими дефолтными значениями (?? оператор)
          const shortcuts = Array.isArray(data.shortcuts) ? data.shortcuts : DEFAULT_SHORTCUTS;
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

          const cleanedData = {
            shortcuts,
            columns,
            size,
            format12h,
            showSeconds,
            showDate,
            customBackground
          };

          storage.clearAndSet(cleanedData, () => {
            window.location.reload(); // Жесткий перезапуск страницы
          });

        } catch (err) {
          alert('Ошибка при импорте. Убедитесь, что выбран правильный файл резервной копии JSON.');
          importFileInput.value = '';
        }
      };

      reader.onerror = () => {
        alert('Ошибка при чтении файла бэкапа.');
        importFileInput.value = '';
      };

      reader.readAsText(file);
    });
  }

  // --- ФУНКЦИИ ОБРАБОТКИ ДАННЫХ И ОТРИСОВКИ ---

  function loadState() {
    storage.get(['shortcuts', 'columns', 'size', 'customBackground', 'showDate', 'format12h', 'showSeconds'], (result) => {
      // Инициализация состояний с защитой nullish-coalescing от пустых значений undefined
      STATE.shortcuts = result.shortcuts ?? DEFAULT_SHORTCUTS;
      STATE.columns = result.columns ?? 10;
      STATE.size = result.size ?? "small"; // "small" (ныне 85x85px) является базовым по умолчанию
      STATE.customBackground = result.customBackground ?? null;
      STATE.showDate = result.showDate ?? true;
      STATE.format12h = result.format12h ?? false;
      STATE.showSeconds = result.showSeconds ?? false;

      if (sizeSelect) sizeSelect.value = STATE.size;
      if (columnsSelect) columnsSelect.value = STATE.columns;

      if (showDateCb) showDateCb.checked = STATE.showDate;
      if (timeFormatCb) timeFormatCb.checked = STATE.format12h;
      if (showSecondsCb) showSecondsCb.checked = STATE.showSeconds;

      applyBackground();
      updateClockAndDate();
      renderShortcuts();
    });
  }

  function saveState() {
    storage.set({
      shortcuts: STATE.shortcuts,
      columns: STATE.columns,
      size: STATE.size,
      customBackground: STATE.customBackground,
      showDate: STATE.showDate,
      format12h: STATE.format12h,
      showSeconds: STATE.showSeconds
    });
  }

  // Вспомогательная сортировка в массиве
  function moveShortcut(fromIndex, toIndex) {
    const [movedItem] = STATE.shortcuts.splice(fromIndex, 1);
    STATE.shortcuts.splice(toIndex, 0, movedItem);
    saveState();
    renderShortcuts();
    renderModalShortcutsList();
  }

  // Скроллинг правого контейнера у границ при перетаскивании
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

  // Отрисовка ярлыков на главном экране
  const container = document.getElementById('shortcuts-container');
  
  function renderShortcuts() {
    if (!container) return;
    container.innerHTML = '';

    // Сбалансированная и измененная сетка размеров
    let itemWidth = 85; 
    if (STATE.size === "small") itemWidth = 85;
    if (STATE.size === "medium") itemWidth = 98;
    if (STATE.size === "large") itemWidth = 110;

    const gap = 16;
    const maxColumns = STATE.columns;
    const actualColumns = Math.min(STATE.shortcuts.length, maxColumns);
    
    const containerMaxWidth = (itemWidth * actualColumns) + (gap * (actualColumns - 1));
    container.style.maxWidth = `${containerMaxWidth}px`;

    STATE.shortcuts.forEach((item) => {
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

      // Прямой вывод через <img> с приоритетом кастомной загруженной вручную иконки
      img.src = item.customIcon || `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;

      // Дефолтная заглушка при ошибке загрузки стандартного API
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

  // Список ярлыков в модальном окне
  const modalList = document.getElementById('modal-shortcuts-list');

  function renderModalShortcutsList() {
    if (!modalList) return;
    modalList.innerHTML = '';

    if (STATE.shortcuts.length === 0) {
      modalList.innerHTML = '<div style="color: rgba(255,255,255,0.3); font-size: 11px; text-align: center; padding: 12px;">Список ярлыков пуст</div>';
      return;
    }

    STATE.shortcuts.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'modal-shortcut-item';

      if (editingIndex === index) {
        // --- РЕЖИМ ИНЛАЙН-РЕДАКТИРОВАНИЯ ---
        row.setAttribute('draggable', false);

        const editContainer = document.createElement('div');
        editContainer.className = 'modal-shortcut-edit-container';

        const fieldsWrapper = document.createElement('div');
        fieldsWrapper.className = 'inline-edit-fields';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = item.name;
        nameInput.className = 'settings-input inline-input';
        nameInput.placeholder = 'Название';

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = item.url;
        urlInput.className = 'settings-input inline-input';
        urlInput.placeholder = 'Ссылка URL';

        fieldsWrapper.appendChild(nameInput);
        fieldsWrapper.appendChild(urlInput);

        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'inline-edit-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-inline-cancel';
        cancelBtn.textContent = 'Отмена';
        cancelBtn.addEventListener('click', () => {
          editingIndex = -1;
          renderModalShortcutsList();
        });

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-inline-save';
        saveBtn.textContent = 'Сохранить';

        // Компактный скрытый инпут и квадратная кнопка для изменения иконки ярлыка
        const inlineIconInput = document.createElement('input');
        inlineIconInput.type = 'file';
        inlineIconInput.accept = 'image/*';
        inlineIconInput.style.display = 'none';
        inlineIconInput.id = `edit-shortcut-icon-file-${index}`;

        const inlineIconLabel = document.createElement('label');
        inlineIconLabel.htmlFor = `edit-shortcut-icon-file-${index}`;
        inlineIconLabel.className = 'btn-square-upload';
        inlineIconLabel.title = 'Обновить иконку (опционально)';

        const uploadImg = document.createElement('img');
        uploadImg.src = 'upload-icon.png';
        uploadImg.alt = 'Upload';

        inlineIconLabel.appendChild(uploadImg);
        inlineIconLabel.appendChild(inlineIconInput);

        // Индикатор выбора файла в режиме редактирования
        inlineIconInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            inlineIconLabel.title = `Выбрана иконка: ${file.name}`;
            inlineIconLabel.style.borderColor = 'rgba(255, 255, 255, 0.3)'; // Подсвечиваем рамку при выборе
          }
        });

        // Добавляем все элементы управления в строку действий
        actionsWrapper.appendChild(cancelBtn);
        actionsWrapper.appendChild(saveBtn);
        actionsWrapper.appendChild(inlineIconLabel); // Квадратная кнопка теперь стоит в ряду с Сохранить/Отмена

        saveBtn.addEventListener('click', () => {
          const newName = nameInput.value.trim();
          let newUrl = urlInput.value.trim();

          if (newName && newUrl) {
            if (!/^https?:\/\//i.test(newUrl)) {
              newUrl = 'https://' + newUrl;
            }

            const file = inlineIconInput.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                STATE.shortcuts[index] = { name: newName, url: newUrl, customIcon: event.target.result };
                saveState();
                editingIndex = -1;
                renderShortcuts();
                renderModalShortcutsList();
              };
              reader.readAsDataURL(file);
            } else {
              // Если файл не выбран, сохраняем существующую иконку (или null)
              const existingIcon = STATE.shortcuts[index].customIcon || null;
              STATE.shortcuts[index] = { name: newName, url: newUrl, customIcon: existingIcon };
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
        // --- СТАНДАРТНЫЙ РЕЖИМ ОТОБРАЖЕНИЯ (С Drag & Drop) ---
        row.setAttribute('draggable', true);
        row.dataset.index = index;

        row.addEventListener('dragstart', (e) => {
          dragSrcIndex = index;
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
          
          const targetIndex = parseInt(row.dataset.index, 10);
          if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
            moveShortcut(dragSrcIndex, targetIndex);
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
        editBtn.textContent = 'Редактировать';
        editBtn.addEventListener('click', () => {
          editingIndex = index;
          renderModalShortcutsList();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-delete';
        deleteBtn.textContent = 'Удалить';
        deleteBtn.addEventListener('click', () => {
          STATE.shortcuts.splice(index, 1);
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

  // Старт инициализации
  loadState();
});