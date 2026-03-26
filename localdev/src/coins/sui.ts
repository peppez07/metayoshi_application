import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl } from '../lib/serverOnly'

export const SUI_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true, swap: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true, showSwapAction: true }
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
    rpcUrl: '',
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
