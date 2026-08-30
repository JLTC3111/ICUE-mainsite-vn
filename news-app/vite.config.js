import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { serveSiteFonts } from '../shared/vite/serveSiteFonts.js'
import { marketApiPlugin } from './vite-market-api-plugin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveSupabaseEnv(fileEnv = {}) {
  const env = { ...fileEnv, ...process.env }
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
    plugins: [react(), marketApiPlugin(), serveSiteFonts(path.resolve(__dirname, '..'))],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(anonKey),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@icue/contact-sidebar': path.resolve(__dirname, '../shared/contact-sidebar'),
        '@icue/styles': path.resolve(__dirname, '../shared/styles'),
        '@icue/drawer-menu': path.resolve(__dirname, '../shared/drawer-menu'),
        '@icue/i18n': path.resolve(__dirname, '../shared/i18n'),
        '@icue/text': path.resolve(__dirname, '../shared/text'),
        '@icue/zalo': path.resolve(__dirname, '../shared/zalo'),
        '@icue/ui': path.resolve(__dirname, '../shared/ui'),
        'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'),
        'motion/react': path.resolve(__dirname, 'node_modules/motion/react'),
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
          // advancedChunks, not manualChunks: under rolldown the manualChunks
          // compat layer ignored our placement for CommonJS-wrapped packages,
          // so React landed inside the `editor` chunk and dragged all of
          // TipTap/ProseMirror (~480 kB) into the entry graph on every page.
          // Priorities make React its own base chunk that `editor` depends on.
          advancedChunks: {
            groups: [
              // Keep Vite's dynamic-import helper out of a feature vendor
              // chunk. Otherwise Rolldown can co-locate it with Supabase and
              // turn that lazy 200 kB SDK back into an entry preload.
              {
                name: 'preload-helper',
                test: /\0vite\/preload-helper/,
                priority: 110,
              },
              {
                name: 'react',
                test: /node_modules[/\\](react|react-dom|scheduler|use-sync-external-store)[/\\]/,
                priority: 100,
              },
              {
                name: 'editor',
                test: /node_modules[/\\](@tiptap|prosemirror-|linkifyjs|orderedmap|rope-sequence|w3c-keyname)/,
                priority: 90,
              },
              {
                name: 'supabase',
                test: /node_modules[/\\](@supabase|iceberg-js)/,
                priority: 80,
              },
              {
                name: 'i18n',
                test: /node_modules[/\\](i18next|react-i18next)[/\\]/,
                priority: 70,
              },
              {
                name: 'motion',
                test: /node_modules[/\\](motion|motion-dom|motion-utils|framer-motion)[/\\]/,
                priority: 60,
              },
              {
                name: 'router',
                test: /node_modules[/\\]react-router/,
                priority: 50,
              },
              {
                name: 'swiper',
                test: /node_modules[/\\]swiper[/\\]/,
                priority: 40,
              },
              {
                name: 'date-picker',
                test: /node_modules[/\\](@daypicker|react-day-picker|date-fns|@date-fns)[/\\]/,
                priority: 39,
              },
              {
                name: 'embla',
                test: /node_modules[/\\](embla-carousel|embla-carousel-react|embla-carousel-reactive-utils)[/\\]/,
                priority: 38,
              },
              {
                name: 'rough-notation',
                test: /node_modules[/\\]rough-notation[/\\]/,
                priority: 37,
              },
              { name: 'vendor', test: /node_modules/, priority: 1 },
            ],
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
