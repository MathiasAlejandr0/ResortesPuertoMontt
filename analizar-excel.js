const XLSX = require('xlsx');
const path = require('path');

// Función para analizar un archivo Excel
function analizarExcel(archivoPath) {
  console.log(`\n=== ANALIZANDO: ${path.basename(archivoPath)} ===`);
  
  try {
    // Leer el archivo Excel
    const workbook = XLSX.readFile(archivoPath);
    
    console.log(`📊 Hojas disponibles: ${workbook.SheetNames.join(', ')}`);
    
    // Analizar cada hoja
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n--- HOJA ${index + 1}: ${sheetName} ---`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        console.log('❌ Hoja vacía');
        return;
      }
      
      // Mostrar las primeras filas para entender la estructura
      console.log(`📋 Total de filas: ${jsonData.length}`);
      console.log(`📋 Total de columnas: ${jsonData[0] ? jsonData[0].length : 0}`);
      
      // Mostrar encabezados (primera fila)
      if (jsonData[0]) {
        console.log('📝 Encabezados:', jsonData[0]);
      }
      
      // Mostrar algunas filas de ejemplo
      console.log('\n📄 Primeras 3 filas de datos:');
      for (let i = 0; i < Math.min(3, jsonData.length); i++) {
        console.log(`Fila ${i + 1}:`, jsonData[i]);
      }
      
      // Analizar tipos de datos en las columnas
      if (jsonData.length > 1) {
        console.log('\n🔍 Análisis de columnas:');
        const headers = jsonData[0];
        for (let col = 0; col < headers.length; col++) {
          const colName = headers[col];
          if (colName) {
            const sampleValues = [];
            for (let row = 1; row < Math.min(6, jsonData.length); row++) {
              if (jsonData[row] && jsonData[row][col] !== undefined) {
                sampleValues.push(jsonData[row][col]);
              }
            }
            console.log(`  ${colName}: [${sampleValues.join(', ')}]`);
          }
        }
      }
    });
    
  } catch (error) {
    console.error(`❌ Error al leer ${archivoPath}:`, error.message);
  }
}

// Función para verificar compatibilidad con el sistema
function verificarCompatibilidad(archivoPath) {
  console.log(`\n=== VERIFICANDO COMPATIBILIDAD: ${path.basename(archivoPath)} ===`);
  
  try {
    const workbook = XLSX.readFile(archivoPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      console.log('❌ Archivo no tiene suficientes datos');
      return;
    }
    
    const headers = jsonData[0];
    console.log('📋 Estructura del archivo:', headers);
    
    // Campos requeridos para el sistema de repuestos
    const camposRequeridos = ['nombre', 'codigo', 'precio', 'stock', 'categoria'];
    const camposOpcionales = ['descripcion', 'ubicacion', 'proveedor', 'marca'];
    
    console.log('\n🔍 Verificación de campos:');
    
    // Buscar campos similares (case insensitive)
    const camposEncontrados = [];
    headers.forEach(header => {
      const headerLower = header.toLowerCase().trim();
      camposRequeridos.forEach(req => {
        if (headerLower.includes(req) || req.includes(headerLower)) {
          camposEncontrados.push({ original: header, mapeado: req });
        }
      });
      camposOpcionales.forEach(opt => {
        if (headerLower.includes(opt) || opt.includes(headerLower)) {
          camposEncontrados.push({ original: header, mapeado: opt });
        }
      });
    });
    
    console.log('✅ Campos encontrados:', camposEncontrados);
    
    // Verificar campos faltantes
    const camposFaltantes = camposRequeridos.filter(req => 
      !camposEncontrados.some(found => found.mapeado === req)
    );
    
    if (camposFaltantes.length > 0) {
      console.log('⚠️ Campos requeridos faltantes:', camposFaltantes);
    } else {
      console.log('✅ Todos los campos requeridos están presentes');
    }
    
    // Mostrar mapeo sugerido
    console.log('\n📋 Mapeo sugerido para el sistema:');
    camposEncontrados.forEach(campo => {
      console.log(`  ${campo.original} → ${campo.mapeado}`);
    });
    
  } catch (error) {
    console.error(`❌ Error al verificar compatibilidad:`, error.message);
  }
}

// Ejecutar análisis
console.log('🔍 ANÁLISIS DE ARCHIVOS EXCEL DE INVENTARIO');
console.log('==========================================');

// Analizar archivo principal
analizarExcel('../LISTA DE PRECIOS C.A.R.S._RESORTESPTOMONTT .xlsx');
verificarCompatibilidad('../LISTA DE PRECIOS C.A.R.S._RESORTESPTOMONTT .xlsx');

// Analizar plantilla
analizarExcel('../plantilla_repuestos.xlsx');
verificarCompatibilidad('../plantilla_repuestos.xlsx');

console.log('\n✅ Análisis completado');
