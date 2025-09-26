import fs from 'fs';
import path from 'path';

console.log('🔍 Verificando estructura de archivos...');

const requiredFiles = [
  './server.js',
  './db.js',
  './package.json',
  './routes/access-integration.js',
  './routes/consentimiento.js',
  './routes/consentimientosFirmados.js',
  './routes/generar-pdf.js',
  './routes/profesionales.js'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - EXISTE`);
  } else {
    console.log(`❌ ${file} - NO EXISTE`);
  }
});

console.log('\n📁 Contenido de la carpeta routes:');
try {
  const files = fs.readdirSync('./routes');
  files.forEach(file => {
    console.log(`   - ${file}`);
  });
} catch (error) {
  console.log('   ❌ No se pudo leer la carpeta routes');
}

console.log('\n🏁 Verificación completada');