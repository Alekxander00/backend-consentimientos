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
    console.log("📥 Recibiendo consentimiento firmado...");
    console.log("📋 Body:", req.body);
    console.log("📎 Archivo:", req.file ? `Sí (${req.file.size} bytes)` : "No");

    const {
      idconsto,
      paciente_nombre,
      paciente_identificacion,
      paciente_telefono,
      paciente_direccion,
      aceptacion,
      declaracion,
      observaciones,
      profesional_id, // ✅ Debe ser un string o número simple
      id_access
    } = req.body;

    // ✅ VALIDACIONES BÁSICAS
    if (!req.file) {
      console.log("❌ No se proporcionó firma");
      return res.status(400).json({ error: "No se proporcionó firma" });
    }

    if (!paciente_nombre || !paciente_identificacion) {
      console.log("❌ Faltan campos obligatorios");
      return res.status(400).json({ error: "Nombre e identificación son obligatorios" });
    }

    const firmaData = req.file.buffer;

    // Iniciar transacción
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Insertar consentimiento firmado
      console.log("💾 Insertando en consentimientos_firmados...");
      const result = await client.query(
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
          firmaData,
          aceptacion, 
          declaracion, 
          observaciones || null,
          profesional_id || null
        ]
      );

      const consentimientoGuardado = result.rows[0];
      console.log("✅ Consentimiento guardado con ID:", consentimientoGuardado.id);

      // 2. Actualizar estado de firma en pacientes_access
      if (id_access) {
        console.log("🔄 Actualizando pacientes_access...");
        await client.query(
          `UPDATE pacientes_access 
           SET firmado = TRUE, fecha_firma = NOW() 
           WHERE id_access = $1`,
          [id_access]
        );
        console.log("✅ Paciente actualizado en access");
      }

      await client.query('COMMIT');
      
      console.log("🎉 Transacción completada exitosamente");
      res.json(consentimientoGuardado);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("❌ Error en transacción:", error);
      throw error;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error("❌ Error al registrar consentimiento firmado:", err);
    res.status(500).json({ error: "Error al registrar consentimiento firmado: " + err.message });
  }
});

export default router;