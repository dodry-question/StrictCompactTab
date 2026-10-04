import { STATE } from '../state/store.js';

import { formatDateLine, getTopbarCityName } from '../src/utils.js';

// Описание погоды для строки топбара берём у СЕРВИСА напрямую, а не у
// app/weather.js. Так разорван последний цикл: раньше clock-topbar читал
// getWeatherDescription из window (мост, заведённый weather.js), потому что
// weather.js тянул 8 констант clock-topbar на top-level и статический импорт
// clock-topbar → weather оставлял бы weather.js в TDZ. Сервис — общий
// поставщик для обоих, у него нет зависимостей от app/*, поэтому цикл исчез,
// а мост window.getWeatherDescription больше не нужен.
import { WeatherService } from '../services/weather.js';

// --- ЧАСЫ И ДАТА ---
const clockElement = document.getElementById('clock');
const dateElement = document.getElementById('date-display');

// --- ПОГОДА ---
const weatherWidget = document.getElementById('weather-widget');
const weatherTemp = document.getElementById('weather-temp');
const weatherIcon = document.getElementById('weather-icon');
const weatherDetails = document.getElementById('weather-details');
const showWeatherCb = /** @type {HTMLInputElement} */ (document.getElementById('show-weather-checkbox'));
const weatherCityInput = /** @type {HTMLInputElement} */ (document.getElementById('weather-city-input'));
const weatherInputStatus = document.getElementById('weather-input-status');
const weatherSubsettings = document.getElementById('weather-subsettings');

// --- РЕЖИМ MIST (Стеклянный минимализм) ---
const mistTabsEl = document.getElementById('mist-tabs');
const mistPresetSelect = /** @type {HTMLSelectElement} */ (document.getElementById('mist-preset-select'));
const mistPerRowSelect = /** @type {HTMLSelectElement} */ (document.getElementById('mist-per-row-select'));
const mistZenZone = document.getElementById('mist-zen-zone');
// Top Bar: единая строка «дата • температура, описание, город» в верхнем углу
const mistTopbarEl = document.getElementById('mist-topbar');
let activeCategory = 'main';

// --- TOP BAR: дата и погода строго в ОДНУ горизонтальную строку ---
// В центральном режиме (Default Mist / SCT) — верхний левый угол,
// в режиме Mist Left/Split — верхний правый угол (позиция задаётся в CSS)
function renderTopbar() {
  if (!mistTopbarEl) return;

  const showDate = !!(STATE.showClock && STATE.showDate);
  const showWeather = !!(STATE.showWeather &&
    STATE.weatherCoords && STATE.weatherCoords.lat !== null &&
    STATE.weatherCache && STATE.weatherCache.temp);
  const inEditMode = document.body.classList.contains('layout-edit-mode');
  // Режим Mist: дата и день недели показываются строго ПОД часами,
  // поэтому в Top Bar остаётся только погода (правый верхний угол)
  const isMist = document.body.classList.contains('mode-mist');
  const topbarDate = showDate && !isMist;

  const dateLine = showDate ? formatDateLine(STATE) : '';
  const weatherLine = showWeather
    ? `${STATE.weatherCache.temp}|${STATE.weatherCache.code}|${getTopbarCityName(STATE)}`
    : '';

  // Перерисовываем только при реальном изменении содержимого
  const signature = [
    STATE.language, dateLine, weatherLine,
    isMist ? 'mist' : 'std',
    inEditMode ? 'edit' : 'view'
  ].join('::');
  if (mistTopbarEl.dataset.signature === signature) return;
  mistTopbarEl.dataset.signature = signature;

  if (inEditMode || (!topbarDate && !showWeather)) {
    mistTopbarEl.innerHTML = '';
    mistTopbarEl.style.display = 'none';
    document.body.classList.remove('has-topbar');
    return;
  }

  const frag = document.createDocumentFragment();

  if (topbarDate) {
    const dateSpan = document.createElement('span');
    dateSpan.className = 'topbar-part topbar-date';
    dateSpan.textContent = dateLine;
    frag.appendChild(dateSpan);
  }

  if (topbarDate && showWeather) {
    const sep = document.createElement('span');
    sep.className = 'topbar-sep';
    sep.textContent = '•';
    frag.appendChild(sep);
  }

  if (showWeather) {
    const tempSpan = document.createElement('span');
    tempSpan.className = 'topbar-part topbar-temp';
    tempSpan.textContent = STATE.weatherCache.temp;
    frag.appendChild(tempSpan);

    const descSpan = document.createElement('span');
    descSpan.className = 'topbar-part topbar-desc';
    const desc = WeatherService.getWeatherDescription(STATE.weatherCache.code, STATE.language);
    const city = getTopbarCityName(STATE);
    descSpan.textContent = city ? `${desc}, ${city}` : desc;
    frag.appendChild(descSpan);
  }

  mistTopbarEl.innerHTML = '';
  mistTopbarEl.appendChild(frag);
  mistTopbarEl.style.display = 'flex';
  document.body.classList.add('has-topbar');
}

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
  const hoursStr = String(hours).padStart(2, '0');

  let timeString = `${hoursStr}:${minutes}`;
  if (STATE.showSeconds) {
    timeString += `:${seconds}`;
  }

  if (clockElement) {
    if (ampm) {
      // Оборачиваем AM/PM в span с уменьшенным шрифтом для красивого вида и исключения наложений
      clockElement.textContent = timeString;
      const ampmSpan = document.createElement('span');
      ampmSpan.className = 'clock-ampm';
      ampmSpan.textContent = ampm.trim();
      clockElement.appendChild(ampmSpan);
    } else {
      clockElement.textContent = timeString;
    }
  }

  if (dateElement) {
    if (STATE.showDate) {
      dateElement.style.display = 'block';
      dateElement.textContent = formatDateLine(STATE, now);
    } else {
      dateElement.style.display = 'none';
    }
  }

  // Top Bar (дата + погода одной строкой) обновляется вместе с часами
  renderTopbar();
}
setInterval(updateClockAndDate, 1000);
updateClockAndDate();

// activeCategory: запись снаружи (categories-tabs, mist-toggles) — через
// setActiveCategory, чтение — через import (live binding). Фаза 3, часть 3.
// Остальные 14 мостов (mistTabsEl/weather-элементы/renderTopbar/
// updateClockAndDate) сняты — фаза 3, потребители импортируют.
function setActiveCategory(value) { activeCategory = value; }
export {
  clockElement,
  dateElement,
  weatherWidget,
  weatherTemp,
  weatherIcon,
  weatherDetails,
  showWeatherCb,
  weatherCityInput,
  weatherInputStatus,
  weatherSubsettings,
  mistTabsEl,
  mistPresetSelect,
  mistPerRowSelect,
  mistZenZone,
  mistTopbarEl,
  activeCategory,
  setActiveCategory,
  renderTopbar,
  updateClockAndDate
};

