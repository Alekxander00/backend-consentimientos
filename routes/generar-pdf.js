import express from "express";
import pool from "../db.js";
import { jsPDF } from "jspdf";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// Para obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapeo completo de tipos de consentimiento a archivos de plantilla
const PLANTILLAS = {
  "RETIRO DE SUTURA": "retiro_sutura.md",
  "ECOGRAFÍA OCULAR": "ecografia_ocular.md", 
  "CAMPO VISUAL": "campo_visual.md",
  "FOTOGRAFÍA OCULAR": "fotografia_ocular.md",
  "PRUEBAS DE PROVOCACIÓN CONJUNTIVAL": "provocacion_conjuntival.md",
  "PAQUIMETRÍA": "paquimetria.md",
  "ABLACION DE LESION O TEJIDO DE CONJUNTIVA": "ablacion_conjuntiva.md",
  "ABLACION DE LESION CORIORETINAL": "ablacion_corioretinal.md",
  "CAPSULOTOMIA LASER": "capsulotomia_laser.md",
  "LISIS DE SINEQUIA": "lisis_sinequia.md",
  "CAMPO VISUAL COMPUTARIZADO": "campo_visual.md",
  "FOTOGRAFIA OCULAR DE SEGMENTO POSTERIOR": "fotografia_ocular.md",
  "PRUEBAS DE PROVOCACION CONJUNTIVAL CON ALERGENOS": "provocacion_conjuntival.md",
  "BIOMETRIA": "biometria.md",
  "ANGIOGRAFIA FLUORESCEINICA": "angiografia.md",
  "DILATACION PUPILAR": "dilatacion_pupilar.md",
  "IRIDOTOMIA LASER": "iridotomia_laser.md",
  "TRABECULOPLASTIA LASER": "trabeculoplastia.md",
  "TOMOGRAFIA DE ESTRUCTURA OCULAR": "tomografia.md",
  "PTOSIS PALPEBRAL": "ptosis_palpebral.md",
  "RECONSTRUCCIÓN DE PÁRPADO": "reconstruccion_parpado.md",
  "RECUBRIMIENTO CONJUNTIVAL": "recubrimiento_conjuntival.md",
  "EXTRACCIÓN DE LENTE INTRAOCULAR": "extraccion_lente.md",
  "SUTURA EN PIEL": "sutura_piel.md",
  "RETIRO DE CUERPO EXTRAÑO EN CORNEA": "retiro_cuerpo_extrano.md",
  "SUTURA EN CORNEA": "sutura_cornea.md"
};

// Función para detectar el tipo de consentimiento
const detectarTipoConsentimiento = (nombre) => {
  if (!nombre) return "default";
  
  const nombreUpper = nombre.toUpperCase().trim();
  
  // Buscar coincidencia exacta primero
  for (const [key] of Object.entries(PLANTILLAS)) {
    if (nombreUpper === key) {
      return key;
    }
  }
  
  // Buscar coincidencia parcial
  for (const [key] of Object.entries(PLANTILLAS)) {
    if (nombreUpper.includes(key)) {
      return key;
    }
  }
  
  return "default";
};

// Función para cargar plantillas desde archivos
const cargarPlantilla = async (nombrePlantilla) => {
  try {
    const templatePath = path.join(__dirname, '..', 'plantillas', nombrePlantilla);
    const contenido = await fs.readFile(templatePath, 'utf-8');
    console.log(`✅ Plantilla cargada: ${nombrePlantilla}`);
    return contenido;
  } catch (error) {
    console.error(`❌ Error cargando plantilla ${nombrePlantilla}:`, error.message);
    // Intentar cargar plantilla por defecto
    try {
      const defaultPath = path.join(__dirname, '..', 'plantillas', 'default.md');
      const defaultContent = await fs.readFile(defaultPath, 'utf-8');
      console.log('✅ Usando plantilla por defecto');
      return defaultContent;
    } catch (defaultError) {
      console.error('❌ Error cargando plantilla por defecto:', defaultError.message);
      return null;
    }
  }
};

