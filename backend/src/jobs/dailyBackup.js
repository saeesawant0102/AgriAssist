import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { SystemClock } from '../utils/clock.js';

const systemClock = new SystemClock();

/**
 * Executes the daily database backup job.
 * Requirement: D20, OR-4, OR-5, Section 7.4 (8), Phase 8
 *
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../utils/clock.js').Clock} [deps.clock=systemClock]
 * @param {Object} [deps.options={}]
 * @param {string} [deps.options.backupDir]
 * @param {number} [deps.options.retainCount]
 * @returns {Promise<{ backupFilePath: string, prunedCount: number }>}
 */
export async function dailyBackupJob(deps) {
  const clock = deps.clock || systemClock;
  const backupDir = deps.options?.backupDir || env.BACKUP_DIR || './data/backups';
  const retainCount = deps.options?.retainCount ?? env.BACKUP_RETAIN_COUNT ?? 7;

  const resolvedDir = path.resolve(backupDir);
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  // Format timestamp: YYYYMMDD_HHmmss (UTC)
  const now = clock.now();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const mins = String(now.getUTCMinutes()).padStart(2, '0');
  const secs = String(now.getUTCSeconds()).padStart(2, '0');
  const timestamp = `${year}${month}${day}_${hours}${mins}${secs}`;

  const fileName = `agriassist_backup_${timestamp}.db`;
  const backupFilePath = path.join(resolvedDir, fileName);

  // Perform consistent database backup using VACUUM INTO via Database.backupTo
  await deps.db.backupTo(backupFilePath);

  // Retention pruning: keep newest retainCount backups
  let prunedCount = 0;
  try {
    const files = fs.readdirSync(resolvedDir);
    const backupFiles = files
      .filter((file) => file.startsWith('agriassist_backup_') && file.endsWith('.db'))
      .map((file) => {
        const fullPath = path.join(resolvedDir, file);
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          path: fullPath,
          mtime: stats.mtimeMs,
        };
      })
      // Sort descending (newest first)
      .sort((a, b) => b.mtime - a.mtime || b.name.localeCompare(a.name));

    if (backupFiles.length > retainCount) {
      const filesToDelete = backupFiles.slice(retainCount);
      for (const item of filesToDelete) {
        try {
          fs.unlinkSync(item.path);
          prunedCount += 1;
        } catch (unlinkErr) {
          console.error(`[Backup] Failed to prune old backup file ${item.path}:`, unlinkErr);
        }
      }
    }
  } catch (pruneErr) {
    console.error('[Backup] Error during backup retention pruning:', pruneErr);
  }

  return {
    backupFilePath,
    prunedCount,
  };
}
