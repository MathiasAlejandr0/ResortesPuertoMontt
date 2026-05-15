import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    /** Abre el navegador al ejecutar `npm run dev` (Windows/macOS/Linux) */
    open: true,
    port: 5173,
  },
})