// Función para reemplazar variables en la plantilla
const procesarPlantilla = (plantilla, datos) => {
  if (!plantilla) return "Plantilla no disponible";
  
  const variables = {
    '{{PACIENTE_NOMBRE}}': datos.paciente_nombre || '________________',
    '{{PACIENTE_IDENTIFICACION}}': datos.paciente_identificacion || '________________',
    '{{PACIENTE_TELEFONO}}': datos.paciente_telefono || '________________',
    '{{PACIENTE_DIRECCION}}': datos.paciente_direccion || '________________',
    '{{PROFESIONAL_NOMBRE}}': datos.profesional_nombre || '________________',
    '{{PROFESIONAL_IDENTIFICACION}}': datos.profesional_identificacion || '________________',
    '{{PROFESIONAL_ESPECIALIDAD}}': datos.profesional_especialidad || '________________',
    '{{REGISTRO_PROFESIONAL}}': datos.registro_profesional || '________________',
    '{{FECHA_ACTUAL}}': new Date().toLocaleDateString('es-ES'),
    '{{ID_CONSENTIMIENTO}}': datos.idconsto || '________________',
    '{{NOMBRE_CONSENTIMIENTO}}': datos.nombre || '________________',
    '{{INF_GRAL}}': datos.inf_gral || '',
    '{{ENQUE_CONSISTE}}': datos.enque_consiste || '',
    '{{BENEFICIOS}}': datos.beneficios || '',
    '{{RIESGOS}}': datos.riesgos || ''
  };

  let contenidoProcesado = plantilla;
  for (const [variable, valor] of Object.entries(variables)) {
    contenidoProcesado = contenidoProcesado.split(variable).join(valor);
  }

  return contenidoProcesado;
};

// Función para generar PDF desde plantilla procesada
const generarPDFDesdePlantilla = (pdf, contenido, consentimiento) => {
  let y = 20;
  const lineas = contenido.split('\n');
  
  pdf.setFont("helvetica");
  
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    
    // Manejar saltos de página
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    
    // Saltar líneas vacías
    if (linea === '') {
      y += 4;
      continue;
    }
    
    // Título principal (líneas que empiezan con #)
    if (linea.startsWith('# ')) {
      pdf.setFontSize(16);
      const titulo = linea.substring(2).trim();
      pdf.text(titulo, 105, y, { align: "center" });
      y += 10;
    }
    // Subtítulo (líneas que empiezan con ##)
    else if (linea.startsWith('## ')) {
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      const subtitulo = linea.substring(3).trim();
      pdf.text(subtitulo, 20, y);
      pdf.setFont(undefined, 'normal');
      y += 8;
    }
    // Texto en negrita (entre **)
    else if (linea.startsWith('**') && linea.endsWith('**')) {
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      const texto = linea.substring(2, linea.length - 2).trim();
      const splitText = pdf.splitTextToSize(texto, 170);
      pdf.text(splitText, 20, y);
      pdf.setFont(undefined, 'normal');
      y += splitText.length * 5 + 2;
    }
    // Listas con viñetas
    else if (linea.startsWith('- ') || linea.startsWith('• ') || linea.startsWith('✓ ')) {
      pdf.setFontSize(10);
      const splitText = pdf.splitTextToSize(linea, 160);
      pdf.text(splitText, 25, y);
      y += splitText.length * 5 + 2;
    }
    // Texto normal
    else {
      pdf.setFontSize(10);
      const splitText = pdf.splitTextToSize(linea, 170);
      pdf.text(splitText, 20, y);
      y += splitText.length * 5 + 2;
    }
  }
  
  return y;
};

