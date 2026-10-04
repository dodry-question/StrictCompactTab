import { WeatherService } from './weather.js';

const WeatherDrawer = {
  init(state, translations) {
    const trigger = document.getElementById('weather-widget');
    const topbar = document.getElementById('mist-topbar');
    const backdrop = document.getElementById('weather-drawer-backdrop');
    const drawer = document.getElementById('weather-drawer');
    const closeButton = document.getElementById('weather-drawer-close');
    const title = document.getElementById('weather-drawer-title');
    const city = document.getElementById('weather-drawer-city');
    const content = document.getElementById('weather-drawer-content');
    let cachedForecast = null;
    let returnFocus = null;

    if (!trigger || !backdrop || !drawer || !closeButton || !title || !city || !content) return null;

    const getDictionary = () => translations[state.language] || translations.en;
    const getCityName = () => (state.weatherCoords && state.weatherCoords.resolvedName) || state.weatherCity || '';

    const appendText = (parent, tagName, className, text) => {
      const element = document.createElement(tagName);
      if (className) element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    };

    const formatHour = (value) => value.slice(11, 16);

    const formatDay = (value, index, dict) => {
      if (index === 0) return dict.weatherToday;
      return new Intl.DateTimeFormat(
        state.language === 'ru' ? 'ru-RU' : 'en-US',
        { weekday: 'short', day: 'numeric', month: 'short' }
      ).format(new Date(`${value}T12:00:00`));
    };

    const showMessage = (message, type) => {
      content.replaceChildren();
      appendText(content, 'p', `weather-drawer-message${type ? ` is-${type}` : ''}`, message);
    };

    const renderForecast = (data) => {
      const dict = getDictionary();
      const current = data.current;
      const hourly = data.hourly;
      const daily = data.daily;
      content.replaceChildren();

      title.textContent = dict.weatherForecastTitle;
      city.textContent = getCityName();

      if (current) {
        const currentSection = document.createElement('section');
        currentSection.className = 'weather-current';
        currentSection.setAttribute('aria-label', dict.weatherForecastCurrent);

        const hero = document.createElement('div');
        hero.className = 'weather-current-hero';
        appendText(hero, 'span', 'weather-current-icon', WeatherService.getWeatherEmoji(current.weather_code));
        const summary = document.createElement('div');
        summary.className = 'weather-current-summary';
        appendText(summary, 'strong', 'weather-current-temperature', `${Math.round(current.temperature_2m)}°`);
        appendText(summary, 'span', 'weather-current-description', WeatherService.getWeatherDescription(current.weather_code, state.language));
        hero.appendChild(summary);
        currentSection.appendChild(hero);

        const stats = document.createElement('div');
        stats.className = 'weather-current-stats';
        [
          [dict.weatherFeelsLike, `${Math.round(current.apparent_temperature)}°`],
          [dict.weatherHumidity, `${Math.round(current.relative_humidity_2m)}%`],
          [dict.weatherWind, `${Math.round(current.wind_speed_10m)} ${dict.weatherWindUnit}`],
          [dict.weatherPrecipitation, `${Math.round(current.precipitation)} ${dict.weatherPrecipitationUnit}`]
        ].forEach(([label, value]) => {
          const stat = document.createElement('div');
          stat.className = 'weather-current-stat';
          appendText(stat, 'span', 'weather-current-stat-label', label);
          appendText(stat, 'strong', 'weather-current-stat-value', value);
          stats.appendChild(stat);
        });
        currentSection.appendChild(stats);
        content.appendChild(currentSection);
      }

      if (hourly && Array.isArray(hourly.time)) {
        const section = document.createElement('section');
        section.className = 'weather-forecast-section';
        appendText(section, 'h3', 'weather-forecast-heading', dict.weatherHourly);
        const list = document.createElement('div');
        list.className = 'weather-hourly-list';
        const now = Date.now();
        const nextHours = hourly.time
          .map((time, index) => ({ time, index }))
          .filter(item => new Date(item.time).getTime() >= now)
          .slice(0, 12);
        nextHours.forEach(({ time, index }) => {
          const item = document.createElement('div');
          item.className = 'weather-hourly-item';
          appendText(item, 'span', 'weather-hourly-time', formatHour(time));
          appendText(item, 'span', 'weather-hourly-icon', WeatherService.getWeatherEmoji(hourly.weather_code[index]));
          appendText(item, 'strong', 'weather-hourly-temperature', `${Math.round(hourly.temperature_2m[index])}°`);
          appendText(item, 'span', 'weather-hourly-precipitation', `${hourly.precipitation_probability[index] ?? 0}%`);
          list.appendChild(item);
        });
        section.appendChild(list);
        content.appendChild(section);
      }

      if (daily && Array.isArray(daily.time)) {
        const section = document.createElement('section');
        section.className = 'weather-forecast-section';
        appendText(section, 'h3', 'weather-forecast-heading', dict.weatherNextDays);
        const list = document.createElement('div');
        list.className = 'weather-daily-list';
        daily.time.slice(0, 5).forEach((day, index) => {
          const item = document.createElement('div');
          item.className = 'weather-daily-item';
          appendText(item, 'span', 'weather-daily-date', formatDay(day, index, dict));
          appendText(item, 'span', 'weather-daily-icon', WeatherService.getWeatherEmoji(daily.weather_code[index]));
          appendText(item, 'span', 'weather-daily-temperatures', `${Math.round(daily.temperature_2m_min[index])}° / ${Math.round(daily.temperature_2m_max[index])}°`);
          appendText(item, 'span', 'weather-daily-precipitation', `${daily.precipitation_probability_max[index] ?? 0}%`);
          list.appendChild(item);
        });
        section.appendChild(list);
        content.appendChild(section);
      }

      appendText(content, 'p', 'weather-data-source', dict.weatherDataSource);
    };

    const close = () => {
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('weather-drawer-open');
      if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') {
        returnFocus.focus();
      }
      returnFocus = null;
    };

    const loadForecast = async () => {
      const coordinates = state.weatherCoords || {};
      const latitude = coordinates.lat;
      const longitude = coordinates.lon;
      const key = `${latitude},${longitude}`;
      const now = Date.now();

      if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
        showMessage(getDictionary().weatherForecastNoCoordinates, 'empty');
        return;
      }

      if (cachedForecast && cachedForecast.key === key && now - cachedForecast.timestamp < 20 * 60 * 1000) {
        renderForecast(cachedForecast.data);
        return;
      }

      showMessage(getDictionary().weatherForecastLoading, 'loading');
      try {
        const data = await WeatherService.fetchForecast(latitude, longitude);
        cachedForecast = { key, timestamp: Date.now(), data };
        renderForecast(data);
      } catch (error) {
        console.error('Weather forecast error:', error);
        showMessage(getDictionary().weatherForecastError, 'error');
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'weather-drawer-retry';
        retry.textContent = getDictionary().weatherForecastRetry;
        retry.addEventListener('click', loadForecast);
        content.appendChild(retry);
      }
    };

    const open = () => {
      returnFocus = document.activeElement;
      const dict = getDictionary();
      title.textContent = dict.weatherForecastTitle;
      closeButton.setAttribute('aria-label', dict.weatherForecastClose);
      closeButton.title = dict.weatherForecastClose;
      city.textContent = getCityName();
      drawer.classList.add('is-open');
      backdrop.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.classList.add('weather-drawer-open');
      closeButton.focus();
      loadForecast();
    };

    const openFromWeather = () => {
      if (document.body.classList.contains('layout-edit-mode')) return;
      open();
    };

    trigger.addEventListener('click', openFromWeather);
    if (topbar) {
      topbar.addEventListener('click', event => {
        if (!/** @type {Element} */ (event.target).closest('.topbar-temp, .topbar-desc')) return;
        openFromWeather();
      });
    }
    closeButton.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    drawer.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('keydown', event => {
      if (!drawer.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.focus();
      }
    });

    return { open, close };
  }
};

export { WeatherDrawer };
