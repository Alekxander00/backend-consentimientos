import express from "express";
import pool from "../db.js";
import { autenticarToken } from "../routes/auth.js";
import { filtrarPorHospital } from "../middleware/hospital.js";

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(autenticarToken);
router.use(filtrarPorHospital);

// Obtener pacientes del hospital actual
router.get("/", async (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    
    const result = await pool.query(
      `SELECT pa.*, c.nombre as nombre_consentimiento, e.nombre as nombre_especialidad
       FROM pacientes_access pa
       LEFT JOIN consentimientos c ON pa.consentimiento_id = c.idconsto
       LEFT JOIN especialidades e ON c.especialidad = e.id
       WHERE pa.hospital_id = $1 AND (pa.firmado = FALSE OR pa.firmado IS NULL)
       ORDER BY pa.paciente_nombre`,
      [hospitalId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;