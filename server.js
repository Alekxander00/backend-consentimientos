// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./health.js";

dotenv.config();
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use("/health", healthRoutes);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));

// health simple y rápido (Railway exige 200)
app.get("/health", (req, res) => {
  return res.status(200).json({ status: "OK", ts: new Date().toISOString() });
});

// health-db para probar la DB manualmente
app.get("/health-db", async (req, res) => {
  try {
    const db = await import("./db.js");
    await db.default.query("SELECT 1");
    return res.status(200).json({ db: "OK" });
  } catch (err) {
    return res.status(500).json({ db: "ERROR", error: err.message });
  }
});

async function start() {
  try {
    // Intentamos cargar rutas — si fallan, logueamos pero no detenemos el servidor
    try {
      const consentimientos = (await import("./routes/consentimiento.js")).default;
      const consentimientosFirmados = (await import("./routes/consentimientosFirmados.js")).default;
      const generarPdf = (await import("./routes/generar-pdf.js")).default;
      const profesionales = (await import("./routes/profesionales.js")).default;
      const accessIntegration = (await import("./routes/access-integration.js")).default;

      app.use("/consentimientos", consentimientos);
      app.use("/consentimientos-firmados", consentimientosFirmados);
      app.use("/generar-pdf", generarPdf);
      app.use("/profesionales", profesionales);
      app.use("/access-integration", accessIntegration);
      console.log("✅ Rutas cargadas");
    } catch (err) {
      console.error("⚠️ Error cargando rutas (no crítico):", err && err.message ? err.message : err);
    }

    const PORT = process.env.PORT || 4000;
    const HOST = "0.0.0.0";

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Servidor en http://${HOST}:${PORT}`);
    });

  } catch (err) {
    console.error("Error arrancando servidor:", err);
    process.exit(1);
  }
}

start();

export default app;
