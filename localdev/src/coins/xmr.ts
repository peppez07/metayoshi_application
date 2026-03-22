import type { CoinModule, CoinRuntimeContext, Network } from './types'
import { NATIVE_ONLY_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl, sanitizeRpcUrl } from '../lib/serverOnly'

const DEFAULT_XMR_EXPLORER_URL = ''

export function createXmrNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_XMR_BRIDGE_USER',
    passEnvKey: 'VITE_XMR_BRIDGE_PASSWORD'
  })

  return {
    id: 'xmr',
    runtimeModelId: 'xmr',
    serverCoinId: 'monero',
    serverChain: 'main',
    displayChain: 'main',
    name: 'Monero',
    symbol: 'XMR',
    coinType: 'BTC',
    coinSymbol: 'XMR',
    rpcUrl: sanitizeRpcUrl(String(env.VITE_XMR_RPC || '').trim() || ctx.apiBaseUrl, ctx.apiBaseUrl),
    rpcWallet: '',
    rpcUsername: String(env.VITE_XMR_RPC_USER || '').trim(),
    rpcPassword: String(env.VITE_XMR_RPC_PASSWORD || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl('monero', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(env.VITE_XMR_EXPLORER || DEFAULT_XMR_EXPLORER_URL).trim()) || undefined,
    capabilities: NATIVE_ONLY_CAPABILITIES,
    derivation: {
      status: 'supported'
    },
    logo: getUnifiedLogoByName('monero')
  }
}

export const xmrCoin: CoinModule = {
  id: 'xmr',
  symbol: 'XMR',
  coinSymbol: 'XMR',
  capabilities: NATIVE_ONLY_CAPABILITIES,
  createNetwork: createXmrNetwork
}
