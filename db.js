import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Configuración para Railway (usa DATABASE_URL) o local
const config = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Necesario para Railway
      }
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pool = new Pool(config);

// Manejo de errores de conexión
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de base de datos', err);
  process.exit(-1);
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a la base de datos establecida correctamente');
    
    // Verificar la versión de PostgreSQL
    const result = await client.query('SELECT version()');
    console.log('📊 Versión de PostgreSQL:', result.rows[0].version);
    
    client.release();
  } catch (err) {
    console.error('❌ Error al conectar con la base de datos:', err.message);
    
    if (process.env.NODE_ENV === 'production') {
      console.log('🔧 Verifica tu DATABASE_URL en Railway');
      console.log('🔧 Asegúrate de que la base de datos esté activa');
    }
    
    process.exit(1);
  }
};

testConnection();

export default pool;