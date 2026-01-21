const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔄 Restauración Automática de Backup\n');

// Buscar la carpeta de backups en el escritorio
const desktopPath = path.join(os.homedir(), 'Desktop');
const backupFolderPath = path.join(desktopPath, 'resortes_db_backups');

console.log('🔍 Buscando carpeta de backups...');
console.log('📁 Ruta:', backupFolderPath);

if (!fs.existsSync(backupFolderPath)) {
  console.error('❌ No se encontró la carpeta "resortes_db_backups" en el escritorio');
  process.exit(1);
}

// Buscar archivos .db en la carpeta
const files = fs.readdirSync(backupFolderPath);
const dbFiles = files
  .filter(file => {
    const filePath = path.join(backupFolderPath, file);
    return fs.statSync(filePath).isFile() && file.endsWith('.db');
  })
  .map(file => {
    const filePath = path.join(backupFolderPath, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      path: filePath,
      size: stats.size,
      modified: stats.mtime
    };
  })
  .sort((a, b) => b.modified.getTime() - a.modified.getTime()); // Más recientes primero

if (dbFiles.length === 0) {
  console.error('❌ No se encontraron archivos .db en la carpeta de backups');
  process.exit(1);
}

console.log(`✅ Se encontraron ${dbFiles.length} backup(s)\n`);

// Usar el backup más reciente
const selectedBackup = dbFiles[0];
const backupPath = selectedBackup.path;
const sizeMB = (selectedBackup.size / (1024 * 1024)).toFixed(2);
const date = selectedBackup.modified.toLocaleString('es-ES');

console.log(`📋 Backup seleccionado (más reciente):`);
console.log(`   Nombre: ${selectedBackup.name}`);
console.log(`   Tamaño: ${sizeMB} MB`);
console.log(`   Fecha: ${date}\n`);

// Determinar la ruta de la base de datos actual
const projectRoot = __dirname;
const devDbPath = path.join(projectRoot, 'data', 'resortes.db');
const devDataDir = path.join(projectRoot, 'data');

let dbPath;
let dataDir;

if (fs.existsSync(devDataDir)) {
  // Modo desarrollo
  dbPath = devDbPath;
  dataDir = devDataDir;
  console.log('🔧 Modo: Desarrollo');
} else {
  // Modo producción
  const userDataPath = process.platform === 'darwin' 
    ? path.join(os.homedir(), 'Library', 'Application Support', 'ResortesPuertoMontt')
    : path.join(os.homedir(), 'AppData', 'Roaming', 'ResortesPuertoMontt');
  
  dataDir = path.join(userDataPath, 'data');
  dbPath = path.join(dataDir, 'resortes.db');
  console.log('🔧 Modo: Producción');
}

console.log('📁 Ruta de base de datos:', dbPath);
console.log('📁 Directorio de datos:', dataDir);
console.log('');

// Crear directorio de datos si no existe
if (!fs.existsSync(dataDir)) {
  console.log('📁 Creando directorio de datos...');
  fs.mkdirSync(dataDir, { recursive: true });
}

// Hacer backup de la base de datos actual si existe
if (fs.existsSync(dbPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const currentBackupPath = path.join(dataDir, `resortes-backup-before-restore-${timestamp}.db`);
  console.log('💾 Creando backup de la base de datos actual...');
  try {
    fs.copyFileSync(dbPath, currentBackupPath);
    console.log(`✅ Backup de seguridad creado: ${path.basename(currentBackupPath)}\n`);
  } catch (error) {
    console.warn('⚠️ No se pudo crear backup de seguridad:', error.message);
    console.warn('⚠️ Continuando sin backup de seguridad...\n');
  }
}

// Restaurar el backup
console.log('🔄 Restaurando backup...');
try {
  fs.copyFileSync(backupPath, dbPath);
  console.log('✅ Backup restaurado exitosamente!');
  console.log(`\n📝 La base de datos ha sido restaurada desde: ${selectedBackup.name}`);
  console.log('🚀 Ahora puedes reiniciar la aplicación.');
} catch (error) {
  console.error('❌ Error restaurando backup:', error.message);
  process.exit(1);
}
