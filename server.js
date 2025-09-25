import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import consentimientosRoutes from "./routes/consentimiento.js";
import consentimientosFirmadosRoutes from "./routes/consentimientosFirmados.js";
import generarPdfRoutes from "./routes/generar-pdf.js";
import profesionalesRoutes from "./routes/profesionales.js";
import accessIntegrationRoutes from "./routes/access-integration.js";
import pool from "./db.js";

dotenv.config();

const app = express();

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(limiter);

// Configuración de CORS CORREGIDA
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://*.railway.app',
        'http://localhost:5173',
        'https://tu-frontend.railway.app' // Reemplaza con tu URL real
      ] 
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para preflight requests - FORMA CORRECTA
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HEALTH CHECK MEJORADO (pero simple)
app.get("/health", async (req, res) => {
  try {
    // Verificación rápida de la BD (pero no bloqueante)
    const client = await pool.connect().catch(err => {
      console.log('⚠️ BD no disponible, pero servidor funciona');
      return null;
    });
    
    if (client) {
      await client.query('SELECT 1');
      client.release();
    }
    
    res.status(200).json({ 
      status: "OK", 
      message: "Servidor funcionando",
      database: client ? "Conectada" : "No disponible",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    // Si hay error, igual responder 200 pero con info del error
    res.status(200).json({ 
      status: "WARNING", 
      message: "Servidor funcionando pero BD con problemas",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta raíz
app.get("/", (req, res) => {
  res.json({ 
    message: "Backend de Consentimientos Informados",
    version: "1.0.0",
    status: "Activo",
    endpoints: [
      "/health - Estado del servidor",
      "/consentimientos - Gestión de consentimientos",
      "/consentimientos-firmados - Consentimientos firmados",
      "/profesionales - Gestión de profesionales"
    ]
  });
});

// Rutas API (IMPORTANTE: mantener este orden)
app.use("/access-integration", accessIntegrationRoutes);
app.use("/consentimientos", consentimientosRoutes);
app.use("/consentimientos-firmados", consentimientosFirmadosRoutes);
app.use("/generar-pdf", generarPdfRoutes);
app.use("/profesionales", profesionalesRoutes);

// Ruta de prueba
app.get("/test", (req, res) => {
  res.json({ message: "Ruta de prueba funcionando correctamente" });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method 
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error global:", err.message);
  
  // Evitar el error de path-to-regexp específico
  if (err.message.includes('path-to-regexp')) {
    return res.status(400).json({ 
      error: "Error en la configuración de rutas",
      details: "Contacte al administrador del sistema"
    });
  }
  
  res.status(500).json({ 
    error: "Error interno del servidor",
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

const PORT = process.env.PORT || 4000;

// Función de inicio mejorada
const startServer = () => {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, '0.0.0.0', (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(`✅ Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 Ruta principal: http://localhost:${PORT}/`);
      resolve(server);
    });
  });
};

// Iniciar servidor con manejo de errores
startServer().catch(error => {
  console.error('❌ Error al iniciar servidor:', error);
  process.exit(1);
});

// Manejo de señales para graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, apagando gracefulmente...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, apagando gracefulmente...');
  process.exit(0);
});