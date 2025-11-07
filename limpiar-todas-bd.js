const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// Ubicaciones de las bases de datos
const basesDeDatos = [
  {
    ruta: path.join(process.env.APPDATA || '', 'Electron', 'data', 'resortes.db'),
    nombre: 'Electron (desarrollo)'
  },
  {
    ruta: path.join(process.env.APPDATA || '', 'resortes-puerto-montt', 'data', 'resortes.db'),
    nombre: 'Producción'
  },
  {
    ruta: path.join(__dirname, 'data', 'resortes.db'),
    nombre: 'Local (data/)'
  }
];

console.log('🔍 Limpiando todas las bases de datos encontradas...\n');

let totalEliminados = 0;

function limpiarDB(ruta, nombre) {
  return new Promise((resolve) => {
    if (!fs.existsSync(ruta)) {
      console.log(`⚠️  ${nombre}: No existe - ${ruta}`);
      resolve(0);
      return;
    }

    const db = new sqlite3.Database(ruta, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.log(`❌ ${nombre}: Error al abrir - ${err.message}`);
        resolve(0);
        return;
      }

      // Contar primero
      db.get('SELECT COUNT(*) as count FROM repuestos', (err, row) => {
        if (err) {
          console.log(`❌ ${nombre}: Error al contar - ${err.message}`);
          db.close();
          resolve(0);
          return;
        }

        const cantidad = row.count;
        
        if (cantidad === 0) {
          console.log(`✅ ${nombre}: Ya está vacío (0 items)`);
          db.close();
          resolve(0);
          return;
        }

        // Eliminar
        db.run('DELETE FROM repuestos', function(deleteErr) {
          if (deleteErr) {
            console.log(`❌ ${nombre}: Error al eliminar - ${deleteErr.message}`);
            db.close();
            resolve(0);
          } else {
            console.log(`✅ ${nombre}: ${this.changes} items eliminados`);
            db.close();
            resolve(this.changes);
          }
        });
      });
    });
  });
}

(async () => {
  console.log('📍 Ubicaciones a verificar:\n');
  basesDeDatos.forEach((bd, i) => {
    console.log(`${i + 1}. ${bd.nombre}: ${bd.ruta}`);
  });
  console.log('\n');

  for (const bd of basesDeDatos) {
    const eliminados = await limpiarDB(bd.ruta, bd.nombre);
    totalEliminados += eliminados;
  }

  console.log(`\n📊 Total eliminado: ${totalEliminados} items`);
  console.log('\n✅ Proceso completado.');
  console.log('💡 IMPORTANTE: Cierra completamente la aplicación y vuelve a abrirla.');
  console.log('💡 Luego podrás importar el Excel de nuevo.\n');
})();

