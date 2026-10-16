/**
 * @typedef {Object} CurrentWeatherData
 * @property {string} date
 * @property {number} temperature
 * @property {number} temperature_max
 * @property {number} temperature_min
 * @property {number} humidity
 * @property {number} rainfall
 * @property {number} rainfall_probability
 * @property {number} wind_speed
 * @property {number} weather_code
 * @property {string} condition
 * @property {string} forecast
 */

/**
 * WeatherService contract (base class).
 * Services depend on this contract, never directly on WeatherAPI or Open-Meteo.
 */
export class WeatherService {
  /**
   * Fetches current weather for given coordinates.
   * @param {number} _lat
   * @param {number} _lon
   * @returns {Promise<CurrentWeatherData>}
   */
  async fetchWeather(_lat, _lon) {
    throw new Error('Not implemented: WeatherService.fetchWeather');
  }

  /**
   * Fetches daily forecast for given coordinates.
   * @param {number} _lat
   * @param {number} _lon
   * @param {number} [_days=7]
   * @returns {Promise<CurrentWeatherData[]>}
   */
  async fetchForecast(_lat, _lon, _days = 7) {
    throw new Error('Not implemented: WeatherService.fetchForecast');
  }
}
