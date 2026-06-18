import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Performance-oriented build: aggressive code-splitting so the heavy editor
// (TipTap/ProseMirror) and Supabase client never block the public news grid.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n'
          if (id.includes('react-router')) return 'router'
          if (id.includes('react') || id.includes('scheduler')) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
