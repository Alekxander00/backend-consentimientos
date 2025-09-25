import express from "express";
import pool from "../db.js";

const router = express.Router();

// Obtener todos los profesionales
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM profesionales ORDER BY nombre");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener profesionales" });
  }
});

// Obtener un profesional por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM profesionales WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener profesional" });
  }
});

// Crear un nuevo profesional
router.post("/", async (req, res) => {
  try {
    const {
      nombre,
      identificacion,
      especialidad,
      registro_profesional,
      correo,
      telefono,
      direccion
    } = req.body;

    const result = await pool.query(
      `INSERT INTO profesionales 
       (nombre, identificacion, especialidad, registro_profesional, correo, telefono, direccion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nombre, identificacion, especialidad, registro_profesional, correo, telefono, direccion]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar profesional" });
  }
});

// Actualizar un profesional
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      identificacion,
      especialidad,
      registro_profesional,
      correo,
      telefono,
      direccion
    } = req.body;

    const result = await pool.query(
      `UPDATE profesionales 
       SET nombre = $1, identificacion = $2, especialidad = $3, registro_profesional = $4, 
           correo = $5, telefono = $6, direccion = $7
       WHERE id = $8
       RETURNING *`,
      [nombre, identificacion, especialidad, registro_profesional, correo, telefono, direccion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar profesional" });
  }
});

export default router;