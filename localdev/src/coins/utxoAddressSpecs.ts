import type { UtxoAddressSpec } from './types'

export const DEFAULT_UTXO_COIN_SYMBOL = 'RTM'

const UTXO_ADDRESS_SPECS: Record<string, UtxoAddressSpec> = {
  BTC: {
    bip44CoinType: 0,
    p2pkhVersion: 0x00
  },
  BTCZ: {
    bip44CoinType: 177,
    p2pkhVersion: 0x1cb8
  },
  FIRO: {
    bip44CoinType: 136,
    p2pkhVersion: 0x52
  },
  DOGE: {
    bip44CoinType: 3,
    p2pkhVersion: 0x1e
  },
  DASH: {
    bip44CoinType: 5,
    p2pkhVersion: 0x4c
  },
  ZEC: {
    bip44CoinType: 133,
    p2pkhVersion: 0x1cb8
  },
  RTM: {
    bip44CoinType: 175,
    p2pkhVersion: 0x3c,
    p2shVersion: 0x10
  }
}

export function getUtxoAddressSpec(coinSymbol: string): UtxoAddressSpec | undefined {
  return UTXO_ADDRESS_SPECS[String(coinSymbol || '').trim().toUpperCase()]
}

export function getAllUtxoAddressSpecs(): Record<string, UtxoAddressSpec> {
  return { ...UTXO_ADDRESS_SPECS }
}
