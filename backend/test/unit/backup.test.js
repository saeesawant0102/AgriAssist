import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Database } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';
import { dailyBackupJob } from '../../src/jobs/dailyBackup.js';
import { startScheduler, stopScheduler } from '../../src/jobs/scheduler.js';
import { FakeWeatherService } from '../helpers/FakeWeatherService.js';

describe('Backup and Restore Unit Tests (D20, OR-4, OR-5, Phase 8)', () => {
  const testDir = path.resolve('./data/test-backups');
  const dbPath = path.join(testDir, 'source.db');
  let db;

  beforeEach(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    // Clean up directory before each test
    for (const file of fs.readdirSync(testDir)) {
      try {
        fs.unlinkSync(path.join(testDir, file));
      } catch {
        // ignore cleanup error
      }
    }

    db = await Database.open(dbPath);
    await migrate(db);
    // Insert a test row to verify data persistence
    await db.run(
      `INSERT INTO users (firebase_uid, user_type, name, email, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['fb-test-1', 'farmer', 'Backup Tester', 'backup@example.com', 'active', '2026-10-18T00:00:00.000Z', '2026-10-18T00:00:00.000Z']
    );
  });

  afterEach(async () => {
    stopScheduler();
    if (db) {
      await db.close();
    }
    // Clean up test files
    if (fs.existsSync(testDir)) {
      for (const file of fs.readdirSync(testDir)) {
        try {
          fs.unlinkSync(path.join(testDir, file));
        } catch {
          // ignore cleanup error
        }
      }
      try {
        fs.rmdirSync(testDir);
      } catch {
        // ignore cleanup error
      }
    }
  });

  it('OR-4: creates a valid SQLite backup using VACUUM INTO via Database.backupTo', async () => {
    const fakeClock = {
      now: () => new Date('2026-10-18T02:00:00.000Z'),
    };

    const result = await dailyBackupJob({
      db,
      clock: fakeClock,
      options: {
        backupDir: testDir,
        retainCount: 5,
      },
    });

    expect(fs.existsSync(result.backupFilePath)).toBe(true);
    expect(result.backupFilePath).toContain('agriassist_backup_');
    expect(result.backupFilePath.endsWith('.db')).toBe(true);
    expect(result.prunedCount).toBe(0);

    // Verify backup DB opens and passes integrity check
    const backupDb = await Database.open(result.backupFilePath);
    const integrity = await backupDb.get('PRAGMA integrity_check');
    expect(integrity.integrity_check).toBe('ok');

    const userRow = await backupDb.get('SELECT * FROM users WHERE email = ?', ['backup@example.com']);
    expect(userRow).toBeDefined();
    expect(userRow.name).toBe('Backup Tester');

    await backupDb.close();
  });

  it('OR-4: prunes oldest backups when count exceeds retainCount', async () => {
    const retainCount = 3;

    // Create 5 backups at different simulated timestamps
    for (let i = 1; i <= 5; i++) {
      const simClock = {
        now: () => new Date(`2026-10-18T02:0${i}:00.000Z`),
      };
      await dailyBackupJob({
        db,
        clock: simClock,
        options: {
          backupDir: testDir,
          retainCount,
        },
      });
    }

    const files = fs.readdirSync(testDir).filter((f) => f.startsWith('agriassist_backup_') && f.endsWith('.db'));
    expect(files.length).toBe(retainCount);

    // Oldest backups (01, 02) should have been pruned; newest (03, 04, 05) remain
    expect(files.some((f) => f.includes('020100'))).toBe(false);
    expect(files.some((f) => f.includes('020200'))).toBe(false);
    expect(files.some((f) => f.includes('020500'))).toBe(true);
  });

  it('OR-5: restores database from backup file and validates integrity', async () => {
    // 1. Create a backup
    const backupResult = await dailyBackupJob({
      db,
      clock: { now: () => new Date('2026-10-18T02:00:00.000Z') },
      options: { backupDir: testDir, retainCount: 5 },
    });

    // 2. Close running DB before restore
    await db.close();
    db = null;

    // 3. Simulate restoring over target DB
    const restoredTarget = path.join(testDir, 'restored.db');
    fs.copyFileSync(backupResult.backupFilePath, restoredTarget);

    // 4. Open restored DB and check integrity
    const restoredDb = await Database.open(restoredTarget);
    const integrity = await restoredDb.get('PRAGMA integrity_check');
    expect(integrity.integrity_check).toBe('ok');

    const user = await restoredDb.get('SELECT * FROM users WHERE email = ?', ['backup@example.com']);
    expect(user.name).toBe('Backup Tester');
    await restoredDb.close();
  });

  it('D18: scheduler registers daily backup and irrigation refresh tasks', () => {
    const tasks = startScheduler({
      db,
      weatherService: new FakeWeatherService(),
      clock: { now: () => new Date() },
    });

    expect(tasks).toBeDefined();
    expect(tasks.length).toBe(2);
  });
});
