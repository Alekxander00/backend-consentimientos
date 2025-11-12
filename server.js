import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./health.js";
import pool from "./db.js";

dotenv.config();
const app = express();

// 🔑 Configurar CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health routes
app.use("/health", healthRoutes);

// health simple y rápido (Railway exige 200)
app.get("/health", (req, res) => res.send("OK"));

// health-db para probar la DB manualmente
app.get("/health-db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({ db: "OK" });
  } catch (err) {
    return res.status(500).json({ db: "ERROR", error: err.message });
  }
});

app.get("/test", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({ db: "OK" });
  } catch (err) {
    return res.status(500).json({ db: "ERROR", error: err.message });
  }
});

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.method === 'POST' && req.body) {
    console.log('Body:', JSON.stringify(req.body).substring(0, 200));
  }
  next();
});

async function start() {
  try {
    console.log("🚀 Iniciando servidor...");
    
    // Intentamos cargar rutas
    try {
      console.log("📁 Cargando rutas...");
      
      // ✅ CARGAR TODAS LAS RUTAS
      const auth = (await import("./routes/auth.js")).default;
      const consentimientos = (await import("./routes/consentimiento.js")).default;
      const consentimientosFirmados = (await import("./routes/consentimientosFirmados.js")).default;
      const generarPdf = (await import("./routes/generar-pdf.js")).default;
      const profesionales = (await import("./routes/profesionales.js")).default;
      const accessIntegration = (await import("./routes/access-integration.js")).default;
      const pacientesAccess = (await import("./routes/pacientes-access.js")).default;
      const accessUpdate = (await import("./routes/access-update.js")).default;
      const whatsapp = (await import("./routes/whatsapp.js")).default;

      // ✅ REGISTRAR RUTAS CON PREFIJO /api
      app.use("/api/auth", auth);
      app.use("/api/consentimientos", consentimientos);
      app.use("/api/consentimientos-firmados", consentimientosFirmados);
      app.use("/api/generar-pdf", generarPdf);
      app.use("/api/profesionales", profesionales);
      app.use("/api/access-integration", accessIntegration);
      app.use("/api/pacientes-access", pacientesAccess);
      app.use("/api/access-update", accessUpdate);
      app.use("/api/whatsapp", whatsapp);
      
      console.log("✅ Todas las rutas cargadas correctamente");
      
      // Ruta de prueba para verificar que las rutas están funcionando
      app.get("/api/test", (req, res) => {
        res.json({ 
          message: "API funcionando correctamente",
          timestamp: new Date().toISOString()
        });
      });
      
    } catch (err) {
      console.error("❌ Error cargando rutas:", err);
    }

    const PORT = process.env.PORT || 4000;
    const HOST = "0.0.0.0";

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Servidor en http://${HOST}:${PORT}`);
      console.log(`🔐 Ruta de autenticación: http://${HOST}:${PORT}/api/auth/login`);
      console.log(`🔍 Ruta de prueba: http://${HOST}:${PORT}/api/test`);
      console.log(`📱 Ruta WhatsApp: http://${HOST}:${PORT}/api/whatsapp/health`);
    });

  } catch (err) {
    console.error("❌ Error arrancando servidor:", err);
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

start();

export default app;