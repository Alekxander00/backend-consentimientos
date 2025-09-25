import express from "express";
import pool from "../db.js";

const router = express.Router();

// Sincronizar paciente desde Access
router.post("/sincronizar-paciente", async (req, res) => {
  try {
    const {
      id_access,
      paciente_nombre,
      paciente_identificacion,
      paciente_telefono,
      paciente_direccion,
      consentimiento_id
    } = req.body;

    // Validar campos obligatorios
    if (!paciente_nombre || !paciente_identificacion || !consentimiento_id) {
      return res.status(400).json({ 
        error: "Nombre, identificación y consentimiento son obligatorios" 
      });
    }

    // Insertar o actualizar paciente
    const result = await pool.query(`
      INSERT INTO pacientes_access 
      (id_access, paciente_nombre, paciente_identificacion, paciente_telefono, paciente_direccion, consentimiento_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id_access) 
      DO UPDATE SET 
        paciente_nombre = EXCLUDED.paciente_nombre,
        paciente_identificacion = EXCLUDED.paciente_identificacion,
        paciente_telefono = EXCLUDED.paciente_telefono,
        paciente_direccion = EXCLUDED.paciente_direccion,
        consentimiento_id = EXCLUDED.consentimiento_id,
        fecha_actualizacion = CURRENT_TIMESTAMP
      RETURNING *
    `, [id_access, paciente_nombre, paciente_identificacion, paciente_telefono, paciente_direccion, consentimiento_id]);

    // Generar URL única para firmar
    const paciente = result.rows[0];
    const urlFirma = `http://localhost:5173/firmar/${paciente.paciente_identificacion}`;

    res.json({
      success: true,
      url_firma: urlFirma,
      paciente: paciente
    });
  } catch (err) {
    console.error("Error al sincronizar paciente:", err);
    res.status(500).json({ error: "Error al sincronizar paciente" });
  }
});

// Obtener datos para firma
router.get("/paciente/:identificacion", async (req, res) => {
  try {
    const { identificacion } = req.params;

    const result = await pool.query(`
      SELECT 
        pa.*,
        c.nombre as consentimiento_nombre,
        c.inf_gral,
        c.enque_consiste,
        c.dosis,
        c.como_aplica,
        c.beneficios,
        c.riesgos,
        c.otras_alt_hay
      FROM pacientes_access pa
      LEFT JOIN consentimientos c ON pa.consentimiento_id = c.idconsto
      WHERE pa.paciente_identificacion = $1
    `, [identificacion]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener paciente:", err);
    res.status(500).json({ error: "Error al obtener paciente" });
  }
});

export default router;