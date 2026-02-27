import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { resolveBridgeCredentials } from './factories'
import utxoLogo from './coinlogos/manta-network.png'

export const MANTA_ATLANTIC_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: false, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: false, showActivityTab: true }
}

export function createMantaAtlanticNetwork(ctx: CoinRuntimeContext): Network {
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials()
  return {
    id: 'srv--manta-atlantic',
    runtimeModelId: 'manta-atlantic',
    serverCoinId: 'manta-atlantic',
    serverChain: 'main',
    name: 'Manta Atlantic',
    symbol: 'MANTA',
    coinType: 'UTXO',
    coinSymbol: 'MANTA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('manta-atlantic', 'main'),
    bridgeUsername,
    bridgePassword,
    derivation: {
      status: 'unsupported',
      reason: 'Manta Atlantic non-custodial signer is not implemented yet'
    },
    capabilities: MANTA_ATLANTIC_CAPABILITIES,
    logo: utxoLogo
  }
}

export const mantaAtlanticCoin: CoinModule = {
  id: 'srv--manta-atlantic',
  symbol: 'MANTA',
  coinSymbol: 'MANTA',
  capabilities: MANTA_ATLANTIC_CAPABILITIES,
  createNetwork: createMantaAtlanticNetwork
}

