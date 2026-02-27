import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput, UtxoAddressSpec } from './types'
import { NATIVE_ONLY_CAPABILITIES, resolveBridgeCredentials } from './factories'
import utxoLogo from './coinlogos/pivx.png'

export const PIVX_CAPABILITIES: NetworkCapabilitiesInput = NATIVE_ONLY_CAPABILITIES
export const PIVX_ADDRESS_SPEC: UtxoAddressSpec = {
  bip44CoinType: 119,
  p2pkhVersion: 0x1e
}

export function createPivxNetwork(ctx: CoinRuntimeContext): Network {
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials()
  return {
    id: 'srv--pivx',
    runtimeModelId: 'pivx',
    serverCoinId: 'pivx',
    serverChain: 'main',
    name: 'PIVX',
    symbol: 'PIVX',
    coinType: 'UTXO',
    coinSymbol: 'PIVX',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('pivx', 'main'),
    bridgeUsername,
    bridgePassword,
    capabilities: PIVX_CAPABILITIES,
    logo: utxoLogo
  }
}

export const pivxCoin: CoinModule = {
  id: 'srv--pivx',
  symbol: 'PIVX',
  coinSymbol: 'PIVX',
  capabilities: PIVX_CAPABILITIES,
  utxoAddress: PIVX_ADDRESS_SPEC,
  createNetwork: createPivxNetwork
}

