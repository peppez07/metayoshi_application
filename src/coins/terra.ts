import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { resolveBridgeCredentials } from './factories'
import utxoLogo from './coinlogos/terra-luna-v2.png'

export const TERRA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: false, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: false, showActivityTab: true }
}

export function createTerraNetwork(ctx: CoinRuntimeContext): Network {
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials()
  return {
    id: 'srv--terra',
    runtimeModelId: 'terra',
    serverCoinId: 'terra',
    serverChain: 'main',
    name: 'Terra',
    symbol: 'LUNA',
    coinType: 'UTXO',
    coinSymbol: 'LUNA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('terra', 'main'),
    bridgeUsername,
    bridgePassword,
    derivation: {
      status: 'unsupported',
      reason: 'Terra non-custodial signer is not implemented yet'
    },
    capabilities: TERRA_CAPABILITIES,
    logo: utxoLogo
  }
}

export const terraCoin: CoinModule = {
  id: 'srv--terra',
  symbol: 'LUNA',
  coinSymbol: 'LUNA',
  capabilities: TERRA_CAPABILITIES,
  createNetwork: createTerraNetwork
}

