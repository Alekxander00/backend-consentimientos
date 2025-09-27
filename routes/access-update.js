// routes/access-update.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

// Endpoint específico para actualizaciones desde Access
router.put("/paciente/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      version, // ✅ Nuevo campo requerido para control de concurrencia
      paciente_nombre,
      paciente_identificacion,
      paciente_telefono,
      paciente_direccion,
      consentimiento_id,
      id_profesional,
      firmado
    } = req.body;

    // Validar que se envíe la versión
    if (version === undefined || version === null) {
      return res.status(400).json({
        success: false,
        error: "Se requiere el campo 'version' para control de concurrencia"
      });
    }

    // Usar la función PostgreSQL con control de concurrencia
    const result = await pool.query(
      "SELECT actualizar_paciente_access($1, $2, $3, $4, $5, $6, $7, $8, $9) as resultado",
      [
        parseInt(id), version, paciente_nombre, paciente_identificacion,
        paciente_telefono, paciente_direccion, consentimiento_id, 
        id_profesional, firmado
      ]
    );

    const resultado = result.rows[0].resultado;
    
    if (resultado.success) {
      res.json({
        success: true,
        message: resultado.message,
        nueva_version: resultado.nueva_version
      });
    } else {
      // Manejar diferentes tipos de error
      if (resultado.error === 'CONCURRENCY_CONFLICT') {
        res.status(409).json({ // HTTP 409 Conflict
          success: false,
          error: resultado.error,
          message: resultado.message,
          version_actual: resultado.version_actual
        });
      } else if (resultado.error === 'RECORD_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: resultado.error,
          message: resultado.message
        });
      } else if (resultado.error === 'DUPLICATE_IDENTIFICATION') {
        res.status(400).json({
          success: false,
          error: resultado.error,
          message: resultado.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: resultado.error,
          message: resultado.message
        });
      }
    }

  } catch (err) {
    console.error("Error en PUT /access-update/paciente/:id", err);
    res.status(500).json({ 
      success: false,
      error: "Error interno del servidor: " + err.message 
    });
  }
});

router.get("/paciente/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        pa.*,
        c.nombre as nombre_consentimiento,
        p.nombre as nombre_profesional,
        -- Incluir la versión para control de concurrencia
        pa.version as version_actual
      FROM pacientes_access pa
      LEFT JOIN consentimientos c ON pa.consentimiento_id = c.idconsto
      LEFT JOIN profesionales p ON pa.id_profesional = p.id
      WHERE pa.id_access = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Paciente no encontrado" 
      });
    }

    res.json({
      success: true,
      paciente: result.rows[0],
      version_actual: result.rows[0].version_actual
    });

  } catch (err) {
    console.error("Error en GET /access-update/paciente/:id", err);
    res.status(500).json({ 
      success: false,
      error: "Error interno del servidor" 
    });
  }
});

// Endpoint para crear nuevos pacientes desde Access
// Endpoint mejorado para crear pacientes
router.post("/paciente/nuevo", async (req, res) => {
  try {
    const {
      paciente_nombre,
      paciente_identificacion,
      paciente_telefono,
      paciente_direccion,
      consentimiento_id,
      id_profesional
    } = req.body;

    // Validaciones básicas
    if (!paciente_nombre || !paciente_identificacion) {
      return res.status(400).json({
        success: false,
        error: "Nombre e identificación son obligatorios"
      });
    }

    // Usar la función PostgreSQL
    const result = await pool.query(
      "SELECT fn_insertar_paciente_access($1, $2, $3, $4, $5, $6) as resultado",
      [paciente_nombre, paciente_identificacion, paciente_telefono, 
       paciente_direccion, consentimiento_id, id_profesional]
    );

    const resultado = result.rows[0].resultado;
    
    if (resultado.success) {
      res.json({
        success: true,
        id_access: resultado.id_access,
        message: resultado.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: resultado.error,
        id_existente: resultado.id_existente
      });
    }

  } catch (err) {
    console.error("Error en POST /access-update/paciente/nuevo", err);
    res.status(500).json({ 
      success: false,
      error: "Error interno del servidor: " + err.message 
    });
  }
});

export default router;