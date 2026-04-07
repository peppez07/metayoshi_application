import type { CoinModule, CoinRuntimeContext, Network } from './types'
import { FULL_ASSET_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl } from '../lib/serverOnly'
const DEFAULT_TRON_EXPLORER_URL = ''

export function createTronNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_TRON_BRIDGE_USER',
    passEnvKey: 'VITE_TRON_BRIDGE_PASSWORD'
  })

  return {
    id: 'tron',
    runtimeModelId: 'tron',
    serverCoinId: 'tron',
    serverChain: 'main',
    displayChain: 'main',
    name: 'TRON',
    symbol: 'TRX',
    coinType: 'TRON',
    coinSymbol: 'TRX',
    rpcUrl: '',
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('tron', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(env.VITE_TRON_EXPLORER || DEFAULT_TRON_EXPLORER_URL).trim()) || undefined,
    capabilities: FULL_ASSET_CAPABILITIES,
    derivation: {
      status: 'supported'
    },
    logo: getUnifiedLogoByName('tron')
  }
}

export const tronCoin: CoinModule = {
  id: 'tron',
  symbol: 'TRX',
  coinSymbol: 'TRX',
  capabilities: FULL_ASSET_CAPABILITIES,
  createNetwork: createTronNetwork
}
