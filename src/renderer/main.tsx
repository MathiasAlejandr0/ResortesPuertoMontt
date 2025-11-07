import React from 'react';
import ReactDOM from 'react-dom/client';
import AppNew from './AppNew';
import './index.css';

console.log('🚀 main.tsx se está ejecutando');
console.log('🔍 React version:', React.version);
console.log('🔍 ReactDOM disponible:', !!ReactDOM);

const rootElement = document.getElementById('root');
console.log('🔍 Root element encontrado:', !!rootElement);

if (rootElement) {
  console.log('🚀 Creando root de React...');
  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log('✅ Root creado, renderizando AppNew completo...');
    
    // Ocultar pantalla de carga inicial cuando React esté renderizando
    // Pero esperar un tiempo mínimo para que el usuario vea la pantalla
    const initialLoading = document.getElementById('initial-loading');
    if (initialLoading) {
      // Esperar al menos 1.5 segundos para mostrar la pantalla de carga
      const minDisplayTime = 1500; // 1.5 segundos mínimo
      const loadStartTime = performance.now();
      
      setTimeout(() => {
        const elapsedTime = performance.now() - loadStartTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        console.log(`⏱️ Pantalla inicial: ${elapsedTime}ms transcurridos, esperando ${remainingTime}ms más`);
        
        setTimeout(() => {
          if (initialLoading) {
            initialLoading.style.opacity = '0';
            initialLoading.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => {
              if (initialLoading) {
                initialLoading.style.display = 'none';
              }
            }, 500);
          }
        }, remainingTime);
      }, 200);
    }
    
    root.render(<AppNew />);
    console.log('✅ AppNew completo renderizado');
  } catch (error) {
    console.error('❌ Error renderizando AppNew:', error);
  }
} else {
  console.error('❌ No se encontró el elemento root');
}

