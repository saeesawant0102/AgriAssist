import cron from 'node-cron';
import { env } from '../config/env.js';
import { refreshIrrigationSchedulesJob } from './refreshIrrigationSchedules.js';

let isInitialized = false;
const activeTasks = [];

/**
 * Initializes and starts all scheduled background jobs.
 * Requirement: D18, Section 11, Section 13.3 (9)
 * Note: Must be called only once from server.js; never from createApp().
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../weather/WeatherService.js').WeatherService} deps.weatherService
 * @param {import('../utils/clock.js').Clock} deps.clock
 * @returns {Array<cron.ScheduledTask>}
 */
export function startScheduler(deps) {
  if (isInitialized) {
    console.warn('[Scheduler] Scheduler is already initialized, skipping duplicate registration.');
    return activeTasks;
  }

  const irrigationCron = env.IRRIGATION_REFRESH_CRON || '0 */6 * * *';
  if (cron.validate(irrigationCron)) {
    const task = cron.schedule(irrigationCron, async () => {
      console.log('[Scheduler] Running scheduled irrigation refresh job...');
      try {
        const result = await refreshIrrigationSchedulesJob(deps);
        console.log(`[Scheduler] Refreshed ${result.refreshedCount} schedule(s) across ${result.farmCount} farm(s).`);
      } catch (err) {
        console.error('[Scheduler] Error in scheduled irrigation refresh job:', err);
      }
    });
    activeTasks.push(task);
    console.log(`[Scheduler] Registered irrigation refresh job with cron: ${irrigationCron}`);
  } else {
    console.error(`[Scheduler] Invalid cron expression for IRRIGATION_REFRESH_CRON: ${irrigationCron}`);
  }

  isInitialized = true;
  return activeTasks;
}

/**
 * Stops all scheduled tasks and resets initialization state.
 */
export function stopScheduler() {
  for (const task of activeTasks) {
    task.stop();
  }
  activeTasks.length = 0;
  isInitialized = false;
  console.log('[Scheduler] All scheduled tasks stopped.');
}

export function isSchedulerRunning() {
  return isInitialized;
}
