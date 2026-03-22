import type { CoinModule, CoinRuntimeContext, Network } from './types'
import { NATIVE_ONLY_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl, sanitizeRpcUrl } from '../lib/serverOnly'

const DEFAULT_XRP_RPC_URL = ''
const DEFAULT_XRP_EXPLORER_URL = ''

export function createXrpNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const wallet = String(env.VITE_XRP_RPC_WALLET || 'mainwallet').trim() || 'mainwallet'
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_XRP_BRIDGE_USER',
    passEnvKey: 'VITE_XRP_BRIDGE_PASSWORD'
  })

  return {
    id: 'xrp',
    runtimeModelId: 'xrp',
    serverCoinId: 'xrp',
    serverChain: 'main',
    displayChain: 'main',
    name: 'XRP Ledger',
    symbol: 'XRP',
    coinType: 'XRP',
    coinSymbol: 'XRP',
    rpcUrl: sanitizeRpcUrl(String(env.VITE_XRP_RPC || DEFAULT_XRP_RPC_URL).trim() || ctx.apiBaseUrl, ctx.apiBaseUrl),
    rpcWallet: wallet,
    rpcUsername: String(env.VITE_XRP_RPC_USER || '').trim(),
    rpcPassword: String(env.VITE_XRP_RPC_PASSWORD || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl('xrp', 'main', wallet),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(env.VITE_XRP_EXPLORER || DEFAULT_XRP_EXPLORER_URL).trim()) || undefined,
    capabilities: NATIVE_ONLY_CAPABILITIES,
    derivation: {
      status: 'supported'
    },
    logo: getUnifiedLogoByName('xrp')
  }
}

export const xrpCoin: CoinModule = {
  id: 'xrp',
  symbol: 'XRP',
  coinSymbol: 'XRP',
  capabilities: NATIVE_ONLY_CAPABILITIES,
  createNetwork: createXrpNetwork
}
