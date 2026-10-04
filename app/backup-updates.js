import { TRANSLATIONS } from '../i18n/translations.js';

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

// --- Р­РљРЎРџРћР Рў Р РРњРџРћР Рў РќРђРЎРўР РћР•Рљ (JSON-Р‘Р­РљРђРџ) ---
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
    const file = /** @type {HTMLInputElement} */ (e.target).files[0];
    if (!file) {
      importFileInput.value = '';
      return;
    }

    // Файл-гигант отклоняем ДО чтения: JSON.parse на сотнях мегабайтов
    // намертво заморозил бы вкладку
    if (file.size > window.BackupValidate.MAX_FILE_BYTES) {
      const dictTooLarge = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
      alert(dictTooLarge.importTooLarge);
      importFileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        // Очистка от BOM-символов (\uFEFF) и лишних пробелов
        const fr = /** @type {FileReader} */ (event.target);
        const cleanText = /** @type {string} */ (fr.result).trim().replace(/^\uFEFF/, '');
        const data = JSON.parse(cleanText);

        // Единая санитизация бэкапа (см. app/backup-validate.js): каждое поле
        // приводится к известному типу и диапазону, чужие ключи отбрасываются,
        // небезопасные ссылки (javascript: и т.п.) удаляются вместе с ярлыком.
        // При отказе хранилище НЕ стирается — старые настройки остаются целы.
        const result = window.BackupValidate.sanitize(data);
        if (!result.ok) {
          console.error('Import rejected:', result.reason);
          const dictInvalid = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
          alert(dictInvalid.importInvalid);
          importFileInput.value = '';
          return;
        }

        // Сохраняем в localStorage / Chrome Storage
        storage.clearAndSet(result.value, () => {
          const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru;
          alert(dict.importSuccess);
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
  const lastCheck = Number(localStorage.getItem('lastUpdateCheck')) || 0;
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
        localStorage.setItem('lastUpdateCheck', String(now));
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

// Мосты ТОЛЬКО для того, что читают классические app/* и тесты
// (mist-toggles, state-render, probe'buildBackupPayload') — уберём в фазе 3
// шага «в», когда потребители перейдут на import.
window.buildBackupPayload = buildBackupPayload;
window.checkForUpdates = checkForUpdates;
export {
  buildBackupPayload,
  isNewerVersion,
  checkForUpdates,
  getExtensionVersion,
  handleUpdateResult
};

