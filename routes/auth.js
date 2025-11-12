import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = express.Router();

// Middleware para verificar token
export const autenticarToken = (req, res, next) => {
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

// Login de usuario
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("📥 Intento de login:", username);

    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }

    // Verificar si la tabla usuarios_hospital existe
    let usuario;
    try {
      // Buscar usuario (versión simplificada para probar)
      const result = await pool.query(
        `SELECT * FROM usuarios_hospital WHERE username = $1 AND activo = true`,
        [username]
      );

      if (result.rows.length === 0) {
        console.log("❌ Usuario no encontrado:", username);
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      usuario = result.rows[0];
    } catch (dbError) {
      console.error("Error en consulta DB:", dbError);
      
      // Si la tabla no existe, usar usuarios de prueba
      const usuariosPrueba = {
        'admin_hcentral': { id: 1, nombre: 'Admin Central', hospital_id: 1, rol: 'admin' },
        'user_cnorte': { id: 2, nombre: 'Usuario Norte', hospital_id: 2, rol: 'usuario' },
        'admin_hsur': { id: 3, nombre: 'Admin Sur', hospital_id: 3, rol: 'admin' }
      };

      if (!usuariosPrueba[username]) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      usuario = usuariosPrueba[username];
    }

    // Verificar contraseña (para prueba, usar 'temp123')
    const contraseñasValidas = {
      'admin_hcentral': 'temp123',
      'user_cnorte': 'temp123', 
      'admin_hsur': 'temp123'
    };

    if (password !== contraseñasValidas[username]) {
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
        email: usuario.email || `${username}@hospital.com`,
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
router.get("/verificar", autenticarToken, (req, res) => {
  res.json({ 
    valido: true, 
    usuario: req.user 
  });
});

// Ruta de salud para auth
router.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    servicio: "Auth", 
    timestamp: new Date().toISOString() 
  });
});

export default router;