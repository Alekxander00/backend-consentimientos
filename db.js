import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const isRemote = Boolean(process.env.DATABASE_URL);

const config = isRemote ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // 🔧 CONFIGURACIONES CLAVE PARA EVITAR BLOQUEOS
  max: 20, // Máximo de conexiones
  idleTimeoutMillis: 30000, // Cerrar conexiones inactivas
  connectionTimeoutMillis: 5000,
  maxUses: 7500, // Rotación de conexiones
} : {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  ssl: false,
  // Mismas configuraciones para desarrollo
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxUses: 7500,
};

const pool = new Pool(config);

// Manejo mejorado de errores
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Función para consultas con manejo seguro
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed in', duration, 'ms');
    return res;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
};

export default pool;