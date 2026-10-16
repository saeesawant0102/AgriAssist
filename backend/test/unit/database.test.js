import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Database } from '../../src/db/connection.js';

describe('Database connection & transaction layer', () => {
  let db;

  beforeEach(async () => {
    db = await Database.open(':memory:');
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('SE-2: enforces PRAGMA foreign_keys = ON', async () => {
    const row = await db.get('PRAGMA foreign_keys;');
    expect(row.foreign_keys).toBe(1);
  });

  it('DB.Crud: executes basic statements with run, get, and all', async () => {
    await db.exec(`
      CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
    `);

    const result = await db.run('INSERT INTO items (name) VALUES (?)', ['Corn']);
    expect(result.lastID).toBe(1);
    expect(result.changes).toBe(1);

    const item = await db.get('SELECT * FROM items WHERE id = ?', [1]);
    expect(item).toEqual({ id: 1, name: 'Corn' });

    await db.run('INSERT INTO items (name) VALUES (?)', ['Wheat']);
    const allItems = await db.all('SELECT * FROM items ORDER BY id ASC');
    expect(allItems).toHaveLength(2);
    expect(allItems[1].name).toBe('Wheat');
  });

  it('DB.Transaction.Commit: commits all operations upon successful completion', async () => {
    await db.exec(`
      CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance REAL);
      INSERT INTO accounts (id, balance) VALUES (1, 100), (2, 200);
    `);

    await db.transaction(async (tx) => {
      await tx.run('UPDATE accounts SET balance = balance - 50 WHERE id = 1');
      await tx.run('UPDATE accounts SET balance = balance + 50 WHERE id = 2');
    });

    const acc1 = await db.get('SELECT balance FROM accounts WHERE id = 1');
    const acc2 = await db.get('SELECT balance FROM accounts WHERE id = 2');
    expect(acc1.balance).toBe(50);
    expect(acc2.balance).toBe(250);
  });

  it('DB.Transaction.Rollback: rolls back operations on error', async () => {
    await db.exec(`
      CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance REAL);
      INSERT INTO accounts (id, balance) VALUES (1, 100), (2, 200);
    `);

    await expect(
      db.transaction(async (tx) => {
        await tx.run('UPDATE accounts SET balance = balance - 50 WHERE id = 1');
        throw new Error('Simulation failure inside transaction');
      })
    ).rejects.toThrow('Simulation failure inside transaction');

    const acc1 = await db.get('SELECT balance FROM accounts WHERE id = 1');
    expect(acc1.balance).toBe(100);
  });

  it('DB.Transaction.Serialise: serialises concurrent transactions without race conditions', async () => {
    await db.exec(`
      CREATE TABLE counter (id INTEGER PRIMARY KEY, val INTEGER);
      INSERT INTO counter (id, val) VALUES (1, 0);
    `);

    const runTx = () =>
      db.transaction(async (tx) => {
        const row = await tx.get('SELECT val FROM counter WHERE id = 1');
        await new Promise((r) => setTimeout(r, 10)); // simulate slight delay
        await tx.run('UPDATE counter SET val = ? WHERE id = 1', [row.val + 1]);
      });

    // Run 5 transactions concurrently
    await Promise.all([runTx(), runTx(), runTx(), runTx(), runTx()]);

    const finalRow = await db.get('SELECT val FROM counter WHERE id = 1');
    expect(finalRow.val).toBe(5);
  });

  it('DB.Transaction.Wait: non-transactional db operations wait for open transactions', async () => {
    await db.exec(`
      CREATE TABLE logs (msg TEXT);
    `);

    let txFinished = false;

    const txPromise = db.transaction(async (tx) => {
      await tx.run('INSERT INTO logs (msg) VALUES (?)', ['from_tx']);
      await new Promise((r) => setTimeout(r, 20));
      txFinished = true;
    });

    const getPromise = db.get('SELECT COUNT(*) as count FROM logs').then((res) => {
      // Must only resolve after tx finishes
      expect(txFinished).toBe(true);
      return res;
    });

    const [_, result] = await Promise.all([txPromise, getPromise]);
    expect(result.count).toBe(1);
  });

  it('DB.Backup: creates a valid copy with backupTo and rejects existing target', async () => {
    await db.exec(`CREATE TABLE data (val TEXT); INSERT INTO data (val) VALUES ('test');`);

    const backupPath = path.join(process.cwd(), 'data', 'test-backup.db');
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);

    await db.backupTo(backupPath);
    expect(fs.existsSync(backupPath)).toBe(true);

    // Opening the backup to verify integrity
    const backupDb = await Database.open(backupPath);
    const row = await backupDb.get('SELECT val FROM data');
    expect(row.val).toBe('test');
    await backupDb.close();

    // Trying to backupTo existing file must throw
    await expect(db.backupTo(backupPath)).rejects.toThrow('already exists');

    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
  });
});
