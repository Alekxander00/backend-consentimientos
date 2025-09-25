import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import consentimientosRoutes from "./routes/consentimiento.js";
import consentimientosFirmadosRoutes from "./routes/consentimientosFirmados.js";
import generarPdfRoutes from "./routes/generar-pdf.js";
import profesionalesRoutes from "./routes/profesionales.js";
import accessIntegrationRoutes from "./routes/acces-integration.js";
import pool from "./db.js"; // Importar el pool de conexiones

dotenv.config();

const app = express();

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000 // Aumentar el límite para producción
});

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: false, // Desactivar CSP temporalmente para debugging
  crossOriginEmbedderPolicy: false
}));
app.use(limiter);

// Configuración de CORS más flexible para producción
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://*.railway.app',
        'http://localhost:5173'
      ] 
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para preflight requests


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ruta de health check MEJORADA
app.get("/health", async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.status(200).json({ 
      status: "OK", 
      message: "Servidor y base de datos funcionando correctamente",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: "ERROR", 
      message: "Error de conexión con la base de datos",
      error: error.message 
    });
  }
});

// Ruta de health check simple (alternativa)
app.get("/", (req, res) => {
  res.status(200).json({ 
    message: "Backend de Consentimientos funcionando",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// Rutas API
app.use("/access-integration", accessIntegrationRoutes);
app.use("/consentimientos", consentimientosRoutes);
app.use("/consentimientos-firmados", consentimientosFirmadosRoutes);
app.use("/generar-pdf", generarPdfRoutes);
app.use("/profesionales", profesionalesRoutes);

// Ruta de prueba
app.get("/test", (req, res) => {
  res.json({ message: "Servidor funcionando correctamente" });
});

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Middleware para manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error("Error global:", err.stack);
  res.status(500).json({ 
    error: "Error interno del servidor",
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

const PORT = process.env.PORT || 4000;

// Función para iniciar el servidor
const startServer = () => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor backend corriendo en puerto ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
};

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();