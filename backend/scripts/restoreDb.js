import fs from 'fs';
import path from 'path';
import { env } from '../src/config/env.js';
import { Database } from '../src/db/connection.js';

async function restoreDb() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node scripts/restoreDb.js <path-to-backup-file>');
    process.exit(1);
  }

  const backupPath = path.resolve(args[0]);
  if (!fs.existsSync(backupPath)) {
    console.error(`[RestoreDb] Backup file does not exist: ${backupPath}`);
    process.exit(1);
  }

  const targetDbPath = path.resolve(env.DATABASE_PATH);
  const targetDir = path.dirname(targetDbPath);

  console.log('----------------------------------------------------');
  console.log('[RestoreDb] WARNING: Ensure backend server is STOPPED before restoring.');
  console.log(`[RestoreDb] Restoring from: ${backupPath}`);
  console.log(`[RestoreDb] Target database: ${targetDbPath}`);
  console.log('----------------------------------------------------');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  try {
    // 1. Copy backup file over target database file
    fs.copyFileSync(backupPath, targetDbPath);
    console.log('[RestoreDb] Copied backup file over target database.');

    // 2. Remove any existing WAL / SHM files next to it
    const walFile = `${targetDbPath}-wal`;
    const shmFile = `${targetDbPath}-shm`;

    if (fs.existsSync(walFile)) {
      fs.unlinkSync(walFile);
      console.log('[RestoreDb] Removed stale WAL file.');
    }
    if (fs.existsSync(shmFile)) {
      fs.unlinkSync(shmFile);
      console.log('[RestoreDb] Removed stale SHM file.');
    }

    // 3. Open restored database and verify integrity
    console.log('[RestoreDb] Opening restored database to verify integrity...');
    const db = await Database.open(targetDbPath);

    const integrity = await db.get('PRAGMA integrity_check');
    if (!integrity || integrity.integrity_check !== 'ok') {
      await db.close();
      throw new Error(`Integrity check failed: ${JSON.stringify(integrity)}`);
    }

    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    console.log(`[RestoreDb] Integrity check passed. Found ${tables.length} application table(s).`);

    await db.close();
    console.log('[RestoreDb] Database restore completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[RestoreDb] Database restore failed:', err.message);
    process.exit(1);
  }
}

restoreDb();
