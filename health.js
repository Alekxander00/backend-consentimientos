import express from "express";

const router = express.Router();

// Healthcheck rápido (Railway)
router.get("/", (req, res) => {
  res.status(200).send("OK");
});

// Healthcheck extendido (opcional)
router.get("/deep", async (req, res) => {
  try {
    const db = await import("./db.js");
    const result = await db.default.query("SELECT 1");
    res.status(200).json({
      status: "OK",
      db: "connected",
      result: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      db: err.message
    });
  }
});

export default router;
