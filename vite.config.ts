import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Feature chunks - agrupar páginas relacionadas para code-splitting
          // taller e inventario comparten dependencias circulares → mismo chunk para evitar warning
          if (id.includes('src/renderer/pages')) {
            // Taller + Inventario (evita circular chunk: inventario ↔ taller)
            if (id.includes('Ordenes') || id.includes('Cotizaciones') || 
                id.includes('Agenda') || id.includes('Recordatorios') || 
                id.includes('Vehiculos') || id.includes('Historico') ||
                id.includes('Inventario') || id.includes('Productos') || 
                id.includes('EditorProductos') || id.includes('ServiciosListado') || 
                id.includes('EditorServicios') || id.includes('CategoriasListado') || 
                id.includes('Tienda')) {
              return 'taller-inventario';
            }
            // Caja - módulo de caja diaria
            if (id.includes('CajaDiaria') || id.includes('CierresCaja') || 
                id.includes('MovimientosCaja') || id.includes('Pagos')) {
              return 'caja';
            }
            // Cuentas - módulo de cuentas corrientes
            if (id.includes('SaldosCuentas') || id.includes('MovimientosCuentas') || 
                id.includes('InformesCuentaCorriente')) {
              return 'cuentas';
            }
            // Informes - módulo de informes y gráficas
            if (id.includes('Informes') || id.includes('Graficas') || 
                id.includes('ReporteTecnicos')) {
              return 'informes';
            }
            // Trabajadores - módulo de trabajadores
            if (id.includes('Trabajadores') || id.includes('PagosTrabajadores') || 
                id.includes('ScoreTrabajadores')) {
              return 'trabajadores';
            }
            // Configuración - módulo de configuración
            if (id.includes('Configuracion') || id.includes('Perfil')) {
              return 'configuracion';
            }
            // Importación/Exportación
            if (id.includes('Importar') || id.includes('Exportar')) {
              return 'importacion';
            }
            // Clientes
            if (id.includes('Clientes')) {
              return 'clientes';
            }
          }
          
          // Dejar que Vite maneje automáticamente los vendor chunks
          // Esto evita dependencias circulares
          return null;
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Aumentar límite a 1MB ya que ahora tenemos chunks optimizados
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
})

