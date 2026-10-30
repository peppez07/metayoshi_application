import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'post-build-extension',
      closeBundle() {
        // Ensure dist/assets exists
        const assetsDir = path.resolve(__dirname, 'dist/assets')
        if (!existsSync(assetsDir)) {
          mkdirSync(assetsDir, { recursive: true })
        }

        // Copy manifest.json
        try {
          copyFileSync('public/manifest.json', 'dist/manifest.json')
          console.log('[OK] Copied manifest.json to dist/')
        } catch (err) {
          console.error('Failed to copy manifest.json:', err)
        }

        // Copy MetayoshiLogo.png to dist root (used by logo + favicon)
        try {
          const logoSrc = path.resolve(__dirname, 'public/MetayoshiLogo.png')
          const logoDest = path.resolve(__dirname, 'dist/MetayoshiLogo.png')
          if (existsSync(logoSrc)) {
            copyFileSync(logoSrc, logoDest)
            console.log('Copied MetayoshiLogo.png to dist/')
          } else {
            console.warn('MISSING: public/MetayoshiLogo.png')
          }
        } catch (err) {
          console.error('Failed to copy MetayoshiLogo.png:', err)
        }

        // Copy icons: public/icons/icon-*.png -> dist/assets/metayoshi-*.png
        try {
          const publicIconsDir = path.resolve(__dirname, 'public/icons')
          if (existsSync(publicIconsDir)) {
            const iconMapping: Record<string, string> = {
              'icon-16.png':  'metayoshi-16.png',
              'icon-32.png':  'metayoshi-32.png',
              'icon-48.png':  'metayoshi-48.png',
              'icon-128.png': 'metayoshi-128.png',
            }
            for (const [src, dest] of Object.entries(iconMapping)) {
              const srcPath  = path.join(publicIconsDir, src)
              const destPath = path.join(assetsDir, dest)
              if (existsSync(srcPath)) {
                copyFileSync(srcPath, destPath)
                console.log(`[OK] Copied ${src} -> dist/assets/${dest}`)
              }
            }
          }
        } catch (err) {
          console.error('Failed to copy icons:', err)
        }

        // Rename bootstrap.css -> ui.css (Vite names CSS after the chunk that imports it)
        try {
          const bootstrapCss = path.resolve(__dirname, 'dist/assets/bootstrap.css')
          const uiCss = path.resolve(__dirname, 'dist/assets/ui.css')
          if (existsSync(bootstrapCss) && !existsSync(uiCss)) {
            copyFileSync(bootstrapCss, uiCss)
            console.log('[OK] Renamed bootstrap.css -> ui.css')
          }
        } catch (err) {
          console.error('Failed to rename CSS:', err)
        }

        // Fix popup HTML: ensure script/link tags use /assets/ui.js and /assets/ui.css
        try {
          const htmlPath = path.resolve(__dirname, 'dist/app/src/ui/index.html')
          if (existsSync(htmlPath)) {
            let html = readFileSync(htmlPath, 'utf-8')

            // Remove the dev-only script tag pointing to /src/main.tsx (Vite injects the real one)
            html = html.replace(/<script[^>]*src="\/src\/main\.tsx"[^>]*><\/script>\n?\s*/g, '')

            // Normalise any auto-generated asset paths -> absolute /assets/...
            html = html.replace(/src="\.+\/assets\//g, 'src="/assets/')
            html = html.replace(/href="\.+\/assets\//g, 'href="/assets/')

            // Fix any bootstrap.css reference -> ui.css
            html = html.replace(/bootstrap\.css/g, 'ui.css')

            // Ensure script tag is present
            if (!html.includes('/assets/ui.js')) {
              html = html.replace(
                '</head>',
                '    <script type="module" crossorigin src="/assets/ui.js"></script>\n  </head>',
              )
            }

            // Ensure CSS link tag is present
            if (!html.includes('/assets/ui.css')) {
              html = html.replace(
                '</head>',
                '    <link rel="stylesheet" crossorigin href="/assets/ui.css">\n  </head>',
              )
            }

            writeFileSync(htmlPath, html, 'utf-8')
            console.log('[OK] Fixed popup HTML asset paths')
          } else {
            console.warn('[WARN] dist/app/src/ui/index.html not found after build')
          }
        } catch (err) {
          console.error('Failed to fix popup HTML:', err)
        }

        // Sanity-check critical files
        for (const f of ['dist/background.js', 'dist/assets/ui.js', 'dist/assets/ui.css']) {
          const p = path.resolve(__dirname, f)
          if (existsSync(p)) {
            console.log(`[OK] ${f}`)
          } else {
            console.warn(`[WARN] MISSING: ${f}`)
          }
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      input: {
        ui:         path.resolve(__dirname, 'app/src/ui/index.html'),
        background: path.resolve(__dirname, 'src/background/service-worker.ts'),
        content:    path.resolve(__dirname, 'src/content/content-script.ts'),
        inpage:     path.resolve(__dirname, 'src/inpage/inpage-provider.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js'
          return 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'manifest.json') return 'manifest.json'
          return 'assets/[name][extname]'
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: false,
    sourcemap: false,
    modulePreload: false,
    minify: 'esbuild',
    target: ['chrome109', 'firefox115'],
  },
  publicDir: 'public',
})
