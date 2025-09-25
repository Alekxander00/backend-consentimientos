import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Configuración para Railway (usa DATABASE_URL) o local
const config = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      // Configuraciones adicionales para producción
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Aumentar timeout
      maxUses: 7500,
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(config);

// Manejo de errores de conexión
pool.on('error', (err) => {
  console.error('❌ Error inesperado en el cliente de base de datos:', err);
  // No salir del proceso en producción, solo loggear
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Reintentando conexión...');
  } else {
    process.exit(-1);
  }
});

// Función para probar la conexión con reintentos
const testConnection = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('✅ Conexión a la base de datos establecida correctamente');
      
      // Verificar la versión de PostgreSQL
      const result = await client.query('SELECT version()');
      console.log('📊 Versión de PostgreSQL:', result.rows[0].version);
      
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ Intento ${i + 1}/${retries} - Error al conectar con la base de datos:`, err.message);
      
      if (i < retries - 1) {
        console.log(`⏳ Reintentando en ${delay/1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('💥 No se pudo conectar a la base de datos después de varios intentos');
        if (process.env.NODE_ENV === 'production') {
          // En producción, no salir del proceso, permitir que el health check maneje el error
          return false;
        } else {
          process.exit(1);
        }
      }
    }
  }
};

// Probar conexión al iniciar
testConnection().then(success => {
  if (success) {
    console.log('🎉 Base de datos conectada exitosamente');
  } else {
    console.log('⚠️ Base de datos no disponible, pero el servidor continuará');
  }
});

export default pool;