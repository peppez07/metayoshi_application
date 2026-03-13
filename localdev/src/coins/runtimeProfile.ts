import { getCoinApiInfo } from './interceptors'
import type { CoinApiInfo, CoinRpcProtocol } from './interceptors/types'

export interface CoinRuntimeProfile {
  networkId: string
  symbol: string
  coinId: string
  chain: 'main' | 'test'
  protocol: CoinRpcProtocol
  api: CoinApiInfo
}

function resolveProtocol(api: CoinApiInfo): CoinRpcProtocol {
  return api.protocol || 'utxo-jsonrpc'
}

export function getCoinRuntimeProfile(networkId?: string): CoinRuntimeProfile | undefined {
  if (!networkId) return undefined
  const api = getCoinApiInfo(networkId)
  if (!api) return undefined
  return {
    networkId: api.networkId,
    symbol: api.symbol,
    coinId: api.coinId,
    chain: api.chain,
    protocol: resolveProtocol(api),
    api
  }
}

