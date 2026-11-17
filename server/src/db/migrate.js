const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

/**
 * Migration runner
 * Reads and applies SQL migration scripts in order.
 */
const runMigrations = async () => {
  const client = await pool.connect();

  try {
    console.log('[Migration] Starting database migrations...');

    // Create schema_migrations tracking table if it does not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get applied migrations
    const { rows: appliedMigrations } = await client.query(
      'SELECT filename FROM schema_migrations'
    );
    const appliedSet = new Set(appliedMigrations.map((r) => r.filename));

    // Read migration files in alphabetical/numerical order
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[Migration] Skipping already applied: ${file}`);
        continue;
      }

      console.log(`[Migration] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute migration inside a transaction
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      console.log(`[Migration] Successfully applied: ${file}`);
    }

    console.log('[Migration] All migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration Error]: Migration failed, transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    // Do not close pool if required programmatically
    if (require.main === module) {
      await pool.end();
    }
  }
};

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
