// routes/pacientes-access.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

// Obtener todos los pacientes de Access
router.get("/", async (req, res) => {
  try {
    console.log("📥 Solicitud recibida para /pacientes-access");
    const result = await pool.query('SELECT * FROM pacientes_access ORDER BY paciente_nombre');
    console.log(`✅ Se encontraron ${result.rows.length} pacientes`);
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
    
    const result = await pool.query(
      'SELECT * FROM pacientes_access WHERE id_access = $1', 
      [id]
    );
    
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