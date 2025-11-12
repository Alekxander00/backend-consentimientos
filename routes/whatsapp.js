import express from "express";
import pool from "../db.js";
import { enviarConsentimientoWhatsApp, guardarPDFTemporal } from "../services/whatsappService.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ruta para enviar consentimiento por WhatsApp
router.post("/enviar-consentimiento/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📤 Solicitando envío WhatsApp para consentimiento: ${id}`);

    // Obtener datos del consentimiento firmado
    const result = await pool.query(
      `SELECT 
        cf.*,
        c.nombre as consentimiento_nombre,
        p.nombre as profesional_nombre,
        encode(cf.paciente_firma, 'base64') as paciente_firma_base64
       FROM consentimientos_firmados cf
       LEFT JOIN consentimientos c ON cf.idconsto = c.idconsto
       LEFT JOIN profesionales p ON cf.profesional_id = p.id
       WHERE cf.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Consentimiento no encontrado" 
      });
    }

    const consentimiento = result.rows[0];

    // Generar PDF (usamos la misma lógica que generar-pdf.js)
    // Por simplicidad, aquí llamaremos a la función de generar PDF
    // En una implementación real, reutilizarías el código de generar-pdf.js
    
    // Por ahora, simulamos el PDF buffer
    // En producción, debes integrar con tu generador de PDFs existente
    const pdfBuffer = Buffer.from(`PDF simulando consentimiento ${id}`);

    // Enviar por WhatsApp
    const resultadoWhatsApp = await enviarConsentimientoWhatsApp(consentimiento, pdfBuffer);

    if (resultadoWhatsApp.success) {
      res.json({
        success: true,
        enlaceWhatsApp: resultadoWhatsApp.enlaceWhatsApp,
        enlaceDescarga: resultadoWhatsApp.enlaceDescarga,
        mensaje: "Enlace de WhatsApp generado correctamente"
      });
    } else {
      res.status(400).json({
        success: false,
        error: resultadoWhatsApp.error
      });
    }

  } catch (error) {
    console.error("❌ Error en envío WhatsApp:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor: " + error.message 
    });
  }
});

// Ruta para descargar PDF temporal
router.get("/descargar/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const TEMP_DIR = path.join(__dirname, '..', 'temp_pdfs');
    const archivoPath = path.join(TEMP_DIR, `consentimiento_${id}.pdf`);

    // Verificar que el archivo existe
    try {
      await fs.access(archivoPath);
    } catch {
      return res.status(404).json({ 
        success: false, 
        error: "Archivo no encontrado o expirado" 
      });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="consentimiento_${id}.pdf"`);
    
    // Enviar archivo
    const fileBuffer = await fs.readFile(archivoPath);
    res.send(fileBuffer);

    // No eliminar inmediatamente, dejar para limpieza programada
    console.log(`📤 PDF temporal descargado: ${id}`);

  } catch (error) {
    console.error("❌ Error descargando PDF temporal:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error al descargar archivo" 
    });
  }
});

// Ruta de salud para WhatsApp
router.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    servicio: "WhatsApp", 
    timestamp: new Date().toISOString() 
  });
});

export default router;