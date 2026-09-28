// --- Р’СЃРїРѕРјРѕРіР°С‚РµР»СЊРЅР°СЏ С„СѓРЅРєС†РёСЏ РґР»СЏ РїСЂРѕРІРµСЂРєРё Р±СЂР°СѓР·РµСЂР° Brave ---
async function isBraveBrowser() {
  // РџРµСЂРІРёС‡РЅР°СЏ РїСЂРѕРІРµСЂРєР° С‡РµСЂРµР· API Brave
  if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
    try {
      return await navigator.brave.isBrave();
    } catch (e) {}
  }
  // Р—Р°РїР°СЃРЅР°СЏ РїСЂРѕРІРµСЂРєР° С‡РµСЂРµР· Client Hints (navigator.userAgentData)
  if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
    try {
      const hints = await navigator.userAgentData.getHighEntropyValues(['brands']);
      return hints.brands.some(brand => brand.brand === 'Brave');
    } catch (e) {}
  }
  return false;
}

// --- Р­РљРЎРџРћР Рў Р РРњРџРћР Рў РќРђРЎРўР РћР•Рљ (JSON-Р‘Р­РљРђРџ) ---
// Структурированная экспортная форма: категории со своими ярлыками
// + вложенный список shortcuts (обратно совместим со старыми версиями,
//   которым нужны ключи shortcuts и folders).
function buildBackupPayload(allData) {
  const raw = (allData && typeof allData === 'object') ? allData : {};
  const nested = migrateToNested(
    Array.isArray(raw.shortcuts) ? raw.shortcuts : [],
    extractCategoryMeta(raw)
  );

  const categories = [];
  nested.forEach(item => {
    if (item && item.isFolder) {
      categories.push({
        id: item.id,
        name: item.name,
        items: (item.children || []).slice()
      });
    }
  });

  // Копируем хранилище целиком, но вырезаем то, что не является настройкой:
  // scheduleData — это разобранный .xlsx (сотни КБ, файл расписания живёт
  // отдельно и в бэкап не переносится), служебные ключи проверки обновлений
  // и кэш иконок. Раньше они попадали в JSON, раздувая его в разы.
  const payload = Object.assign({}, raw);
  delete payload.scheduleData;
  delete payload.lastUpdateCheck;
  delete payload.cachedLatestVersion;
  delete payload.shortcutIconCache;

  return Object.assign(payload, {
    format: 'strict-compact-tab-backup',
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    shortcuts: nested,
    categories: categories,
    // Легаси-ключ для старых версий расширения
    folders: categories.map(c => ({ id: c.id, name: c.name }))
  });
}

