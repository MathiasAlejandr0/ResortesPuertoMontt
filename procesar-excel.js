const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Función para importar datos del archivo principal de inventario
function importarInventarioPrincipal(archivoPath) {
  console.log('\n=== IMPORTANDO INVENTARIO PRINCIPAL ===');
  
  try {
    const workbook = XLSX.readFile(archivoPath);
    const worksheet = workbook.Sheets['COD SAP MANG ']; // Usar la hoja principal
    
    if (!worksheet) {
      console.log('❌ No se encontró la hoja "COD SAP MANG "');
      return [];
    }
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      console.log('❌ No hay suficientes datos en el archivo');
      return [];
    }
    
    const headers = jsonData[0];
    console.log('📋 Encabezados encontrados:', headers);
    
    const repuestos = [];
    
    // Procesar cada fila de datos
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || row.length === 0) continue;
      
      const repuesto = {
        codigo: row[0] ? String(row[0]).trim() : '', // COD MAN
        nombre: row[2] ? String(row[2]).trim() : '', // DESCRIPCION
        descripcion: row[2] ? String(row[2]).trim() : '', // DESCRIPCION
        precio: row[3] ? parseFloat(row[3]) : 0, // PRECIO
        stock: 0, // No hay información de stock en este archivo
        stockMinimo: 0,
        categoria: 'Resortes', // Categoría por defecto
        marca: 'C.A.R.S', // Marca por defecto
        ubicacion: 'Almacén Principal',
        activo: true
      };
      
      // Solo agregar si tiene código y nombre
      if (repuesto.codigo && repuesto.nombre) {
        repuestos.push(repuesto);
      }
    }
    
    console.log(`✅ Procesados ${repuestos.length} repuestos del inventario principal`);
    return repuestos;
    
  } catch (error) {
    console.error('❌ Error al importar inventario principal:', error.message);
    return [];
  }
}

// Función para importar datos de la plantilla
function importarPlantilla(archivoPath) {
  console.log('\n=== IMPORTANDO PLANTILLA ===');
  
  try {
    const workbook = XLSX.readFile(archivoPath);
    const worksheet = workbook.Sheets['Repuestos'];
    
    if (!worksheet) {
      console.log('❌ No se encontró la hoja "Repuestos"');
      return [];
    }
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      console.log('❌ No hay suficientes datos en el archivo');
      return [];
    }
    
    const headers = jsonData[0];
    console.log('📋 Encabezados encontrados:', headers);
    
    const repuestos = [];
    
    // Procesar cada fila de datos
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || row.length === 0) continue;
      
      const repuesto = {
        codigo: row[0] ? String(row[0]).trim() : '', // Código
        nombre: row[1] ? String(row[1]).trim() : '', // Nombre
        descripcion: row[2] ? String(row[2]).trim() : '', // Descripción
        precio: row[3] ? parseFloat(row[3]) : 0, // Precio
        stock: row[4] ? parseInt(row[4]) : 0, // Stock
        stockMinimo: row[5] ? parseInt(row[5]) : 0, // Stock Mínimo
        categoria: row[6] ? String(row[6]).trim() : 'General', // Categoría
        marca: row[7] ? String(row[7]).trim() : '', // Marca
        ubicacion: row[9] ? String(row[9]).trim() : 'Almacén', // Ubicación
        activo: true
      };
      
      // Solo agregar si tiene código y nombre
      if (repuesto.codigo && repuesto.nombre) {
        repuestos.push(repuesto);
      }
    }
    
    console.log(`✅ Procesados ${repuestos.length} repuestos de la plantilla`);
    return repuestos;
    
  } catch (error) {
    console.error('❌ Error al importar plantilla:', error.message);
    return [];
  }
}

