import express from "express";
import pool from "../db.js";

const router = express.Router();

// Obtener todos los consentimientos
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM consentimientos ORDER BY idconsto DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener consentimientos" });
  }
});

// Obtener un consentimiento por ID
router.get("/", async (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const result = await pool.query(
      "SELECT * FROM consentimientos WHERE hospital_id = $1 ORDER BY idconsto DESC",
      [hospitalId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener consentimientos" });
  }
});
// Insertar un consentimiento
router.post("/", async (req, res) => {
  try {
    const {
      especialidad,
      nombre,
      inf_gral,
      enque_consiste,
      dosis,
      como_aplica,
      beneficios,
      riesgos,
      otras_alt_hay,
      expr_volt,
      dat_inst,
      vac_etapa,
      vac_estrategia,
      vac_bio,
      vac_dosis
    } = req.body;

    const result = await pool.query(
      `INSERT INTO consentimientos 
       (especialidad, nombre, inf_gral, enque_consiste, dosis, como_aplica, beneficios, riesgos, otras_alt_hay, expr_volt, dat_inst, vac_etapa, vac_estrategia, vac_bio, vac_dosis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [especialidad, nombre, inf_gral, enque_consiste, dosis, como_aplica, beneficios, riesgos, otras_alt_hay, expr_volt, dat_inst, vac_etapa, vac_estrategia, vac_bio, vac_dosis]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar consentimiento" });
  }
});

// Actualizar un consentimiento
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      especialidad,
      nombre,
      inf_gral,
      enque_consiste,
      dosis,
      como_aplica,
      beneficios,
      riesgos,
      otras_alt_hay,
      expr_volt,
      dat_inst,
      vac_etapa,
      vac_estrategia,
      vac_bio,
      vac_dosis
    } = req.body;

    const result = await pool.query(
      `UPDATE consentimientos 
       SET especialidad = $1, nombre = $2, inf_gral = $3, enque_consiste = $4, dosis = $5, como_aplica = $6, 
           beneficios = $7, riesgos = $8, otras_alt_hay = $9, expr_volt = $10, dat_inst = $11, 
           vac_etapa = $12, vac_estrategia = $13, vac_bio = $14, vac_dosis = $15
       WHERE idconsto = $16
       RETURNING *`,
      [especialidad, nombre, inf_gral, enque_consiste, dosis, como_aplica, beneficios, riesgos, otras_alt_hay, expr_volt, dat_inst, vac_etapa, vac_estrategia, vac_bio, vac_dosis, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Consentimiento no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar consentimiento" });
  }
});

// Eliminar un consentimiento
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM consentimientos WHERE idconsto = $1 RETURNING *", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Consentimiento no encontrado" });
    }
    
    res.json({ message: "Consentimiento eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar consentimiento" });
  }
});

export default router;