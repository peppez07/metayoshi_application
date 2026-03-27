import path from 'path'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import type { BuildConfig } from './viteExtension'
import { createExtensionBuildConfig } from './viteExtension'

type CreateCoreViteConfigOptions = {
  rootDir: string
  pkgVersion: string
  buildConfig: BuildConfig
  plugins: Plugin[]
}

export function createCoreViteConfig(options: CreateCoreViteConfigOptions) {
  const { rootDir, pkgVersion, buildConfig, plugins } = options

  return defineConfig({
    base: '/',
    plugins: [
      wasm(),
      topLevelAwait(),
      react(),
      ...plugins,
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
        buffer: 'buffer',
        stream: 'stream-browserify',
        events: 'events',
        process: 'process/browser',
      },
    },
    define: {
      global: 'globalThis',
      process: 'globalThis.process',
      'globalThis.Buffer': 'globalThis.Buffer',
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkgVersion),
      __METAYOSHI_BUILD_CONFIG__: JSON.stringify(buildConfig ?? {}),
    },
    optimizeDeps: {
      include: ['buffer', 'stream-browserify', 'events', 'process'],
    },
    build: createExtensionBuildConfig(rootDir),
    publicDir: 'public',
  })
}
