import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput, UtxoAddressSpec } from './types'
import { NATIVE_ONLY_CAPABILITIES, resolveBridgeCredentials } from './factories'
import utxoLogo from './coinlogos/bitcoin.png'

export const BITCOIN_CAPABILITIES: NetworkCapabilitiesInput = NATIVE_ONLY_CAPABILITIES
export const BITCOIN_ADDRESS_SPEC: UtxoAddressSpec = {
  bip44CoinType: 0,
  p2pkhVersion: 0x00
}

export function createBitcoinNetwork(ctx: CoinRuntimeContext): Network {
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials()
  return {
    id: 'srv--bitcoin',
    runtimeModelId: 'bitcoin',
    serverCoinId: 'bitcoin',
    serverChain: 'main',
    name: 'Bitcoin',
    symbol: 'BTC',
    coinType: 'UTXO',
    coinSymbol: 'BTC',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('bitcoin', 'main'),
    bridgeUsername,
    bridgePassword,
    capabilities: BITCOIN_CAPABILITIES,
    logo: utxoLogo
  }
}

export const bitcoinCoin: CoinModule = {
  id: 'srv--bitcoin',
  symbol: 'BTC',
  coinSymbol: 'BTC',
  capabilities: BITCOIN_CAPABILITIES,
  utxoAddress: BITCOIN_ADDRESS_SPEC,
  createNetwork: createBitcoinNetwork
}

