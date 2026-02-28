import { getPackedCoinFeatureByCoinId, getPackedCoinFeatureByNetworkId } from './packed'
import { STANDARD_RUNTIME_META } from './standardRuntimeMeta'
import type { Network } from './types'

export type CoinWalletUiAssetListLayout = 'grouped' | 'flat'

export type CoinWalletUiProfile = {
  showModelAction: boolean
  assetListLayout: CoinWalletUiAssetListLayout
  hideAssetMetaLabels: boolean
  showAssetPreview: boolean
}

function normalizeKey(value?: string): string {
  return String(value || '').trim().toLowerCase()
}

function parseBooleanLike(value: unknown): boolean | undefined {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return undefined
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return undefined
}

function resolvePackedFeatureByNetworkLike(network: Network): any | null {
  const key = normalizeKey(network.id)
  if (!key) return null

  const directByNetwork = getPackedCoinFeatureByNetworkId(key)
  if (directByNetwork) return directByNetwork
  const directByCoin = getPackedCoinFeatureByCoinId(key)
  if (directByCoin) return directByCoin

  const serverCoinId = normalizeKey((network as any)?.serverCoinId)
  if (serverCoinId) {
    const byServerCoin = getPackedCoinFeatureByCoinId(serverCoinId)
    if (byServerCoin) return byServerCoin
  }

  if (key.startsWith('srv--')) {
    const srvCoinId = key.slice('srv--'.length)
    if (srvCoinId) {
      const bySrvCoin = getPackedCoinFeatureByCoinId(srvCoinId)
      if (bySrvCoin) return bySrvCoin
    }
  }

  const aliasSep = key.lastIndexOf('--')
  if (aliasSep > 0 && aliasSep < key.length - 2) {
    const suffix = key.slice(aliasSep + 2)
    const bySuffixNetwork = getPackedCoinFeatureByNetworkId(suffix)
    if (bySuffixNetwork) return bySuffixNetwork
    const bySuffixCoin = getPackedCoinFeatureByCoinId(suffix)
    if (bySuffixCoin) return bySuffixCoin
    const byPrefixNetwork = getPackedCoinFeatureByNetworkId(key.slice(0, aliasSep))
    if (byPrefixNetwork) return byPrefixNetwork
  }

  const runtimeModelId = normalizeKey(network.runtimeModelId)
  if (runtimeModelId) {
    const standardMeta = STANDARD_RUNTIME_META[runtimeModelId]
    if (standardMeta?.coinId) {
      const byStandard = getPackedCoinFeatureByCoinId(standardMeta.coinId)
      if (byStandard) return byStandard
    }
  }

  return null
}

function defaultProfile(network: Network): CoinWalletUiProfile {
  const coinType = String(network.coinType || '').trim().toUpperCase()
  const runtimeModelId = normalizeKey(network.runtimeModelId)
  const showAssetPreview = coinType === 'UTXO'
    || coinType === 'EVM'
    || coinType === 'XRP'
    || runtimeModelId === 'sol'
    || runtimeModelId === 'ada'
    || runtimeModelId === 'tron'

  return {
    showModelAction: true,
    assetListLayout: coinType === 'EVM' ? 'flat' : 'grouped',
    hideAssetMetaLabels: coinType === 'EVM',
    showAssetPreview
  }
}

export function resolveCoinWalletUiProfile(network: Network): CoinWalletUiProfile {
  const base = defaultProfile(network)
  const feature = resolvePackedFeatureByNetworkLike(network)
  if (!feature) return base

  const ui = (feature as any)?.settings?.ui
  const uiWallet = ui && typeof ui.wallet === 'object' ? ui.wallet : null

  const showModelAction = parseBooleanLike(uiWallet?.showModelAction ?? ui?.showModelAction)
  const hideAssetMetaLabels = parseBooleanLike(uiWallet?.hideAssetMetaLabels ?? ui?.hideAssetMetaLabels)
  const showAssetPreview = parseBooleanLike(uiWallet?.showAssetPreview ?? ui?.showAssetPreview)

  const rawLayout = String(uiWallet?.assetListLayout ?? ui?.assetListLayout ?? '').trim().toLowerCase()
  const assetListLayout: CoinWalletUiAssetListLayout | undefined =
    rawLayout === 'flat' || rawLayout === 'grouped'
      ? (rawLayout as CoinWalletUiAssetListLayout)
      : undefined

  return {
    showModelAction: showModelAction ?? base.showModelAction,
    assetListLayout: assetListLayout ?? base.assetListLayout,
    hideAssetMetaLabels: hideAssetMetaLabels ?? base.hideAssetMetaLabels,
    showAssetPreview: showAssetPreview ?? base.showAssetPreview
  }
}

