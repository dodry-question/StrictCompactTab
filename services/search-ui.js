const SearchUI = {
  initCustomSearchEngines(state, translations, actions) {
    const toggleBtn = document.getElementById('btn-toggle-custom-engines');
    const panel = document.getElementById('custom-engines-panel');
    const form = /** @type {HTMLFormElement} */ (document.getElementById('add-custom-engine-form'));
    const nameInput = /** @type {HTMLInputElement} */ (document.getElementById('custom-engine-name'));
    const queryInput = /** @type {HTMLInputElement} */ (document.getElementById('custom-engine-query'));
    const fileInput = /** @type {HTMLInputElement} */ (document.getElementById('custom-engine-logo-file'));
    const statusText = document.getElementById('custom-engine-logo-status');

    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        if (panel.style.display === 'none') {
          panel.style.display = 'flex';
          actions.renderCustomSearchEngines();
        } else {
          panel.style.display = 'none';
        }
      });
    }

    if (fileInput && statusText) {
      fileInput.addEventListener('change', (e) => {
        const file = /** @type {HTMLInputElement} */ (e.target).files[0];
        if (file) {
          // fallback на en: в чужом/старом языковом пакете ключа может не быть
          const dict = translations[state.language] || translations.en;
          statusText.textContent = dict.logoLoadedStatus || 'Selected';
          statusText.style.color = '#4caf50';
        } else {
          statusText.textContent = '';
        }
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        let queryUrl = queryInput.value.trim();

        if (name && queryUrl) {
          if (!/^https?:\/\//i.test(queryUrl)) {
            queryUrl = 'https://' + queryUrl;
          }

          const newId = 'custom_' + Date.now();

          const saveEngine = (logo) => {
            if (!state.customSearchEngines) state.customSearchEngines = [];
            state.customSearchEngines.push({
              id: newId,
              name,
              queryUrl,
              logo
            });
            actions.saveState();
            actions.populateSearchEnginesSelect();
            actions.renderCustomSearchEngines();

            form.reset();
            if (statusText) statusText.textContent = '';
          };

          const file = fileInput ? fileInput.files[0] : null;
          if (file) {
            actions.compressImage(file, 64, 64, 0.85, (result) => {
              saveEngine(result);
            });
          } else {
            saveEngine(null);
          }
        }
      });
    }
  },

  renderCustomSearchEngines(state, actions) {
    const list = document.getElementById('custom-engines-list');
    if (!list) return;
    list.innerHTML = '';

    if (!state.customSearchEngines || state.customSearchEngines.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.fontSize = '0.8rem';
      emptyMsg.style.opacity = '0.6';
      emptyMsg.style.padding = '4px 0';
      emptyMsg.textContent = state.language === 'ru' ? 'Нет пользовательских поисковиков' : 'No custom search engines';
      list.appendChild(emptyMsg);
      return;
    }

    state.customSearchEngines.forEach(eng => {
      const item = document.createElement('div');
      item.className = 'custom-engine-item';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';
      item.style.padding = '6px';
      item.style.borderBottom = '1px solid var(--border-color, #444)';
      item.style.gap = '8px';

      const leftPart = document.createElement('div');
      leftPart.style.display = 'flex';
      leftPart.style.alignItems = 'center';
      leftPart.style.gap = '8px';
      leftPart.style.overflow = 'hidden';

      const logoImg = document.createElement('img');
      logoImg.src = eng.logo || 'assets/favicon.png';
      logoImg.style.width = '16px';
      logoImg.style.height = '16px';
      logoImg.style.objectFit = 'contain';

      const details = document.createElement('div');
      details.style.overflow = 'hidden';
      details.style.textOverflow = 'ellipsis';
      details.style.whiteSpace = 'nowrap';

      const name = document.createElement('div');
      name.style.fontWeight = '600';
      name.style.fontSize = '0.8rem';
      name.textContent = eng.name;

      const url = document.createElement('div');
      url.style.fontSize = '0.7rem';
      url.style.opacity = '0.5';
      url.style.overflow = 'hidden';
      url.style.textOverflow = 'ellipsis';
      url.textContent = eng.queryUrl;

      details.appendChild(name);
      details.appendChild(url);
      leftPart.appendChild(logoImg);
      leftPart.appendChild(details);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger-action';
      deleteBtn.style.padding = '2px 6px';
      deleteBtn.style.fontSize = '0.75rem';
      deleteBtn.textContent = state.language === 'ru' ? 'Удалить' : 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (state.searchEngine === eng.id) {
          state.searchEngine = 'duckduckgo';
        }
        state.customSearchEngines = state.customSearchEngines.filter(e => e.id !== eng.id);
        actions.saveState();
        actions.populateSearchEnginesSelect();
        actions.updateSearchEngineUI();
        actions.renderCustomSearchEngines();
      });

      item.appendChild(leftPart);
      item.appendChild(deleteBtn);
      list.appendChild(item);
    });
  },

  populateSearchEnginesSelect(state, saveState) {
    const select = /** @type {HTMLSelectElement} */ (document.getElementById('search-engine-select'));
    if (!select) return;

    const currentVal = state.searchEngine;
    select.innerHTML = '';

    const defaultEngines = [
      { id: 'duckduckgo', name: 'DuckDuckGo' },
      { id: 'yandex', name: 'Yandex' },
      { id: 'google', name: 'Google' },
      { id: 'brave', name: 'Brave' },
      { id: 'bing', name: 'Bing' },
      { id: 'qwant', name: 'Qwant' },
      { id: 'startpage', name: 'Startpage' }
    ];

    defaultEngines.forEach(eng => {
      const opt = document.createElement('option');
      opt.value = eng.id;
      opt.textContent = eng.name;
      select.appendChild(opt);
    });

    if (state.customSearchEngines && Array.isArray(state.customSearchEngines)) {
      state.customSearchEngines.forEach(eng => {
        const opt = document.createElement('option');
        opt.value = eng.id;
        opt.textContent = eng.name;
        select.appendChild(opt);
      });
    }

    select.value = currentVal;

    if (select.selectedIndex === -1) {
      select.value = 'duckduckgo';
      state.searchEngine = 'duckduckgo';
      saveState();
    }
  },

  updateSearchEngineUI(state) {
    const select = /** @type {HTMLSelectElement} */ (document.getElementById('search-engine-select'));
    if (select) {
      select.value = state.searchEngine;
    }

    let logoSrc = 'assets/search_' + state.searchEngine + '.png';
    let isCustom = false;
    let customLogo = null;

    if (state.searchEngine && state.searchEngine.startsWith('custom_')) {
      const customEng = state.customSearchEngines ? state.customSearchEngines.find(e => e.id === state.searchEngine) : null;
      if (customEng) {
        isCustom = true;
        customLogo = customEng.logo || 'assets/favicon.png';
      }
    }

    const logo = /** @type {HTMLImageElement} */ (document.getElementById('search-engine-logo'));
    if (logo) {
      logo.src = isCustom ? customLogo : logoSrc;
      if (state.searchEngine === 'brave') {
        logo.classList.add('inverted');
      } else {
        logo.classList.remove('inverted');
      }
    }

    const settingsSearchLogo = /** @type {HTMLImageElement} */ (document.getElementById('settings-search-logo'));
    if (settingsSearchLogo) {
      settingsSearchLogo.src = isCustom ? customLogo : logoSrc;
      if (state.searchEngine === 'brave') {
        settingsSearchLogo.classList.add('inverted');
      } else {
        settingsSearchLogo.classList.remove('inverted');
      }
    }
  }
};

export { SearchUI };
