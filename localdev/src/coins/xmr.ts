import type { CoinModule, CoinRuntimeContext, Network } from './types'
import { NATIVE_ONLY_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'

const DEFAULT_XMR_EXPLORER_URL = 'https://xmrchain.net'

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
    name: 'Monero',
    symbol: 'XMR',
    coinType: 'BTC',
    coinSymbol: 'XMR',
    rpcUrl: String(env.VITE_XMR_RPC || ctx.apiBaseUrl).trim() || ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: String(env.VITE_XMR_RPC_USER || '').trim(),
    rpcPassword: String(env.VITE_XMR_RPC_PASSWORD || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl('monero', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: String(env.VITE_XMR_EXPLORER || DEFAULT_XMR_EXPLORER_URL).trim() || DEFAULT_XMR_EXPLORER_URL,
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