// Función para generar script SQL de inserción
function generarScriptSQL(repuestos, nombreArchivo) {
  console.log(`\n=== GENERANDO SCRIPT SQL PARA ${nombreArchivo} ===`);
  
  const sqlStatements = [];
  
  // Agregar comentario de inicio
  sqlStatements.push(`-- Script de importación de repuestos desde ${nombreArchivo}`);
  sqlStatements.push(`-- Generado automáticamente el ${new Date().toLocaleString()}`);
  sqlStatements.push('');
  
  // Agregar cada repuesto
  repuestos.forEach((repuesto, index) => {
    const sql = `INSERT INTO repuestos (codigo, nombre, descripcion, precio, stock, stockMinimo, categoria, marca, ubicacion, activo) VALUES (
  '${repuesto.codigo.replace(/'/g, "''")}',
  '${repuesto.nombre.replace(/'/g, "''")}',
  '${repuesto.descripcion.replace(/'/g, "''")}',
  ${repuesto.precio},
  ${repuesto.stock},
  ${repuesto.stockMinimo},
  '${repuesto.categoria.replace(/'/g, "''")}',
  '${repuesto.marca.replace(/'/g, "''")}',
  '${repuesto.ubicacion.replace(/'/g, "''")}',
  1
);`;
    
    sqlStatements.push(sql);
  });
  
  // Guardar archivo SQL
  const sqlContent = sqlStatements.join('\n');
  const fileName = `importacion_${nombreArchivo.replace(/[^a-zA-Z0-9]/g, '_')}.sql`;
  const filePath = path.join(__dirname, fileName);
  
  fs.writeFileSync(filePath, sqlContent, 'utf8');
  console.log(`✅ Script SQL guardado en: ${fileName}`);
  
  return sqlContent;
}

// Función para generar archivo JSON para importación directa
function generarJSON(repuestos, nombreArchivo) {
  console.log(`\n=== GENERANDO ARCHIVO JSON PARA ${nombreArchivo} ===`);
  
  const jsonContent = JSON.stringify(repuestos, null, 2);
  const fileName = `importacion_${nombreArchivo.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
  const filePath = path.join(__dirname, fileName);
  
  fs.writeFileSync(filePath, jsonContent, 'utf8');
  console.log(`✅ Archivo JSON guardado en: ${fileName}`);
  
  return jsonContent;
}

// Función principal
function procesarArchivosExcel() {
  console.log('🔍 PROCESANDO ARCHIVOS EXCEL PARA IMPORTACIÓN');
  console.log('==============================================');
  
  // Procesar archivo principal
  const inventarioPrincipal = importarInventarioPrincipal('../LISTA DE PRECIOS C.A.R.S._RESORTESPTOMONTT .xlsx');
  
  // Procesar plantilla
  const plantilla = importarPlantilla('../plantilla_repuestos.xlsx');
  
  // Generar archivos de importación
  if (inventarioPrincipal.length > 0) {
    generarScriptSQL(inventarioPrincipal, 'inventario_principal');
    generarJSON(inventarioPrincipal, 'inventario_principal');
  }
  
  if (plantilla.length > 0) {
    generarScriptSQL(plantilla, 'plantilla');
    generarJSON(plantilla, 'plantilla');
  }
  
  // Resumen final
  console.log('\n📊 RESUMEN DE IMPORTACIÓN:');
  console.log(`✅ Inventario Principal: ${inventarioPrincipal.length} repuestos`);
  console.log(`✅ Plantilla: ${plantilla.length} repuestos`);
  console.log(`📁 Archivos generados:`);
  console.log(`   - importacion_inventario_principal.sql`);
  console.log(`   - importacion_inventario_principal.json`);
  console.log(`   - importacion_plantilla.sql`);
  console.log(`   - importacion_plantilla.json`);
  
  console.log('\n🎯 PRÓXIMOS PASOS:');
  console.log('1. Revisar los archivos generados');
  console.log('2. Ejecutar los scripts SQL en la base de datos');
  console.log('3. O usar los archivos JSON para importación programática');
  console.log('4. Verificar que los datos se importaron correctamente');
}

// Ejecutar procesamiento
procesarArchivosExcel();
