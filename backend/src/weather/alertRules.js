/**
 * Weather Alert Rules per Section 13.5 (D12).
 * Evaluated on the next 3 forecast days (days 0–2).
 */

export const ALERT_THRESHOLDS = {
  HIGH_WIND_KMH: 50,
  HEAVY_RAIN_MM: 50,
  EXTREME_HEAT_CELSIUS: 42,
  FROST_CELSIUS: 2,
  THUNDERSTORM_CODE: 95,
};

/**
 * Evaluates weather alerts across the next 3 forecast days.
 * @param {Array<{ date: string, wind_speed: number, rainfall: number, temperature_max: number, temperature_min: number, weather_code: number }>} next3Days
 * @returns {Array<{ alert_type: string, severity: 'severe', date: string, message: string }>}
 */
export function evaluateWeatherAlerts(next3Days = []) {
  const alerts = [];
  const daysToCheck = (next3Days || []).slice(0, 3);

  for (const day of daysToCheck) {
    if (!day || !day.date) continue;

    // HIGH_WIND: wind_speed >= 50 km/h
    if (day.wind_speed !== null && day.wind_speed >= ALERT_THRESHOLDS.HIGH_WIND_KMH) {
      alerts.push({
        alert_type: 'HIGH_WIND',
        severity: 'severe',
        date: day.date,
        message: `High wind warning: wind speed expected to reach ${day.wind_speed} km/h on ${day.date}.`,
      });
    }

    // HEAVY_RAIN: rainfall >= 50 mm
    if (day.rainfall !== null && day.rainfall >= ALERT_THRESHOLDS.HEAVY_RAIN_MM) {
      alerts.push({
        alert_type: 'HEAVY_RAIN',
        severity: 'severe',
        date: day.date,
        message: `Heavy rainfall warning: precipitation expected to reach ${day.rainfall} mm on ${day.date}.`,
      });
    }

    // EXTREME_HEAT: temperature_max >= 42 °C
    if (
      day.temperature_max !== null &&
      day.temperature_max >= ALERT_THRESHOLDS.EXTREME_HEAT_CELSIUS
    ) {
      alerts.push({
        alert_type: 'EXTREME_HEAT',
        severity: 'severe',
        date: day.date,
        message: `Extreme heat warning: maximum temperature expected to reach ${day.temperature_max}°C on ${day.date}.`,
      });
    }

    // FROST: temperature_min <= 2 °C
    if (day.temperature_min !== null && day.temperature_min <= ALERT_THRESHOLDS.FROST_CELSIUS) {
      alerts.push({
        alert_type: 'FROST',
        severity: 'severe',
        date: day.date,
        message: `Frost warning: minimum temperature expected to drop to ${day.temperature_min}°C on ${day.date}.`,
      });
    }

    // THUNDERSTORM: weather_code >= 95
    if (day.weather_code !== null && day.weather_code >= ALERT_THRESHOLDS.THUNDERSTORM_CODE) {
      alerts.push({
        alert_type: 'THUNDERSTORM',
        severity: 'severe',
        date: day.date,
        message: `Thunderstorm warning: severe thunderstorms expected on ${day.date}.`,
      });
    }
  }

  return alerts;
}
