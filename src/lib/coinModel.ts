import type { Network } from '../coins/types'
import { resolveNetworkCapabilities } from './networkCapabilities'

export type CoinModelFamily =
  | 'utxo-assets'
  | 'utxo-classic'
  | 'xrp-ledger'
  | 'evm'
  | 'cardano'
  | 'monero'
  | 'generic'

export type CoinModelRouteKey =
  | 'utxo-assets'
  | 'utxo-classic'
  | 'xrp'
  | 'evm'
  | 'cardano'
  | 'monero'
  | 'generic'

export function resolveCoinModelFamily(network: Network): CoinModelFamily {
  if (network.id === 'ada') return 'cardano'
  if (network.id === 'xmr') return 'monero'
  if (network.coinType === 'EVM') return 'evm'
  if (network.coinType === 'XRP') return 'xrp-ledger'

  if (network.coinType === 'UTXO') {
    const caps = resolveNetworkCapabilities(network)
    return caps.features.assetLayer ? 'utxo-assets' : 'utxo-classic'
  }

  return 'generic'
}

export function coinModelFamilyToRouteKey(model: CoinModelFamily): CoinModelRouteKey {
  if (model === 'xrp-ledger') return 'xrp'
  return model
}

export function coinModelRouteKeyToFamily(route: string): CoinModelFamily {
  if (route === 'xrp') return 'xrp-ledger'
  if (
    route === 'utxo-assets'
    || route === 'utxo-classic'
    || route === 'evm'
    || route === 'cardano'
    || route === 'monero'
    || route === 'generic'
  ) return route
  return 'generic'
}
