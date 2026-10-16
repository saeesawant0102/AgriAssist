import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

export class Database {
  /**
   * @private
   * @param {sqlite3.Database} rawDb
   */
  constructor(rawDb) {
    this._rawDb = rawDb;
    this._queue = Promise.resolve();
    this._isClosed = false;
  }

  /**
   * Opens a new SQLite database connection and sets required pragmas.
   * @param {string} dbPath - Path to database file or ':memory:'
   * @returns {Promise<Database>}
   */
  static async open(dbPath = ':memory:') {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const rawDb = await new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });

    const database = new Database(rawDb);

    // Apply required PRAGMAs per Section 7.4
    await database._rawExec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
    `);

    return database;
  }

  /**
   * Enqueues an operation to run sequentially.
   * Any db.run/get/all call made while a transaction is open waits until the transaction finishes.
   * @private
   */
  _enqueue(op) {
    if (this._isClosed) {
      return Promise.reject(new Error('Database is closed'));
    }
    const run = () => op();
    const resultPromise = this._queue.then(run, run);
    // Keep queue alive even if an operation fails
    this._queue = resultPromise.then(
      () => {},
      () => {}
    );
    return resultPromise;
  }

  /**
   * Raw execution methods that execute directly on sqlite3.Database
   * @private
   */
  _rawRun(sql, params = []) {
    return new Promise((resolve, reject) => {
      this._rawDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * @private
   */
  _rawGet(sql, params = []) {
    return new Promise((resolve, reject) => {
      this._rawDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * @private
   */
  _rawAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      this._rawDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * @private
   */
  _rawExec(sql) {
    return new Promise((resolve, reject) => {
      this._rawDb.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Executes one statement; resolves { lastID, changes }.
   * @param {string} sql
   * @param {Array<any>} [params=[]]
   * @returns {Promise<{ lastID: number, changes: number }>}
   */
  run(sql, params = []) {
    return this._enqueue(() => this._rawRun(sql, params));
  }

  /**
   * Resolves the first row object, or undefined.
   * @param {string} sql
   * @param {Array<any>} [params=[]]
   * @returns {Promise<any | undefined>}
   */
  get(sql, params = []) {
    return this._enqueue(() => this._rawGet(sql, params));
  }

  /**
   * Resolves an array of row objects.
   * @param {string} sql
   * @param {Array<any>} [params=[]]
   * @returns {Promise<Array<any>>}
   */
  all(sql, params = []) {
    return this._enqueue(() => this._rawAll(sql, params));
  }

  /**
   * Executes multi-statement SQL.
   * @param {string} sql
   * @returns {Promise<void>}
   */
  exec(sql) {
    return this._enqueue(() => this._rawExec(sql));
  }

  /**
   * Runs the callback inside a serialized transaction.
   * Waits for the internal mutex, runs BEGIN IMMEDIATE, calls the callback with tx,
   * runs COMMIT (or ROLLBACK and re-throws on error), then releases the mutex.
   * @template T
   * @param {(tx: { run: Function, get: Function, all: Function, exec: Function }) => Promise<T>} callback
   * @returns {Promise<T>}
   */
  transaction(callback) {
    return this._enqueue(async () => {
      await this._rawExec('BEGIN IMMEDIATE');
      const tx = {
        run: (sql, params = []) => this._rawRun(sql, params),
        get: (sql, params = []) => this._rawGet(sql, params),
        all: (sql, params = []) => this._rawAll(sql, params),
        exec: (sql) => this._rawExec(sql),
      };

      try {
        const result = await callback(tx);
        await this._rawExec('COMMIT');
        return result;
      } catch (err) {
        try {
          await this._rawExec('ROLLBACK');
        } catch (rollbackErr) {
          console.error('Error during transaction rollback:', rollbackErr);
        }
        throw err;
      }
    });
  }

  /**
   * Writes a consistent copy of the database using VACUUM INTO.
   * Target file must not already exist.
   * @param {string} targetFilePath
   * @returns {Promise<void>}
   */
  async backupTo(targetFilePath) {
    if (fs.existsSync(targetFilePath)) {
      throw new Error(`Target backup file already exists: ${targetFilePath}`);
    }

    const dir = path.dirname(targetFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // VACUUM INTO with parameterized statement or escaped path
    return this._enqueue(async () => {
      try {
        await this._rawRun('VACUUM INTO ?', [targetFilePath]);
      } catch {
        // Fallback if sqlite3 does not accept parameter for VACUUM INTO
        const escaped = targetFilePath.replace(/'/g, "''");
        await this._rawExec(`VACUUM INTO '${escaped}'`);
      }
    });
  }

  /**
   * Closes the database connection after all pending operations finish.
   * @returns {Promise<void>}
   */
  close() {
    if (this._isClosed) {
      return Promise.resolve();
    }
    this._isClosed = true;

    const closeOp = () => {
      return new Promise((resolve, reject) => {
        this._rawDb.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    const resultPromise = this._queue.then(closeOp, closeOp);
    this._queue = resultPromise.then(
      () => {},
      () => {}
    );
    return resultPromise;
  }
}
