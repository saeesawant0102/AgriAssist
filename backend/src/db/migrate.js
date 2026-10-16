import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Runs all pending migrations in alphabetical order.
 * Each migration is executed inside a single transaction and recorded in schema_migrations.
 * @param {import('./connection.js').Database} db
 * @param {string} [migrationsDir]
 * @returns {Promise<string[]>} Array of newly applied migration file names
 */
export async function migrate(db, migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  // Ensure schema_migrations table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const appliedRows = await db.all('SELECT version FROM schema_migrations');
  const appliedSet = new Set(appliedRows.map((r) => r.version));

  const newlyApplied = [];

  for (const file of files) {
    if (!appliedSet.has(file)) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await db.transaction(async (tx) => {
        if (sql.trim().length > 0) {
          await tx.exec(sql);
        }
        await tx.run(
          'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
          [file, new Date().toISOString()]
        );
      });

      newlyApplied.push(file);
    }
  }

  return newlyApplied;
}
