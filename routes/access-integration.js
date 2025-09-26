import express from "express";
import db from "../db.js";

const router = express.Router();

// Endpoint específico para firma desde Access
router.get("/paciente/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Consulta completa para firma
    const pacienteResult = await db.query(
      `SELECT 
         pa.*, 
         c.*,
         p.nombre as profesional_nombre,
         p.identificacion as profesional_identificacion,
         p.especialidad as profesional_especialidad,
         p.registro_profesional,
         p.telefono as profesional_telefono,
         p.direccion as profesional_direccion,
         p.correo as profesional_correo
       FROM public.pacientes_access pa
       LEFT JOIN public.consentimientos c ON pa.consentimiento_id = c.idconsto
       LEFT JOIN public.profesionales p ON pa.id_profesional = p.id
       WHERE pa.id_access = $1`,
      [id]
    );

    if (pacienteResult.rows.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json(pacienteResult.rows[0]);
  } catch (err) {
    console.error("Error en GET /firma-access/paciente/:id", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint alternativo por query string
router.get("/paciente", async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Se requiere el ID del paciente" });
    }

    const pacienteResult = await db.query(
      `SELECT 
         pa.*, 
         c.*,
         p.nombre as profesional_nombre,
         p.identificacion as profesional_identificacion,
         p.especialidad as profesional_especialidad,
         p.registro_profesional,
         p.telefono as profesional_telefono,
         p.direccion as profesional_direccion,
         p.correo as profesional_correo
       FROM public.pacientes_access pa
       LEFT JOIN public.consentimientos c ON pa.consentimiento_id = c.idconsto
       LEFT JOIN public.profesionales p ON pa.id_profesional = p.id
       WHERE pa.id_access = $1`,
      [id]
    );

    if (pacienteResult.rows.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json(pacienteResult.rows[0]);
  } catch (err) {
    console.error("Error en GET /firma-access/paciente", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
