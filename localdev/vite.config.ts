import path from 'path'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { createCoreViteConfig } from './build/viteCore'
import { createPostBuildExtensionPlugin, createWalletLogoRegistryPlugin } from './build/viteExtension'
import type { BuildConfig } from './build/viteExtension'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(path.resolve(rootDir, 'package.json'), 'utf-8')) as { version: string }

function loadBuildConfig(rootPath: string): BuildConfig {
  const explicit = String(process.env.METAYOSHI_BUILD_CONFIG_PATH || '').trim()
  const defaultPath = path.resolve(rootPath, 'metayoshi.build.json')
  const configPath = explicit ? path.resolve(rootPath, explicit) : defaultPath
  if (!existsSync(configPath)) return {}

  try {
    const raw = readFileSync(configPath, 'utf-8')
    const json = JSON.parse(raw) as unknown
    if (!json || typeof json !== 'object' || Array.isArray(json)) return {}
    console.log(`[metayoshi] Build config loaded from ${configPath}`)
    return json as BuildConfig
  } catch (err) {
    console.warn(`[metayoshi] Failed to load build config from ${configPath}:`, err)
    return {}
  }
}

const buildConfig = loadBuildConfig(rootDir)

export default createCoreViteConfig({
  rootDir,
  pkgVersion: pkg.version,
  buildConfig,
  plugins: [
    createWalletLogoRegistryPlugin(rootDir, buildConfig),
    createPostBuildExtensionPlugin(rootDir),
  ],
})
