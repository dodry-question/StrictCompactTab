import { WeatherService } from '../services/weather.js';

import { storage } from '../storage/storage.js';

import { STATE } from '../state/store.js';

import { TRANSLATIONS } from '../i18n/translations.js';

// --- РЈРџР РђР’Р›Р•РќРР• РџРћР“РћР”РћР™ ---
if (showWeatherCb) {
  showWeatherCb.addEventListener('change', (e) => {
    STATE.showWeather = /** @type {HTMLInputElement} */ (e.target).checked;
    saveState();
    applyWeatherVisibility();
    
    if (STATE.showWeather) {
      if (STATE.weatherCoords && STATE.weatherCoords.lat !== null) {
        updateWeatherWidget();
      } else if (STATE.weatherCity) {
        handleCityInputChange();
      }
    } else {
      if (weatherInputStatus) weatherInputStatus.textContent = "";
    }
  });
}

if (weatherCityInput) {
  weatherCityInput.addEventListener('input', handleCityInputChange);
}

let geocodeTimeout = null;

function handleCityInputChange() {
  if (!STATE.showWeather) return;

  const cityName = weatherCityInput.value.trim();
  STATE.weatherCity = cityName;
  // Пишем только ключ weatherCity: полный saveState() на каждый символ
  // перезаписывал весь снимок вместе с тяжёлым customBackground (base64 JPEG)
  storage.set({ weatherCity: cityName });

  if (geocodeTimeout) clearTimeout(geocodeTimeout);

  if (!cityName) {
    STATE.weatherCoords = { lat: null, lon: null, resolvedName: "" };
    STATE.weatherCache = { temp: "", code: null, desc: "", timestamp: 0 };
    saveState();
    updateWeatherWidget();
    updateStatusText("");
    return;
  }

  updateStatusText("searching");

  geocodeTimeout = setTimeout(() => {
    // Полный снимок — один раз, уже после паузы ввода, перед геокодированием
    saveState();
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=${STATE.language === 'ru' ? 'ru' : 'en'}`;

    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error('Geocoding API error');
        return response.json();
      })
      .then(data => {
        if (!STATE.showWeather) return;
        
        const results = data.results;
        if (results && results.length > 0) {
          const bestMatch = results[0];
          const lat = bestMatch.latitude;
          const lon = bestMatch.longitude;
          
          const name = bestMatch.name;
          const countryCode = bestMatch.country_code ? bestMatch.country_code.toUpperCase() : "";
          const admin1 = bestMatch.admin1 || "";
          
          let resolvedName = name;
          if (admin1 && countryCode) {
            resolvedName = `${name} (${admin1}, ${countryCode})`;
          } else if (countryCode) {
            resolvedName = `${name} (${countryCode})`;
          }

          STATE.weatherCoords = {
            lat: lat,
            lon: lon,
            resolvedName: resolvedName
          };
          STATE.weatherCache = { temp: "", code: null, desc: "", timestamp: 0 };
          saveState();

          updateStatusText("success", resolvedName);
          updateWeatherWidget();
        } else {
          STATE.weatherCoords = { lat: null, lon: null, resolvedName: "" };
          STATE.weatherCache = { temp: "", code: null, desc: "", timestamp: 0 };
          saveState();
          updateStatusText("notfound");
          updateWeatherWidget();
        }
      })
      .catch(err => {
        console.error(err);
        if (!STATE.showWeather) return;
        updateStatusText("error");
      });
  }, 800);
}

function updateStatusText(status, resolvedName = "") {
  if (!weatherInputStatus) return;
  
  weatherInputStatus.className = "weather-input-status";
  
  const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

  if (status === "searching") {
    weatherInputStatus.classList.add("status-searching");
    weatherInputStatus.textContent = dict.weatherStatusSearching || "Searching...";
  } else if (status === "success") {
    weatherInputStatus.classList.add("status-success");
    weatherInputStatus.textContent = `${dict.weatherStatusFound || "Found"}: ${resolvedName}`;
  } else if (status === "notfound") {
    weatherInputStatus.classList.add("status-error");
    weatherInputStatus.textContent = dict.weatherStatusNotFound || "City not found";
  } else if (status === "error") {
    weatherInputStatus.classList.add("status-error");
    weatherInputStatus.textContent = dict.weatherStatusError || "Error loading weather";
  } else {
    weatherInputStatus.textContent = "";
  }
}

function applyWeatherVisibility() {
  if (STATE.showWeather) {
    if (weatherWidget) weatherWidget.style.display = 'flex';
    if (weatherSubsettings) weatherSubsettings.style.display = 'flex';
  } else {
    if (weatherWidget) weatherWidget.style.display = 'none';
    if (weatherSubsettings) weatherSubsettings.style.display = 'none';
  }

  renderTopbar();
}

function updateWeatherWidget() {
  if (!STATE.showWeather) {
    return;
  }

  const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en;

  if (!STATE.weatherCoords || STATE.weatherCoords.lat === null || STATE.weatherCoords.lon === null) {
    if (weatherTemp) weatherTemp.textContent = '--°C';
    if (weatherIcon) weatherIcon.textContent = '❓';
    if (weatherDetails) weatherDetails.textContent = dict.weatherNoCity || 'No city set';
    renderTopbar();
    return;
  }

  const now = Date.now();
  const cacheAge = now - STATE.weatherCache.timestamp;
  if (cacheAge < 1800000 && STATE.weatherCache.temp !== "") {
    renderWeatherFromCache();
    return;
  }

  if (weatherDetails) {
    weatherDetails.textContent = dict.weatherLoading || 'Loading...';
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${STATE.weatherCoords.lat}&longitude=${STATE.weatherCoords.lon}&current_weather=true&timezone=auto`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('Weather API error');
      return response.json();
    })
    .then(data => {
      if (!STATE.showWeather) return;
      const current = data.current_weather;
      if (current) {
        const temp = Math.round(current.temperature) + '°C';
        const code = current.weathercode;
        const desc = getWeatherDescription(code, STATE.language);

        STATE.weatherCache = {
          temp: temp,
          code: code,
          desc: desc,
          timestamp: Date.now()
        };
        saveState();
        renderWeatherFromCache();
      }
    })
    .catch(err => {
      console.error(err);
      if (weatherDetails) {
        weatherDetails.textContent = dict.weatherStatusError || 'Error loading weather';
      }
    });
}

