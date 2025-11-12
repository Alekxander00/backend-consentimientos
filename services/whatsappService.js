import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import fetch from 'node-fetch'; // Para hacer requests internos

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '..', 'temp_pdfs');

const ensureTempDir = async () => {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
};

const cleanupOldFiles = async () => {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > oneHour) {
        await fs.unlink(filePath);
        console.log(`🧹 Archivo temporal eliminado: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error en limpieza de archivos:', error);
  }
};

export const guardarPDFTemporal = async (pdfBuffer, nombreOriginal) => {
  await ensureTempDir();
  
  const idUnico = uuidv4();
  const extension = path.extname(nombreOriginal) || '.pdf';
  const nombreArchivo = `consentimiento_${idUnico}${extension}`;
  const rutaArchivo = path.join(TEMP_DIR, nombreArchivo);

  await fs.writeFile(rutaArchivo, pdfBuffer);
  
  cleanupOldFiles().catch(console.error);
  
  return { idUnico, nombreArchivo, rutaArchivo };
};

export const generarEnlaceWhatsApp = (numero, mensaje) => {
  if (!numero) {
    throw new Error('Número de teléfono requerido');
  }

  const numeroLimpio = numero.toString().replace(/[\s\(\)\-+]/g, '');
  
  if (!/^\d{10,15}$/.test(numeroLimpio)) {
    throw new Error('Formato de número inválido');
  }

  const mensajeCodificado = encodeURIComponent(mensaje);
  
  return `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
};

// ✅ SERVICIO MEJORADO QUE GENERA EL PDF REAL
export const enviarConsentimientoWhatsApp = async (consentimientoId) => {
  try {
    console.log(`📄 Generando PDF real para consentimiento: ${consentimientoId}`);
    
    // Obtener datos del consentimiento
    const result = await pool.query(
      `SELECT 
        cf.*,
        c.nombre as consentimiento_nombre,
        p.nombre as profesional_nombre,
        p.especialidad as profesional_especialidad,
        p.registro_profesional,
        encode(cf.paciente_firma, 'base64') as paciente_firma_base64
       FROM consentimientos_firmados cf
       LEFT JOIN consentimientos c ON cf.idconsto = c.idconsto
       LEFT JOIN profesionales p ON cf.profesional_id = p.id
       WHERE cf.id = $1`,
      [consentimientoId]
    );

    if (result.rows.length === 0) {
      throw new Error('Consentimiento no encontrado');
    }

    const consentimiento = result.rows[0];
    const { paciente_nombre, paciente_identificacion, paciente_telefono } = consentimiento;
    
    if (!paciente_telefono) {
      return {
        success: false,
        error: 'El paciente no tiene número de teléfono registrado'
      };
    }

    // ✅ GENERAR EL PDF REAL usando la ruta existente de generar-pdf
    const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    const pdfResponse = await fetch(`${baseUrl}/api/generar-pdf/${consentimientoId}`);
    
    if (!pdfResponse.ok) {
      throw new Error(`Error al generar PDF: ${pdfResponse.statusText}`);
    }

    // Obtener el buffer del PDF real
    const pdfBuffer = await pdfResponse.buffer();

    // Guardar PDF temporalmente
    const nombreArchivo = `consentimiento_${paciente_identificacion || 'sin_id'}.pdf`;
    const { idUnico } = await guardarPDFTemporal(pdfBuffer, nombreArchivo);

    // Generar enlace de descarga
    const enlaceDescarga = `${baseUrl}/api/whatsapp/descargar/${idUnico}`;

    // Crear mensaje personalizado
    const mensaje = `Hola ${paciente_nombre},

📄 *Consentimiento Informado Firmado*

Le compartimos su consentimiento informado que acaba de firmar en nuestra clínica.

*Enlace de descarga del documento:* 
${enlaceDescarga}

*Detalles del documento:*
• Procedimiento: ${consentimiento.consentimiento_nombre || 'Consentimiento médico'}
• Fecha: ${new Date().toLocaleDateString('es-ES')}
• Identificación: ${paciente_identificacion}
• Profesional: ${consentimiento.profesional_nombre || 'Médico tratante'}

*Instrucciones:*
1. Haga clic en el enlace de arriba
2. Descargue el PDF 
3. Consérvelo en sus archivos

¡Quedamos atentos a cualquier inquietud!

*Clínica Oftalmológica*
*Equipo Médico*`;

    // Generar enlace de WhatsApp
    const enlaceWhatsApp = generarEnlaceWhatsApp(paciente_telefono, mensaje);
    
    console.log(`✅ PDF real generado y listo para WhatsApp: ${consentimientoId}`);
    
    return {
      success: true,
      enlaceWhatsApp,
      enlaceDescarga,
      mensaje: mensaje,
      idTemporal: idUnico,
      datosPaciente: {
        nombre: paciente_nombre,
        telefono: paciente_telefono,
        identificacion: paciente_identificacion
      }
    };
  } catch (error) {
    console.error('❌ Error en servicio WhatsApp:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default enviarConsentimientoWhatsApp;