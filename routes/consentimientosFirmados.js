import express from "express";
import pool from "../db.js";
import multer from "multer";

const router = express.Router();

// Configuración de multer para memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Límite de 5MB
  }
});

// Guardar consentimiento firmado
router.post("/", upload.single('paciente_firma'), async (req, res) => {
  try {
    const {
      idconsto,
      paciente_nombre,
      paciente_identificacion,
      paciente_telefono,
      paciente_direccion,
      aceptacion,
      declaracion,
      observaciones,
      profesional_id
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó firma" });
    }

    // Usar el buffer directamente del archivo subido
    // La variable correcta es req.file.buffer, no firmaBuffer
    const firmaData = req.file.buffer;

    const result = await pool.query(
      `INSERT INTO consentimientos_firmados 
       (idconsto, paciente_nombre, paciente_identificacion, paciente_telefono, paciente_direccion, paciente_firma,
        aceptacion, declaracion, observaciones, profesional_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        idconsto, 
        paciente_nombre, 
        paciente_identificacion, 
        paciente_telefono || null, 
        paciente_direccion || null, 
        firmaData, // Usar el buffer directamente
        aceptacion, 
        declaracion, 
        observaciones || null,
        profesional_id || null
      ]
    );

    res.json(result.rows[0]);
    
  } catch (err) {
    console.error("Error al registrar consentimiento firmado:", err);
    res.status(500).json({ error: "Error al registrar consentimiento firmado" });
  }
});

// Obtener consentimientos firmados
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cf.*, 
        c.nombre as consentimiento_nombre,
        p.nombre as profesional_nombre,
        p.especialidad as profesional_especialidad,
        encode(cf.paciente_firma, 'base64') as paciente_firma_base64
      FROM consentimientos_firmados cf
      LEFT JOIN consentimientos c ON cf.idconsto = c.idconsto
      LEFT JOIN profesionales p ON cf.profesional_id = p.id
      ORDER BY cf.fecha_registro DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener consentimientos firmados" });
  }
});

// Obtener un consentimiento firmado por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        cf.*, 
        c.nombre as consentimiento_nombre,
        p.nombre as profesional_nombre,
        p.identificacion as profesional_identificacion,
        p.especialidad as profesional_especialidad,
        p.registro_profesional,
        p.telefono as profesional_telefono,
        p.direccion as profesional_direccion,
        encode(cf.paciente_firma, 'base64') as paciente_firma_base64
      FROM consentimientos_firmados cf
      LEFT JOIN consentimientos c ON cf.idconsto = c.idconsto
      LEFT JOIN profesionales p ON cf.profesional_id = p.id
      WHERE cf.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Consentimiento firmado no encontrado" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener consentimiento firmado" });
  }
});

export default router;