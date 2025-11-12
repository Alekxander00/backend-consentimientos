// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./health.js";
import pool from "./db.js"; // ✅ Importar pool directamente

dotenv.config();
const app = express();

// 🔑 Configurar CORS
app.use(cors({
  origin: "*" // en dev lo dejamos abierto, en prod puedes restringir
}));

app.use(express.json({ limit: "10mb" }));
app.use("/health", healthRoutes);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

// // ✅ Nueva ruta para pacientes access - DEFINIDA FUERA DEL BLOQUE ASYNC
// app.get('/api/pacientes-access', async (req, res) => {
//   try {
//     console.log("📥 Solicitud recibida para /api/pacientes-access");
//     const result = await pool.query('SELECT * FROM pacientes_access ORDER BY paciente_nombre');
//     console.log(`✅ Se encontraron ${result.rows.length} pacientes`);
//     res.json(result.rows);
//   } catch (error) {
//     console.error('❌ Error al obtener pacientes:', error);
//     res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
//   }
// });

// server.js - AGREGAR ESTAS MODIFICACIONES

// server.js - AGREGAR ESTO en la sección de rutas
async function start() {
  try {
    // Intentamos cargar rutas
    try {
        // ✅ AGREGAR ESTAS IMPORTACIONES
        const auth = (await import("./routes/auth.js")).default;
        
        const consentimientos = (await import("./routes/consentimiento.js")).default;
        const consentimientosFirmados = (await import("./routes/consentimientosFirmados.js")).default;
        const generarPdf = (await import("./routes/generar-pdf.js")).default;
        const profesionales = (await import("./routes/profesionales.js")).default;
        const accessIntegration = (await import("./routes/access-integration.js")).default;
        const pacientesAccess = (await import("./routes/pacientes-access.js")).default;
        const accessUpdate = (await import("./routes/access-update.js")).default;

        // ✅ REGISTRAR RUTAS (auth PRIMERO)
        app.use("/auth", auth);
        app.use("/consentimientos", consentimientos);
        app.use("/consentimientos-firmados", consentimientosFirmados);
        app.use("/generar-pdf", generarPdf);
        app.use("/profesionales", profesionales);
        app.use("/access-integration", accessIntegration);
        app.use("/pacientes-access", pacientesAccess);
        app.use("/access-update", accessUpdate);
        
        console.log("✅ Todas las rutas cargadas correctamente");
      } catch (err) {
        console.error("⚠️ Error cargando rutas:", err && err.message ? err.message : err);
      }

    const PORT = process.env.PORT || 4000;
    const HOST = "0.0.0.0";

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Servidor en http://${HOST}:${PORT}`);
      console.log(`🔐 Ruta de autenticación: http://${HOST}:${PORT}/auth/login`);
    });

  } catch (err) {
    console.error("Error arrancando servidor:", err);
    process.exit(1);
  }
}

start();

export default app;