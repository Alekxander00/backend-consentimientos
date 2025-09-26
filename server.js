import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Importar rutas
import consentimientosRoutes from "./routes/consentimiento.js";
import consentimientosFirmadosRoutes from "./routes/consentimientosFirmados.js";
import generarPdfRoutes from "./routes/generar-pdf.js";
import profesionalesRoutes from "./routes/profesionales.js";
import accessIntegrationRoutes from "./routes/acces-integration.js";

dotenv.config();

const app = express();

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configurado para Railway
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas de la API
app.use("/consentimientos", consentimientosRoutes);
app.use("/consentimientos-firmados", consentimientosFirmadosRoutes);
app.use("/generar-pdf", generarPdfRoutes);
app.use("/profesionales", profesionalesRoutes);
app.use("/access-integration", accessIntegrationRoutes);

// Healthcheck mejorado para Railway
app.get("/health", async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    const db = await import('./db.js');
    const client = await db.default.connect();
    
    // Verificar que podemos hacer una consulta simple
    await client.query('SELECT 1 as health_check');
    client.release();
    
    res.status(200).json({
      status: "OK",
      message: "Servidor y base de datos funcionando correctamente",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    console.error('Healthcheck failed:', error);
    res.status(503).json({
      status: "ERROR",
      message: "Error de conexión a la base de datos",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta raíz
app.get("/", (req, res) => {
  res.json({
    message: "API de Consentimientos Médicos - Backend",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      health: "/health",
      consentimientos: "/consentimientos",
      consentimientos_firmados: "/consentimientos-firmados",
      profesionales: "/profesionales",
      access_integration: "/access-integration",
      generar_pdf: "/generar-pdf"
    }
  });
});

// Ruta de prueba de la base de datos
app.get("/test-db", async (req, res) => {
  try {
    const db = await import('./db.js');
    const result = await db.default.query('SELECT NOW() as current_time, version() as db_version');
    
    res.json({
      database: "Conectado correctamente",
      current_time: result.rows[0].current_time,
      db_version: result.rows[0].db_version
    });
  } catch (error) {
    res.status(500).json({
      error: "Error de conexión a la base de datos",
      details: error.message
    });
  }
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ 
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  res.status(500).json({ 
    error: "Error interno del servidor",
    ...(process.env.NODE_ENV === 'development' && { 
      details: err.message,
      stack: err.stack 
    })
  });
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// Iniciar servidor
app.listen(PORT, HOST, () => {
  console.log('🚀 Servidor iniciado correctamente');
  console.log(`📍 URL: http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Puerto: ${PORT}`);
});

export default app;