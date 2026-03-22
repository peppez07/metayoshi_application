import type { CoinModule, CoinRuntimeContext, Network } from './types'
import { FULL_ASSET_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl, sanitizeRpcUrl } from '../lib/serverOnly'

const DEFAULT_ADA_RPC_URL = ''
const DEFAULT_ADA_EXPLORER_URL = ''

export function createAdaNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_ADA_BRIDGE_USER',
    passEnvKey: 'VITE_ADA_BRIDGE_PASSWORD'
  })

  return {
    id: 'ada',
    runtimeModelId: 'ada',
    serverCoinId: 'cardano',
    serverChain: 'main',
    displayChain: 'main',
    name: 'Cardano',
    symbol: 'ADA',
    coinType: 'BTC',
    coinSymbol: 'ADA',
    rpcUrl: sanitizeRpcUrl(String(env.VITE_ADA_RPC || DEFAULT_ADA_RPC_URL).trim() || ctx.apiBaseUrl, ctx.apiBaseUrl),
    rpcWallet: '',
    rpcUsername: String(env.VITE_ADA_RPC_USER || '').trim(),
    rpcPassword: String(env.VITE_ADA_RPC_PASSWORD || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl('cardano', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(env.VITE_ADA_EXPLORER || DEFAULT_ADA_EXPLORER_URL).trim()) || undefined,
    capabilities: FULL_ASSET_CAPABILITIES,
    derivation: {
      status: 'supported'
    },
    logo: getUnifiedLogoByName('cardano')
  }
}

export const adaCoin: CoinModule = {
  id: 'ada',
  symbol: 'ADA',
  coinSymbol: 'ADA',
  capabilities: FULL_ASSET_CAPABILITIES,
  createNetwork: createAdaNetwork
}
