const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧹 Limpieza Completa y Recreación de Base de Datos\n');

// Obtener todas las posibles ubicaciones de la base de datos
const userDataPath = process.platform === 'darwin' 
  ? path.join(os.homedir(), 'Library', 'Application Support', 'ResortesPuertoMontt')
  : path.join(os.homedir(), 'AppData', 'Roaming', 'ResortesPuertoMontt');

const dataDir = path.join(userDataPath, 'data');
const keysDir = path.join(userDataPath, 'keys');
const backupDir = path.join(userDataPath, 'backups');

// También verificar ubicación de desarrollo
const devDataDir = path.join(__dirname, 'data');
const devBackupDir = path.join(__dirname, 'backups');

console.log('📁 Ubicaciones a limpiar:');
console.log('   - Producción:', userDataPath);
console.log('   - Desarrollo:', devDataDir);
console.log('');

// Función para eliminar archivos .db de un directorio
function deleteDbFiles(dirPath, dirName) {
  if (!fs.existsSync(dirPath)) {
    console.log(`ℹ️  ${dirName}: No existe, omitiendo...`);
    return 0;
  }

  let deleted = 0;
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      if (file.endsWith('.db')) {
        const filePath = path.join(dirPath, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`   ✅ Eliminado: ${file}`);
          deleted++;
        } catch (error) {
          console.warn(`   ⚠️  No se pudo eliminar ${file}:`, error.message);
        }
      }
    });
  } catch (error) {
    console.warn(`   ⚠️  Error leyendo ${dirName}:`, error.message);
  }
  return deleted;
}

// Función para eliminar claves de encriptación
function deleteKeys(dirPath, dirName) {
  if (!fs.existsSync(dirPath)) {
    console.log(`ℹ️  ${dirName}: No existe, omitiendo...`);
    return 0;
  }

  let deleted = 0;
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      if (file.startsWith('db.key') || file.endsWith('.key')) {
        const filePath = path.join(dirPath, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`   ✅ Eliminado: ${file}`);
          deleted++;
        } catch (error) {
          console.warn(`   ⚠️  No se pudo eliminar ${file}:`, error.message);
        }
      }
    });
  } catch (error) {
    console.warn(`   ⚠️  Error leyendo ${dirName}:`, error.message);
  }
  return deleted;
}

// 1. Eliminar todas las bases de datos
console.log('🗑️  Eliminando bases de datos...\n');

let totalDeleted = 0;
totalDeleted += deleteDbFiles(dataDir, 'Data (Producción)');
totalDeleted += deleteDbFiles(backupDir, 'Backups (Producción)');
totalDeleted += deleteDbFiles(devDataDir, 'Data (Desarrollo)');
totalDeleted += deleteDbFiles(devBackupDir, 'Backups (Desarrollo)');

console.log(`\n✅ Total de bases de datos eliminadas: ${totalDeleted}\n`);

// 2. Eliminar todas las claves de encriptación
console.log('🔑 Eliminando claves de encriptación...\n');

let totalKeysDeleted = 0;
totalKeysDeleted += deleteKeys(keysDir, 'Keys (Producción)');

console.log(`\n✅ Total de claves eliminadas: ${totalKeysDeleted}\n`);

// 3. Asegurar que los directorios existan para la nueva base de datos
console.log('📁 Preparando directorios para nueva base de datos...\n');

const dirsToCreate = [dataDir, keysDir];
dirsToCreate.forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   ✅ Creado: ${path.basename(dir)}`);
    } catch (error) {
      console.error(`   ❌ Error creando ${dir}:`, error.message);
    }
  } else {
    console.log(`   ℹ️  Ya existe: ${path.basename(dir)}`);
  }
});

console.log('\n✅ Limpieza completada!\n');
console.log('📝 Próximos pasos:');
console.log('   1. Reinicia la aplicación (npm run dev)');
console.log('   2. La aplicación creará una base de datos completamente nueva');
console.log('   3. La base de datos estará vacía pero completamente funcional\n');
console.log('💡 La nueva base de datos será:');
console.log('   - Encriptada con SQLCipher');
console.log('   - Con una nueva clave de encriptación');
console.log('   - Con todas las tablas creadas correctamente');
console.log('   - Lista para usar inmediatamente\n');