function renderWeatherFromCache() {
  if (weatherTemp) weatherTemp.textContent = STATE.weatherCache.temp;
  if (weatherIcon) weatherIcon.textContent = getWeatherEmoji(STATE.weatherCache.code);
  if (weatherDetails) {
    const desc = getWeatherDescription(STATE.weatherCache.code, STATE.language);
    let cityName = STATE.weatherCoords.resolvedName || STATE.weatherCity;
    if (cityName.includes('(')) {
      cityName = cityName.split('(')[0].trim();
    }
    weatherDetails.textContent = '';
    weatherDetails.appendChild(document.createTextNode(desc));
    weatherDetails.appendChild(document.createElement('br'));
    weatherDetails.appendChild(document.createTextNode(cityName));
  }

  renderTopbar();
}

function getWeatherEmoji(code) {
  return WeatherService.getWeatherEmoji(code);
}

function getWeatherDescription(code, lang) {
  return WeatherService.getWeatherDescription(code, lang);
}

// --- РЈРџР РђР’Р›Р•РќРР• РџРђРџРљРђРњР (Р”Р Р•Р’РћР’РР”РќРђРЇ РР•Р РђР РҐРРЇ) ---
const expandedFolders = new Set();
let draggedId = null;
let justDroppedId = null;

// draggedId/justDroppedId переприсваивают modal-shortcuts и categories-settings
// (draggedId = item.id; justDroppedId = null) — закрыты ACCESSORS, иначе десинк.
Object.defineProperty(window, 'draggedId', {
  get: () => draggedId,
  set: (value) => { draggedId = value; },
  configurable: true
});
Object.defineProperty(window, 'justDroppedId', {
  get: () => justDroppedId,
  set: (value) => { justDroppedId = value; },
  configurable: true
});
// Мосты функций для потребителей (clock-topbar, settings-panel, state-render) —
// уберём в фазе 3 шага «в».
window.getWeatherDescription = getWeatherDescription;
window.updateStatusText = updateStatusText;
window.updateWeatherWidget = updateWeatherWidget;
window.handleCityInputChange = handleCityInputChange;
window.applyWeatherVisibility = applyWeatherVisibility;
export {
  handleCityInputChange,
  updateStatusText,
  applyWeatherVisibility,
  updateWeatherWidget,
  renderWeatherFromCache,
  getWeatherEmoji,
  getWeatherDescription,
  expandedFolders,
  draggedId,
  justDroppedId
};

