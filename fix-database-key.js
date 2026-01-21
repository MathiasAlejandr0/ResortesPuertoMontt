const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔧 Solución para Error de Clave de Encriptación\n');

// Ruta del backup
const desktopPath = path.join(os.homedir(), 'Desktop');
const backupFolderPath = path.join(desktopPath, 'resortes_db_backups');
const backupFile = path.join(backupFolderPath, 'resortes_electron_20260108_224821.db');

// Ruta de la base de datos actual
const userDataPath = process.platform === 'darwin' 
  ? path.join(os.homedir(), 'Library', 'Application Support', 'ResortesPuertoMontt')
  : path.join(os.homedir(), 'AppData', 'Roaming', 'ResortesPuertoMontt');

const dataDir = path.join(userDataPath, 'data');
const dbPath = path.join(dataDir, 'resortes.db');
const keysDir = path.join(userDataPath, 'keys');
const keyFilePath = path.join(keysDir, 'db.key');

console.log('📁 Ruta de base de datos:', dbPath);
console.log('📁 Ruta de clave:', keyFilePath);
console.log('');

// Verificar si el backup existe
if (!fs.existsSync(backupFile)) {
  console.error('❌ No se encontró el backup');
  process.exit(1);
}

console.log('✅ Backup encontrado:', path.basename(backupFile));
console.log('');

// Opción 1: Intentar renombrar/eliminar la clave actual para forzar regeneración
// Esto solo funcionará si el backup es legacy (sin encriptar)
console.log('💡 Solución 1: Intentar usar el backup como base de datos legacy (sin encriptar)');
console.log('   Esto funcionará si el backup fue creado antes de la migración a encriptación.\n');

// Hacer backup de la clave actual si existe
if (fs.existsSync(keyFilePath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const keyBackupPath = path.join(keysDir, `db.key.backup-${timestamp}`);
  console.log('💾 Haciendo backup de la clave actual...');
  try {
    fs.copyFileSync(keyFilePath, keyBackupPath);
    console.log(`✅ Clave respaldada: ${path.basename(keyBackupPath)}\n`);
  } catch (error) {
    console.warn('⚠️ No se pudo respaldar la clave:', error.message);
  }
}

// Verificar si la base de datos actual existe
if (fs.existsSync(dbPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbBackupPath = path.join(dataDir, `resortes.db.problematic-${timestamp}`);
  console.log('💾 Respaldando base de datos actual con problema...');
  try {
    fs.copyFileSync(dbPath, dbBackupPath);
    console.log(`✅ Base de datos respaldada: ${path.basename(dbBackupPath)}\n`);
  } catch (error) {
    console.warn('⚠️ No se pudo respaldar la base de datos:', error.message);
  }
}

// Restaurar el backup
console.log('🔄 Restaurando backup...');
try {
  // Asegurar que el directorio existe
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.copyFileSync(backupFile, dbPath);
  console.log('✅ Backup restaurado\n');
} catch (error) {
  console.error('❌ Error restaurando backup:', error.message);
  process.exit(1);
}

// Eliminar la clave actual para forzar regeneración
// Esto hará que la aplicación intente abrir la BD sin clave primero (legacy)
// y si no funciona, creará una nueva clave
console.log('🔑 Eliminando clave de encriptación actual...');
console.log('   La aplicación intentará abrir la BD como legacy (sin encriptar)');
console.log('   Si el backup está encriptado, necesitarás la clave original.\n');

if (fs.existsSync(keyFilePath)) {
  try {
    // En lugar de eliminar, renombrar para poder restaurarla si es necesario
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const keyBackupPath = path.join(keysDir, `db.key.removed-${timestamp}`);
    fs.renameSync(keyFilePath, keyBackupPath);
    console.log(`✅ Clave movida a: ${path.basename(keyBackupPath)}`);
    console.log('   (Puedes restaurarla si es necesario)\n');
  } catch (error) {
    console.warn('⚠️ No se pudo mover la clave:', error.message);
  }
}

console.log('✅ Proceso completado!\n');
console.log('📝 Próximos pasos:');
console.log('   1. Reinicia la aplicación (npm run dev)');
console.log('   2. Si el backup es legacy (sin encriptar), la aplicación lo migrará automáticamente');
console.log('   3. Si el backup está encriptado con otra clave, verás el error nuevamente');
console.log('   4. En ese caso, necesitarás la clave original o recrear la base de datos\n');

console.log('💡 Si el error persiste:');
console.log('   - El backup puede estar encriptado con una clave diferente');
console.log('   - Puedes recrear la base de datos desde cero');
console.log('   - O restaurar la clave original si la tienes guardada\n');
