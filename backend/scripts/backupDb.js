import { env } from '../src/config/env.js';
import { Database } from '../src/db/connection.js';
import { dailyBackupJob } from '../src/jobs/dailyBackup.js';
import { SystemClock } from '../src/utils/clock.js';

const systemClock = new SystemClock();

async function backupDb() {
  console.log(`[BackupDb] Opening database at ${env.DATABASE_PATH}...`);

  let db;
  try {
    db = await Database.open(env.DATABASE_PATH);
  } catch (err) {
    console.error(`[BackupDb] Failed to open database at ${env.DATABASE_PATH}:`, err.message);
    process.exit(1);
  }

  try {
    console.log(`[BackupDb] Creating consistent backup in ${env.BACKUP_DIR}...`);
    const result = await dailyBackupJob({
      db,
      clock: systemClock,
      options: {
        backupDir: env.BACKUP_DIR,
        retainCount: env.BACKUP_RETAIN_COUNT,
      },
    });

    console.log(`[BackupDb] Successfully created backup at: ${result.backupFilePath}`);
    if (result.prunedCount > 0) {
      console.log(`[BackupDb] Pruned ${result.prunedCount} old backup(s) per retention policy (keep ${env.BACKUP_RETAIN_COUNT}).`);
    }

    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('[BackupDb] Backup failed:', err.message);
    if (db) {
      await db.close();
    }
    process.exit(1);
  }
}

backupDb();
