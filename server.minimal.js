// server.minimal.js
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Ruta mínima para healthcheck
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Home opcional para pruebas
app.get("/", (req, res) => {
  res.send("Servidor minimal en funcionamiento ✅");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor minimal corriendo en http://0.0.0.0:${PORT}`);
});