if (btnExport) {
  btnExport.addEventListener('click', () => {
    storage.getAll(async (allData) => {
      const dataStr = JSON.stringify(buildBackupPayload(allData), null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      // РћР¶РёРґР°РµРј СЂРµР·СѓР»СЊС‚Р°С‚ РїСЂРѕРІРµСЂРєРё РЅР° Brave
      const isBrave = await isBraveBrowser();
      const exportFileName = isBrave ? 'brave_new_tab_backup.json' : 'strict_compact_tab_backup.json';
      
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
        // РћС‡РёСЃС‚РєР° РѕС‚ BOM-СЃРёРјРІРѕР»РѕРІ (\uFEFF) Рё Р»РёС€РЅРёС… РїСЂРѕР±РµР»РѕРІ
        const cleanText = event.target.result.trim().replace(/^\uFEFF/, '');
        const data = JSON.parse(cleanText);

        if (!data) {
          throw new Error("Invalid backup format: parsed data is null or empty");
        }

        let shortcuts = [];
        let columns = 10;
        let size = 'small';
        let format12h = false;
        let showSeconds = false;
        let showDate = true;
        let theme = 'dark';
        let adaptiveThemeData = null;
        let layoutPositions = null;
        let layoutGridSnap = false;
        let layoutGridSize = 20;
        let showClock = true;
        let showWeather = false;
        let weatherCity = '';
        let weatherCoords = { lat: null, lon: null, resolvedName: '' };
        let weatherCache = { temp: '', code: null, desc: '', timestamp: 0 };
        let customBackground = null;
        let customFavicon = null;
        let language = 'en';
        let searchEngine = 'duckduckgo';
        let customSearchEngines = [];
        let checkUpdates = false;
        let layoutZenMode = false;

        // Р•СЃР»Рё РёРјРїРѕСЂС‚РёСЂСѓРµС‚СЃСЏ РїР»РѕСЃРєРёР№ РјР°СЃСЃРёРІ СЏСЂР»С‹РєРѕРІ (СЃС‚Р°СЂС‹Р№ С„РѕСЂРјР°С‚)
        if (Array.isArray(data)) {
          shortcuts = data;
        } else if (typeof data === 'object') {
          // Р•СЃР»Рё РёРјРїРѕСЂС‚РёСЂСѓРµС‚СЃСЏ СЃР»РѕР¶РЅС‹Р№ РѕР±СЉРµРєС‚ РЅР°СЃС‚СЂРѕРµРє (РЅРѕРІС‹Р№ С„РѕСЂРјР°С‚)
          shortcuts = Array.isArray(data.shortcuts) ? data.shortcuts : DEFAULT_SHORTCUTS;
          columns = data.columns ?? 10;
          size = data.size ?? 'small';
          
          if (data.format12h !== undefined && data.format12h !== null) {
            format12h = data.format12h;
          } else if (data.timeFormat === '12h') {
            format12h = true;
          }

          showSeconds = data.showSeconds ?? false;
          showDate = data.showDate ?? true;
          theme = data.theme ?? 'dark';
          if (theme === 'nord') theme = 'dark';
          adaptiveThemeData = data.adaptiveThemeData ?? null;
          layoutPositions = data.layoutPositions ?? null;
          layoutGridSnap = data.layoutGridSnap ?? false;
          layoutGridSize = data.layoutGridSize ?? 20;
          showClock = data.showClock ?? true;
          showWeather = data.showWeather ?? false;
          weatherCity = data.weatherCity ?? '';
          weatherCoords = data.weatherCoords ?? { lat: null, lon: null, resolvedName: '' };
          weatherCache = data.weatherCache ?? { temp: '', code: null, desc: '', timestamp: 0 };
          customBackground = data.customBackground ?? null;
          customFavicon = data.customFavicon ?? null;
          language = data.language ?? 'en';
          // Чужой бэкап может принести несуществующий язык — ограничиваем до известных,
          // иначе все строки UI превращаются в undefined и приложение падает
          if (language !== 'en' && language !== 'ru') language = 'en';
          searchEngine = data.searchEngine ?? 'duckduckgo';
          customSearchEngines = data.customSearchEngines ?? [];
          checkUpdates = data.checkUpdates ?? false;
          layoutZenMode = data.layoutZenMode ?? false;
        } else {
          throw new Error("Invalid backup format: data must be an object or array");
        }

        // РћР±СЏР·Р°С‚РµР»СЊРЅР°СЏ С„РёР»СЊС‚СЂР°С†РёСЏ СЏСЂР»С‹РєРѕРІ (РѕС‚СЃРµРёРІР°РµРј null Рё РЅРµ-РѕР±СЉРµРєС‚С‹)
        shortcuts = shortcuts.filter(s => s && typeof s === 'object');
        
        // Миграция: folders / categories / groups любого прошлого формата
        // автоматически превращаются в текущую структуру категорий
        const categoryMeta = extractCategoryMeta(data);
        const migratedShortcuts = migrateToNested(shortcuts, categoryMeta);

        const cleanedData = {
          shortcuts: migratedShortcuts,
          columns,
          size,
          format12h,
          showSeconds,
          showDate,
          customBackground,
          customFavicon,
          language,
          searchEngine,
          theme,
          adaptiveThemeData,
          layoutPositions,
          layoutGridSnap,
          layoutGridSize,
          showClock,
          showWeather,
          weatherCity,
          weatherCoords,
          weatherCache,
          customSearchEngines,
          checkUpdates,
          layoutZenMode,
          layoutIosMode: data.layoutIosMode ?? false,
          layoutStealthMode: data.layoutStealthMode ?? false,
          layoutMistMode: data.layoutMistMode ?? false,
          mistPreset: data.mistPreset ?? 'center',
          mistPerRow: data.mistPerRow ?? 6,
          mistHeadOffset: normalizeMistWidgets(data.mistHeadOffset),
          // Плагин «Расписание»: галка и выбранная группа — настройки, значит
          // они принадлежат бэкапу. Раньше они терялись при импорте, потому
          // что clearAndSet стирает хранилище целиком.
          // Сам файл расписания (scheduleData) в бэкап не входит: его заново
          // загружают перетаскиванием .xlsx.
          scheduleEnabled: data.scheduleEnabled ?? false,
          scheduleGroup: data.scheduleGroup ?? null
        };

        // Zen и Mist взаимоисключающи. Раньше оба могли оказаться включены
        // (особенно из бэкапа), и такая комбинация расходилась с тем, что
        // потом записывает saveState
        if (cleanedData.layoutZenMode) cleanedData.layoutMistMode = false;

        // РЎРѕС…СЂР°РЅСЏРµРј РІ localStorage / Chrome Storage
        storage.clearAndSet(cleanedData, () => {
          const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
          alert(dict.importSuccess || "Import successful!");
          window.location.reload();
        });

      } catch (err) {
        console.error("Import error details:", err);
        const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
        alert(dict.importError);
        importFileInput.value = '';
      }
    };

    reader.onerror = () => {
      const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
      alert(dict.importReadError);
      importFileInput.value = '';
    };

    reader.readAsText(file);
  });
}

function isNewerVersion(current, latest) {
  const parse = v => v.replace(/^v/, '').replace(/[^0-9.]/g, '').split('.').map(Number);
  const currParts = parse(current);
  const latParts = parse(latest);
  for (let i = 0; i < Math.max(currParts.length, latParts.length); i++) {
    const c = currParts[i] || 0;
    const l = latParts[i] || 0;
    if (l > c) return true;
    if (c > l) return false;
  }
  return false;
}

function checkForUpdates() {
  if (!STATE.checkUpdates) return;
  
  const now = Date.now();
  const lastCheck = localStorage.getItem('lastUpdateCheck') || 0;
  const cachedVersion = localStorage.getItem('cachedLatestVersion');
  
  // РљСЌС€ РЅР° 1 С‡Р°СЃ РґР»СЏ РїСЂРµРґРѕС‚РІСЂР°С‰РµРЅРёСЏ Р»РёРјРёС‚РѕРІ Р·Р°РїСЂРѕСЃРѕРІ GitHub API
  if (now - lastCheck < 3600000 && cachedVersion) {
    handleUpdateResult(cachedVersion);
    return;
  }
  
  fetch('https://api.github.com/repos/dodry-question/StrictCompactTab/releases/latest')
    .then(res => {
      if (!res.ok) throw new Error("GitHub API error");
      return res.json();
    })
    .then(data => {
      if (data && data.tag_name) {
        localStorage.setItem('lastUpdateCheck', now);
        localStorage.setItem('cachedLatestVersion', data.tag_name);
        handleUpdateResult(data.tag_name);
      }
    })
    .catch(err => console.error("Error checking updates:", err));
}

// Версия расширения: берётся из manifest.json, чтобы не расходиться с ним
// при каждом релизе. Раньше здесь было вписано '1.10.7' — из-за этого баннер
// «новая версия» показывался ВСЕГДА, даже когда обновление уже стояло.
function getExtensionVersion() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime &&
        typeof chrome.runtime.getManifest === 'function') {
      const manifest = chrome.runtime.getManifest();
      if (manifest && manifest.version) return manifest.version;
    }
  } catch (err) {
    // не страница расширения — уходим на запасной вариант
  }
  return '1.11.1';
}

function handleUpdateResult(latestVersion) {
  const currentVersion = getExtensionVersion();
  if (isNewerVersion(currentVersion, latestVersion)) {
    const notification = document.getElementById('update-notification');
    const updateText = document.getElementById('update-text');
    const updateLink = document.getElementById('update-link');
    if (notification && updateText) {
      const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
      updateText.textContent = (dict.updateAvailable || "New version available: ") + latestVersion;
      if (updateLink) {
        updateLink.textContent = dict.updateDownload || "Download";
      }
      notification.style.display = 'flex';
    }
  } else {
    const notification = document.getElementById('update-notification');
    if (notification) notification.style.display = 'none';
  }
}

