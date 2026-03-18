import type { CoinModule, CoinRuntimeContext, Network } from './types'
import { NATIVE_ONLY_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'

const DEFAULT_XRP_RPC_URL = 'https://xrplcluster.com'
const DEFAULT_XRP_EXPLORER_URL = 'https://livenet.xrpl.org'

export function createXrpNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_XRP_BRIDGE_USER',
    passEnvKey: 'VITE_XRP_BRIDGE_PASSWORD'
  })

  return {
    id: 'xrp',
    runtimeModelId: 'xrp',
    serverCoinId: 'xrp',
    serverChain: 'main',
    name: 'XRP Ledger',
    symbol: 'XRP',
    coinType: 'XRP',
    coinSymbol: 'XRP',
    rpcUrl: String(env.VITE_XRP_RPC || DEFAULT_XRP_RPC_URL).trim() || DEFAULT_XRP_RPC_URL,
    rpcWallet: String(env.VITE_XRP_RPC_WALLET || 'mainwallet').trim() || 'mainwallet',
    rpcUsername: String(env.VITE_XRP_RPC_USER || '').trim(),
    rpcPassword: String(env.VITE_XRP_RPC_PASSWORD || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl('xrp', 'main', String(env.VITE_XRP_RPC_WALLET || 'mainwallet').trim() || 'mainwallet'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: String(env.VITE_XRP_EXPLORER || DEFAULT_XRP_EXPLORER_URL).trim() || DEFAULT_XRP_EXPLORER_URL,
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
