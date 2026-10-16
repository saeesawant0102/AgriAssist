import { CropAdvisory } from '../models/CropAdvisory.js';
import { WeatherData } from '../models/WeatherData.js';

/**
 * Advisory repository for persisting crop_advisories and advisory_weather.
 * Requirements: Advisory.Generate, Advisory.Display, Section 9.6, Section 13.2
 */

/**
 * Inserts a crop advisory row.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {Object} data
 * @returns {Promise<CropAdvisory>}
 */
export async function insertAdvisory(exec, data) {
  const sql = `
    INSERT INTO crop_advisories (
      crop_id, recommendation, message, date, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `;
  const params = [
    data.crop_id,
    data.recommendation,
    data.message,
    data.date,
    data.created_at,
  ];

  const result = await exec.run(sql, params);
  return CropAdvisory.fromRow({
    ...data,
    advisory_id: result.lastID,
  });
}

/**
 * Links an advisory to its underlying weather_data rows in advisory_weather junction.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} advisoryId
 * @param {number[]} weatherIds
 * @returns {Promise<void>}
 */
export async function linkAdvisoryWeather(exec, advisoryId, weatherIds) {
  if (!weatherIds || weatherIds.length === 0) return;
  const sql = `INSERT OR IGNORE INTO advisory_weather (advisory_id, weather_id) VALUES (?, ?)`;
  for (const weatherId of weatherIds) {
    await exec.run(sql, [advisoryId, weatherId]);
  }
}

/**
 * Retrieves all advisories for a crop, newest first.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} cropId
 * @returns {Promise<CropAdvisory[]>}
 */
export async function getAdvisoriesByCrop(exec, cropId) {
  const sql = `
    SELECT * FROM crop_advisories
    WHERE crop_id = ?
    ORDER BY advisory_id DESC
  `;
  const rows = await exec.all(sql, [cropId]);
  return rows.map((r) => CropAdvisory.fromRow(r));
}

/**
 * Retrieves the latest advisory for a crop.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} cropId
 * @returns {Promise<CropAdvisory | null>}
 */
export async function getLatestAdvisoryByCrop(exec, cropId) {
  const sql = `
    SELECT * FROM crop_advisories
    WHERE crop_id = ?
    ORDER BY advisory_id DESC
    LIMIT 1
  `;
  const row = await exec.get(sql, [cropId]);
  return row ? CropAdvisory.fromRow(row) : null;
}

/**
 * Retrieves an advisory by ID.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} advisoryId
 * @returns {Promise<CropAdvisory | null>}
 */
export async function getAdvisoryById(exec, advisoryId) {
  const sql = `SELECT * FROM crop_advisories WHERE advisory_id = ?`;
  const row = await exec.get(sql, [advisoryId]);
  return row ? CropAdvisory.fromRow(row) : null;
}

/**
 * Retrieves linked weather data rows for a given advisory.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} advisoryId
 * @returns {Promise<WeatherData[]>}
 */
export async function getAdvisoryWeatherRows(exec, advisoryId) {
  const sql = `
    SELECT w.* FROM weather_data w
    INNER JOIN advisory_weather aw ON aw.weather_id = w.weather_id
    WHERE aw.advisory_id = ?
    ORDER BY w.date ASC
  `;
  const rows = await exec.all(sql, [advisoryId]);
  return rows.map((r) => WeatherData.fromRow(r));
}
