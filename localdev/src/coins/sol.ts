import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { FULL_ASSET_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl } from '../lib/serverOnly'
const DEFAULT_SOL_EXPLORER_URL = ''

export const SOL_CAPABILITIES: NetworkCapabilitiesInput = FULL_ASSET_CAPABILITIES

export function createSolNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_SOL_BRIDGE_USER',
    passEnvKey: 'VITE_SOL_BRIDGE_PASSWORD'
  })

  return {
    id: 'sol',
    runtimeModelId: 'sol',
    serverCoinId: 'solana',
    serverChain: 'main',
    displayChain: 'main',
    name: 'Solana',
    symbol: 'SOL',
    coinType: 'SOL',
    coinSymbol: 'SOL',
    rpcUrl: '',
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('solana', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(
      String(env.VITE_SOL_EXPLORER || env.VITE_SOLANA_EXPLORER || DEFAULT_SOL_EXPLORER_URL).trim()
    ) || undefined,
    capabilities: SOL_CAPABILITIES,
    logo: getUnifiedLogoByName('solana')
  }
}

export const solCoin: CoinModule = {
  id: 'sol',
  symbol: 'SOL',
  coinSymbol: 'SOL',
  capabilities: SOL_CAPABILITIES,
  createNetwork: createSolNetwork
}
