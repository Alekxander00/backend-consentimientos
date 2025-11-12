export const generarEnlaceWhatsApp = (numero, mensaje) => {
  // Limpiar y formatear número (eliminar espacios, paréntesis, etc.)
  const numeroLimpio = numero.replace(/[\s\(\)\-]/g, '');
  
  // Codificar el mensaje para URL
  const mensajeCodificado = encodeURIComponent(mensaje);
  
  // Generar enlace de WhatsApp
  return `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
};

// Función para enviar PDF por WhatsApp
export const enviarPDFPorWhatsApp = async (numero, pdfBuffer, datosPaciente) => {
  try {
    // Primero guardamos el PDF temporalmente
    const idUnico = await guardarPDFTemporal(pdfBuffer, `consentimiento-${datosPaciente.nombre}.pdf`);
    
    // Generar enlace de descarga
    const enlaceDescarga = `${process.env.BASE_URL || 'http://localhost:4000'}/generar-pdf/descargar/${idUnico}`;
    
    // Crear mensaje personalizado
    const mensaje = `Hola ${datosPaciente.nombre},

Adjunto encontrará su consentimiento informado firmado.

📄 *Enlace de descarga:* 
${enlaceDescarga}

*Detalles:*
- Procedimiento: ${datosPaciente.procedimiento}
- Fecha: ${new Date().toLocaleDateString('es-ES')}
- Médico: ${datosPaciente.medico}

*Instrucciones:*
1. Haga clic en el enlace de arriba
2. Descargue el PDF
3. Guárdelo en su dispositivo

¡Quedamos atentos a cualquier inquietud!`;

    // Generar enlace de WhatsApp
    const enlaceWhatsApp = generarEnlaceWhatsApp(numero, mensaje);
    
    return {
      success: true,
      enlaceWhatsApp,
      enlaceDescarga,
      mensaje: mensaje
    };
  } catch (error) {
    console.error('❌ Error al preparar envío por WhatsApp:', error);
    return { success: false, error: error.message };
  }
};

export default enviarPDFPorWhatsApp;