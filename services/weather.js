const WeatherService = {
  async fetchForecast(latitude, longitude) {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
      hourly: 'temperature_2m,precipitation_probability,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      forecast_days: '5',
      timezone: 'auto',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      precipitation_unit: 'mm'
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`Open-Meteo forecast request failed: ${response.status}`);
    return response.json();
  },

  getWeatherEmoji(code) {
    if (code === 0) return '☀️';
    if (code === 1) return '🌤️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code === 45 || code === 48) return '🌫️';
    if ([51, 53, 55, 56, 57].includes(code)) return '🌧️';
    if ([61, 63, 65, 66, 67].includes(code)) return '🌧️';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
    if ([80, 81, 82].includes(code)) return '🌦️';
    if ([95, 96, 99].includes(code)) return '⛈️';
    return '⛅';
  },

  getWeatherDescription(code, lang) {
    const isRu = lang === 'ru';
    if (code === 0) return isRu ? 'Ясно' : 'Clear';
    if (code === 1) return isRu ? 'Преимущественно ясно' : 'Mainly clear';
    if (code === 2) return isRu ? 'Переменная облачность' : 'Partly cloudy';
    if (code === 3) return isRu ? 'Пасмурно' : 'Overcast';
    if (code === 45 || code === 48) return isRu ? 'Туман' : 'Fog';
    if ([51, 53, 55].includes(code)) return isRu ? 'Морось' : 'Drizzle';
    if ([61, 63, 65].includes(code)) return isRu ? 'Дождь' : 'Rain';
    if ([66, 67].includes(code)) return isRu ? 'Ледяной дождь' : 'Freezing rain';
    if ([71, 73, 75].includes(code)) return isRu ? 'Снегопад' : 'Snowfall';
    if (code === 77) return isRu ? 'Снежная крупа' : 'Snow grains';
    if ([80, 81, 82].includes(code)) return isRu ? 'Ливень' : 'Rain showers';
    if ([85, 86].includes(code)) return isRu ? 'Снежный ливень' : 'Snow showers';
    if ([95, 96, 99].includes(code)) return isRu ? 'Гроза' : 'Thunderstorm';
    return isRu ? 'Умеренно' : 'Moderate';
  }
};

export { WeatherService };
