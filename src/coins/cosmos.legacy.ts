import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { FULL_ASSET_CAPABILITIES, resolveBridgeCredentials } from './factories'
import utxoLogo from './coinlogos/cosmos.png'

export const COSMOS_CAPABILITIES: NetworkCapabilitiesInput = FULL_ASSET_CAPABILITIES

export function createCosmosNetwork(ctx: CoinRuntimeContext): Network {
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials()
  return {
    id: 'srv--cosmos',
    runtimeModelId: 'cosmos',
    serverCoinId: 'cosmos',
    serverChain: 'main',
    name: 'Cosmos',
    symbol: 'ATOM',
    coinType: 'UTXO',
    coinSymbol: 'ATOM',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('cosmos', 'main'),
    bridgeUsername,
    bridgePassword,
    capabilities: COSMOS_CAPABILITIES,
    logo: utxoLogo
  }
}

export const cosmosCoin: CoinModule = {
  id: 'srv--cosmos',
  symbol: 'ATOM',
  coinSymbol: 'ATOM',
  capabilities: COSMOS_CAPABILITIES,
  createNetwork: createCosmosNetwork
}
