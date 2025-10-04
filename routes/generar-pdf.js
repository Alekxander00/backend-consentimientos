import express from "express";
import pool from "../db.js";
import { jsPDF } from "jspdf";

const router = express.Router();

// Mapeo de tipos de consentimiento a plantillas
const PLANTILLAS = {
  "RETIRO DE SUTURA": "retiro_sutura",
  "ECOGRAFÍA OCULAR": "ecografia_ocular", 
  "CAMPO VISUAL": "campo_visual",
  "FOTOGRAFÍA OCULAR": "fotografia_ocular",
  "PRUEBAS DE PROVOCACIÓN CONJUNTIVAL": "provocacion_conjuntival",
  "PAQUIMETRÍA": "paquimetria"
};

// Función para detectar el tipo de consentimiento basado en el nombre
const detectarTipoConsentimiento = (nombre) => {
  const nombreUpper = nombre.toUpperCase();
  for (const [key, value] of Object.entries(PLANTILLAS)) {
    if (nombreUpper.includes(key)) {
      return value;
    }
  }
  return "default";
};

// Función para generar PDF de retiro de sutura
const generarRetiroSutura = (pdf, consentimiento, y) => {
  pdf.setFontSize(16);
  pdf.text("CONSENTIMIENTO INFORMADO PARA RETIRO DE SUTURA", 105, y, { align: "center" });
  y += 10;
  
  pdf.setFontSize(10);
  pdf.text("CÓDIGO:", 20, y);
  pdf.text("VERSIÓN:", 100, y);
  pdf.text("FECHA: ENERO – 20 – 2021", 150, y);
  y += 8;
  
  pdf.setFont(undefined, 'bold');
  pdf.text("PROCESO PROCEDIMIENTO MENOR", 105, y, { align: "center" });
  y += 15;
  
  // Datos del paciente
  pdf.setFont(undefined, 'normal');
  pdf.text(`${consentimiento.paciente_nombre} de años de edad,`, 20, y);
  y += 6;
  pdf.text("(Nombre del paciente)", 20, y);
  y += 6;
  pdf.text(`Identificado con: RC__TI___CC: __ No.: ${consentimiento.paciente_identificacion}`, 20, y);
  y += 15;
  
  // DECLARO sección
  pdf.setFont(undefined, 'bold');
  pdf.text("DECLARO", 20, y);
  y += 8;
  
  pdf.setFont(undefined, 'normal');
  pdf.text(`Que el DOCTOR (A) ${consentimiento.profesional_nombre},`, 20, y);
  y += 6;
  pdf.text("me ha explicado que es conveniente proceder, en mi situación, al tratamiento mediante RETIRO DE SUTURA.", 20, y);
  y += 15;
  
  // CONSIDERACIONES GENERALES
  pdf.setFont(undefined, 'bold');
  pdf.text("CONSIDERACIONES GENERALES", 20, y);
  y += 8;
  
  const consideraciones = [
    "El sentido de la visión es responsable del 85% del total de las percepciones sensoriales y por ello debemos",
    "ejecutar ante un traumatismo, un adecuado diagnóstico y tratamiento con la derivación rápida y convincente al",
    "oftalmólogo en aras de preservar uno de los dones más apreciados del ser humano."
  ];
  
  consideraciones.forEach(line => {
    pdf.text(line, 20, y);
    y += 6;
  });
  y += 10;
  
  // ETIOLOGÍA
  pdf.setFont(undefined, 'bold');
  pdf.text("ETIOLOGÍA", 20, y);
  y += 8;
  
  const etiologia = [
    "El globo ocular puede sufrir diversas formas de trauma, mencionaremos y desarrollaremos los principales:",
    "1.- Contusiónales",
    "2.- Heridas penetrantes", 
    "3.- Quemaduras químicas",
    "4.- Penetración de cuerpos extraños",
    "5.- Fracturas orbitarias",
    "6.- Traumas por onda explosiva",
    "7.- Traumas físicos",
    "",
    "Los puntos de la queratoplastia penetrante, se pueden quitar por varios motivos. Principalmente, porque se",
    "aflojen, dejando de cumplir su función y facilitando la infección o vascularización de la zona. También se quitan,",
    "después de un periodo de tiempo que no debe ser inferior a los 6 ó 9 meses para corregir el astigmatismo.",
    "",
    "Se retiran los puntos más tensos y de manera paulatina. Los puntos se retiran con anestesia tópica: gotas, en la",
    "lámpara de hendidura, o en quirófano, depende del número que se vayan a retirar y la colaboración del paciente."
  ];
  
  etiologia.forEach(line => {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(line, 20, y);
    y += 6;
  });
  y += 10;
  
  // Segunda página
  pdf.addPage();
  y = 20;
  
  pdf.text("CONSENTIMIENTO INFORMADO PARA RETIRO DE SUTURA", 105, y, { align: "center" });
  y += 10;
  
  pdf.setFontSize(10);
  pdf.text("CÓDIGO:", 20, y);
  pdf.text("VERSIÓN:", 100, y);
  pdf.text("FECHA: ENERO – 20 – 2021", 150, y);
  y += 8;
  
  pdf.setFont(undefined, 'bold');
  pdf.text("PROCESO PROCEDIMIENTO MENOR", 105, y, { align: "center" });
  y += 15;
  
  // Continuación del texto
  const continuacion = [
    "Si la sutura es continua se suele retirar en quirófano. No suele ser muy molesto, y requiere tratamiento",
    "posterior con UNGUENTOS. Se cortan con una aguja de insulina, y se retiran con pinzas.",
    "",
    "DECLARO: Que he comprendido la información recibida en un lenguaje claro y sencillo y he podido formular",
    "todas las preguntas que he considerado oportunas Que el procedimiento descrito es una de las indicaciones",
    "establecidas en Oftalmología para la solución de mi problema no existiendo contraindicación para su realización,",
    "siendo consciente de que no existen garantías absolutas de que el resultado de la cirugía sea el más satisfactorio,",
    "existiendo la posibilidad de fracaso. Que, en cualquier momento y sin necesidad de dar ninguna explicación,",
    "puedo revocar este consentimiento. Por ello manifiesto que estoy satisfecho con la información recibida y que",
    "comprendo el alcance y los riesgos del tratamiento.",
    "",
    "AUTORIZO: que la realización del procedimiento sea filmada o fotografiada con fines didácticos o científicos, no",
    "identificando en ningún caso el nombre del paciente o de sus familiares. A que los tejidos o muestras obtenidos",
    "en mi intervención o los datos sobre mi enfermedad podrán ser utilizados en comunicaciones científicas o",
    "proyectos de investigación o docentes. Y en tales condiciones.",
    "",
    "CONSIENTO QUE SE ME REALICE EL RETIRO DE SUTURA así como las maniobras u operaciones que sean",
    "necesarias durante la intervención quirúrgica.",
    "",
    "CONSIENTO",
    "",
    `Que se me realice RETIRO DE SUTURA DEL OJO _____ así como las maniobras u operaciones`,
    "que sean necesarias durante la intervención quirúrgica."
  ];
  
  continuacion.forEach(line => {
    pdf.text(line, 20, y);
    y += 6;
  });
  y += 15;
  
  // Firmas
  const fecha = new Date().toLocaleDateString();
  pdf.text(`En _____, a _____ de _____, de ${new Date().getFullYear()}`, 20, y);
  y += 15;
  
  // Líneas para firmas
  pdf.line(20, y, 60, y);
  pdf.line(80, y, 120, y);
  pdf.line(140, y, 180, y);
  y += 5;
  
  pdf.text("firma Médico(a)", 25, y);
  pdf.text("firma El/la Paciente", 85, y);
  pdf.text("firma Representante legal", 145, y);
  y += 8;
  
  pdf.text(`RM: ${consentimiento.registro_profesional || ''}`, 25, y);
  pdf.text(`CC: ${consentimiento.paciente_identificacion}`, 85, y);
  pdf.text("CC", 145, y);
  
  return y;
};

