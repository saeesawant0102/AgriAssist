import { WeatherService } from '../../src/weather/WeatherService.js';

export class FakeWeatherService extends WeatherService {
  constructor() {
    super();
    this.currentData = {
      date: '2026-04-15',
      temperature: 24.5,
      temperature_max: 30.0,
      temperature_min: 19.0,
      humidity: 65.0,
      rainfall: 0.0,
      rainfall_probability: 10,
      wind_speed: 12.0,
      weather_code: 1,
      condition: 'Mainly clear',
      forecast: 'Mainly clear',
    };
    this.forecastData = [];
    this.failWeather = false;
  }

  async fetchWeather(_lat, _lon) {
    if (this.failWeather) {
      throw new Error('FakeWeatherService upstream failure');
    }
    return { ...this.currentData };
  }

  async fetchForecast(_lat, _lon, days = 7) {
    if (this.failWeather) {
      throw new Error('FakeWeatherService upstream failure');
    }
    if (this.forecastData.length > 0) {
      return this.forecastData.slice(0, days);
    }
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.UTC(2026, 3, 15 + i)).toISOString().split('T')[0];
      result.push({
        date,
        temperature: 25.0,
        temperature_max: 31.0,
        temperature_min: 19.0,
        humidity: 60.0,
        rainfall: 0.0,
        rainfall_probability: 10,
        wind_speed: 10.0,
        weather_code: 0,
        condition: 'Clear sky',
        forecast: 'Clear sky',
      });
    }
    return result;
  }
}
