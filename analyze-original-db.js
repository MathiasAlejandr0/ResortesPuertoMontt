const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta a la base de datos original
const dbPath = path.join(__dirname, 'data', 'resortes-original.db');

console.log('🔍 Analizando base de datos original del software instalado...');
console.log('📁 Ruta:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error abriendo base de datos:', err.message);
    return;
  }
  console.log('✅ Base de datos original abierta correctamente');
});

// Función para obtener todas las tablas
function getTables() {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => row.name));
      }
    });
  });
}

// Función para obtener el esquema de una tabla
function getTableSchema(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Función para contar registros en una tabla
function getTableCount(tableName) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count);
      }
    });
  });
}

// Función para obtener algunos registros de ejemplo
function getSampleData(tableName, limit = 3) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName} LIMIT ${limit}`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function analyzeDatabase() {
  try {
    console.log('\n📊 ANÁLISIS DE LA BASE DE DATOS ORIGINAL');
    console.log('=' .repeat(50));
    
    // Obtener todas las tablas
    const tables = await getTables();
    console.log('\n🗂️  TABLAS ENCONTRADAS:');
    tables.forEach(table => console.log(`  - ${table}`));
    
    // Analizar cada tabla
    for (const table of tables) {
      console.log(`\n📋 TABLA: ${table.toUpperCase()}`);
      console.log('-'.repeat(30));
      
      // Esquema de la tabla
      const schema = await getTableSchema(table);
      console.log('🔧 ESTRUCTURA:');
      schema.forEach(column => {
        console.log(`  ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // Cantidad de registros
      const count = await getTableCount(table);
      console.log(`📊 REGISTROS: ${count}`);
      
      // Datos de ejemplo
      if (count > 0) {
        const sampleData = await getSampleData(table);
        console.log('📝 DATOS DE EJEMPLO:');
        sampleData.forEach((row, index) => {
          console.log(`  ${index + 1}:`, JSON.stringify(row, null, 2));
        });
      }
    }
    
    console.log('\n✅ Análisis completado');
    
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    db.close();
  }
}

analyzeDatabase();
