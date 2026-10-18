# AgriAssist — Database Backup and Recovery Guide

**Requirements:** D20, OR-4, OR-5, Section 7.4, Section 15 (Phase 8)

This document provides operational instructions for automated and manual backup and recovery of the AgriAssist SQLite database.

---

## 1. Architecture Overview

AgriAssist uses SQLite in WAL (`Write-Ahead Logging`) mode located at `backend/data/agriassist.db` (configurable via `DATABASE_PATH`).

### Key Characteristics
- **Non-blocking backups:** Performed using SQLite's native `VACUUM INTO` command via `Database.backupTo()`. This produces a clean, consistent snapshot without taking exclusive database locks or corrupting active reader transactions.
- **Timestamped snapshots:** Saved with ISO UTC timestamps (e.g. `agriassist_2026-10-18T02-00-00-000Z.db`).
- **Retention management:** Automatically preserves the newest `BACKUP_RETAIN_COUNT` (default: 7) snapshots, pruning older backups to prevent unbounded disk growth.

---

## 2. Automated Scheduled Backups

The backend includes a scheduled job (`backend/src/jobs/dailyBackup.js`) registered in `backend/src/jobs/scheduler.js`.

### Configuration (`backend/.env`)
```bash
# Cron schedule (standard 5-part cron syntax; default: daily at 02:00 AM)
BACKUP_CRON=0 2 * * *

# Target directory for backup files (relative to backend root or absolute)
BACKUP_DIR=./data/backups

# Number of most recent backups to retain
BACKUP_RETAIN_COUNT=7
```

> [!NOTE]
> Scheduled background jobs run inside the Node.js backend process. Scheduled backups execute only while the backend server process is running. If the server is offline at the scheduled hour, the backup will run on the next cycle when the server is active.

---

## 3. Manual Backup

You can trigger an immediate manual backup at any time while the server is running or offline.

### Command
```bash
# From repository root:
npm --prefix backend run db:backup

# Or from backend directory:
npm run db:backup
```

### Execution Output
```
[Backup] Starting manual database backup...
[Backup] Target backup directory: C:\SPIT\SPIT SEM-5\SE\AgriAssist\backend\data\backups
[Backup] Database backup completed successfully.
[Backup] File: C:\SPIT\SPIT SEM-5\SE\AgriAssist\backend\data\backups\agriassist_2026-10-18T06-30-00-000Z.db
[Backup] Total backups: 1 (retained 1 of 7 max).
```

---

## 4. Database Restore Procedure

> [!CAUTION]
> **Prerequisite:** You MUST STOP the backend server process before running a database restore.
> Restoring while SQLite has an open file handle or active WAL transactions can cause WAL journal mismatch and data corruption.

### Step 1: Stop the Application Server
If running `npm run dev` or `npm --prefix backend start`, terminate the process (`Ctrl + C`).

### Step 2: Choose a Backup File
List the available backup files in `backend/data/backups/`:
```bash
dir backend\data\backups
```
Pick the desired snapshot file (e.g. `backend/data/backups/agriassist_2026-10-18T02-00-00-000Z.db`).

### Step 3: Run the Restore Script
Pass the backup file path as an argument to `db:restore`:

```bash
# From repository root:
npm --prefix backend run db:restore -- ./data/backups/agriassist_2026-10-18T02-00-00-000Z.db

# Or with an absolute path:
npm --prefix backend run db:restore -- C:\SPIT\SPIT SEM-5\SE\AgriAssist\backend\data\backups\agriassist_2026-10-18T02-00-00-000Z.db
```

### What the Restore Script Does:
1. Verifies that the specified backup file exists and is accessible.
2. Performs a pre-restore integrity check on the backup file.
3. Automatically creates a safety backup of your current database (`agriassist.db.pre-restore-<timestamp>`).
4. Overwrites the live database file with the verified backup snapshot.
5. Deletes existing `-wal` and `-shm` auxiliary files to avoid stale WAL journal conflicts.
6. Connects to the restored database and executes `PRAGMA integrity_check`.
7. Executes a smoke query (`SELECT count(*) FROM users`) to confirm queryability.

### Sample Success Output
```
[Restore] Target database: C:\SPIT\SPIT SEM-5\SE\AgriAssist\backend\data\agriassist.db
[Restore] Source backup: C:\SPIT\SPIT SEM-5\SE\AgriAssist\backend\data\backups\agriassist_2026-10-18T02-00-00-000Z.db
[Restore] Pre-restore backup created at: ...\agriassist.db.pre-restore-1771234567890
[Restore] Live database replaced successfully.
[Restore] Stale WAL and SHM files cleaned.
[Restore] Running PRAGMA integrity_check...
[Restore] Integrity check PASSED: ok
[Restore] Verified readability: 3 users found.
[Restore] Database restore completed successfully!
```

### Step 4: Restart the Backend Server
```bash
npm run dev
```

---

## 5. Failure Scenarios and Troubleshooting

| Scenario | Symptom / Error | Resolution |
|---|---|---|
| **Server Still Running** | `EBUSY: resource locked` or `database is locked` | Stop the backend server process before executing `npm run db:restore`. |
| **Corrupt Backup File** | `[Restore Error] Integrity check failed: ...` | The restore script automatically aborts and preserves your existing database and pre-restore copy. Choose an earlier snapshot. |
| **Backup File Missing** | `[Restore Error] Backup file not found` | Verify the file path passed after `--`. Use quotes if the path contains spaces. |
| **Disk Space Exhaustion** | `ENOSPC: no space left on device` | Check disk space. Old backups are automatically pruned to `BACKUP_RETAIN_COUNT`, but ensure the drive has adequate headroom for `VACUUM INTO`. |
| **Target Exists During Backup** | `destination database already exists` | `Database.backupTo()` generates UTC microsecond-level timestamps. Ensure clock synchronization if running rapid successive backups. |

---

## 6. Verification and Acceptance

Backup and recovery operations are covered by automated unit and integration tests:
```bash
npm --prefix backend test test/unit/backup.test.js
```
The test suite validates:
- `OR-4`: Backup creation via `Database.backupTo()` with `VACUUM INTO`.
- `OR-4`: Automatic retention pruning when backup count exceeds `BACKUP_RETAIN_COUNT`.
- `OR-5`: Database restore, stale WAL removal, and `PRAGMA integrity_check`.
- `D18`: Scheduler registration of daily backup job alongside irrigation refresh.
