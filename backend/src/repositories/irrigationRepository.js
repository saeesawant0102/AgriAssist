import { IrrigationSchedule } from '../models/IrrigationSchedule.js';
import { WeatherData } from '../models/WeatherData.js';

/**
 * Irrigation repository for persisting irrigation_schedules, dates, and schedule_weather.
 * Requirements: Irrigation.Generate, Irrigation.View, Irrigation.Update, Irrigation.Skip, BR-5, Section 9.7, Section 13.3
 */

/**
 * Inserts a new irrigation schedule along with its candidate dates and weather associations.
 * Must be executed within a transaction.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {Object} data
 * @returns {Promise<IrrigationSchedule>}
 */
export async function insertSchedule(exec, data) {
  const scheduleSql = `
    INSERT INTO irrigation_schedules (
      crop_id, start_date, end_date, frequency, water_required,
      skip_recommended, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const scheduleParams = [
    data.crop_id,
    data.start_date,
    data.end_date,
    data.frequency,
    data.water_required,
    data.skip_recommended,
    data.note,
    data.created_at,
    data.updated_at,
  ];

  const result = await exec.run(scheduleSql, scheduleParams);
  const scheduleId = result.lastID;

  // Insert dates
  if (data.dates && data.dates.length > 0) {
    const dateSql = `
      INSERT INTO irrigation_schedule_dates (schedule_id, date, is_skipped)
      VALUES (?, ?, ?)
    `;
    for (const d of data.dates) {
      await exec.run(dateSql, [scheduleId, d.date, d.is_skipped]);
    }
  }

  // Link weather data
  if (data.weather_ids && data.weather_ids.length > 0) {
    const weatherSql = `
      INSERT OR IGNORE INTO schedule_weather (schedule_id, weather_id)
      VALUES (?, ?)
    `;
    for (const wId of data.weather_ids) {
      await exec.run(weatherSql, [scheduleId, wId]);
    }
  }

  return getScheduleById(exec, scheduleId);
}

/**
 * Updates an existing irrigation schedule in-place and replaces its child dates and weather links.
 * Must be executed within a transaction.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} scheduleId
 * @param {Object} data
 * @returns {Promise<IrrigationSchedule>}
 */
export async function updateScheduleInPlace(exec, scheduleId, data) {
  const updateSql = `
    UPDATE irrigation_schedules
    SET frequency = ?,
        water_required = ?,
        skip_recommended = ?,
        note = ?,
        updated_at = ?
    WHERE schedule_id = ?
  `;
  await exec.run(updateSql, [
    data.frequency,
    data.water_required,
    data.skip_recommended,
    data.note,
    data.updated_at,
    scheduleId,
  ]);

  // Replace child dates
  await exec.run(`DELETE FROM irrigation_schedule_dates WHERE schedule_id = ?`, [scheduleId]);
  if (data.dates && data.dates.length > 0) {
    const dateSql = `
      INSERT INTO irrigation_schedule_dates (schedule_id, date, is_skipped)
      VALUES (?, ?, ?)
    `;
    for (const d of data.dates) {
      await exec.run(dateSql, [scheduleId, d.date, d.is_skipped]);
    }
  }

  // Replace child weather links
  await exec.run(`DELETE FROM schedule_weather WHERE schedule_id = ?`, [scheduleId]);
  if (data.weather_ids && data.weather_ids.length > 0) {
    const weatherSql = `
      INSERT OR IGNORE INTO schedule_weather (schedule_id, weather_id)
      VALUES (?, ?)
    `;
    for (const wId of data.weather_ids) {
      await exec.run(weatherSql, [scheduleId, wId]);
    }
  }

  return getScheduleById(exec, scheduleId);
}

/**
 * Retrieves a single irrigation schedule by ID including child dates and weather associations.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} scheduleId
 * @returns {Promise<IrrigationSchedule|null>}
 */
export async function getScheduleById(exec, scheduleId) {
  const row = await exec.get(
    `SELECT * FROM irrigation_schedules WHERE schedule_id = ?`,
    [scheduleId]
  );
  if (!row) return null;

  const datesRows = await exec.all(
    `SELECT date, is_skipped FROM irrigation_schedule_dates WHERE schedule_id = ? ORDER BY date ASC`,
    [scheduleId]
  );

  const weatherRows = await exec.all(
    `
    SELECT w.* FROM weather_data w
    INNER JOIN schedule_weather sw ON sw.weather_id = w.weather_id
    WHERE sw.schedule_id = ?
    ORDER BY w.date ASC
    `,
    [scheduleId]
  );

  return IrrigationSchedule.fromRow(
    row,
    datesRows,
    weatherRows.map((w) => new WeatherData(w))
  );
}

/**
 * Retrieves all irrigation schedules for a crop, newest first (schedule_id DESC).
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} cropId
 * @returns {Promise<IrrigationSchedule[]>}
 */
export async function getSchedulesByCropId(exec, cropId) {
  const rows = await exec.all(
    `SELECT * FROM irrigation_schedules WHERE crop_id = ? ORDER BY schedule_id DESC`,
    [cropId]
  );

  const schedules = [];
  for (const row of rows) {
    const datesRows = await exec.all(
      `SELECT date, is_skipped FROM irrigation_schedule_dates WHERE schedule_id = ? ORDER BY date ASC`,
      [row.schedule_id]
    );
    schedules.push(IrrigationSchedule.fromRow(row, datesRows));
  }
  return schedules;
}

/**
 * Finds all active schedules whose end_date is not in the past (>= currentDate).
 * Joined with crop and farm for grouping by farm in the cron job.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {string} currentDate - YYYY-MM-DD
 * @returns {Promise<Array<Object>>}
 */
export async function findActiveSchedules(exec, currentDate) {
  const sql = `
    SELECT
      s.schedule_id,
      s.crop_id,
      s.start_date,
      s.end_date,
      c.crop_name,
      c.farm_id,
      f.farmer_id
    FROM irrigation_schedules s
    INNER JOIN crops c ON c.crop_id = s.crop_id
    INNER JOIN farms f ON f.farm_id = c.farm_id
    WHERE s.end_date >= ?
    ORDER BY f.farm_id ASC, s.schedule_id ASC
  `;
  return exec.all(sql, [currentDate]);
}
