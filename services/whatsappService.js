import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio temporal para PDFs
const TEMP_DIR = path.join(__dirname, '..', 'temp_pdfs');

// Asegurar que el directorio temporal existe
const ensureTempDir = async () => {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
};

// Limpiar archivos temporales antiguos (más de 1 hora)
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

// Guardar PDF temporalmente
export const guardarPDFTemporal = async (pdfBuffer, nombreOriginal) => {
  await ensureTempDir();
  
  const idUnico = uuidv4();
  const extension = path.extname(nombreOriginal) || '.pdf';
  const nombreArchivo = `consentimiento_${idUnico}${extension}`;
  const rutaArchivo = path.join(TEMP_DIR, nombreArchivo);

  await fs.writeFile(rutaArchivo, pdfBuffer);
  
  // Limpiar archivos antiguos en segundo plano
  cleanupOldFiles().catch(console.error);
  
  return { idUnico, nombreArchivo, rutaArchivo };
};

// Generar enlace WhatsApp
export const generarEnlaceWhatsApp = (numero, mensaje) => {
  if (!numero) {
    throw new Error('Número de teléfono requerido');
  }

  // Limpiar y formatear número
  const numeroLimpio = numero.toString().replace(/[\s\(\)\-+]/g, '');
  
  // Validar formato (debe tener entre 10-15 dígitos)
  if (!/^\d{10,15}$/.test(numeroLimpio)) {
    throw new Error('Formato de número inválido');
  }

  // Codificar mensaje
  const mensajeCodificado = encodeURIComponent(mensaje);
  
  // Generar enlace
  return `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
};

// Servicio principal para enviar consentimiento por WhatsApp
export const enviarConsentimientoWhatsApp = async (consentimientoFirmado, pdfBuffer) => {
  try {
    const { paciente_nombre, paciente_identificacion, paciente_telefono } = consentimientoFirmado;
    
    if (!paciente_telefono) {
      return {
        success: false,
        error: 'El paciente no tiene número de teléfono registrado'
      };
    }

    // Guardar PDF temporalmente
    const nombreArchivo = `consentimiento_${paciente_identificacion || 'sin_id'}.pdf`;
    const { idUnico, nombreArchivo: nombreGuardado } = await guardarPDFTemporal(pdfBuffer, nombreArchivo);

    // Generar enlace de descarga (usaremos una ruta específica)
    const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    const enlaceDescarga = `${baseUrl}/api/whatsapp/descargar/${idUnico}`;

    // Crear mensaje personalizado
    const mensaje = `Hola ${paciente_nombre},

📄 *Consentimiento Informado Firmado*

Le compartimos su consentimiento informado que acaba de firmar.

*Enlace de descarga:* 
${enlaceDescarga}

*Detalles:*
• Documento: Consentimiento médico
• Fecha: ${new Date().toLocaleDateString('es-ES')}
• Identificación: ${paciente_identificacion}

*Instrucciones:*
1. Haga clic en el enlace de arriba
2. Descargue el PDF
3. Guárdelo en su dispositivo

¡Quedamos atentos a cualquier inquietud!

*Clínica Oftalmológica*`;

    // Generar enlace de WhatsApp
    const enlaceWhatsApp = generarEnlaceWhatsApp(paciente_telefono, mensaje);
    
    return {
      success: true,
      enlaceWhatsApp,
      enlaceDescarga,
      mensaje: mensaje,
      idTemporal: idUnico
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