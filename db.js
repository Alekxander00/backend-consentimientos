import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Configuración para Railway (usa DATABASE_URL proporcionada por Railway)
const config = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
} : {
  // Configuración local de respaldo
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: false
};

const pool = new Pool(config);

// Verificar conexión a la base de datos
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
    
    // Verificar que las tablas existan
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📊 Tablas disponibles:', tables.rows.map(t => t.table_name));
    client.release();
  } catch (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    console.error('Configuración usada:', {
      host: config.host || 'from DATABASE_URL',
      database: config.database || 'from DATABASE_URL'
    });
    process.exit(1);
  }
};

testConnection();

export default pool;