import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { resolveBridgeCredentials } from './factories'
import utxoLogo from './coinlogos/polkadot-new.png'

export const POLKADOT_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: false, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: false, showActivityTab: true }
}

export function createPolkadotNetwork(ctx: CoinRuntimeContext): Network {
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials()
  return {
    id: 'srv--polkadot',
    runtimeModelId: 'polkadot',
    serverCoinId: 'polkadot',
    serverChain: 'main',
    name: 'Polkadot',
    symbol: 'DOT',
    coinType: 'UTXO',
    coinSymbol: 'DOT',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('polkadot', 'main'),
    bridgeUsername,
    bridgePassword,
    derivation: {
      status: 'unsupported',
      reason: 'Polkadot non-custodial signer is not implemented yet'
    },
    capabilities: POLKADOT_CAPABILITIES,
    logo: utxoLogo
  }
}

export const polkadotCoin: CoinModule = {
  id: 'srv--polkadot',
  symbol: 'DOT',
  coinSymbol: 'DOT',
  capabilities: POLKADOT_CAPABILITIES,
  createNetwork: createPolkadotNetwork
}

