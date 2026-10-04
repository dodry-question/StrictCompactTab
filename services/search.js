const SearchService = {
  getBaseUrl(searchEngine, customSearchEngines) {
    const engines = {
      google: "https://www.google.com/search?q=",
      yandex: "https://yandex.ru/search/?text=",
      brave: "https://search.brave.com/search?q=",
      duckduckgo: "https://duckduckgo.com/?q=",
      qwant: "https://www.qwant.com/?q=",
      bing: "https://www.bing.com/search?q=",
      startpage: "https://www.startpage.com/do/search?q="
    };

    let baseUrl = engines[searchEngine];
    if (!baseUrl && searchEngine && searchEngine.startsWith('custom_')) {
      const customEng = Array.isArray(customSearchEngines)
        ? customSearchEngines.find(eng => eng.id === searchEngine)
        : null;
      if (customEng) {
        baseUrl = customEng.queryUrl;
      }
    }

    return baseUrl || engines.duckduckgo;
  },

  buildSearchUrl(query, searchEngine, customSearchEngines) {
    const baseUrl = this.getBaseUrl(searchEngine, customSearchEngines);
    return baseUrl + encodeURIComponent(query);
  }
};

// Мост для классических app/* — уберём в фазе 3 шага «в».
window.SearchService = SearchService;
export { SearchService };
