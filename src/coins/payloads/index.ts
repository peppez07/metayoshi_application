import { BTCZ_PAYLOADS } from './btcz'
import { DOGE_PAYLOADS } from './doge'
import { FIRO_PAYLOADS } from './firo'
import { RTM_PAYLOADS } from './rtm'
import { TIDE_PAYLOADS } from './tide'

export const PAYLOADS_BY_NETWORK_ID = {
  rtm: RTM_PAYLOADS,
  doge: DOGE_PAYLOADS,
  tide: TIDE_PAYLOADS,
  btcz: BTCZ_PAYLOADS,
  firo: FIRO_PAYLOADS
}

export function getCoinPayloadCatalog(networkId?: string) {
  if (!networkId) return undefined
  return PAYLOADS_BY_NETWORK_ID[networkId as keyof typeof PAYLOADS_BY_NETWORK_ID]
}

export {
  RTM_PAYLOADS,
  DOGE_PAYLOADS,
  TIDE_PAYLOADS,
  BTCZ_PAYLOADS,
  FIRO_PAYLOADS
}

export type { CoinPayloadCatalog, CoinPayloadBuilders, JsonRpcEnvelope, UtxoTxInputRef } from './types'
