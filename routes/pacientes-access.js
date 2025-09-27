// routes/pacientes-access.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

// Obtener todos los pacientes de Access
router.get("/", async (req, res) => {
  try {
    console.log("📥 Solicitud recibida para /pacientes-access");
    
    const result = await pool.query(`
      SELECT 
        pa.*, 
        c.nombre as nombre_consentimiento,
        e.nombre as nombre_especialidad
      FROM pacientes_access pa
      LEFT JOIN consentimientos c ON pa.consentimiento_id = c.idconsto
      LEFT JOIN especialidades e ON c.especialidad = e.id
      WHERE pa.firmado = FALSE OR pa.firmado IS NULL
      ORDER BY pa.paciente_nombre
    `);
    
    console.log(`✅ Se encontraron ${result.rows.length} pacientes no firmados`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al obtener pacientes:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// Obtener paciente por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📥 Buscando paciente con ID: ${id}`);
    
    const result = await pool.query(`
      SELECT 
        pa.*, 
        c.*,
        c.nombre as nombre_consentimiento,
        e.nombre as nombre_especialidad,
        p.nombre as profesional_nombre,
        p.especialidad as profesional_especialidad
      FROM pacientes_access pa
      LEFT JOIN consentimientos c ON pa.consentimiento_id = c.idconsto
      LEFT JOIN especialidades e ON c.especialidad = e.id
      LEFT JOIN profesionales p ON pa.id_profesional = p.id
      WHERE pa.id_access = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }
    
    console.log(`✅ Paciente encontrado: ${result.rows[0].paciente_nombre}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error al obtener paciente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
export default router;