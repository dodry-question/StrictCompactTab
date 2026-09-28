window.ShortcutRenderer = {
  renderCategoryTabs(element, tabs, activeCategory, onSelect) {
    if (!element) return;

    if (tabs.length <= 1) {
      element.innerHTML = '';
      element.style.display = 'none';
      return;
    }

    const existing = Array.from(element.querySelectorAll('.mist-tab'));
    const sameSet = existing.length === tabs.length &&
      existing.every((button, index) => button.dataset.tabId === tabs[index].id);

    if (!sameSet) {
      element.innerHTML = '';
      const fragment = document.createDocumentFragment();

      tabs.forEach((tab, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mist-tab';
        button.textContent = tab.name;
        button.dataset.tabId = tab.id;
        button.setAttribute('role', 'tab');
        button.addEventListener('click', () => onSelect(tab.id, index, true));
        fragment.appendChild(button);
      });

      element.appendChild(fragment);
    } else {
      existing.forEach((button, index) => {
        button.textContent = tabs[index].name;
      });
    }

    element.style.display = 'flex';
    element.setAttribute('role', 'tablist');

    element.querySelectorAll('.mist-tab').forEach(button => {
      const isActive = button.dataset.tabId === activeCategory;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
    });
  },

  appendClassicCards(items, size, container) {
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      if (!item || item.isFolder) return;

      const card = document.createElement('a');
      card.href = item.url;
      card.className = `shortcut-card size-${size}`;
      card.title = item.name;
      card.dataset.id = item.id;

      const img = document.createElement('img');
      img.className = 'shortcut-icon';
      img.alt = '';

      let hostname = '';
      try { hostname = new URL(item.url).hostname; } catch (e) { hostname = item.url; }
      img.src = item.customIcon || `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;

      img.onerror = () => {
        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>';
      };

      const span = document.createElement('span');
      span.className = 'shortcut-label';
      span.textContent = item.name;

      card.appendChild(img);
      card.appendChild(span);
      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }
};
