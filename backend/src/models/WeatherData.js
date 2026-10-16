/**
 * WeatherData domain model mapped from Class Diagram and Section 8.
 * Requirement: R3, Weather.Fetch, Weather.Display
 */
export class WeatherData {
  constructor({
    weather_id = null,
    farm_id = null,
    type = 'current',
    date,
    temperature = null,
    temperature_max = null,
    temperature_min = null,
    humidity = null,
    rainfall = null,
    rainfall_probability = null,
    wind_speed = null,
    weather_code = null,
    condition = null,
    forecast = null,
    fetched_at = null,
    stale = false,
  }) {
    this.weather_id = weather_id ? Number(weather_id) : null;
    this.farm_id = farm_id ? Number(farm_id) : null;
    this.type = type;
    this.date = date;
    this.temperature = temperature !== null ? Number(temperature) : null;
    this.temperature_max = temperature_max !== null ? Number(temperature_max) : null;
    this.temperature_min = temperature_min !== null ? Number(temperature_min) : null;
    this.humidity = humidity !== null ? Number(humidity) : null;
    this.rainfall = rainfall !== null ? Number(rainfall) : null;
    this.rainfall_probability = rainfall_probability !== null ? Number(rainfall_probability) : null;
    this.wind_speed = wind_speed !== null ? Number(wind_speed) : null;
    this.weather_code = weather_code !== null ? Number(weather_code) : null;
    this.condition = condition;
    this.forecast = forecast;
    this.fetched_at = fetched_at;
    this.stale = Boolean(stale);
  }

  // Operation from Class Diagram: view_weather
  async viewWeather() {
    return this.toJSON();
  }

  toJSON() {
    const data = {
      weather_id: this.weather_id,
      farm_id: this.farm_id,
      type: this.type,
      date: this.date,
      temperature: this.temperature,
      temperature_max: this.temperature_max,
      temperature_min: this.temperature_min,
      humidity: this.humidity,
      rainfall: this.rainfall,
      rainfall_probability: this.rainfall_probability,
      wind_speed: this.wind_speed,
      weather_code: this.weather_code,
      condition: this.condition,
      forecast: this.forecast,
      fetched_at: this.fetched_at,
    };
    if (this.stale) {
      data.stale = true;
    }
    return data;
  }

  static fromRow(row, extra = {}) {
    if (!row) return null;
    return new WeatherData({
      weather_id: row.weather_id,
      farm_id: row.farm_id,
      type: row.type,
      date: row.date,
      temperature: row.temperature,
      temperature_max: row.temperature_max,
      temperature_min: row.temperature_min,
      humidity: row.humidity,
      rainfall: row.rainfall,
      rainfall_probability: row.rainfall_probability,
      wind_speed: row.wind_speed,
      weather_code: row.weather_code,
      condition: row.condition,
      forecast: row.forecast,
      fetched_at: row.fetched_at,
      stale: extra.stale || false,
    });
  }
}
