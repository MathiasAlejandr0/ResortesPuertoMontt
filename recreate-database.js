const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔄 Recreación de Base de Datos\n');

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

// Verificar si la base de datos existe
if (fs.existsSync(dbPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(dataDir, `resortes.db.before-recreate-${timestamp}`);
  console.log('💾 Respaldando base de datos actual...');
  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup creado: ${path.basename(backupPath)}\n`);
  } catch (error) {
    console.error('❌ Error creando backup:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️  No existe base de datos actual, se creará una nueva\n');
}

// Eliminar la base de datos actual
if (fs.existsSync(dbPath)) {
  console.log('🗑️  Eliminando base de datos actual...');
  try {
    fs.unlinkSync(dbPath);
    console.log('✅ Base de datos eliminada\n');
  } catch (error) {
    console.error('❌ Error eliminando base de datos:', error.message);
    process.exit(1);
  }
}

// Eliminar la clave de encriptación para que se genere una nueva
if (fs.existsSync(keyFilePath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const keyBackupPath = path.join(keysDir, `db.key.before-recreate-${timestamp}`);
  console.log('💾 Respaldando clave de encriptación actual...');
  try {
    fs.copyFileSync(keyFilePath, keyBackupPath);
    console.log(`✅ Clave respaldada: ${path.basename(keyBackupPath)}`);
  } catch (error) {
    console.warn('⚠️  No se pudo respaldar la clave:', error.message);
  }
  
  console.log('🗑️  Eliminando clave de encriptación actual...');
  try {
    fs.unlinkSync(keyFilePath);
    console.log('✅ Clave eliminada\n');
  } catch (error) {
    console.warn('⚠️  No se pudo eliminar la clave:', error.message);
  }
} else {
  console.log('ℹ️  No existe clave de encriptación, se generará una nueva\n');
}

console.log('✅ Proceso completado!\n');
console.log('📝 Próximos pasos:');
console.log('   1. Reinicia la aplicación (npm run dev)');
console.log('   2. La aplicación creará una nueva base de datos encriptada');
console.log('   3. La base de datos estará vacía, pero funcional\n');
console.log('💡 Si necesitas los datos del backup:');
console.log('   - El backup original está en: ~/Desktop/resortes_db_backups/');
console.log('   - Los backups de seguridad están en:', dataDir);
console.log('   - Puedes intentar restaurar el backup manualmente más tarde\n');
