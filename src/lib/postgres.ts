import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

let pool: any = null;

if (connectionString) {
  const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000 // safer timeout for remote/Railway PostgreSQL connection handshakes
  });

  // Handle unexpected errors on idle clients to prevent unhandled exceptions
  pool.on("error", (err: any) => {
    console.warn("[PostgreSQL] Idle client connection issue/timeout:", err.message || err);
  });
}

export async function initPostgres() {
  if (!pool) {
    console.warn("[PostgreSQL] No DATABASE_URL or DATABASE_PUBLIC_URL specified. Skipping pool initialization.");
    return;
  }

  try {
    const client = await pool.connect();
    console.log("[PostgreSQL] Connected to Railway PostgreSQL successfully.");
    
    // Create files cache table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS railway_files_cache (
        filename VARCHAR(255) PRIMARY KEY,
        content TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    client.release();
    
    // Pull any existing files from database and restore them to local disk
    await loadAllFromPostgres();
  } catch (err) {
    console.error("[PostgreSQL] Connection structure check failed:", err);
  }
}

export async function loadAllFromPostgres() {
  if (!pool) return;
  try {
    const { rows } = await pool.query("SELECT filename, content FROM railway_files_cache");
    console.log(`[PostgreSQL] Sync: Found ${rows.length} files in database.`);
    for (const row of rows) {
      if (!row.filename || !row.content) continue;
      
      const fullPath = path.join(process.cwd(), row.filename);
      const dir = path.dirname(fullPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(fullPath, row.content, "utf8");
      console.log(`[PostgreSQL] Restored cache file from postgres: ${row.filename} (${row.content.length} bytes)`);
    }
  } catch (err) {
    console.error("[PostgreSQL] Error loading files from postgres:", err);
  }
}

export async function saveToPostgres(filename: string, content: string) {
  if (!pool) return;
  
  // Resolve relative to process.cwd() so it stores nicely e.g. "telegram_users_list.json"
  const relativePath = path.relative(process.cwd(), path.resolve(filename));
  try {
    await pool.query(
      `INSERT INTO railway_files_cache (filename, content, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (filename)
       DO UPDATE SET content = $2, updated_at = NOW()`,
      [relativePath, content]
    );
    console.log(`[PostgreSQL] Synchronized file to DB: ${relativePath}`);
  } catch (err) {
    console.error(`[PostgreSQL] Error saving ${relativePath} to postgres:`, err);
  }
}

export async function getPostgresPool() {
  return pool;
}