// Función para generar PDF de ecografía ocular
const generarEcografiaOcular = (pdf, consentimiento, y) => {
  pdf.setFontSize(14);
  pdf.text("CONSENTIMIENTO INFORMADO PARA ECOGRAFÍA OCULAR", 105, y, { align: "center" });
  y += 10;
  
  pdf.setFontSize(10);
  pdf.text("CÓDIGO:", 20, y);
  pdf.text("VERSIÓN:", 100, y);
  pdf.text("FECHA: ENERO – 20 – 2021", 150, y);
  y += 8;
  
  pdf.setFont(undefined, 'bold');
  pdf.text("PROCESO EXAMENES DIAGNOSTICOS", 105, y, { align: "center" });
  y += 15;
  
  // Datos del paciente
  pdf.setFont(undefined, 'normal');
  pdf.text(`NOMBRE DEL PACIENTE: ${consentimiento.paciente_nombre} de ____ años de edad,`, 20, y);
  y += 6;
  pdf.text(`Identificado con: TI__ CC __ No.: ${consentimiento.paciente_identificacion}`, 20, y);
  y += 10;
  
  // DECLARO sección
  pdf.setFont(undefined, 'bold');
  pdf.text("DECLARO", 20, y);
  y += 8;
  
  pdf.setFont(undefined, 'normal');
  pdf.text(`Que el DOCTOR/A ${consentimiento.profesional_nombre}, me ha explicado que`, 20, y);
  y += 6;
  pdf.text("es conveniente proceder, en mi situación, al tratamiento mediante ECOGRAFIA OCULAR.", 20, y);
  y += 10;
  
  // Contenido específico de ecografía ocular
  const contenido = [
    "Con la ecografía ocular se pueden diagnosticar muchas de lesiones del globo ocular y los órganos que lo rodean. La",
    "exploración es indolora para el paciente, absolutamente inocua y, además, ofrece la ventaja de obtener imágenes en tiempo",
    "real.",
    "",
    "¿Qué es una ecografía ocular?",
    "",
    "Es una técnica de diagnóstico por imagen que estudia las estructuras del globo ocular y las estructuras anexas a la órbita",
    "(músculos, glándula lagrimal, grasa orbitaria, etc.) mediante ultrasonidos.",
    "",
    "¿Cómo se realiza una ecografía ocular?",
    "",
    "Al igual que las ecografías abdominales o de otras partes del cuerpo, para realizar una ecografía ocular se extiende un gel",
    "sobre la piel del paciente (en este caso el párpado, aunque se puede realizar directamente sobre el globo ocular) y se pone",
    "en contacto la sonda del ecógrafo con dicho gel para obtener las imágenes."
  ];
  
  contenido.forEach(line => {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(line, 20, y);
    y += 6;
  });
  
  // Agregar más contenido según sea necesario...
  
  return y;
};

// Función para generar PDF genérico (fallback)
const generarPDFGenerico = (pdf, consentimiento, y) => {
  pdf.setFontSize(16);
  pdf.text("CONSENTIMIENTO INFORMADO", 105, y, { align: "center" });
  y += 10;

  pdf.setFontSize(14);
  pdf.text(consentimiento.nombre, 105, y, { align: "center" });
  y += 15;

  // Información general
  if (consentimiento.inf_gral) {
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text("INFORMACIÓN GENERAL:", 20, y);
    y += 8;
    pdf.setFont(undefined, 'normal');
    const splitText = pdf.splitTextToSize(consentimiento.inf_gral, 170);
    pdf.text(splitText, 20, y);
    y += splitText.length * 6 + 10;
  }

  // Datos del paciente
  pdf.setFont(undefined, 'bold');
  pdf.text("DATOS DEL PACIENTE:", 20, y);
  y += 8;
  pdf.setFont(undefined, 'normal');
  pdf.text(`Nombre: ${consentimiento.paciente_nombre}`, 20, y);
  y += 6;
  pdf.text(`Identificación: ${consentimiento.paciente_identificacion}`, 20, y);
  y += 6;
  
  if (consentimiento.paciente_telefono) {
    pdf.text(`Teléfono: ${consentimiento.paciente_telefono}`, 20, y);
    y += 6;
  }
  
  if (consentimiento.paciente_direccion) {
    pdf.text(`Dirección: ${consentimiento.paciente_direccion}`, 20, y);
    y += 6;
  }

  // Datos del profesional
  if (consentimiento.profesional_nombre) {
    y += 10;
    pdf.setFont(undefined, 'bold');
    pdf.text("DATOS DEL PROFESIONAL:", 20, y);
    y += 8;
    pdf.setFont(undefined, 'normal');
    pdf.text(`Nombre: ${consentimiento.profesional_nombre}`, 20, y);
    y += 6;
    pdf.text(`Identificación: ${consentimiento.profesional_identificacion}`, 20, y);
    y += 6;
    pdf.text(`Especialidad: ${consentimiento.profesional_especialidad}`, 20, y);
    y += 6;
    
    if (consentimiento.registro_profesional) {
      pdf.text(`Registro Profesional: ${consentimiento.registro_profesional}`, 20, y);
      y += 6;
    }
  }

  // Firma
  if (consentimiento.paciente_firma_base64) {
    y += 10;
    pdf.setFont(undefined, 'bold');
    pdf.text("FIRMA DEL PACIENTE:", 20, y);
    y += 8;
    
    pdf.addImage(`data:image/png;base64,${consentimiento.paciente_firma_base64}`, 'PNG', 20, y, 80, 40);
    y += 45;
  }

  // Declaraciones
  y += 10;
  pdf.setFont(undefined, 'bold');
  pdf.text("DECLARACIONES:", 20, y);
  y += 8;
  pdf.setFont(undefined, 'normal');
  
  if (consentimiento.aceptacion) {
    pdf.text(`Aceptación: ${consentimiento.aceptacion}`, 20, y);
    y += 6;
  }
  
  if (consentimiento.declaracion) {
    pdf.text(`Declaración: ${consentimiento.declaracion}`, 20, y);
    y += 6;
  }

  // Fecha
  pdf.text(`Fecha: ${new Date(consentimiento.fecha_registro).toLocaleDateString()}`, 20, y + 10);

  return y;
};

// Ruta principal para generar PDF
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
    
    // Configuración inicial
    pdf.setFont("helvetica");
    let y = 20;

    // Detectar tipo de consentimiento y generar PDF correspondiente
    const tipoConsentimiento = detectarTipoConsentimiento(consentimiento.nombre);
    
    switch (tipoConsentimiento) {
      case "retiro_sutura":
        y = generarRetiroSutura(pdf, consentimiento, y);
        break;
      case "ecografia_ocular":
        y = generarEcografiaOcular(pdf, consentimiento, y);
        break;
      // Agregar más casos para otros tipos de consentimiento...
      default:
        y = generarPDFGenerico(pdf, consentimiento, y);
    }

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