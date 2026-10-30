import { ElectrumClient, ElectrumError } from './client'
import { addressToScriptHash } from '../rtm/address'
import { toAtoms } from '../rtm/amount'
import { hexToBytes } from '../rtm/bytes'
import type { AssetUtxo, CoinUtxo } from '../rtm/builder'

/** Initial test server; replaced by node-collected servers later. */
export const DEFAULT_ELECTRUM_SERVERS: string[] = String(
  import.meta.env.VITE_RTM_ELECTRUM_SERVERS || 'wss://144.202.18.233:50004'
).split(',').map((s) => s.trim()).filter(Boolean)

export function isValidServerUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (parsed.protocol === 'wss:' || parsed.protocol === 'ws:') && !!parsed.hostname
  } catch {
    return false
  }
}

export interface ServerFeatures {
  serverVersion: string
  genesisHash: string
  assetsReady: boolean
  assetIndexedHeight: number | null
}

export interface HistoryItem {
  txid: string
  height: number
  fee?: number
}

export interface AssetBalance {
  assetId: string
  confirmed: bigint
  unconfirmed: bigint
}

export interface AssetMetadata {
  assetId: string
  name: string
  decimalPoint: number
  isUnique: boolean
  updatable: boolean
  isRoot: boolean
  supply: bigint
  maxMintCount: number | null
  mintCount: number
  referenceHash: string
  owner: string
  creationHeight: number | null
}

const METHOD_NOT_FOUND = -32601

/** Floor used when the server reports no fee information. */
export const MIN_FEE_PER_BYTE = 2n

export const RTM_GENESIS_HASH = 'b79e5df07278b9567ada8fc655ffbfa9d3f586dc38da3dd93053686f41caeea0'

interface Page<T> {
  items: T[]
  cursor: string | null
}

let activeClient: ElectrumClient | null = null

export function getClient(url: string): ElectrumClient {
  if (activeClient && activeClient.url === url) return activeClient
  activeClient?.close()
  activeClient = new ElectrumClient(url)
  return activeClient
}

export function closeClient(): void {
  activeClient?.close()
  activeClient = null
}

export class RtmElectrum {
  constructor(readonly client: ElectrumClient) {}

  async features(): Promise<ServerFeatures> {
    const result = await this.client.request<any>('server.features')
    const assets = result?.rtm_assets
    return {
      serverVersion: String(result?.server_version ?? this.client.serverVersion),
      genesisHash: String(result?.genesis_hash ?? ''),
      assetsReady: Boolean(assets?.ready),
      assetIndexedHeight: typeof assets?.indexed_height === 'number' ? assets.indexed_height : null
    }
  }

  /** Verifies the server is a Raptoreum mainnet server before any wallet data is trusted. */
  async verifyNetwork(): Promise<ServerFeatures> {
    const features = await this.features()
    if (features.genesisHash !== RTM_GENESIS_HASH) {
      throw new ElectrumError('Server is not a Raptoreum mainnet ElectrumX server (genesis hash mismatch)')
    }
    return features
  }

  async tipHeight(): Promise<number> {
    const header = await this.client.request<{ height: number }>('blockchain.headers.subscribe')
    return Number(header?.height ?? 0)
  }

  onHeader(handler: (height: number) => void): () => void {
    return this.client.on('blockchain.headers.subscribe', (params) => {
      const height = Number((params[0] as any)?.height)
      if (Number.isFinite(height)) handler(height)
    })
  }

  async balance(address: string): Promise<{ confirmed: bigint; unconfirmed: bigint }> {
    const result = await this.client.request<{ confirmed: number; unconfirmed: number }>(
      'blockchain.scripthash.get_balance', [addressToScriptHash(address)])
    return { confirmed: toAtoms(result.confirmed), unconfirmed: toAtoms(result.unconfirmed) }
  }

  async listUnspent(address: string): Promise<CoinUtxo[]> {
    const rows = await this.client.request<any[]>('blockchain.scripthash.listunspent', [addressToScriptHash(address)])
    return (rows ?? []).map((row) => ({
      txid: String(row.tx_hash),
      vout: Number(row.tx_pos),
      value: toAtoms(row.value),
      height: Number(row.height)
    }))
  }

  async history(address: string): Promise<HistoryItem[]> {
    const rows = await this.client.request<any[]>('blockchain.scripthash.get_history', [addressToScriptHash(address)])
    return (rows ?? []).map((row) => ({ txid: String(row.tx_hash), height: Number(row.height), fee: row.fee }))
  }

  async subscribeAddress(address: string): Promise<string | null> {
    return await this.client.request<string | null>('blockchain.scripthash.subscribe', [addressToScriptHash(address)])
  }

  onAddressChange(handler: (scriptHash: string, status: string | null) => void): () => void {
    return this.client.on('blockchain.scripthash.subscribe', (params) => handler(String(params[0]), params[1] as string | null))
  }

  async blockHeader(height: number): Promise<string> {
    return await this.client.request<string>('blockchain.block.header', [height])
  }

  async getTransaction(txid: string): Promise<string> {
    return await this.client.request<string>('blockchain.transaction.get', [txid, false])
  }

