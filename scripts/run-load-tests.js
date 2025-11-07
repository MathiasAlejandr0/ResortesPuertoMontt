/**
 * Script para ejecutar pruebas de carga
 * 
 * Uso: node scripts/run-load-tests.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando pruebas de carga...\n');

const testFiles = [
  'src/__tests__/database/load-test.test.ts',
  'src/__tests__/database/performance-benchmark.test.ts',
  'src/__tests__/database/database-integrity.test.ts'
];

try {
  // Ejecutar tests de carga
  console.log('📊 Ejecutando tests de carga y rendimiento...\n');
  
  testFiles.forEach((testFile, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test ${index + 1}/${testFiles.length}: ${testFile}`);
    console.log('='.repeat(60));
    
    try {
      execSync(`npm test -- ${testFile}`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    } catch (error) {
      console.error(`❌ Error ejecutando ${testFile}:`, error.message);
    }
  });

  console.log('\n✅ Pruebas de carga completadas');
} catch (error) {
  console.error('❌ Error ejecutando pruebas de carga:', error);
  process.exit(1);
}

