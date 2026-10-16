import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { describe, expect, it } from 'vitest';
import { evaluateCropAdvisory } from '../../src/advisory/advisoryRules.js';
import { CropAdvisory } from '../../src/models/CropAdvisory.js';
import { WeatherData } from '../../src/models/WeatherData.js';
import { evaluateWeatherAlerts } from '../../src/weather/alertRules.js';
import { WeatherAPI } from '../../src/weather/WeatherAPI.js';
import { getWeatherCondition, getWeatherForecast } from '../../src/weather/weatherCodes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Weather & Advisory Unit Tests (Feature 4)', () => {
  const sampleOpenMeteoJson = JSON.parse(
    readFileSync(join(__dirname, '../fixtures/open-meteo-forecast.json'), 'utf8')
  );

  describe('Weather.Fetch: WeatherAPI Open-Meteo Mapping', () => {
    it('Weather.Fetch: correctly maps current weather from Open-Meteo payload', () => {
      const api = new WeatherAPI();
      const { current } = api.mapResponse(sampleOpenMeteoJson);

      expect(current.date).toBe('2026-04-15');
      expect(current.temperature).toBe(28.4);
      expect(current.temperature_max).toBe(34.2);
      expect(current.temperature_min).toBe(21.4);
      expect(current.humidity).toBe(58.2);
      expect(current.rainfall).toBe(0.0);
      expect(current.rainfall_probability).toBe(10);
      expect(current.wind_speed).toBe(14.5);
      expect(current.weather_code).toBe(1);
      expect(current.condition).toBe('Mainly clear');
      expect(current.forecast).toBe('Mainly clear');
    });

    it('Weather.Fetch: calculates daily temperature as mean of max and min (1 decimal)', () => {
      const api = new WeatherAPI();
      const { forecast } = api.mapResponse(sampleOpenMeteoJson);

      expect(forecast).toHaveLength(7);
      // Day 0: max 34.2, min 21.4 => (34.2 + 21.4) / 2 = 27.8
      expect(forecast[0].date).toBe('2026-04-15');
      expect(forecast[0].temperature).toBe(27.8);
      expect(forecast[0].temperature_max).toBe(34.2);
      expect(forecast[0].temperature_min).toBe(21.4);
    });

    it('Weather.Fetch: calculates daily humidity as mean of 24 hourly values (1 decimal)', () => {
      const api = new WeatherAPI();
      const { forecast } = api.mapResponse(sampleOpenMeteoJson);

      // Hourly values for 2026-04-15 sum: 60+62+65+68+70+72+75+70+65+60+55+50+48+45+42+40+42+45+50+55+60+62+65+68 = 1394
      // 1394 / 24 = 58.0833... => round1 = 58.1
      expect(forecast[0].humidity).toBe(58.1);
    });

    it('Weather.Fetch: maps WMO weather codes to descriptive condition and forecast', () => {
      expect(getWeatherCondition(0)).toBe('Clear sky');
      expect(getWeatherCondition(95)).toBe('Thunderstorm');
      expect(getWeatherCondition(61)).toBe('Slight rain');
      expect(getWeatherCondition(999)).toBe('Unknown');

      expect(getWeatherForecast(95)).toBe('Thunderstorm: slight or moderate');
    });
  });

  describe('Weather Alert Notification: alertRules.js', () => {
    it('Weather.Alert: triggers HIGH_WIND when wind_speed >= 50 km/h', () => {
      const days = [
        { date: '2026-04-15', wind_speed: 49.9, rainfall: 0, temperature_max: 30, temperature_min: 20, weather_code: 1 },
        { date: '2026-04-16', wind_speed: 50.0, rainfall: 0, temperature_max: 30, temperature_min: 20, weather_code: 1 },
        { date: '2026-04-17', wind_speed: 55.0, rainfall: 0, temperature_max: 30, temperature_min: 20, weather_code: 1 },
      ];
      const alerts = evaluateWeatherAlerts(days);
      const highWindAlerts = alerts.filter((a) => a.alert_type === 'HIGH_WIND');
      expect(highWindAlerts).toHaveLength(2);
      expect(highWindAlerts[0].date).toBe('2026-04-16');
      expect(highWindAlerts[1].date).toBe('2026-04-17');
    });

    it('Weather.Alert: triggers HEAVY_RAIN when rainfall >= 50 mm', () => {
      const days = [
        { date: '2026-04-15', wind_speed: 10, rainfall: 49.5, temperature_max: 30, temperature_min: 20, weather_code: 1 },
        { date: '2026-04-16', wind_speed: 10, rainfall: 50.0, temperature_max: 30, temperature_min: 20, weather_code: 1 },
        { date: '2026-04-17', wind_speed: 10, rainfall: 75.0, temperature_max: 30, temperature_min: 20, weather_code: 1 },
      ];
      const alerts = evaluateWeatherAlerts(days);
      const heavyRainAlerts = alerts.filter((a) => a.alert_type === 'HEAVY_RAIN');
      expect(heavyRainAlerts).toHaveLength(2);
      expect(heavyRainAlerts[0].date).toBe('2026-04-16');
    });

    it('Weather.Alert: triggers EXTREME_HEAT when temperature_max >= 42 °C', () => {
      const days = [
        { date: '2026-04-15', wind_speed: 10, rainfall: 0, temperature_max: 41.9, temperature_min: 25, weather_code: 1 },
        { date: '2026-04-16', wind_speed: 10, rainfall: 0, temperature_max: 42.0, temperature_min: 25, weather_code: 1 },
      ];
      const alerts = evaluateWeatherAlerts(days);
      expect(alerts.some((a) => a.alert_type === 'EXTREME_HEAT' && a.date === '2026-04-16')).toBe(true);
      expect(alerts.some((a) => a.alert_type === 'EXTREME_HEAT' && a.date === '2026-04-15')).toBe(false);
    });

    it('Weather.Alert: triggers FROST when temperature_min <= 2 °C', () => {
      const days = [
        { date: '2026-04-15', wind_speed: 10, rainfall: 0, temperature_max: 15, temperature_min: 2.1, weather_code: 1 },
        { date: '2026-04-16', wind_speed: 10, rainfall: 0, temperature_max: 15, temperature_min: 2.0, weather_code: 1 },
      ];
      const alerts = evaluateWeatherAlerts(days);
      expect(alerts.some((a) => a.alert_type === 'FROST' && a.date === '2026-04-16')).toBe(true);
      expect(alerts.some((a) => a.alert_type === 'FROST' && a.date === '2026-04-15')).toBe(false);
    });

    it('Weather.Alert: triggers THUNDERSTORM when weather_code >= 95', () => {
      const days = [
        { date: '2026-04-15', wind_speed: 10, rainfall: 0, temperature_max: 25, temperature_min: 15, weather_code: 80 },
        { date: '2026-04-16', wind_speed: 10, rainfall: 0, temperature_max: 25, temperature_min: 15, weather_code: 95 },
        { date: '2026-04-17', wind_speed: 10, rainfall: 0, temperature_max: 25, temperature_min: 15, weather_code: 99 },
      ];
      const alerts = evaluateWeatherAlerts(days);
      const stormAlerts = alerts.filter((a) => a.alert_type === 'THUNDERSTORM');
      expect(stormAlerts).toHaveLength(2);
    });

    it('Weather.Alert: only evaluates days 0 to 2 (ignores day 3 onwards)', () => {
      const days = [
        { date: '2026-04-15', wind_speed: 10, rainfall: 0, temperature_max: 25, temperature_min: 15, weather_code: 1 },
        { date: '2026-04-16', wind_speed: 10, rainfall: 0, temperature_max: 25, temperature_min: 15, weather_code: 1 },
        { date: '2026-04-17', wind_speed: 10, rainfall: 0, temperature_max: 25, temperature_min: 15, weather_code: 1 },
        { date: '2026-04-18', wind_speed: 90, rainfall: 100, temperature_max: 48, temperature_min: -5, weather_code: 99 },
      ];
      const alerts = evaluateWeatherAlerts(days);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Advisory.Generate: advisoryRules.js', () => {
    const baseCrop = { crop_name: 'Wheat', growth_stage: 'Vegetative', harvest_date: '2026-05-15' };
    const baseCurrent = { temperature: 24, humidity: 60 };
    const createForecast = (overrides = []) => {
      return Array.from({ length: 7 }, (_, i) => ({
        date: `2026-04-${15 + i}`,
        temperature: 24,
        temperature_max: 28,
        temperature_min: 18,
        humidity: 60,
        rainfall: 0,
        rainfall_probability: 10,
        wind_speed: 12,
        weather_code: 1,
        ...(overrides[i] || {}),
      }));
    };

    it('Advisory.Generate: Priority 1 - Harvest before rain', () => {
      const crop = { crop_name: 'Wheat', harvest_date: '2026-04-18' }; // 3 days away
      const forecast = createForecast([
        { rainfall_probability: 20 },
        { rainfall_probability: 55 }, // >= 50
      ]);
      const advisory = evaluateCropAdvisory({
        crop,
        current: baseCurrent,
        forecast,
        today: '2026-04-15',
      });

      expect(advisory.recommendation).toBe('Harvest before rain');
      expect(advisory.message).toContain('Rain is likely near your harvest date');
    });

    it('Advisory.Generate: Priority 2 - Heavy rain (prob >= 70 or mm >= 10)', () => {
      const forecast = createForecast([
        { rainfall_probability: 10, rainfall: 2 },
        { rainfall_probability: 75, rainfall: 5 }, // prob >= 70
      ]);
      const advisory = evaluateCropAdvisory({
        crop: baseCrop,
        current: baseCurrent,
        forecast,
        today: '2026-04-15',
      });

      expect(advisory.recommendation).toBe('Heavy rain');
      expect(advisory.message).toContain('Heavy rain expected. Postpone irrigation');
    });

    it('Advisory.Generate: Priority 3 - Heat stress (max >= 38)', () => {
      const forecast = createForecast([
        { temperature_max: 32 },
        { temperature_max: 39 }, // >= 38
      ]);
      const advisory = evaluateCropAdvisory({
        crop: baseCrop,
        current: baseCurrent,
        forecast,
        today: '2026-04-15',
      });

      expect(advisory.recommendation).toBe('Heat stress');
      expect(advisory.message).toContain('High temperatures expected. Irrigate in early morning');
    });

    it('Advisory.Generate: Priority 4 - Cold / frost (min <= 5)', () => {
      const forecast = createForecast([
        { temperature_min: 10 },
        { temperature_min: 4 }, // <= 5
      ]);
      const advisory = evaluateCropAdvisory({
        crop: baseCrop,
        current: baseCurrent,
        forecast,
        today: '2026-04-15',
      });

      expect(advisory.recommendation).toBe('Cold / frost');
      expect(advisory.message).toContain('Low temperatures expected. Protect the crop');
    });

    it('Advisory.Generate: Priority 5 - Strong wind (wind >= 30)', () => {
      const forecast = createForecast([
        { wind_speed: 15 },
        { wind_speed: 32 }, // >= 30
      ]);
      const advisory = evaluateCropAdvisory({
        crop: baseCrop,
        current: baseCurrent,
        forecast,
        today: '2026-04-15',
      });

      expect(advisory.recommendation).toBe('Strong wind');
      expect(advisory.message).toContain('Strong winds expected. Avoid spraying');
    });

    it('Advisory.Generate: Priority 6 - Fungal risk (humidity >= 85 and 20 <= temp <= 30)', () => {
      const current = { humidity: 88, temperature: 25 };
      const forecast = createForecast();
      // Ensure rain sum >= 2 to not trigger dry spell
      forecast[0].rainfall = 5;

      const advisory = evaluateCropAdvisory({
        crop: baseCrop,
        current,
        forecast,
        today: '2026-04-15',
      });

      expect(advisory.recommendation).toBe('Fungal risk');
      expect(advisory.message).toContain('High humidity with mild temperatures raises fungal disease risk');
    });

    it('Advisory.Generate: Priority 7 - Dry spell (sum rain < 2 and temp >= 30)', () => {
      const current = { humidity: 40, temperature: 31 };
      const forecast = createForecast(); // rainfall is 0 for all days, sum = 0 < 2

      const advisory = evaluateCropAdvisory({
        crop: baseCrop,
        current,
        forecast,
        today: '2026-04-15',
      });

      expect(advisory.recommendation).toBe('Dry spell');
      expect(advisory.message).toContain('Dry and warm weather ahead. Plan irrigation.');
    });

    it('Advisory.Generate: Default when no rules trigger', () => {
      const current = { humidity: 60, temperature: 24 };
      const forecast = createForecast();
      forecast[0].rainfall = 5; // rain sum >= 2 prevents dry spell

      const advisory = evaluateCropAdvisory({
        crop: baseCrop,
        current,
        forecast,
        today: '2026-04-15',
      });

      expect(advisory.recommendation).toBe('Favourable conditions');
      expect(advisory.message).toBe('Weather conditions are favourable. Continue routine crop care.');
    });

    it('Advisory.Generate: Combines multiple messages with first triggered rule headline', () => {
      // Trigger Priority 2 (Heavy rain) and Priority 5 (Strong wind)
      const forecast = createForecast([
        { rainfall: 15, wind_speed: 35 },
      ]);
      const advisory = evaluateCropAdvisory({
        crop: baseCrop,
        current: baseCurrent,
        forecast,
        today: '2026-04-15',
      });

      expect(advisory.recommendation).toBe('Heavy rain');
      expect(advisory.message).toContain('Heavy rain expected');
      expect(advisory.message).toContain('Strong winds expected');
    });
  });

  describe('WeatherData & CropAdvisory Domain Models', () => {
    it('WeatherData.Model: viewWeather returns JSON format', async () => {
      const wd = new WeatherData({
        weather_id: 1,
        farm_id: 10,
        type: 'current',
        date: '2026-04-15',
        temperature: 25.5,
      });

      const json = await wd.viewWeather();
      expect(json.weather_id).toBe(1);
      expect(json.farm_id).toBe(10);
      expect(json.temperature).toBe(25.5);
    });

    it('CropAdvisory.Model: viewAdvisory returns JSON format', async () => {
      const ca = new CropAdvisory({
        advisory_id: 5,
        crop_id: 2,
        recommendation: 'Heavy rain',
        message: 'Postpone spraying',
        date: '2026-04-15',
        created_at: '2026-04-15T10:00:00Z',
      });

      const json = await ca.viewAdvisory();
      expect(json.advisory_id).toBe(5);
      expect(json.crop_id).toBe(2);
      expect(json.recommendation).toBe('Heavy rain');
    });
  });
});
