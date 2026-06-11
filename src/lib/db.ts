import pg from 'pg';
const { Pool } = pg;

// Lazy initialization of the database pool
let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (connectionString) {
      pool = new Pool({
        connectionString,
        ssl: connectionString.includes('railway.net') ? { rejectUnauthorized: false } : false
      });
    } else if (process.env.PGHOST) {
      pool = new Pool({
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT || '5432'),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: process.env.PGHOST.includes('railway') ? { rejectUnauthorized: false } : false
      });
    } else {
      throw new Error('DATABASE_URL or PostgreSQL connection variables are not defined');
    }

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return pool;
}

/**
 * Execute a query using the database pool.
 * Use this for simple, one-off queries.
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await getDbPool().query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

/**
 * Get a client from the pool for transactions.
 * IMPORTANT: You must call client.release() when finished.
 */
export async function getClient() {
  const client = await getDbPool().connect();
  return client;
}