// Función para agregar firmas
const agregarFirmas = (pdf, consentimiento, y) => {
  if (y > 200) {
    pdf.addPage();
    y = 20;
  }
  
  const fecha = new Date();
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  pdf.text(`En _____, a _____ de ${meses[fecha.getMonth()]}, de ${fecha.getFullYear()}`, 20, y);
  y += 15;
  
  // Líneas para firmas
  pdf.line(20, y, 70, y);
  pdf.line(90, y, 140, y);
  pdf.line(160, y, 190, y);
  y += 5;
  
  pdf.setFontSize(9);
  pdf.text("Médico Tratante", 25, y);
  pdf.text("Paciente", 95, y);
  pdf.text("Representante Legal", 165, y);
  y += 8;
  
  pdf.text(`Dr. ${consentimiento.profesional_nombre || ''}`, 25, y);
  pdf.text(consentimiento.paciente_nombre || '', 95, y);
  pdf.text("", 165, y);
  y += 6;
  
  pdf.text(`Registro: ${consentimiento.registro_profesional || ''}`, 25, y);
  pdf.text(`CC: ${consentimiento.paciente_identificacion || ''}`, 95, y);
  pdf.text("CC:", 165, y);
  
  return y + 15;
};

// Ruta principal para generar PDF
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 Solicitando PDF para consentimiento firmado ID: ${id}`);

    // Obtener datos del consentimiento firmado
    const result = await pool.query(`
      SELECT 
        cf.*,
        c.*,
        p.nombre as profesional_nombre,
        p.identificacion as profesional_identificacion,
        p.especialidad as profesional_especialidad,
        p.registro_profesional,
        encode(cf.paciente_firma, 'base64') as paciente_firma_base64
      FROM consentimientos_firmados cf
      LEFT JOIN consentimientos c ON cf.idconsto = c.idconsto
      LEFT JOIN profesionales p ON cf.profesional_id = p.id
      WHERE cf.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      console.log('❌ Consentimiento no encontrado');
      return res.status(404).json({ error: "Consentimiento firmado no encontrado" });
    }

    const consentimiento = result.rows[0];
    console.log(`🔍 Tipo de consentimiento: ${consentimiento.nombre}`);

    // Detectar tipo de consentimiento
    const tipoConsentimiento = detectarTipoConsentimiento(consentimiento.nombre);
    const nombrePlantilla = PLANTILLAS[tipoConsentimiento] || 'default.md';
    
    console.log(`📋 Usando plantilla: ${nombrePlantilla} para: ${tipoConsentimiento}`);

    // Cargar plantilla
    const plantilla = await cargarPlantilla(nombrePlantilla);
    
    if (!plantilla) {
      console.log('❌ No se pudo cargar ninguna plantilla');
      return res.status(500).json({ error: "Error al cargar la plantilla del consentimiento" });
    }

    // Procesar plantilla con datos
    const contenido = procesarPlantilla(plantilla, consentimiento);

    // Crear PDF
    const pdf = new jsPDF();
    let y = generarPDFDesdePlantilla(pdf, contenido, consentimiento);
    
    // Agregar firmas
    agregarFirmas(pdf, consentimiento, y);
    
    // Agregar firma escaneada si existe
    if (consentimiento.paciente_firma_base64) {
      pdf.addPage();
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text("FIRMA DEL PACIENTE:", 20, 30);
      try {
        pdf.addImage(`data:image/png;base64,${consentimiento.paciente_firma_base64}`, 'PNG', 20, 40, 80, 40);
      } catch (imageError) {
        console.log('⚠️ Error al agregar imagen de firma:', imageError.message);
        pdf.text("(Firma no disponible)", 20, 45);
      }
    }

    // Generar el PDF
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=consentimiento-${consentimiento.paciente_identificacion || 'sin_identificacion'}.pdf`);
    res.send(pdfBuffer);

    console.log(`✅ PDF generado exitosamente para: ${consentimiento.paciente_nombre}`);

  } catch (error) {
    console.error("❌ Error al generar PDF:", error);
    res.status(500).json({ error: "Error interno al generar el PDF: " + error.message });
  }
});

export default router;