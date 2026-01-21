import React from 'react';
import ReactDOM from 'react-dom/client';
import AppNew from './AppNew';
import './index.css';

console.log('🚀 main.tsx se está ejecutando');
console.log('🔍 React version:', React.version);
console.log('🔍 ReactDOM disponible:', !!ReactDOM);

const rootElement = document.getElementById('root');
// Solo log en desarrollo
const isDev = import.meta.env.DEV;

if (isDev) {
  console.log('🔍 Root element encontrado:', !!rootElement);
}

if (rootElement) {
  if (isDev) console.log('🚀 Creando root de React...');
  try {
    const root = ReactDOM.createRoot(rootElement);
    if (isDev) console.log('✅ Root creado, renderizando AppNew completo...');
    
    // Ocultar pantalla de carga inicial cuando React esté renderizando
    const initialLoading = document.getElementById('initial-loading');
    if (initialLoading) {
      const minDisplayTime = 1500;
      const loadStartTime = performance.now();
      
      setTimeout(() => {
        const elapsedTime = performance.now() - loadStartTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        if (isDev) {
          console.log(`⏱️ Pantalla inicial: ${elapsedTime}ms transcurridos, esperando ${remainingTime}ms más`);
        }
        
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
    if (isDev) console.log('✅ AppNew completo renderizado');
  } catch (error) {
    console.error('❌ Error renderizando AppNew:', error);
  }
} else {
  console.error('❌ No se encontró el elemento root');
}

