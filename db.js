// db.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const isRemote = Boolean(process.env.DATABASE_URL);

const config = isRemote ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
} : {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  ssl: false
};

const pool = new Pool(config);

pool.on("error", (err) => {
  console.error("Unexpected idle client error:", err);
});

// función opcional para debug (no es llamada automáticamente)
export async function testConnectionNonBlocking() {
  try {
    const client = await pool.connect();
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `);
    console.log("Tablas:", tables.rows.map(r => r.table_name));
    client.release();
  } catch (err) {
    console.error("No se pudo conectar a DB (no crítico):", err && err.message ? err.message : err);
  }
}

export default pool;
