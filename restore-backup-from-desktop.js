const fs = require('fs');
const path = require('path');
const os = require('os');

// Obtener la ruta del escritorio
const desktopPath = path.join(os.homedir(), 'Desktop');

// Buscar archivos .db en el escritorio
console.log('🔍 Buscando backups en el escritorio...\n');
console.log('📁 Ruta del escritorio:', desktopPath);

const files = fs.readdirSync(desktopPath);
// Buscar archivos .db o cualquier archivo que pueda ser un backup
const dbFiles = files.filter(file => {
  const filePath = path.join(desktopPath, file);
  const stats = fs.statSync(filePath);
  // Solo archivos (no directorios) y que sean .db o tengan nombres relacionados
  return stats.isFile() && (
    file.endsWith('.db') || 
    file.toLowerCase().includes('backup') || 
    file.toLowerCase().includes('resortes')
  );
});

if (dbFiles.length === 0) {
  console.log('❌ No se encontraron archivos .db en el escritorio');
  console.log('\n📋 Archivos en el escritorio (primeros 20):');
  const allFiles = files.filter(f => {
    const filePath = path.join(desktopPath, f);
    return fs.statSync(filePath).isFile();
  }).slice(0, 20);
  allFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });
  console.log('\n💡 Si el backup tiene otro nombre o extensión, renómbralo a .db o muévelo al escritorio');
  process.exit(1);
}

console.log('\n📋 Archivos .db encontrados en el escritorio:');
dbFiles.forEach((file, index) => {
  const filePath = path.join(desktopPath, file);
  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`  ${index + 1}. ${file} (${sizeMB} MB)`);
});

// Usar el primer archivo encontrado (o el más reciente)
const backupFile = dbFiles[0];
const backupPath = path.join(desktopPath, backupFile);

console.log(`\n✅ Usando backup: ${backupFile}`);

// Determinar la ruta de la base de datos actual
// En desarrollo, está en data/resortes.db relativo al proyecto
const projectRoot = __dirname;
const devDbPath = path.join(projectRoot, 'data', 'resortes.db');
const devDataDir = path.join(projectRoot, 'data');

// Verificar si estamos en desarrollo o producción
let dbPath;
let dataDir;

if (fs.existsSync(devDataDir)) {
  // Modo desarrollo
  dbPath = devDbPath;
  dataDir = devDataDir;
  console.log('🔧 Modo: Desarrollo');
} else {
  // Modo producción - buscar en AppData
  const userDataPath = process.env.APPDATA || 
    (process.platform === 'darwin' 
      ? path.join(os.homedir(), 'Library', 'Application Support', 'ResortesPuertoMontt')
      : path.join(os.homedir(), 'AppData', 'Roaming', 'ResortesPuertoMontt'));
  
  dataDir = path.join(userDataPath, 'data');
  dbPath = path.join(dataDir, 'resortes.db');
  console.log('🔧 Modo: Producción');
}

console.log('📁 Ruta de base de datos:', dbPath);
console.log('📁 Directorio de datos:', dataDir);

// Crear directorio de datos si no existe
if (!fs.existsSync(dataDir)) {
  console.log('📁 Creando directorio de datos...');
  fs.mkdirSync(dataDir, { recursive: true });
}

// Hacer backup de la base de datos actual si existe
if (fs.existsSync(dbPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const currentBackupPath = path.join(dataDir, `resortes-backup-before-restore-${timestamp}.db`);
  console.log('\n💾 Creando backup de la base de datos actual...');
  fs.copyFileSync(dbPath, currentBackupPath);
  console.log(`✅ Backup creado: ${path.basename(currentBackupPath)}`);
}

// Restaurar el backup
console.log('\n🔄 Restaurando backup desde el escritorio...');
try {
  fs.copyFileSync(backupPath, dbPath);
  console.log('✅ Backup restaurado exitosamente!');
  console.log(`\n📝 La base de datos ha sido restaurada desde: ${backupFile}`);
  console.log('🚀 Ahora puedes reiniciar la aplicación.');
} catch (error) {
  console.error('❌ Error restaurando backup:', error.message);
  process.exit(1);
}
