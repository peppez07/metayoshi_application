import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { resolveBridgeCredentials } from './factories'
import utxoLogo from './coinlogos/terra-luna.png'

export const TERRA_CLASSIC_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: false, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: false, showActivityTab: true }
}

export function createTerraClassicNetwork(ctx: CoinRuntimeContext): Network {
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials()
  return {
    id: 'srv--terra-classic',
    runtimeModelId: 'terra-classic',
    serverCoinId: 'terra-classic',
    serverChain: 'main',
    name: 'Terra Classic',
    symbol: 'LUNC',
    coinType: 'UTXO',
    coinSymbol: 'LUNC',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('terra-classic', 'main'),
    bridgeUsername,
    bridgePassword,
    derivation: {
      status: 'unsupported',
      reason: 'Terra Classic non-custodial signer is not implemented yet'
    },
    capabilities: TERRA_CLASSIC_CAPABILITIES,
    logo: utxoLogo
  }
}

export const terraClassicCoin: CoinModule = {
  id: 'srv--terra-classic',
  symbol: 'LUNC',
  coinSymbol: 'LUNC',
  capabilities: TERRA_CLASSIC_CAPABILITIES,
  createNetwork: createTerraClassicNetwork
}

