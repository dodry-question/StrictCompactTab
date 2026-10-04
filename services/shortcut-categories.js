const ShortcutCategories = {
  getHotkeyIndex(key, categoryCount) {
    const index = key === '0' ? 9 : /^[1-9]$/.test(key) ? Number(key) - 1 : -1;
    return index >= 0 && index < categoryCount ? index : -1;
  },

  getCategories(shortcuts) {
    const topLevel = [];
    const folders = [];
    (shortcuts || []).forEach(item => {
      if (!item) return;
      if (item.isFolder) {
        folders.push(item);
      } else {
        topLevel.push(item);
      }
    });
    return { topLevel, folders };
  },

  buildTabs(shortcuts, language, translations, activeCategory) {
    const { topLevel, folders } = this.getCategories(shortcuts);
    const dict = translations[language] || translations.en;
    const tabs = [];

    if (topLevel.length > 0 || folders.length === 0) {
      tabs.push({ id: 'main', name: dict.mistHomeTab || 'Home', items: topLevel });
    }
    folders.forEach(folder => tabs.push({
      id: folder.id,
      name: folder.name,
      items: (folder.children || []).slice()
    }));

    const nextActiveCategory = tabs.some(tab => tab.id === activeCategory)
      ? activeCategory
      : tabs.length > 0 ? tabs[0].id : 'main';

    return { tabs, activeCategory: nextActiveCategory };
  },

  getActiveTab(tabs, activeCategory) {
    return tabs.find(tab => tab.id === activeCategory) || tabs[0] || null;
  }
};

export { ShortcutCategories };
