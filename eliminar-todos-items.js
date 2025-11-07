const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Para desarrollo, buscar en las ubicaciones comunes
const posiblesUbicaciones = [
  // Desarrollo
  path.join(__dirname, 'data/resortes.db'),
  path.join(__dirname, '../../data/resortes.db'),
  // Producción (si la app está empaquetada)
  path.join(process.env.APPDATA || '', 'resortes-puerto-montt', 'data', 'resortes.db'),
  path.join(process.env.LOCALAPPDATA || '', 'resortes-puerto-montt', 'data', 'resortes.db'),
];

console.log('🔍 Buscando base de datos...\n');

let dbPath = null;
let dbEncontrada = false;

for (const ubicacion of posiblesUbicaciones) {
  console.log(`Verificando: ${ubicacion}`);
  if (fs.existsSync(ubicacion)) {
    dbPath = ubicacion;
    dbEncontrada = true;
    console.log(`✅ Base de datos encontrada en: ${ubicacion}\n`);
    break;
  }
}

if (!dbEncontrada) {
  console.error('❌ No se encontró la base de datos en ninguna ubicación conocida.');
  console.log('\nUbicaciones probadas:');
  posiblesUbicaciones.forEach(u => console.log(`  - ${u}`));
  console.log('\n💡 Si la aplicación está ejecutándose, ciérrala primero.');
  process.exit(1);
}

console.log(`🔍 Conectando a: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    console.log('\n💡 Asegúrate de que la aplicación esté cerrada.');
    process.exit(1);
  }
  
  console.log('✅ Conectado a la base de datos');
  console.log('\n🗑️  Eliminando TODOS los repuestos del inventario...\n');
  
  // Primero contar cuántos hay
  db.get('SELECT COUNT(*) as count FROM repuestos', (err, row) => {
    if (err) {
      console.error('❌ Error contando repuestos:', err.message);
      db.close();
      process.exit(1);
    }
    
    const cantidad = row.count;
    console.log(`📊 Total de items en el inventario: ${cantidad}\n`);
    
    if (cantidad === 0) {
      console.log('✅ El inventario ya está vacío.');
      db.close();
      process.exit(0);
    }
    
    // Eliminar todos
    db.run('DELETE FROM repuestos', function(err) {
      if (err) {
        console.error('❌ Error eliminando repuestos:', err.message);
        db.close();
        process.exit(1);
      } else {
        console.log(`✅ ${this.changes} items eliminados exitosamente`);
        console.log('\n✅ El inventario ahora está completamente vacío.');
        console.log('💡 Reinicia la aplicación y podrás importar el Excel de nuevo.\n');
        
        db.close((err) => {
          if (err) {
            console.error('Error cerrando la base de datos:', err.message);
          }
          process.exit(0);
        });
      }
    });
  });
});

