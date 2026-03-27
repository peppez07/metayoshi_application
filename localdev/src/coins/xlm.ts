import type { CoinModule, CoinRuntimeContext, Network } from './types'
import { FULL_ASSET_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl } from '../lib/serverOnly'
const DEFAULT_XLM_EXPLORER_URL = ''

export function createXlmNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_XLM_BRIDGE_USER',
    passEnvKey: 'VITE_XLM_BRIDGE_PASSWORD'
  })

  return {
    id: 'xlm',
    runtimeModelId: 'xlm',
    serverCoinId: 'stellar',
    serverChain: 'main',
    displayChain: 'main',
    name: 'Stellar',
    symbol: 'XLM',
    coinType: 'XLM',
    coinSymbol: 'XLM',
    rpcUrl: '',
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('stellar', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(env.VITE_XLM_EXPLORER || DEFAULT_XLM_EXPLORER_URL).trim()) || undefined,
    capabilities: FULL_ASSET_CAPABILITIES,
    derivation: {
      status: 'supported'
    },
    logo: getUnifiedLogoByName('stellar')
  }
}

export const xlmCoin: CoinModule = {
  id: 'xlm',
  symbol: 'XLM',
  coinSymbol: 'XLM',
  capabilities: FULL_ASSET_CAPABILITIES,
  createNetwork: createXlmNetwork
}
