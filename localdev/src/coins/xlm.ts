import type { CoinModule, CoinRuntimeContext, Network } from './types'
import { NATIVE_ONLY_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl, sanitizeRpcUrl } from '../lib/serverOnly'

const DEFAULT_XLM_RPC_URL = ''
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
    coinType: 'BTC',
    coinSymbol: 'XLM',
    rpcUrl: sanitizeRpcUrl(String(env.VITE_XLM_RPC || DEFAULT_XLM_RPC_URL).trim() || ctx.apiBaseUrl, ctx.apiBaseUrl),
    rpcWallet: '',
    rpcUsername: String(env.VITE_XLM_RPC_USER || '').trim(),
    rpcPassword: String(env.VITE_XLM_RPC_PASSWORD || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl('stellar', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(env.VITE_XLM_EXPLORER || DEFAULT_XLM_EXPLORER_URL).trim()) || undefined,
    capabilities: NATIVE_ONLY_CAPABILITIES,
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
  capabilities: NATIVE_ONLY_CAPABILITIES,
  createNetwork: createXlmNetwork
}
