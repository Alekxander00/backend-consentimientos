// Middleware para inyectar hospital_id en las queries
export const filtrarPorHospital = (req, res, next) => {
  // Agregar hospital_id al request para usarlo en las consultas
  req.hospitalId = req.user?.hospitalId;
  
  if (!req.hospitalId) {
    return res.status(403).json({ error: "Acceso no autorizado" });
  }
  
  next();
};

// Middleware para verificar permisos de administrador
export const requiereAdmin = (req, res, next) => {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: "Se requieren permisos de administrador" });
  }
  next();
};