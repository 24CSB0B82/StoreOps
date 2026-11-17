const { pool } = require('../config/db');
const { runMigrations } = require('./migrate');
const { seedDatabase } = require('./seed');

/**
 * Drop all StoreOps tables and recreate schema from scratch
 */
const resetDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('[DB Reset] Dropping existing StoreOps tables...');
    await client.query('BEGIN');
    await client.query(`
      DROP TABLE IF EXISTS schema_migrations CASCADE;
      DROP TABLE IF EXISTS inventory_transactions CASCADE;
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS suppliers CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    await client.query('COMMIT');
    console.log('[DB Reset] All tables dropped.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB Reset Error]: Could not drop tables:', error);
    process.exit(1);
  } finally {
    client.release();
  }

  // Run migrations then seed
  await runMigrations();
  await seedDatabase();
  console.log('[DB Reset] Database reset and reseeded successfully.');
  await pool.end();
};

if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };
