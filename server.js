import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import multer from "multer";
import jwt from "jsonwebtoken";
import { jsPDF } from "jspdf";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
const app = express();

// 🔑 Configurar CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configuración de multer para memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Límite de 5MB
  }
});

// Middleware para verificar token
const autenticarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Token de acceso requerido" });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secreto_desarrollo', (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
    req.user = user;
    next();
  });
};

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==================== RUTAS BÁSICAS ====================

// Health check
app.get("/health", (req, res) => res.send("OK"));

// Health check de base de datos
app.get("/health-db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({ db: "OK" });
  } catch (err) {
    return res.status(500).json({ db: "ERROR", error: err.message });
  }
});

// ==================== AUTENTICACIÓN ====================

// Login de usuario
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("📥 Intento de login:", username);

    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }

    // Usuarios de prueba
    const usuariosPrueba = {
      'admin': { id: 1, nombre: 'Administrador', hospital_id: 1, rol: 'admin' },
      'usuario': { id: 2, nombre: 'Usuario General', hospital_id: 1, rol: 'usuario' }
    };

    if (!usuariosPrueba[username]) {
      console.log("❌ Usuario no encontrado:", username);
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const usuario = usuariosPrueba[username];

    // Verificar contraseña (para prueba, usar 'password')
    if (password !== 'password') {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Generar token
    const token = jwt.sign(
      { 
        userId: usuario.id,
        username: username,
        hospitalId: usuario.hospital_id,
        hospitalNombre: `Hospital ${usuario.hospital_id}`,
        rol: usuario.rol
      },
      process.env.JWT_SECRET || 'secreto_desarrollo',
      { expiresIn: '8h' }
    );

    console.log("✅ Login exitoso para:", username);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: username,
        nombre: usuario.nombre,
        email: `${username}@hospital.com`,
        rol: usuario.rol
      },
      hospital: {
        id: usuario.hospital_id,
        nombre: `Hospital ${usuario.hospital_id}`,
        codigo: `HOSP_${usuario.hospital_id}`
      }
    });

  } catch (err) {
    console.error("❌ Error en login:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Verificar token
app.get("/auth/verificar", autenticarToken, (req, res) => {
  res.json({ 
    valido: true, 
    usuario: req.user 
  });
});

// ==================== PACIENTES ACCESS ====================

// Obtener pacientes del hospital actual
app.get("/pacientes-access", autenticarToken, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId || 1;
    
    console.log("🔍 Buscando pacientes para hospital:", hospitalId);
    
    const result = await pool.query(
      `SELECT pa.*, c.nombre as nombre_consentimiento
       FROM pacientes_access pa
       LEFT JOIN consentimientos c ON pa.consentimiento_id = c.idconsto
       WHERE (pa.firmado = FALSE OR pa.firmado IS NULL)
       ORDER BY pa.paciente_nombre`,
      []
    );
    
    console.log(`✅ Encontrados ${result.rows.length} pacientes`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al obtener pacientes:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// Obtener un paciente específico
app.get("/access-integration/paciente/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const pacienteResult = await pool.query(
      `SELECT 
         pa.*, 
         c.*,
         p.nombre as profesional_nombre,
         p.identificacion as profesional_identificacion,
         p.especialidad as profesional_especialidad,
         p.registro_profesional
       FROM public.pacientes_access pa
       LEFT JOIN public.consentimientos c ON pa.consentimiento_id = c.idconsto
       LEFT JOIN public.profesionales p ON pa.id_profesional = p.id
       WHERE pa.id_access = $1`,
      [id]
    );

    if (pacienteResult.rows.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json(pacienteResult.rows[0]);
  } catch (err) {
    console.error("Error en GET /access-integration/paciente/:id", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==================== CONSENTIMIENTOS FIRMADOS ====================

// Guardar consentimiento firmado
app.post("/consentimientos-firmados", upload.single('paciente_firma'), async (req, res) => {
  try {
    console.log("📥 Recibiendo consentimiento firmado...");

    const {
      idconsto,
      paciente_nombre,
      paciente_identificacion,
      paciente_telefono,
      paciente_direccion,
      aceptacion,
      declaracion,
      observaciones,
      profesional_id,
      id_access
    } = req.body;

    // Validaciones básicas
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
          idconsto || 1, 
          paciente_nombre, 
          paciente_identificacion, 
          paciente_telefono || null, 
          paciente_direccion || null, 
          firmaData,
          aceptacion || "Acepto el procedimiento", 
          declaracion || "Declaro que he entendido la información", 
          observaciones || null,
          profesional_id || 1
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

// ==================== PROFESIONALES ====================

// Obtener todos los profesionales
app.get("/profesionales", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM profesionales ORDER BY nombre");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener profesionales" });
  }
});

// ==================== GENERAR PDF ====================

// Ruta para generar PDF
app.get("/generar-pdf/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 Solicitando PDF para consentimiento firmado ID: ${id}`);

    // Obtener datos del consentimiento firmado
    const result = await pool.query(
      `SELECT 
        cf.*,
        c.nombre as consentimiento_nombre,
        p.nombre as profesional_nombre,
        p.identificacion as profesional_identificacion,
        p.especialidad as profesional_especialidad,
        p.registro_profesional,
        encode(cf.paciente_firma, 'base64') as paciente_firma_base64
      FROM consentimientos_firmados cf
      LEFT JOIN consentimientos c ON cf.idconsto = c.idconsto
      LEFT JOIN profesionales p ON cf.profesional_id = p.id
      WHERE cf.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      console.log('❌ Consentimiento no encontrado');
      return res.status(404).json({ error: "Consentimiento firmado no encontrado" });
    }

    const consentimiento = result.rows[0];
    
    // Crear PDF simple
    const pdf = new jsPDF();
    
    // Agregar contenido al PDF
    pdf.setFontSize(16);
    pdf.text("CONSENTIMIENTO INFORMADO", 20, 20);
    
    pdf.setFontSize(12);
    pdf.text(`Paciente: ${consentimiento.paciente_nombre}`, 20, 40);
    pdf.text(`Identificación: ${consentimiento.paciente_identificacion}`, 20, 50);
    pdf.text(`Procedimiento: ${consentimiento.consentimiento_nombre || 'Consentimiento médico'}`, 20, 60);
    pdf.text(`Profesional: ${consentimiento.profesional_nombre || 'Médico tratante'}`, 20, 70);
    pdf.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 80);
    
    // Agregar firma si existe
    if (consentimiento.paciente_firma_base64) {
      pdf.text("Firma del paciente:", 20, 100);
      try {
        const imgData = `data:image/png;base64,${consentimiento.paciente_firma_base64}`;
        pdf.addImage(imgData, 'PNG', 20, 105, 50, 20);
      } catch (imageError) {
        pdf.text("[Firma digital del paciente]", 20, 110);
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

// ==================== WHATSAPP ====================

const TEMP_DIR = './temp_pdfs';

const ensureTempDir = async () => {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
};

// Ruta para enviar consentimiento por WhatsApp - VERSIÓN CORREGIDA
app.post("/whatsapp/enviar-consentimiento/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📤 Solicitando envío WhatsApp para consentimiento: ${id}`);

    // ✅ SOLUCIÓN: Usar la misma lógica de generación de PDFs que ya tienes
    // Obtener datos del consentimiento firmado
    const result = await pool.query(
      `SELECT 
        cf.*,
        c.nombre as consentimiento_nombre,
        p.nombre as profesional_nombre,
        p.identificacion as profesional_identificacion,
        p.especialidad as profesional_especialidad,
        p.registro_profesional,
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
    const { paciente_nombre, paciente_telefono, paciente_identificacion } = consentimiento;

    if (!paciente_telefono) {
      return res.status(400).json({
        success: false,
        error: 'El paciente no tiene número de teléfono registrado'
      });
    }

    // ✅ GENERAR PDF CON LA MISMA LÓGICA QUE /generar-pdf/:id
    const pdf = new jsPDF();
    
    // Agregar contenido al PDF (mismo que tu ruta /generar-pdf)
    pdf.setFontSize(16);
    pdf.text("CONSENTIMIENTO INFORMADO", 20, 20);
    
    pdf.setFontSize(12);
    pdf.text(`Paciente: ${consentimiento.paciente_nombre}`, 20, 40);
    pdf.text(`Identificación: ${consentimiento.paciente_identificacion}`, 20, 50);
    pdf.text(`Procedimiento: ${consentimiento.consentimiento_nombre || 'Consentimiento médico'}`, 20, 60);
    pdf.text(`Profesional: ${consentimiento.profesional_nombre || 'Médico tratante'}`, 20, 70);
    pdf.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 80);
    
    // Agregar firma si existe
    if (consentimiento.paciente_firma_base64) {
      pdf.text("Firma del paciente:", 20, 100);
      try {
        const imgData = `data:image/png;base64,${consentimiento.paciente_firma_base64}`;
        pdf.addImage(imgData, 'PNG', 20, 105, 50, 20);
      } catch (imageError) {
        pdf.text("[Firma digital del paciente]", 20, 110);
      }
    }
    
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Guardar PDF temporalmente
    await ensureTempDir();
    const idUnico = uuidv4();
    const nombreArchivo = `consentimiento_${idUnico}.pdf`;
    const rutaArchivo = path.join(TEMP_DIR, nombreArchivo);
    await fs.writeFile(rutaArchivo, pdfBuffer);

    // Generar enlace de descarga
    const baseUrl = process.env.BASE_URL || 'https://backend-consentimientos-production.up.railway.app';
    const enlaceDescarga = `${baseUrl}/whatsapp/descargar/${idUnico}`;

    // Crear mensaje para WhatsApp
    const mensaje = `Hola ${paciente_nombre},

📄 *Consentimiento Informado Firmado*

Le compartimos su consentimiento informado que acaba de firmar en nuestra clínica.

*Enlace de descarga del documento:* 
${enlaceDescarga}

*Detalles del documento:*
• Fecha: ${new Date().toLocaleDateString('es-ES')}
• Identificación: ${paciente_identificacion}
• Procedimiento: ${consentimiento.consentimiento_nombre || 'Consentimiento médico'}

¡Quedamos atentos a cualquier inquietud!

*Clínica Oftalmológica*
*Equipo Médico*`;

    // Generar enlace de WhatsApp
    const numeroLimpio = paciente_telefono.toString().replace(/[\s\(\)\-+]/g, '');
    
    // Validar formato de número
    if (!/^\d{10,15}$/.test(numeroLimpio)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de número de teléfono inválido'
      });
    }

    const mensajeCodificado = encodeURIComponent(mensaje);
    const enlaceWhatsApp = `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;

    console.log(`✅ WhatsApp preparado para: ${paciente_nombre} (${paciente_telefono})`);

    res.json({
      success: true,
      enlaceWhatsApp,
      enlaceDescarga,
      mensaje: "Enlace de WhatsApp generado correctamente",
      datosPaciente: {
        nombre: paciente_nombre,
        telefono: paciente_telefono,
        identificacion: paciente_identificacion
      }
    });

  } catch (error) {
    console.error("❌ Error en envío WhatsApp:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor: " + error.message 
    });
  }
});

// Ruta para descargar PDF temporal de WhatsApp (MANTENER IGUAL)
app.get("/whatsapp/descargar/:id", async (req, res) => {
  try {
    const { id } = req.params;
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

    console.log(`📤 PDF temporal descargado: ${id}`);

  } catch (error) {
    console.error("❌ Error descargando PDF temporal:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error al descargar archivo" 
    });
  }
});

// ==================== INICIAR SERVIDOR ====================

const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor en http://${HOST}:${PORT}`);
  console.log(`🔐 Ruta de autenticación: http://${HOST}:${PORT}/auth/login`);
  console.log(`📄 Ruta de PDF: http://${HOST}:${PORT}/generar-pdf/:id`);
  console.log(`📱 Ruta WhatsApp: http://${HOST}:${PORT}/whatsapp/enviar-consentimiento/:id`);
});

export default app;