import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = express.Router();

// Middleware para verificar token
export const autenticarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }

    // Buscar usuario con datos del hospital
    const result = await pool.query(
      `SELECT uh.*, h.nombre as hospital_nombre, h.codigo as hospital_codigo, 
              h.configuracion as hospital_config
       FROM usuarios_hospital uh
       INNER JOIN hospitales h ON uh.hospital_id = h.id
       WHERE uh.username = $1 AND uh.activo = true AND h.activo = true`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const usuario = result.rows[0];

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Actualizar último login
    await pool.query(
      "UPDATE usuarios_hospital SET ultimo_login = NOW() WHERE id = $1",
      [usuario.id]
    );

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: usuario.id,
        username: usuario.username,
        hospitalId: usuario.hospital_id,
        hospitalNombre: usuario.hospital_nombre,
        rol: usuario.rol
      },
      process.env.JWT_SECRET || 'secreto_desarrollo',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol
      },
      hospital: {
        id: usuario.hospital_id,
        nombre: usuario.hospital_nombre,
        codigo: usuario.hospital_codigo
      }
    });

  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Verificar token
router.get("/verificar", autenticarToken, async (req, res) => {
  try {
    res.json({ 
      valido: true, 
      usuario: req.user 
    });
  } catch (err) {
    res.status(401).json({ error: "Token inválido" });
  }
});

// Cambiar contraseña
router.post("/cambiar-password", autenticarToken, async (req, res) => {
  try {
    const { passwordActual, nuevoPassword } = req.body;
    const userId = req.user.userId;

    // Verificar password actual
    const usuarioResult = await pool.query(
      "SELECT password_hash FROM usuarios_hospital WHERE id = $1",
      [userId]
    );

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const passwordValida = await bcrypt.compare(
      passwordActual, 
      usuarioResult.rows[0].password_hash
    );

    if (!passwordValida) {
      return res.status(401).json({ error: "Contraseña actual incorrecta" });
    }

    // Hashear nuevo password
    const nuevoPasswordHash = await bcrypt.hash(nuevoPassword, 12);

    // Actualizar password
    await pool.query(
      "UPDATE usuarios_hospital SET password_hash = $1 WHERE id = $2",
      [nuevoPasswordHash, userId]
    );

    res.json({ message: "Contraseña actualizada correctamente" });

  } catch (err) {
    console.error("Error cambiando password:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;