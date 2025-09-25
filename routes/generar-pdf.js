import express from "express";
import pool from "../db.js";
import { jsPDF } from "jspdf";

const router = express.Router();

// Ruta para generar y descargar PDF
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener datos del consentimiento firmado
    const result = await pool.query(`
      SELECT 
        cf.*,
        c.*,
        p.nombre as profesional_nombre,
        p.identificacion as profesional_identificacion,
        p.especialidad as profesional_especialidad,
        p.registro_profesional,
        p.correo as profesional_correo,
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

    const consentimiento = result.rows[0];

    // Crear PDF
    const pdf = new jsPDF();
    
    // Configuración del PDF
    pdf.setFont("helvetica");
    let y = 20;

    // Título
    pdf.setFontSize(20);
    pdf.text("CONSENTIMIENTO INFORMADO", 105, y, { align: "center" });
    y += 15;

    // Información del procedimiento
    pdf.setFontSize(16);
    pdf.text(consentimiento.nombre, 105, y, { align: "center" });
    y += 15;

    pdf.setFontSize(12);
    pdf.text(`Especialidad: ${consentimiento.especialidad}`, 20, y);
    y += 10;

    // Información general
    if (consentimiento.inf_gral) {
      pdf.text("INFORMACIÓN GENERAL:", 20, y);
      y += 8;
      const splitText = pdf.splitTextToSize(consentimiento.inf_gral, 170);
      pdf.text(splitText, 20, y);
      y += splitText.length * 6 + 10;
    }

    // Datos del paciente
    pdf.text("DATOS DEL PACIENTE:", 20, y);
    y += 8;
    pdf.text(`Nombre: ${consentimiento.paciente_nombre}`, 20, y);
    y += 8;
    pdf.text(`Identificación: ${consentimiento.paciente_identificacion}`, 20, y);
    y += 8;
    
    if (consentimiento.paciente_telefono) {
      pdf.text(`Teléfono: ${consentimiento.paciente_telefono}`, 20, y);
      y += 8;
    }
    
    if (consentimiento.paciente_direccion) {
      pdf.text(`Dirección: ${consentimiento.paciente_direccion}`, 20, y);
      y += 8;
    }

    // Datos del profesional
    if (consentimiento.profesional_nombre) {
      y += 10;
      pdf.text("DATOS DEL PROFESIONAL:", 20, y);
      y += 8;
      pdf.text(`Nombre: ${consentimiento.profesional_nombre}`, 20, y);
      y += 8;
      pdf.text(`Identificación: ${consentimiento.profesional_identificacion}`, 20, y);
      y += 8;
      pdf.text(`Especialidad: ${consentimiento.profesional_especialidad}`, 20, y);
      y += 8;
      
      if (consentimiento.registro_profesional) {
        pdf.text(`Registro Profesional: ${consentimiento.registro_profesional}`, 20, y);
        y += 8;
      }
      
      if (consentimiento.profesional_telefono) {
        pdf.text(`Teléfono: ${consentimiento.profesional_telefono}`, 20, y);
        y += 8;
      }
    }

    // Firma (si está disponible)
    if (consentimiento.paciente_firma_base64) {
      y += 15;
      pdf.text("FIRMA DEL PACIENTE:", 20, y);
      y += 8;
      
      // Agregar imagen al PDF
      pdf.addImage(`data:image/png;base64,${consentimiento.paciente_firma_base64}`, 'PNG', 20, y, 80, 40);
      y += 45;
    }

    // Declaraciones
    y += 10;
    pdf.text("DECLARACIONES:", 20, y);
    y += 8;
    pdf.text(`Aceptación: ${consentimiento.aceptacion}`, 20, y);
    y += 8;
    pdf.text(`Declaración: ${consentimiento.declaracion}`, 20, y);
    y += 8;

    if (consentimiento.observaciones) {
      pdf.text(`Observaciones: ${consentimiento.observaciones}`, 20, y);
      y += 8;
    }

    // Fecha
    pdf.text(`Fecha: ${new Date(consentimiento.fecha_registro).toLocaleDateString()}`, 20, y + 20);

    // Generar el PDF y enviarlo como respuesta
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=consentimiento-${consentimiento.paciente_identificacion}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Error al generar PDF:", error);
    res.status(500).json({ error: "Error al generar el PDF" });
  }
});

export default router;