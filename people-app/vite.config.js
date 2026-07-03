import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/people/',
  plugins: [react()],
  build: {
    outDir: '../people',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
  },
  server: {
    port: 5174,
    proxy: {
      '/profilePhotos': { target: 'http://localhost:5173', changeOrigin: true },
      '/public': { target: 'http://localhost:5173', changeOrigin: true },
    },
  },
})
