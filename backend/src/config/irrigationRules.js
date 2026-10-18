import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read default crop requirements from JSON
const cropRequirementsPath = path.join(__dirname, 'cropRequirements.json');
let cropRequirements = {
  default: {
    interval_days: 5,
    water_mm: 25,
  },
};

try {
  const content = fs.readFileSync(cropRequirementsPath, 'utf8');
  cropRequirements = JSON.parse(content);
} catch {
  // Fallback to default in-memory if file read fails
}

export const RAIN_PROB_SKIP = 60;
export const RAIN_MM_SKIP = 5;

/**
 * Checks if a forecast day satisfies the rainy threshold.
 * Requirement: BR-5, Irrigation.Skip, Section 13.3
 * Threshold: rainfall_probability >= 60 OR rainfall >= 5 mm
 * @param {Object} day
 * @returns {boolean}
 */
export function isRainyDay(day) {
  if (!day) return false;
  const prob = Number(day.rainfall_probability ?? 0);
  const rain = Number(day.rainfall ?? 0);
  return prob >= RAIN_PROB_SKIP || rain >= RAIN_MM_SKIP;
}

/**
 * Generates an irrigation schedule plan for a crop and 7-day forecast.
 * Requirement: Irrigation.Generate, Irrigation.Skip, BR-5, Section 13.3
 * @param {string} cropName
 * @param {Array<Object>} forecastDays - 7-day forecast array D[0]..D[6]
 * @returns {Object}
 */
export function generateIrrigationPlan(cropName = '', forecastDays = []) {
  if (!forecastDays || forecastDays.length === 0) {
    throw new Error('Forecast days are required to generate irrigation schedule');
  }

  const nameKey = (cropName || '').toLowerCase().trim();
  const req = cropRequirements[nameKey] ?? cropRequirements.default ?? {
    interval_days: 5,
    water_mm: 25,
  };

  const intervalDays = Number(req.interval_days) || 5;
  const waterMm = Number(req.water_mm) || 25;

  const startDate = forecastDays[0].date;
  const endDate = forecastDays[Math.min(6, forecastDays.length - 1)].date;

  const candidateDates = [];
  for (let i = 0; i < forecastDays.length && i <= 6; i += intervalDays) {
    const day = forecastDays[i];
    const skipped = isRainyDay(day);
    candidateDates.push({
      date: day.date,
      is_skipped: skipped ? 1 : 0,
      weather_id: day.weather_id ?? null,
    });
  }

  const skippedDates = candidateDates
    .filter((d) => d.is_skipped === 1)
    .map((d) => d.date)
    .sort();

  const irrigationDates = candidateDates
    .filter((d) => d.is_skipped === 0)
    .map((d) => d.date)
    .sort();

  const skipRecommended = skippedDates.length > 0 ? 1 : 0;
  const note =
    skipRecommended === 1
      ? `Rainfall expected on ${skippedDates.join(', ')}; skip irrigation on these dates.`
      : '';

  const frequency = `Every ${intervalDays} days`;
  const waterRequired = `${waterMm} mm per irrigation`;

  // Linked weather rows from the forecast used (Section 13.3)
  const weatherIds = forecastDays
    .slice(0, 7)
    .map((f) => f.weather_id)
    .filter(Boolean);

  return {
    start_date: startDate,
    end_date: endDate,
    frequency,
    water_required: waterRequired,
    skip_recommended: skipRecommended,
    note,
    dates: candidateDates,
    irrigation_dates: irrigationDates,
    skipped_dates: skippedDates,
    weather_ids: weatherIds,
  };
}
