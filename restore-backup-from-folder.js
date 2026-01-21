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

  // Buscar la carpeta de backups en el escritorio
  const desktopPath = path.join(os.homedir(), 'Desktop');
  const backupFolderPath = path.join(desktopPath, 'resortes_db_backups');

  console.log('🔍 Buscando carpeta de backups...');
  console.log('📁 Ruta:', backupFolderPath);

  if (!fs.existsSync(backupFolderPath)) {
    console.error('❌ No se encontró la carpeta "resortes_db_backups" en el escritorio');
    console.error('💡 Verifica que la carpeta exista y tenga ese nombre exacto');
    rl.close();
    process.exit(1);
  }

  if (!fs.statSync(backupFolderPath).isDirectory()) {
    console.error('❌ La ruta especificada no es un directorio');
    rl.close();
    process.exit(1);
  }

  console.log('✅ Carpeta de backups encontrada\n');

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
    rl.close();
    process.exit(1);
  }

  console.log(`📋 Se encontraron ${dbFiles.length} backup(s) disponible(s):\n`);
  dbFiles.forEach((file, index) => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const date = file.modified.toLocaleString('es-ES');
    console.log(`  ${index + 1}. ${file.name}`);
    console.log(`     Tamaño: ${sizeMB} MB | Modificado: ${date}\n`);
  });

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

  // Pedir al usuario que elija el backup
  const choice = await question(`¿Qué backup deseas restaurar? (1-${dbFiles.length}, o 'q' para cancelar): `);

  if (choice.toLowerCase() === 'q') {
    console.log('❌ Operación cancelada');
    rl.close();
    process.exit(0);
  }

  const index = parseInt(choice) - 1;
  if (isNaN(index) || index < 0 || index >= dbFiles.length) {
    console.error('❌ Selección inválida');
    rl.close();
    process.exit(1);
  }

  const selectedBackup = dbFiles[index];
  const backupPath = selectedBackup.path;

  console.log(`\n✅ Backup seleccionado: ${selectedBackup.name}`);
  console.log(`📁 Ruta: ${backupPath}`);

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
    console.log(`\n📝 La base de datos ha sido restaurada desde: ${selectedBackup.name}`);
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
