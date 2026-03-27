import path from 'path'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import type { Plugin, UserConfig } from 'vite'

export type BuildConfig = {
  coins?: { enabled?: 'all' | '*' | string[]; disabled?: string[] }
  features?: Record<string, boolean | undefined>
  modelStatus?: { tested?: string[]; untested?: string[]; blocked?: string[] }
}

type WalletLogoSpec = {
  coinIds: string[]
  file: string
  names: string[]
}

type ManifestShape = {
  background?: {
    scripts?: string[]
    service_worker?: string
    type?: string
  }
  browser_specific_settings?: {
    gecko?: {
      id?: string
      strict_min_version?: string
    }
  }
}

const VIRTUAL_WALLET_LOGO_REGISTRY_ID = 'virtual:wallet-logo-registry'
const RESOLVED_VIRTUAL_WALLET_LOGO_REGISTRY_ID = `\0${VIRTUAL_WALLET_LOGO_REGISTRY_ID}`

const WALLET_LOGO_SPECS: WalletLogoSpec[] = [
  { coinIds: ['rtm'], file: 'raptoreum.png', names: ['raptoreum', 'rtm'] },
  { coinIds: ['eth'], file: 'ethereum.png', names: ['ethereum', 'eth'] },
  { coinIds: ['ethereum-sepolia'], file: 'ethereum.png', names: ['ethereum-sepolia', 'eth-sepolia', 'sepolia', 'sepolia-eth', 'testnet-ethereum'] },
  { coinIds: ['arb'], file: 'arbitrum.png', names: ['arbitrum', 'arb', 'arbitrum-one'] },
  { coinIds: ['arbitrum-sepolia'], file: 'arbitrum.png', names: ['arbitrum-sepolia', 'arb-sepolia', 'arbitrum-testnet', 'testnet-arbitrum'] },
  { coinIds: ['akash'], file: 'akash-network.png', names: ['akash', 'akash-network', 'akt'] },
  { coinIds: ['aurora'], file: 'aurora.svg', names: ['aurora'] },
  { coinIds: ['bahamut'], file: 'bahamut.svg', names: ['bahamut', 'ftn'] },
  { coinIds: ['op'], file: 'op.png', names: ['op', 'optimism'] },
  { coinIds: ['optimism-sepolia'], file: 'op.png', names: ['optimism-sepolia', 'op-sepolia', 'optimism-testnet', 'testnet-optimism'] },
  { coinIds: ['base'], file: 'base.png', names: ['base', 'base-mainnet', 'base-chain'] },
  { coinIds: ['base-sepolia'], file: 'base.png', names: ['base-sepolia', 'sepolia-base', 'base-testnet', 'testnet-base'] },
  { coinIds: ['bnb', 'bnb-testnet'], file: 'bnb.png', names: ['bnb', 'bsc', 'bnb-smart-chain', 'binance-smart-chain'] },
  { coinIds: ['avaxc'], file: 'avalanche.png', names: ['avalanche', 'avax', 'avaxc', 'avalanche-c-chain'] },
  { coinIds: ['avalanche-fuji'], file: 'avalanche.png', names: ['avalanche-fuji', 'avalanche-fuji-c-chain', 'fuji', 'fuji-c-chain', 'avalanche-testnet'] },
  { coinIds: ['sol'], file: 'solana.png', names: ['solana', 'sol'] },
  { coinIds: ['dash'], file: 'dash.png', names: ['dash'] },
  { coinIds: ['doge'], file: 'dogecoin.png', names: ['dogecoin', 'doge'] },
  { coinIds: ['tron', 'trx'], file: 'tron.png', names: ['tron', 'trx'] },
  { coinIds: ['ada', 'cardano'], file: 'cardano.png', names: ['cardano', 'ada'] },
  { coinIds: ['xlm', 'stellar'], file: 'stellar.png', names: ['stellar', 'xlm'] },
  { coinIds: ['btcz'], file: 'bitcoinz.png', names: ['bitcoinz', 'btcz'] },
  { coinIds: ['firo'], file: 'firo.png', names: ['firo'] },
  { coinIds: ['gnosis'], file: 'gnosis.svg', names: ['gnosis', 'gnosis-chain', 'xdai'] },
  { coinIds: ['cosmos'], file: 'cosmos.png', names: ['cosmos', 'atom'] },
  { coinIds: ['bitcoin'], file: 'bitcoin.png', names: ['bitcoin', 'btc'] },
  { coinIds: ['polygon'], file: 'polygon.png', names: ['polygon', 'matic'] },
  { coinIds: ['polygon-amoy'], file: 'polygon.png', names: ['polygon-amoy', 'polygon-amoy-bor', 'amoy', 'polygon-testnet', 'testnet-polygon'] },
  { coinIds: ['cronos', 'cro'], file: 'cronos.png', names: ['cronos', 'cro', 'cronos-pos'] },
  { coinIds: ['dymension-evm'], file: 'dymension.jpg', names: ['dymension-evm', 'dymension-evm-mainnet', 'mainnet-dymension-evm'] },
  { coinIds: ['elys'], file: 'elysia.png', names: ['elys', 'elys-mainnet', 'mainnet-elys'] },
  { coinIds: ['evmos-evm'], file: 'evmos.png', names: ['evmos-evm', 'evmos-evm-mainnet', 'mainnet-evmos-evm'] },
  { coinIds: ['lumera'], file: 'lumera-health.png', names: ['lumera', 'lumera-mainnet', 'mainnet-lumera'] },
  { coinIds: ['nolus'], file: 'nolus-io.png', names: ['nolus', 'nolus-mainnet', 'mainnet-nolus'] },
  { coinIds: ['oraichain'], file: 'oraichain-token.png', names: ['oraichain', 'oraichain-mainnet', 'mainnet-oraichain', 'orai'] },
  { coinIds: ['sei'], file: 'sei.png', names: ['sei', 'sei-mainnet', 'mainnet-sei'] },
  { coinIds: ['sei-evm'], file: 'sei.png', names: ['sei-evm', 'sei-evm-mainnet', 'mainnet-sei-evm'] },
  { coinIds: ['sui'], file: 'sui.png', names: ['sui'] },
  { coinIds: ['zksync'], file: 'ZKsync.png', names: ['zksync', 'zk-sync', 'zk sync', 'zks', 'zk', 'zk era', 'zksync-era'] }
]

