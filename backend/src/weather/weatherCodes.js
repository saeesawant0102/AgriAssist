/**
 * WMO Weather interpretation codes (WW) per Open-Meteo & Section 13.1.
 */
export const WEATHER_CODE_MAP = {
  0: { condition: 'Clear sky', forecast: 'Clear sky' },
  1: { condition: 'Mainly clear', forecast: 'Mainly clear' },
  2: { condition: 'Partly cloudy', forecast: 'Partly cloudy' },
  3: { condition: 'Overcast', forecast: 'Overcast' },
  45: { condition: 'Fog', forecast: 'Fog' },
  48: { condition: 'Depositing rime fog', forecast: 'Depositing rime fog' },
  51: { condition: 'Light drizzle', forecast: 'Drizzle: light intensity' },
  53: { condition: 'Moderate drizzle', forecast: 'Drizzle: moderate intensity' },
  55: { condition: 'Dense drizzle', forecast: 'Drizzle: dense intensity' },
  56: { condition: 'Light freezing drizzle', forecast: 'Freezing drizzle: light' },
  57: { condition: 'Dense freezing drizzle', forecast: 'Freezing drizzle: dense' },
  61: { condition: 'Slight rain', forecast: 'Rain: slight intensity' },
  63: { condition: 'Moderate rain', forecast: 'Rain: moderate intensity' },
  65: { condition: 'Heavy rain', forecast: 'Rain: heavy intensity' },
  66: { condition: 'Light freezing rain', forecast: 'Freezing rain: light' },
  67: { condition: 'Heavy freezing rain', forecast: 'Freezing rain: heavy' },
  71: { condition: 'Slight snowfall', forecast: 'Snowfall: slight intensity' },
  73: { condition: 'Moderate snowfall', forecast: 'Snowfall: moderate intensity' },
  75: { condition: 'Heavy snowfall', forecast: 'Snowfall: heavy intensity' },
  77: { condition: 'Snow grains', forecast: 'Snow grains' },
  80: { condition: 'Slight rain showers', forecast: 'Rain showers: slight' },
  81: { condition: 'Moderate rain showers', forecast: 'Rain showers: moderate' },
  82: { condition: 'Violent rain showers', forecast: 'Rain showers: violent' },
  85: { condition: 'Slight snow showers', forecast: 'Snow showers: slight' },
  86: { condition: 'Heavy snow showers', forecast: 'Snow showers: heavy' },
  95: { condition: 'Thunderstorm', forecast: 'Thunderstorm: slight or moderate' },
  96: { condition: 'Thunderstorm with hail', forecast: 'Thunderstorm with slight hail' },
  99: { condition: 'Thunderstorm with hail', forecast: 'Thunderstorm with heavy hail' },
};

/**
 * Returns human-readable weather condition for given WMO code.
 * @param {number} code
 * @returns {string}
 */
export function getWeatherCondition(code) {
  return WEATHER_CODE_MAP[code]?.condition || 'Unknown';
}

/**
 * Returns human-readable weather forecast description for given WMO code.
 * @param {number} code
 * @returns {string}
 */
export function getWeatherForecast(code) {
  return WEATHER_CODE_MAP[code]?.forecast || 'Unknown';
}
