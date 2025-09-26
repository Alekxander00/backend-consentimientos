import express from "express";
import db from "../db.js";

// routes/access-integration.js
router.get("/paciente/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Consulta mejorada que incluye profesional y consentimiento
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
       FROM public_pacientes_access pa
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
    console.error("Error en GET /access-integration/paciente/:id", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// routes/access-integration.js
router.get("/paciente", async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Se requiere el ID del paciente" });
    }

    // Misma consulta que arriba
    const pacienteResult = await db.query(
      `SELECT ... (misma consulta de arriba) ... WHERE pa.id_access = $1`,
      [id]
    );

    if (pacienteResult.rows.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json(pacienteResult.rows[0]);
  } catch (err) {
    console.error("Error en GET /access-integration/paciente", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});