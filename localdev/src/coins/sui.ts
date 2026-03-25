import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl } from '../lib/serverOnly'

const DEFAULT_SUI_RPC_URL = 'https://fullnode.mainnet.sui.io:443'

export const SUI_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createSuiNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_SUI_BRIDGE_USER',
    passEnvKey: 'VITE_SUI_BRIDGE_PASSWORD'
  })
  return {
    id: 'sui',
    runtimeModelId: 'sui',
    serverCoinId: 'sui',
    serverChain: 'main',
    displayChain: 'main',
    name: 'Sui',
    symbol: 'SUI',
    coinType: 'SUI',
    coinSymbol: 'SUI',
    rpcUrl: String(
      env.VITE_SUI_RPC
      || env.VITE_SUI_RPC_URL
      || env.VITE_SUI_JSON_RPC
      || DEFAULT_SUI_RPC_URL
    ).trim(),
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('sui', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(env.VITE_SUI_EXPLORER || '').trim()) || undefined,
    capabilities: SUI_CAPABILITIES,
    derivation: {
      status: 'supported'
    },
    logo: getUnifiedLogoByName('sui')
  }
}

export const suiCoin: CoinModule = {
  id: 'sui',
  symbol: 'SUI',
  coinSymbol: 'SUI',
  capabilities: SUI_CAPABILITIES,
  createNetwork: createSuiNetwork
}
