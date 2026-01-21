const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔄 Restauración de Backup de Base de Datos\n');
  console.log('Este script restaurará un backup de la base de datos.\n');

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

  // Pedir la ruta del backup
  console.log('💡 Puedes proporcionar la ruta del backup de dos formas:');
  console.log('   1. Ruta absoluta completa (ej: /Users/math10jara/Desktop/backup.db)');
  console.log('   2. Ruta relativa al escritorio (ej: backup.db o carpeta/backup.db)');
  console.log('');

  const backupInput = await question('📂 Ingresa la ruta del backup: ');

  let backupPath;
  
  // Intentar interpretar la ruta
  if (path.isAbsolute(backupInput)) {
    // Ruta absoluta
    backupPath = backupInput;
  } else {
    // Ruta relativa - asumir que es relativa al escritorio
    backupPath = path.join(os.homedir(), 'Desktop', backupInput);
  }

  // Normalizar la ruta
  backupPath = path.normalize(backupPath);

  console.log('\n🔍 Verificando backup...');
  console.log('📁 Ruta del backup:', backupPath);

  if (!fs.existsSync(backupPath)) {
    console.error('❌ El archivo de backup no existe en:', backupPath);
    console.error('\n💡 Verifica que:');
    console.error('   - La ruta sea correcta');
    console.error('   - El archivo exista');
    console.error('   - Tengas permisos para leer el archivo');
    rl.close();
    process.exit(1);
  }

  const stats = fs.statSync(backupPath);
  if (!stats.isFile()) {
    console.error('❌ La ruta especificada no es un archivo');
    rl.close();
    process.exit(1);
  }

  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Backup encontrado: ${path.basename(backupPath)} (${sizeMB} MB)`);

  // Crear directorio de datos si no existe
  if (!fs.existsSync(dataDir)) {
    console.log('\n📁 Creando directorio de datos...');
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Hacer backup de la base de datos actual si existe
  if (fs.existsSync(dbPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentBackupPath = path.join(dataDir, `resortes-backup-before-restore-${timestamp}.db`);
    console.log('\n💾 Creando backup de la base de datos actual...');
    try {
      fs.copyFileSync(dbPath, currentBackupPath);
      console.log(`✅ Backup de seguridad creado: ${path.basename(currentBackupPath)}`);
    } catch (error) {
      console.warn('⚠️ No se pudo crear backup de seguridad:', error.message);
      const confirm = await question('\n⚠️ ¿Continuar sin backup de seguridad? (s/n): ');
      if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'y') {
        console.log('❌ Operación cancelada');
        rl.close();
        process.exit(0);
      }
    }
  }

  // Confirmar restauración
  console.log('\n⚠️  ADVERTENCIA: Esta operación reemplazará la base de datos actual.');
  const confirm = await question('¿Estás seguro de que deseas continuar? (s/n): ');

  if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'y') {
    console.log('❌ Operación cancelada');
    rl.close();
    process.exit(0);
  }

  // Restaurar el backup
  console.log('\n🔄 Restaurando backup...');
  try {
    fs.copyFileSync(backupPath, dbPath);
    console.log('✅ Backup restaurado exitosamente!');
    console.log(`\n📝 La base de datos ha sido restaurada desde: ${path.basename(backupPath)}`);
    console.log('🚀 Ahora puedes reiniciar la aplicación.');
  } catch (error) {
    console.error('❌ Error restaurando backup:', error.message);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});
