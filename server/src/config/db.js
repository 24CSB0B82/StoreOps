const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool configuration
const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'storeops',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    };

const pool = new Pool({
  ...poolConfig,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
});

// Pool error handling for unexpected errors on idle clients
pool.on('error', (err) => {
  console.error('[Database Pool Error]: Unexpected error on idle client', err.message);
});

/**
 * Execute a single query using a client from the pool
 * @param {string} text - SQL query string
 * @param {Array} params - Array of parameter values ($1, $2, ...)
 */
const query = (text, params) => pool.query(text, params);

/**
 * Acquire a dedicated client from the pool for transactions
 * NOTE: The caller MUST call client.release() in a finally block!
 */
const getClient = () => pool.connect();

/**
 * Test connectivity to PostgreSQL database
 */
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as database');
    return {
      connected: true,
      time: res.rows[0].current_time,
      database: res.rows[0].database,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
};