  private inBlockSupported = true

  /**
   * Confirmed transactions via the RTM extension, which works on servers whose
   * Core has no txindex; mempool transactions (height <= 0) and servers
   * without the extension use blockchain.transaction.get.
   */
  async getTransactionAt(txid: string, height: number): Promise<string> {
    if (height > 0 && this.inBlockSupported) {
      try {
        return await this.client.request<string>('blockchain.transaction.get_in_block', [txid, height])
      } catch (error) {
        if (!(error instanceof ElectrumError) || error.code !== METHOD_NOT_FOUND) throw error
        this.inBlockSupported = false
      }
    }
    return await this.getTransaction(txid)
  }

  async broadcast(hex: string): Promise<string> {
    return await this.client.request<string>('blockchain.transaction.broadcast', [hex])
  }

  /** Fee rate in satoshis per byte: the higher of relay fee and the 6-block estimate. */
  async feePerByte(): Promise<bigint> {
    const toSatPerByte = (coinPerKb: unknown): bigint => {
      const value = Number(coinPerKb)
      if (!Number.isFinite(value) || value <= 0) return 0n
      return BigInt(Math.ceil((value * 1e8) / 1000))
    }
    const [relay, estimate] = await Promise.all([
      this.client.request<number>('blockchain.relayfee').catch(() => 0),
      this.client.request<number>('blockchain.estimatefee', [6]).catch(() => -1)
    ])
    const rate = [toSatPerByte(relay), toSatPerByte(estimate), MIN_FEE_PER_BYTE].reduce((a, b) => (a > b ? a : b))
    return rate
  }

  // ── Assets ──────────────────────────────────────────────────────────────

  async assetBalances(address: string): Promise<AssetBalance[]> {
    const result = await this.client.request<any>('blockchain.scripthash.assets.get_balance', [addressToScriptHash(address)])
    return Object.entries(result?.assets ?? {}).map(([assetId, b]: [string, any]) => ({
      assetId,
      confirmed: toAtoms(b.confirmed),
      unconfirmed: toAtoms(b.unconfirmed)
    }))
  }

  private async allPages<T>(fetchPage: (cursor: string | null) => Promise<Page<T>>): Promise<T[]> {
    const items: T[] = []
    let cursor: string | null = null
    for (let page = 0; page < 100; page += 1) {
      const result: Page<T> = await fetchPage(cursor)
      items.push(...result.items)
      if (!result.cursor) return items
      cursor = result.cursor
    }
    throw new ElectrumError('Too many asset pages')
  }

  async assetUnspent(address: string, assetId: string): Promise<AssetUtxo[]> {
    const scripthash = addressToScriptHash(address)
    const rows = await this.allPages<any>(async (cursor) => {
      const result = await this.client.request<any>('blockchain.scripthash.assets.listunspent', [scripthash, assetId, cursor, 1000])
      return { items: result?.items ?? [], cursor: result?.cursor ?? null }
    })
    return rows.map((row) => ({
      txid: String(row.tx_hash),
      vout: Number(row.tx_pos),
      assetId: String(row.asset_id),
      amount: toAtoms(row.amount),
      height: Number(row.height ?? 0),
      uniqueId: row.is_unique ? toAtoms(row.unique_id) : null,
      script: hexToBytes(String(row.script)),
      spendable: row.spendable !== false
    }))
  }

  async assetHistory(address: string, assetId: string): Promise<Array<{ txid: string; height: number }>> {
    const scripthash = addressToScriptHash(address)
    const rows = await this.allPages<any>(async (cursor) => {
      const result = await this.client.request<any>('blockchain.scripthash.assets.get_history', [scripthash, assetId, cursor, 1000])
      return { items: result?.items ?? [], cursor: result?.cursor ?? null }
    })
    return rows.map((row) => ({ txid: String(row.tx_hash), height: Number(row.height ?? 0) }))
  }

  async assetMetadata(assetId: string): Promise<AssetMetadata | null> {
    const result = await this.client.request<any>('blockchain.asset.get_metadata', [assetId])
    const m = result?.metadata
    if (!m) return null
    return {
      assetId,
      name: String(m.name ?? assetId),
      decimalPoint: Number(m.decimal_point ?? 8),
      isUnique: Boolean(m.is_unique),
      updatable: Boolean(m.updatable),
      isRoot: m.is_root !== false,
      supply: toAtoms(m.supply ?? 0),
      maxMintCount: m.max_mint_count === undefined ? null : Number(m.max_mint_count),
      mintCount: Number(m.mint_count ?? 0),
      referenceHash: String(m.reference_hash ?? ''),
      owner: String(m.owner ?? ''),
      creationHeight: typeof m.creation_height === 'number' ? m.creation_height : null
    }
  }

  async subscribeAssets(address: string): Promise<string | null> {
    return await this.client.request<string | null>('blockchain.scripthash.assets.subscribe', [addressToScriptHash(address)])
  }

  onAssetChange(handler: (scriptHash: string) => void): () => void {
    return this.client.on('blockchain.scripthash.assets.subscribe', (params) => handler(String(params[0])))
  }
}
