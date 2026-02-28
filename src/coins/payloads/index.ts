import { createUtxoPayloadCatalog } from './common'
import { STANDARD_RUNTIME_META } from '../standardRuntimeMeta'
import { getPackedCoinFeatureByCoinId, getPackedCoinFeatureByNetworkId } from '../packed'
import type { CoinPayloadCatalog } from './types'

function normalizePayloadNetworkId(networkId?: string): string {
  const normalized = String(networkId || '').trim().toLowerCase()
  if (!normalized) return ''
  return normalized
}

function resolvePackedFeature(networkId?: string) {
  const key = normalizePayloadNetworkId(networkId)
  if (!key) return null

  const directByNetwork = getPackedCoinFeatureByNetworkId(key)
  if (directByNetwork) return directByNetwork

  const directByCoin = getPackedCoinFeatureByCoinId(key)
  if (directByCoin) return directByCoin

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

  const standardMeta = STANDARD_RUNTIME_META[key]
  if (standardMeta?.coinId) {
    const byStandard = getPackedCoinFeatureByCoinId(standardMeta.coinId)
    if (byStandard) return byStandard
  }

  return null
}

function catalogFromFeature(feature: any, requestedNetworkId: string): CoinPayloadCatalog {
  const networkId = String(requestedNetworkId || feature?.networkId || feature?.coinId || '').trim().toLowerCase()
  const symbol = String(feature?.symbol || '').trim().toUpperCase() || 'COIN'
  const coinId = String(feature?.bridgeCoinId || feature?.coinId || '').trim().toLowerCase() || networkId
  const chain = String(feature?.settings?.bridge?.chain || 'main').trim().toLowerCase() === 'test' ? 'test' : 'main'

  const base = createUtxoPayloadCatalog({
    networkId,
    symbol,
    coinId,
    chain
  })

  const sendCoinTemplate = feature?.payloadTemplates?.sendCoin || {}
  const sendAssetTemplate = feature?.payloadTemplates?.sendAsset || {}

  return {
    ...base,
    helperExamples: {
      sendCoin: {
        to: String(sendCoinTemplate?.toAddress || sendCoinTemplate?.to || base.helperExamples.sendCoin.to),
        amount: Number(sendCoinTemplate?.amount ?? base.helperExamples.sendCoin.amount) || base.helperExamples.sendCoin.amount,
        subtractFeeFromAmount: Boolean(sendCoinTemplate?.subtractFeeFromAmount ?? base.helperExamples.sendCoin.subtractFeeFromAmount)
      },
      sendAsset: {
        assetId: String(sendAssetTemplate?.assetId || base.helperExamples.sendAsset.assetId),
        qty: Number(sendAssetTemplate?.qty ?? base.helperExamples.sendAsset.qty) || base.helperExamples.sendAsset.qty,
        toAddress: String(sendAssetTemplate?.toAddress || base.helperExamples.sendAsset.toAddress),
        changeAddress: String(sendAssetTemplate?.changeAddress || base.helperExamples.sendAsset.changeAddress),
        assetChangeAddress: String(sendAssetTemplate?.assetChangeAddress || base.helperExamples.sendAsset.assetChangeAddress)
      }
    }
  }
}

const dynamicPayloadCatalogCache = new Map<string, CoinPayloadCatalog>()

export function getCoinPayloadCatalog(networkId?: string): CoinPayloadCatalog | undefined {
  const key = normalizePayloadNetworkId(networkId)
  if (!key) return undefined
  const cached = dynamicPayloadCatalogCache.get(key)
  if (cached) return cached

  const feature = resolvePackedFeature(key)
  if (!feature) return undefined

  const catalog = catalogFromFeature(feature, key)
  dynamicPayloadCatalogCache.set(key, catalog)
  return catalog
}

function mustCatalog(id: string): CoinPayloadCatalog {
  const value = getCoinPayloadCatalog(id)
  if (!value) {
    throw new Error(`Missing payload catalog for networkId=${id}`)
  }
  return value
}

export const RTM_PAYLOADS = mustCatalog('rtm')
export const DOGE_PAYLOADS = mustCatalog('doge')
export const TIDE_PAYLOADS = mustCatalog('tide')
export const BTCZ_PAYLOADS = mustCatalog('btcz')
export const FIRO_PAYLOADS = mustCatalog('firo')
export const ARR_PAYLOADS = mustCatalog('arr')
export const XRP_PAYLOADS = mustCatalog('xrp')
export const XMR_PAYLOADS = mustCatalog('xmr')
export const ADA_PAYLOADS = mustCatalog('ada')
export const BITCOIN_PAYLOADS = mustCatalog('bitcoin')
export const PIVX_PAYLOADS = mustCatalog('pivx')
export const DASH_PAYLOADS = mustCatalog('dash')
export const TERRA_PAYLOADS = mustCatalog('terra')
export const TERRACLASSIC_PAYLOADS = mustCatalog('terra-classic')
export const POLKADOT_PAYLOADS = mustCatalog('polkadot')
export const MANTAATLANTIC_PAYLOADS = mustCatalog('manta-atlantic')

export type { CoinPayloadCatalog, CoinPayloadBuilders, JsonRpcEnvelope, UtxoTxInputRef } from './types'
