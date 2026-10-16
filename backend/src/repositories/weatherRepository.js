import { WeatherData } from '../models/WeatherData.js';

/**
 * Weather repository for persisting and querying weather_data.
 * Requirements: Weather.Fetch, Weather.Display, Section 9.6, Section 13.1
 */

/**
 * Inserts a single weather data row.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {Object} row
 * @returns {Promise<WeatherData>}
 */
export async function insertWeatherRow(exec, row) {
  const sql = `
    INSERT INTO weather_data (
      farm_id, type, date, temperature, temperature_max, temperature_min,
      humidity, rainfall, rainfall_probability, wind_speed,
      weather_code, condition, forecast, fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    row.farm_id,
    row.type,
    row.date,
    row.temperature,
    row.temperature_max,
    row.temperature_min,
    row.humidity,
    row.rainfall,
    row.rainfall_probability,
    row.wind_speed,
    row.weather_code,
    row.condition,
    row.forecast,
    row.fetched_at,
  ];

  const result = await exec.run(sql, params);
  return WeatherData.fromRow({
    ...row,
    weather_id: result.lastID,
  });
}

/**
 * Inserts multiple weather rows within the current executor.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {Object[]} rows
 * @returns {Promise<WeatherData[]>}
 */
export async function insertWeatherRows(exec, rows) {
  const results = [];
  for (const row of rows) {
    const inserted = await insertWeatherRow(exec, row);
    results.push(inserted);
  }
  return results;
}

/**
 * Retrieves the newest cached weather rows for a farm and type (Section 13.1).
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmId
 * @param {'current' | 'forecast'} type
 * @returns {Promise<WeatherData[]>}
 */
export async function getLatestWeatherByFarmAndType(exec, farmId, type) {
  const sql = `
    SELECT * FROM weather_data
    WHERE farm_id = ? AND type = ?
      AND fetched_at = (SELECT MAX(fetched_at) FROM weather_data WHERE farm_id = ? AND type = ?)
    ORDER BY date ASC
  `;
  const rows = await exec.all(sql, [farmId, type, farmId, type]);
  return rows.map((r) => WeatherData.fromRow(r));
}

/**
 * Retrieves the newest cached weather bundle (both current and forecast) for a farm.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmId
 * @returns {Promise<{ current: WeatherData | null, forecast: WeatherData[], fetched_at: string | null }>}
 */
export async function getLatestWeatherBundle(exec, farmId) {
  const maxRow = await exec.get(
    'SELECT MAX(fetched_at) AS max_fetched_at FROM weather_data WHERE farm_id = ?',
    [farmId]
  );

  if (!maxRow || !maxRow.max_fetched_at) {
    return { current: null, forecast: [], fetched_at: null };
  }

  const fetchedAt = maxRow.max_fetched_at;
  const rows = await exec.all(
    'SELECT * FROM weather_data WHERE farm_id = ? AND fetched_at = ? ORDER BY date ASC',
    [farmId, fetchedAt]
  );

  let current = null;
  const forecast = [];

  for (const r of rows) {
    if (r.type === 'current') {
      current = WeatherData.fromRow(r);
    } else if (r.type === 'forecast') {
      forecast.push(WeatherData.fromRow(r));
    }
  }

  return { current, forecast, fetched_at: fetchedAt };
}

/**
 * Retrieves weather rows by an array of weather_id.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number[]} weatherIds
 * @returns {Promise<WeatherData[]>}
 */
export async function getWeatherDataByIds(exec, weatherIds) {
  if (!weatherIds || weatherIds.length === 0) return [];
  const placeholders = weatherIds.map(() => '?').join(',');
  const sql = `SELECT * FROM weather_data WHERE weather_id IN (${placeholders}) ORDER BY date ASC`;
  const rows = await exec.all(sql, weatherIds);
  return rows.map((r) => WeatherData.fromRow(r));
}
