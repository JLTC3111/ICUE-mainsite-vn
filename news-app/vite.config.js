import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { marketApiPlugin } from './vite-market-api-plugin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveSupabaseEnv(env) {
  return {
    url: env.VITE_SUPABASE_URL || env.SUPABASE_URL || '',
    anonKey: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '',
  }
}

// Performance-oriented build: aggressive code-splitting so the heavy editor
// (TipTap/ProseMirror) and Supabase client never block the public news grid.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const { url, anonKey } = resolveSupabaseEnv(env)

  return {
    // Distinct from legacy #/News — served at icue.vn/newsroom/
    base: '/newsroom/',
    plugins: [react(), marketApiPlugin()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(anonKey),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@icue/contact-sidebar': path.resolve(__dirname, '../shared/contact-sidebar'),
        '@icue/i18n': path.resolve(__dirname, '../shared/i18n'),
        '@icue/text': path.resolve(__dirname, '../shared/text'),
        '@icue/zalo': path.resolve(__dirname, '../shared/zalo'),
      },
    },
    build: {
      // Production serves the repo ROOT statically, so the app must live at
      // /newsroom (not /public/newsroom) to match its base + the banner link.
      outDir: '../newsroom',
      emptyOutDir: true,
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
            if (id.includes('motion') || id.includes('framer-motion')) return 'motion'
            if (id.includes('/ogl') || id.includes('node_modules/ogl')) return 'ogl'
            if (id.includes('react') || id.includes('scheduler')) return 'react'
            return 'vendor'
          },
        },
      },
    },
    server: {
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
    },
  }
})