function normalizeCoinId(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function listWalletLogoFiles(rootDir: string): string[] {
  const logosDir = path.resolve(rootDir, 'src/coins/logos')
  if (!existsSync(logosDir)) return []
  return readdirSync(logosDir)
    .filter((file) => /\.(png|jpg|jpeg|webp|svg)$/i.test(file))
    .sort((a, b) => a.localeCompare(b))
}

function createAutoWalletLogoSpecs(rootDir: string, existing: WalletLogoSpec[]): WalletLogoSpec[] {
  const knownFiles = new Set(existing.map((spec) => String(spec.file || '').trim().toLowerCase()).filter(Boolean))
  const out: WalletLogoSpec[] = []
  for (const file of listWalletLogoFiles(rootDir)) {
    const normalizedFile = file.toLowerCase()
    if (knownFiles.has(normalizedFile)) continue
    const parsed = path.parse(file)
    const baseName = String(parsed.name || '').trim()
    if (!baseName) continue
    out.push({
      coinIds: [baseName],
      file,
      names: [baseName]
    })
  }
  return out
}

function resolveBundledWalletLogoSpecs(rootDir: string, config: BuildConfig): WalletLogoSpec[] {
  const disabled = new Set((config.coins?.disabled || []).map(normalizeCoinId).filter(Boolean))
  const specs = [...WALLET_LOGO_SPECS, ...createAutoWalletLogoSpecs(rootDir, WALLET_LOGO_SPECS)]
  return specs.filter((spec) => spec.coinIds.some((id) => !disabled.has(normalizeCoinId(id))))
}

function createWalletLogoRegistryModule(rootDir: string, config: BuildConfig): string {
  const specs = resolveBundledWalletLogoSpecs(rootDir, config)
  const imports = specs.map((spec, index) => {
    const from = `/src/coins/logos/${spec.file}`
    return `import logo${index} from ${JSON.stringify(from)}`
  })
  const entries = specs.map((spec, index) => {
    return `  { src: logo${index}, names: ${JSON.stringify(spec.names)} }`
  })

  return [
    ...imports,
    '',
    'export const bundledWalletLogos = [',
    ...entries.map((entry, index) => `${entry}${index < entries.length - 1 ? ',' : ''}`),
    ']'
  ].join('\n')
}

function ensureManifestMetadata(manifestPath: string): void {
  if (!existsSync(manifestPath)) return

  const raw = readFileSync(manifestPath, 'utf-8')
  const manifest = JSON.parse(raw) as ManifestShape
  const background = manifest.background || {}

  manifest.background = {
    ...background,
    service_worker: String(background.service_worker || 'background.js').trim() || 'background.js',
    type: background.type || 'module'
  }

  manifest.browser_specific_settings = {
    ...(manifest.browser_specific_settings || {}),
    gecko: {
      ...(manifest.browser_specific_settings?.gecko || {}),
      id: manifest.browser_specific_settings?.gecko?.id || 'wallet@metayoshi.app'
    }
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')
}

function manualChunkId(id: string): string | undefined {
  const normalized = id.replace(/\\/g, '/')

  if (!normalized.includes('/node_modules/')) return undefined
  if (normalized.includes('/react/') || normalized.includes('/react-dom/') || normalized.includes('/react-router')) {
    return 'vendor-react'
  }
  if (normalized.includes('/@solana/web3.js/')) {
    return 'vendor-solana'
  }
  if (normalized.includes('/ethers/') || normalized.includes('/@walletconnect/') || normalized.includes('/viem/')) {
    return 'vendor-evm'
  }
  if (normalized.includes('/@mysten/sui/')) {
    return 'vendor-sui'
  }
  if (normalized.includes('/@stellar/stellar-sdk/')) {
    return 'vendor-stellar'
  }
  if (normalized.includes('/@emurgo/cardano-serialization-lib-browser/')) {
    return 'vendor-cardano'
  }
  if (normalized.includes('/@stellar/stellar-sdk/')) {
    return 'vendor-stellar'
  }

  return undefined
}

export function createWalletLogoRegistryPlugin(rootDir: string, buildConfig: BuildConfig): Plugin {
  return {
    name: 'wallet-logo-registry',
    resolveId(id) {
      if (id === VIRTUAL_WALLET_LOGO_REGISTRY_ID) return RESOLVED_VIRTUAL_WALLET_LOGO_REGISTRY_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_WALLET_LOGO_REGISTRY_ID) return null
      return createWalletLogoRegistryModule(rootDir, buildConfig)
    }
  }
}

export function createPostBuildExtensionPlugin(rootDir: string): Plugin {
  return {
    name: 'post-build-extension',
    closeBundle() {
      const assetsDir = path.resolve(rootDir, 'dist/assets')
      if (!existsSync(assetsDir)) {
        mkdirSync(assetsDir, { recursive: true })
      }

      try {
        copyFileSync(path.resolve(rootDir, 'public/manifest.json'), path.resolve(rootDir, 'dist/manifest.json'))
        ensureManifestMetadata(path.resolve(rootDir, 'dist/manifest.json'))
        console.log('[OK] Copied manifest.json to dist/')
      } catch (err) {
        console.error('Failed to copy manifest.json:', err)
      }

      try {
        const logoSrc = path.resolve(rootDir, 'public/MetayoshiLogo.png')
        const logoDest = path.resolve(rootDir, 'dist/MetayoshiLogo.png')
        if (existsSync(logoSrc)) {
          copyFileSync(logoSrc, logoDest)
          console.log('Copied MetayoshiLogo.png to dist/')
        } else {
          console.warn('MISSING: public/MetayoshiLogo.png')
        }
      } catch (err) {
        console.error('Failed to copy MetayoshiLogo.png:', err)
      }

      try {
        const shimSrc = path.resolve(rootDir, 'public/process-prelude.js')
        const shimDest = path.resolve(rootDir, 'dist/assets/process-prelude.js')
        if (existsSync(shimSrc)) {
          copyFileSync(shimSrc, shimDest)
          console.log('[OK] Copied process-prelude.js -> dist/assets/process-prelude.js')
        } else {
          console.warn('MISSING: public/process-prelude.js')
        }
      } catch (err) {
        console.error('Failed to copy process-prelude.js:', err)
      }

      try {
        const sourceIconsDir = path.resolve(rootDir, 'src/coins/logos')
        if (existsSync(sourceIconsDir)) {
          const distIconsDir = path.resolve(rootDir, 'dist/icons')
          if (!existsSync(distIconsDir)) {
            mkdirSync(distIconsDir, { recursive: true })
          }
          const iconMapping: Record<string, string> = {
            'icon-16.png': 'metayoshi-16.png',
            'icon-32.png': 'metayoshi-32.png',
            'icon-48.png': 'metayoshi-48.png',
            'icon-64.png': 'metayoshi-64.png',
            'icon-128.png': 'metayoshi-128.png',
          }
          for (const [src, dest] of Object.entries(iconMapping)) {
            const sourceFileName = dest
            const srcPath = path.join(sourceIconsDir, sourceFileName)
            const destPath = path.join(assetsDir, dest)
            const legacyDestPath = path.join(distIconsDir, src)
            if (existsSync(srcPath)) {
              copyFileSync(srcPath, destPath)
              console.log(`[OK] Copied ${src} -> dist/assets/${dest}`)
              copyFileSync(srcPath, legacyDestPath)
              console.log(`[OK] Copied ${src} -> dist/icons/${src}`)
            } else {
              console.warn(`[WARN] Missing square icon source: ${sourceFileName}`)
            }
          }
        }
      } catch (err) {
        console.error('Failed to copy icons:', err)
      }

      try {
        const bootstrapCss = path.resolve(rootDir, 'dist/assets/bootstrap.css')
        const uiCss = path.resolve(rootDir, 'dist/assets/ui.css')
        if (existsSync(bootstrapCss) && !existsSync(uiCss)) {
          copyFileSync(bootstrapCss, uiCss)
          console.log('[OK] Renamed bootstrap.css -> ui.css')
        }
      } catch (err) {
        console.error('Failed to rename CSS:', err)
      }

      try {
        const htmlPath = path.resolve(rootDir, 'dist/app/src/ui/index.html')
        if (existsSync(htmlPath)) {
          let html = readFileSync(htmlPath, 'utf-8')
          html = html.replace(/<script[^>]*src="\/src\/main\.tsx"[^>]*><\/script>\n?\s*/g, '')
          html = html.replace(/src="\.+\/assets\//g, 'src="/assets/')
          html = html.replace(/href="\.+\/assets\//g, 'href="/assets/')
          html = html.replace(/bootstrap\.css/g, 'ui.css')
          html = html.replace(/<script[^>]*src="\/assets\/process-prelude\.js"[^>]*><\/script>\n?\s*/g, '')

          if (!html.includes('/assets/ui.js')) {
            html = html.replace(
              '</head>',
              '    <script type="module" crossorigin src="/assets/ui.js"></script>\n  </head>',
            )
          }

          html = html.replace(
            '<script type="module" crossorigin src="/assets/ui.js"></script>',
            '    <script src="/assets/process-prelude.js"></script>\n    <script type="module" crossorigin src="/assets/ui.js"></script>'
          )

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

      for (const f of ['dist/background.js', 'dist/assets/ui.js', 'dist/assets/ui.css']) {
        const resolved = path.resolve(rootDir, f)
        if (existsSync(resolved)) {
          console.log(`[OK] ${f}`)
        } else {
          console.warn(`[WARN] MISSING: ${f}`)
        }
      }
    }
  }
}

export function createExtensionBuildConfig(rootDir: string): UserConfig['build'] {
  return {
    rollupOptions: {
      onwarn(warning, warn) {
        const message = String((warning as any)?.message ?? '')
        const id = String((warning as any)?.id ?? (warning as any)?.loc?.file ?? '')

        if (
          (message.includes('contains an annotation that Rollup cannot interpret')
            || message.includes('Rollup cannot interpret due to the position of the comment'))
          && (message.includes('ox/_esm/core/Base64.js') || id.includes('ox/_esm/core/Base64.js'))
        ) {
          return
        }

        warn(warning)
      },
      input: {
        ui: path.resolve(rootDir, 'app/src/ui/index.html'),
        background: path.resolve(rootDir, 'src/background/service-worker.ts'),
        content: path.resolve(rootDir, 'src/content/content-script.ts'),
        inpage: path.resolve(rootDir, 'src/inpage/inpage-provider.ts'),
      },
      output: {
        manualChunks(id) {
          return manualChunkId(id)
        },
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
    target: ['chrome79', 'firefox78'],
  }
}
