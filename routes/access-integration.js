// import express from "express";
// import db from "../db.js";

// const router = express.Router();

// // Obtener datos completos de paciente + consentimiento
// router.get("/paciente/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Traer paciente
//     const pacienteResult = await db.query(
//       `SELECT pa.*, c.*
//        FROM public_pacientes_access pa
//        LEFT JOIN public_consentimientos c ON pa.consentimiento_id = c.idconsto
//        WHERE pa.id_access = $1`,
//       [id]
//     );

//     if (pacienteResult.rows.length === 0) {
//       return res.status(404).json({ error: "Paciente no encontrado" });
//     }

//     res.json(pacienteResult.rows[0]);
//   } catch (err) {
//     console.error("Error en GET /access-integration/paciente/:id", err);
//     res.status(500).json({ error: "Error interno del servidor" });
//   }
// });

// export default router;
