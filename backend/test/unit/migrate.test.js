import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Database } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';

describe('Database Migration Runner', () => {
  let db;
  const tempMigrationsDir = path.join(process.cwd(), 'test', 'temp_migrations');

  beforeEach(async () => {
    db = await Database.open(':memory:');
    if (fs.existsSync(tempMigrationsDir)) {
      fs.rmSync(tempMigrationsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempMigrationsDir, { recursive: true });
  });

  afterEach(async () => {
    if (db) await db.close();
    if (fs.existsSync(tempMigrationsDir)) {
      fs.rmSync(tempMigrationsDir, { recursive: true, force: true });
    }
  });

  it('Migration.Runner: creates schema_migrations and applies files in order', async () => {
    fs.writeFileSync(
      path.join(tempMigrationsDir, '001_initial.sql'),
      'CREATE TABLE test_one (id INTEGER PRIMARY KEY);'
    );
    fs.writeFileSync(
      path.join(tempMigrationsDir, '002_second.sql'),
      'CREATE TABLE test_two (id INTEGER PRIMARY KEY);'
    );

    const applied = await migrate(db, tempMigrationsDir);
    expect(applied).toEqual(['001_initial.sql', '002_second.sql']);

    const rows = await db.all('SELECT version FROM schema_migrations ORDER BY version ASC');
    expect(rows).toEqual([{ version: '001_initial.sql' }, { version: '002_second.sql' }]);
  });

  it('Migration.Idempotent: running migrations repeatedly does not reapply already applied files', async () => {
    fs.writeFileSync(
      path.join(tempMigrationsDir, '001_initial.sql'),
      'CREATE TABLE test_table (id INTEGER PRIMARY KEY);'
    );

    const firstRun = await migrate(db, tempMigrationsDir);
    expect(firstRun).toHaveLength(1);

    const secondRun = await migrate(db, tempMigrationsDir);
    expect(secondRun).toHaveLength(0);

    const rows = await db.all('SELECT version FROM schema_migrations');
    expect(rows).toHaveLength(1);
  });
});
