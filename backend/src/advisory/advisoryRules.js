/**
 * Crop Advisory Rules per Section 13.2 (D14).
 * Evaluates rules in strict priority order (1 to 7).
 * recommendation = headline of first triggered rule
 * message = all triggered rule messages joined by a space
 */

export const ADVISORY_THRESHOLDS = {
  HARVEST_RAIN_DAYS: 7,
  HARVEST_RAIN_PROB: 50,
  HEAVY_RAIN_PROB: 70,
  HEAVY_RAIN_MM: 10,
  HEAT_STRESS_MAX_TEMP: 38,
  COLD_FROST_MIN_TEMP: 5,
  STRONG_WIND_KMH: 30,
  FUNGAL_HUMIDITY: 85,
  FUNGAL_TEMP_MIN: 20,
  FUNGAL_TEMP_MAX: 30,
  DRY_SPELL_RAIN_SUM_MAX: 2,
  DRY_SPELL_TEMP: 30,
};

export const DEFAULT_ADVISORY = {
  recommendation: 'Favourable conditions',
  message: 'Weather conditions are favourable. Continue routine crop care.',
};

/**
 * Evaluates advisory rules for a crop and given weather readings.
 * @param {Object} params
 * @param {Object} params.crop - { crop_name, growth_stage, harvest_date }
 * @param {Object} params.current - Current weather reading
 * @param {Object[]} params.forecast - 7-day daily forecast readings
 * @param {string} [params.today] - Date string for today (defaults to forecast[0].date or current.date)
 * @returns {{ recommendation: string, message: string }}
 */
export function evaluateCropAdvisory({ crop, current = {}, forecast = [], today = null }) {
  const todayStr = today || forecast[0]?.date || current?.date;
  const next3Days = forecast.slice(0, 3);
  const next5Days = forecast.slice(0, 5);

  const triggered = [];

  // 1. Harvest before rain: harvest_date within 7 days and any of next 3 days rainfall_probability >= 50
  if (crop && crop.harvest_date && todayStr) {
    const harvestTime = new Date(crop.harvest_date).getTime();
    const todayTime = new Date(todayStr).getTime();
    const diffDays = Math.round((harvestTime - todayTime) / (1000 * 60 * 60 * 24));
    const harvestWithin7 = diffDays >= 0 && diffDays <= ADVISORY_THRESHOLDS.HARVEST_RAIN_DAYS;
    const rainLikely = next3Days.some(
      (d) => (d.rainfall_probability ?? 0) >= ADVISORY_THRESHOLDS.HARVEST_RAIN_PROB
    );

    if (harvestWithin7 && rainLikely) {
      triggered.push({
        priority: 1,
        headline: 'Harvest before rain',
        message: 'Rain is likely near your harvest date. Plan harvesting before the rain.',
      });
    }
  }

  // 2. Heavy rain: any of next 3 days rainfall_probability >= 70 or rainfall >= 10 mm
  const heavyRain = next3Days.some(
    (d) =>
      (d.rainfall_probability ?? 0) >= ADVISORY_THRESHOLDS.HEAVY_RAIN_PROB ||
      (d.rainfall ?? 0) >= ADVISORY_THRESHOLDS.HEAVY_RAIN_MM
  );
  if (heavyRain) {
    triggered.push({
      priority: 2,
      headline: 'Heavy rain',
      message:
        'Heavy rain expected. Postpone irrigation, fertilizer and pesticide spraying; ensure field drainage.',
    });
  }

  // 3. Heat stress: any of next 3 days temperature_max >= 38 °C
  const heatStress = next3Days.some(
    (d) => (d.temperature_max ?? 0) >= ADVISORY_THRESHOLDS.HEAT_STRESS_MAX_TEMP
  );
  if (heatStress) {
    triggered.push({
      priority: 3,
      headline: 'Heat stress',
      message:
        'High temperatures expected. Irrigate in early morning or evening and consider mulching.',
    });
  }

  // 4. Cold / frost: any of next 3 days temperature_min <= 5 °C
  const coldFrost = next3Days.some(
    (d) => d.temperature_min !== null && d.temperature_min <= ADVISORY_THRESHOLDS.COLD_FROST_MIN_TEMP
  );
  if (coldFrost) {
    triggered.push({
      priority: 4,
      headline: 'Cold / frost',
      message: 'Low temperatures expected. Protect the crop from cold or frost.',
    });
  }

  // 5. Strong wind: any of next 3 days wind_speed >= 30 km/h
  const strongWind = next3Days.some(
    (d) => (d.wind_speed ?? 0) >= ADVISORY_THRESHOLDS.STRONG_WIND_KMH
  );
  if (strongWind) {
    triggered.push({
      priority: 5,
      headline: 'Strong wind',
      message: 'Strong winds expected. Avoid spraying and support tall crops.',
    });
  }

  // 6. Fungal risk: current humidity >= 85 and 20 <= temperature <= 30
  const currHumidity = current.humidity ?? 0;
  const currTemp = current.temperature ?? 0;
  if (
    currHumidity >= ADVISORY_THRESHOLDS.FUNGAL_HUMIDITY &&
    currTemp >= ADVISORY_THRESHOLDS.FUNGAL_TEMP_MIN &&
    currTemp <= ADVISORY_THRESHOLDS.FUNGAL_TEMP_MAX
  ) {
    triggered.push({
      priority: 6,
      headline: 'Fungal risk',
      message:
        'High humidity with mild temperatures raises fungal disease risk. Inspect the crop regularly.',
    });
  }

  // 7. Dry spell: sum of rainfall over next 5 days < 2 mm and temperature >= 30
  const rainSum = next5Days.reduce((acc, d) => acc + (d.rainfall ?? 0), 0);
  if (
    rainSum < ADVISORY_THRESHOLDS.DRY_SPELL_RAIN_SUM_MAX &&
    currTemp >= ADVISORY_THRESHOLDS.DRY_SPELL_TEMP
  ) {
    triggered.push({
      priority: 7,
      headline: 'Dry spell',
      message: 'Dry and warm weather ahead. Plan irrigation.',
    });
  }

  if (triggered.length === 0) {
    return { ...DEFAULT_ADVISORY };
  }

  // Sort by priority ascending to ensure first triggered rule provides headline
  triggered.sort((a, b) => a.priority - b.priority);

  const recommendation = triggered[0].headline;
  const message = triggered.map((t) => t.message).join(' ');

  return { recommendation, message };
}
