import path from 'path'
import { fileURLToPath } from 'url'
import { validateWalletEnvConfiguration } from '../build/walletEnv'

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)))

try {
  validateWalletEnvConfiguration(rootDir)
  console.log('[metayoshi] Wallet environment validation passed.')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
