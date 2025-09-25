import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import consentimientosRoutes from "./routes/consentimiento.js";
import consentimientosFirmadosRoutes from "./routes/consentimientosFirmados.js";
import generarPdfRoutes from "./routes/generar-pdf.js";
import profesionalesRoutes from "./routes/profesionales.js"; // Nueva importación

dotenv.config();

const app = express();

// Configuración de CORS
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas
app.use("/consentimientos", consentimientosRoutes);
app.use("/consentimientos-firmados", consentimientosFirmadosRoutes);
app.use("/generar-pdf", generarPdfRoutes);
app.use("/profesionales", profesionalesRoutes); // Nueva ruta

// Ruta de prueba
app.get("/test", (req, res) => {
  res.json({ message: "Servidor funcionando correctamente" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});