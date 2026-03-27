import { resolvePublicApiBaseUrl } from './apiBase'
import { DEFAULT_WALLET_SERVER_TIMEOUT_MS } from './serverTimeouts'

type StellarChain = 'main' | 'test'

type BridgeJson = Record<string, unknown> | null

export type StellarAssetBalance = {
  assetType: string
  assetCode?: string
  assetIssuer?: string
  balance: string
  limit?: string
  decimals: number
  raw: Record<string, unknown>
}

export type StellarAccountSnapshot = {
  accountId: string
  sequence: string
  nativeBalance: string
  balances: StellarAssetBalance[]
  raw: Record<string, unknown> | null
}

export type StellarFeeStats = {
  baseFeeStroops: number
  minFeeStroops?: number
  maxFeeStroops?: number
  raw: Record<string, unknown> | null
}

export type StellarBridgeClientConfig = {
  apiBaseUrl?: string
  bridgeUrl?: string
  bridgeUsername?: string
  bridgePassword?: string
  network?: StellarChain
  timeoutMs?: number
}

type BridgeResponse = {
  ok: boolean
  status: number
  json: BridgeJson
  text: string
  url: string
}

type RpcLikePayload = {
  jsonrpc?: string
  id?: string | number
  method?: string
  params?: unknown[]
  [key: string]: unknown
}

type AddressRoute = 'balance' | 'assets'

const XLM_NATIVE_ASSET_TYPE = 'native'
const XLM_DEFAULT_DECIMALS = 7
const XLM_DEFAULT_CHAIN: StellarChain = 'main'
const XLM_DEFAULT_TIMEOUT_MS = DEFAULT_WALLET_SERVER_TIMEOUT_MS

function getEnv(): Record<string, unknown> {
  return ((import.meta as any)?.env || {}) as Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeIntegerText(value: unknown): string {
  const raw = normalizeText(value)
  return /^\d+$/.test(raw) ? raw : ''
}

function normalizeDecimalText(value: unknown): string {
  const raw = normalizeText(value)
  return /^\d+(\.\d+)?$/.test(raw) ? raw : ''
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const raw = normalizeText(value)
    if (!raw || seen.has(raw)) continue
    seen.add(raw)
    out.push(raw)
  }
  return out
}

function stripTrailingSlashes(value: string): string {
  return String(value || '').trim().replace(/\/+$/, '')
}

function stripBridgePath(baseUrl: string): string {
  const raw = stripTrailingSlashes(baseUrl)
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    const path = parsed.pathname.replace(/\/+$/, '')
    const bridgeIdx = path.toLowerCase().indexOf('/v1/bridge/')
    if (bridgeIdx >= 0) {
      parsed.pathname = path.slice(0, bridgeIdx) || '/'
      return stripTrailingSlashes(parsed.toString())
    }
    const v1Idx = path.toLowerCase().indexOf('/v1/')
    if (v1Idx >= 0) {
      parsed.pathname = path.slice(0, v1Idx) || '/'
      return stripTrailingSlashes(parsed.toString())
    }
    return stripTrailingSlashes(parsed.origin)
  } catch {
    return raw
  }
}

function resolveStellarChainFromEnv(): StellarChain {
  const env = getEnv()
  const raw = normalizeText(env.VITE_XLM_NETWORK).toLowerCase()
  if (raw === 'test' || raw === 'testnet') return 'test'
  return XLM_DEFAULT_CHAIN
}

function resolveStellarChainFromConfig(network?: StellarChain): StellarChain {
  return network || resolveStellarChainFromEnv()
}

function resolveStellarApiBaseUrl(input?: StellarBridgeClientConfig): string {
  const env = getEnv()
  const explicit = [
    input?.apiBaseUrl,
    env.VITE_BALANCE_API_BASE_URL,
    env.VITE_SECURE_BRIDGE_API_BASE_URL,
    env.VITE_API_BASE_URL,
    env.VITE_XLM_API_BASE_URL
  ]

  for (const candidate of explicit) {
    const normalized = resolvePublicApiBaseUrl(candidate)
    if (normalized) return normalized
  }

  const bridgeCandidates = [
    input?.bridgeUrl,
    env.VITE_XLM_BRIDGE_URL,
    env.VITE_STELLAR_BRIDGE_URL
  ]
  for (const candidate of bridgeCandidates) {
    const normalized = stripBridgePath(normalizeText(candidate))
    if (normalized) return normalized
  }

  return ''
}

function resolveStellarBridgeUrl(input?: StellarBridgeClientConfig): string {
  const env = getEnv()
  const chain = resolveStellarChainFromConfig(input?.network)
  const explicit = [
    input?.bridgeUrl,
    env.VITE_XLM_BRIDGE_URL,
    env.VITE_STELLAR_BRIDGE_URL
  ]

  for (const candidate of explicit) {
    const normalized = stripTrailingSlashes(normalizeText(candidate))
    if (normalized) return normalized
  }

  const apiBase = resolveStellarApiBaseUrl(input)
  if (!apiBase) return ''
  return `${stripTrailingSlashes(apiBase)}/v1/bridge/stellar/${chain}`
}

function resolveBridgeCredentials(input?: StellarBridgeClientConfig): { bridgeUsername?: string; bridgePassword?: string } {
  const env = getEnv()
  const username = normalizeText(
    input?.bridgeUsername
    || env.VITE_XLM_BRIDGE_USER
    || env.VITE_BRIDGE_USER
  )
  const password = normalizeText(
    input?.bridgePassword
    || env.VITE_XLM_BRIDGE_PASSWORD
    || env.VITE_BRIDGE_PASSWORD
  )
  if (!username || !password) return {}
  return { bridgeUsername: username, bridgePassword: password }
}

function resolveHeaders(input?: StellarBridgeClientConfig, contentType = 'application/json'): Record<string, string> {
  const env = getEnv()
  const headers: Record<string, string> = {
    Accept: 'application/json'
  }
  if (contentType) headers['Content-Type'] = contentType
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials(input)
  if (bridgeUsername && bridgePassword) {
    headers.Authorization = `Basic ${btoa(`${bridgeUsername}:${bridgePassword}`)}`
  }
  const apiKey = normalizeText(env.VITE_APP_API_KEY)
  if (apiKey) headers['X-API-Key'] = apiKey
  return headers
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<BridgeResponse> {
  const response = await fetchWithTimeout(url, init, timeoutMs)
  const text = await response.text().catch(() => '')
  const json = (() => {
    try {
      return text ? JSON.parse(text) as BridgeJson : null
    } catch {
      return null
    }
  })()
  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
    url
  }
}

function resolveScalarString(...values: unknown[]): string {
  for (const value of values) {
    const raw = normalizeDecimalText(value)
    if (raw) return raw
    const integer = normalizeIntegerText(value)
    if (integer) return integer
  }
  return ''
}

function resolveBaseFeeStroops(json: BridgeJson): number {
  const candidates = [
    json?.base_fee,
    json?.baseFee,
    json?.fee,
    json?.fee_stroops,
    json?.feeStroops,
    json?.fee_charged,
    (json?.result as Record<string, unknown> | undefined)?.base_fee,
    (json?.result as Record<string, unknown> | undefined)?.baseFee,
    (json?.result as Record<string, unknown> | undefined)?.fee,
    (json?.result as Record<string, unknown> | undefined)?.fee_stroops,
    (json?.result as Record<string, unknown> | undefined)?.feeStroops
  ]
  for (const candidate of candidates) {
    const raw = normalizeIntegerText(candidate)
    if (raw) return Math.max(1, Number(raw))
  }
  return 100
}

function normalizeStellarAssetBalanceRow(row: Record<string, unknown>): StellarAssetBalance | null {
  const assetType = normalizeText(
    row.asset_type
    || row.assetType
    || row.type
    || row.kind
    || row.asset
  ).toLowerCase()
  const balance = resolveScalarString(row.balance, row.amount, row.available_balance, row.balanceRaw, row.native_balance)
  const decimalsRaw = Number(
    row.decimals
    || row.asset_decimals
    || row.precision
    || row.asset_precision
    || XLM_DEFAULT_DECIMALS
  )
  const decimals = Number.isFinite(decimalsRaw) && decimalsRaw >= 0 && decimalsRaw <= 18
    ? Math.trunc(decimalsRaw)
    : XLM_DEFAULT_DECIMALS

  if (!balance) return null

  if (assetType === XLM_NATIVE_ASSET_TYPE || assetType === 'native') {
    return {
      assetType: XLM_NATIVE_ASSET_TYPE,
      balance,
      decimals: XLM_DEFAULT_DECIMALS,
      raw: row
    }
  }

  const assetCode = normalizeText(
    row.asset_code
    || row.assetCode
    || row.code
    || row.currency
    || row.symbol
  )
  const assetIssuer = normalizeText(
    row.asset_issuer
    || row.assetIssuer
    || row.issuer
    || row.issuer_account
    || row.issuerAccount
  )

  return {
    assetType: assetType || 'credit',
    assetCode: assetCode || undefined,
    assetIssuer: assetIssuer || undefined,
    balance,
    limit: resolveScalarString(row.limit, row.max, row.maximum) || undefined,
    decimals,
    raw: row
  }
}

function collectAssetRowsFromValue(value: unknown): StellarAssetBalance[] {
  const rows: StellarAssetBalance[] = []
  const pushRow = (input: unknown): void => {
    const row = asRecord(input)
    if (!row) return
    const normalized = normalizeStellarAssetBalanceRow(row)
    if (normalized) rows.push(normalized)
  }

  if (Array.isArray(value)) {
    for (const entry of value) pushRow(entry)
    return rows
  }

  const record = asRecord(value)
  if (!record) return rows

  const nestedCandidates = [
    record.balances,
    record.assets,
    record.lines,
    record.trustlines,
    record.tokens,
    record.result,
    (record.result as Record<string, unknown> | undefined)?.balances,
    (record.result as Record<string, unknown> | undefined)?.assets
  ]
  for (const candidate of nestedCandidates) {
    if (Array.isArray(candidate)) {
      for (const entry of candidate) pushRow(entry)
    }
  }

  if (rows.length === 0) pushRow(record)
  return rows
}

function normalizeAccountSnapshot(payload: BridgeJson, address: string): StellarAccountSnapshot | null {
  const root = asRecord(payload)
  if (!root) return null

  const accountCandidates = [
    root.account,
    root.account_data,
    root.accountData,
    root.result,
    root.data,
    root
  ]

  let account = root
  for (const candidate of accountCandidates) {
    const record = asRecord(candidate)
    if (!record) continue
    if (resolveScalarString(record.sequence, record.sequenceNumber, record.Sequence)) {
      account = record
      break
    }
    if (Array.isArray(record.balances) || Array.isArray(record.assets) || Array.isArray(record.lines)) {
      account = record
      break
    }
  }

  const sequence = resolveScalarString(
    account.sequence,
    account.sequenceNumber,
    account.Sequence,
    root.sequence,
    root.sequenceNumber,
    root.Sequence
  )
  const accountId = normalizeText(
    account.account_id
    || account.accountId
    || account.account
    || root.account_id
    || root.accountId
    || root.account
    || address
  )
  const balances = collectAssetRowsFromValue(account)
  const nativeBalance =
    balances.find((row) => row.assetType === XLM_NATIVE_ASSET_TYPE)?.balance
    || resolveScalarString(account.balance, account.nativeBalance, root.balance, root.nativeBalance)

  return {
    accountId,
    sequence,
    nativeBalance: nativeBalance || '0',
    balances,
    raw: root
  }
}

function normalizeSubmitHash(payload: BridgeJson, signedXdr: string): string {
  const root = asRecord(payload)
  const candidates = [
    root?.hash,
    root?.txid,
    root?.txHash,
    root?.transaction_hash,
    root?.transactionHash,
    root?.result && asRecord(root.result)?.hash,
    root?.result && asRecord(root.result)?.txid,
    root?.result && asRecord(root.result)?.txHash,
    root?.data && asRecord(root.data)?.hash,
    root?.data && asRecord(root.data)?.txid
  ]
  if (typeof root?.result === 'string') {
    const resultHash = normalizeText(root.result)
    if (resultHash) return resultHash
  }
  for (const candidate of candidates) {
    const hash = normalizeText(candidate)
    if (hash) return hash
  }
  return normalizeText(signedXdr) ? '' : ''
}

async function fetchAddressRoute(
  input: StellarBridgeClientConfig,
  address: string,
  route: AddressRoute
): Promise<BridgeJson> {
  const apiBaseUrl = resolveStellarApiBaseUrl(input)
  if (!apiBaseUrl) return null
  const chain = resolveStellarChainFromConfig(input?.network)
  const params = new URLSearchParams({
    coin: 'stellar',
    chain
  })
  const url = `${stripTrailingSlashes(apiBaseUrl)}/v1/address/${encodeURIComponent(address)}/${route}?${params.toString()}`
  const response = await fetchJson(url, {
    method: 'GET',
    headers: resolveHeaders(input, '')
  }, Number(input?.timeoutMs ?? XLM_DEFAULT_TIMEOUT_MS))
  if (!response.ok) {
    if (response.status >= 500) return null
    return response.json
  }
  return response.json
}

async function postBridgePayload(
  input: StellarBridgeClientConfig,
  endpointCandidates: string[],
  payloadCandidates: RpcLikePayload[],
  timeoutMs: number
): Promise<BridgeJson> {
  const headers = resolveHeaders(input)
  let lastStatus = 0
  let lastJson: BridgeJson = null
  let lastText = ''

  for (const endpoint of endpointCandidates) {
    const url = stripTrailingSlashes(endpoint)
    if (!url) continue
    for (const payload of payloadCandidates) {
      const response = await fetchJson(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }, timeoutMs)

      lastStatus = response.status
      lastJson = response.json
      lastText = response.text

      if (!response.ok) {
        if ([404, 405, 501].includes(response.status)) continue
        if (response.status >= 500) continue
        const body = asRecord(response.json)
        if (body?.error || asRecord(body?.result)?.error) continue
        return response.json
      }

      const body = asRecord(response.json)
      if (body?.error || asRecord(body?.result)?.error) continue
      return response.json
    }
  }

  if (lastJson) return lastJson
  if (lastText) return { error: lastText, status: lastStatus }
  return null
}

function buildBridgeEndpointCandidates(input: StellarBridgeClientConfig, kind: 'read' | 'submit'): string[] {
  const apiBaseUrl = resolveStellarApiBaseUrl(input)
  const bridgeUrl = resolveStellarBridgeUrl(input)
  const chain = resolveStellarChainFromConfig(input?.network)
  const candidates = [
    bridgeUrl,
    apiBaseUrl ? `${stripTrailingSlashes(apiBaseUrl)}/v1/bridge/stellar/${chain}` : '',
    apiBaseUrl ? `${stripTrailingSlashes(apiBaseUrl)}/v1/bridge/send/coin/stellar/${chain}` : '',
    apiBaseUrl ? `${stripTrailingSlashes(apiBaseUrl)}/v1/bridge/send/asset/stellar/${chain}` : ''
  ]
  if (kind === 'read') return uniqueStrings(candidates.slice(0, 2))
  return uniqueStrings(candidates.slice(0, 4))
}

function buildReadMethodPayloadCandidates(methodNames: string[], params: unknown[]): RpcLikePayload[] {
  const out: RpcLikePayload[] = []
  let idx = 0
  for (const method of methodNames) {
    out.push({
      jsonrpc: '2.0',
      id: `stellar-${idx += 1}`,
      method,
      params
    })
    out.push({ method, params })
  }
  return out
}

function buildSubmitPayloadCandidates(signedXdr: string, extra: Record<string, unknown> = {}): RpcLikePayload[] {
  const common = {
    signedTx: signedXdr,
    signedTxXdr: signedXdr,
    signedXdr,
    xdr: signedXdr,
    txXdr: signedXdr,
    tx_blob: signedXdr,
    envelopeXdr: signedXdr,
    ...extra
  }
  return [
    {
      jsonrpc: '2.0',
      id: 'stellar-submit-1',
      method: 'submittransaction',
      params: [common]
    },
    {
      jsonrpc: '2.0',
      id: 'stellar-submit-2',
      method: 'sendrawtransaction',
      params: [common]
    },
    {
      jsonrpc: '2.0',
      id: 'stellar-submit-3',
      method: 'submit',
      params: [common]
    },
    { method: 'submittransaction', params: [common] },
    { method: 'sendrawtransaction', params: [common] },
    { method: 'submit', params: [common] },
    { method: 'submitTransaction', params: [common] },
    { method: 'sendTransaction', params: [common] },
    common
  ]
}

export function resolveStellarNetworkChain(network?: StellarChain): StellarChain {
  return resolveStellarChainFromConfig(network)
}

export function resolveStellarNetworkPassphrase(chain?: StellarChain): string {
  return resolveStellarChainFromConfig(chain) === 'test'
    ? 'Test SDF Network ; September 2015'
    : 'Public Global Stellar Network ; September 2015'
}

export function createStellarBridgeClient(input: StellarBridgeClientConfig = {}) {
  const timeoutMs = Number(input.timeoutMs ?? XLM_DEFAULT_TIMEOUT_MS)
  const network = resolveStellarChainFromConfig(input.network)

  async function callReadMethod(methodNames: string[], params: unknown[]): Promise<BridgeJson> {
    const endpointCandidates = buildBridgeEndpointCandidates({ ...input, network }, 'read')
    const payloadCandidates = buildReadMethodPayloadCandidates(methodNames, params)
    return await postBridgePayload({ ...input, network }, endpointCandidates, payloadCandidates, timeoutMs)
  }

  async function getAccount(address: string): Promise<StellarAccountSnapshot> {
    const accountAddress = normalizeText(address)
    if (!accountAddress) throw new Error('Stellar account address is required')

    const methodResponse = await callReadMethod(
      ['account', 'getaccount', 'account_info', 'getAccount', 'getAccountInfo', 'loadAccount'],
      [
        {
          account: accountAddress,
          address: accountAddress,
          ledger_index: 'validated',
          queue: true
        }
      ]
    ).catch(() => null)

    const accountSnapshot = normalizeAccountSnapshot(methodResponse, accountAddress)
    if (accountSnapshot?.sequence) return accountSnapshot

    const balanceJson = await fetchAddressRoute({ ...input, network }, accountAddress, 'balance').catch(() => null)
    const assetsJson = await fetchAddressRoute({ ...input, network }, accountAddress, 'assets').catch(() => null)
    const merged: Record<string, unknown> = {
      ...(asRecord(balanceJson) || {}),
      ...(asRecord(assetsJson) || {})
    }
    const mergedSnapshot = normalizeAccountSnapshot(merged, accountAddress)
    if (mergedSnapshot?.sequence) return mergedSnapshot

    throw new Error('Stellar account info is unavailable from the configured bridge')
  }

  async function getNativeBalance(address: string): Promise<string> {
    const snapshot = await getAccount(address).catch(() => null)
    const native = normalizeText(snapshot?.nativeBalance)
    if (native) return native

    const balanceJson = await fetchAddressRoute({ ...input, network }, address, 'balance')
    const balanceRecord = asRecord(balanceJson)
    const fromPayload = resolveScalarString(
      balanceRecord?.balance,
      balanceRecord?.balanceRaw,
      (balanceRecord?.result as Record<string, unknown> | undefined)?.balance,
      (balanceRecord?.result as Record<string, unknown> | undefined)?.balanceRaw,
      (balanceRecord?.data as Record<string, unknown> | undefined)?.balance
    )
    if (fromPayload) return fromPayload
    return '0'
  }

  async function getAssetBalances(address: string): Promise<StellarAssetBalance[]> {
    const snapshot = await getAccount(address).catch(() => null)
    if (snapshot?.balances.length) {
      return snapshot.balances.filter((row) => row.assetType !== XLM_NATIVE_ASSET_TYPE)
    }

    const assetsJson = await fetchAddressRoute({ ...input, network }, address, 'assets')
    const rows = collectAssetRowsFromValue(assetsJson)
    return rows.filter((row) => row.assetType !== XLM_NATIVE_ASSET_TYPE)
  }

  async function getFeeStats(): Promise<StellarFeeStats> {
    const response = await callReadMethod(
      ['fee_stats', 'fee', 'feeStats', 'getFeeStats', 'getBaseFee', 'getFee', 'get_fee_stats'],
      []
    ).catch(() => null)

    const root = asRecord(response)
    const result = asRecord(root?.result)
    const baseFeeStroops = resolveBaseFeeStroops(response)
    const minFee = resolveScalarString(root?.min_fee, root?.minFee, root?.minimum_fee, result?.min_fee, result?.minFee, result?.minimum_fee)
    const maxFee = resolveScalarString(root?.max_fee, root?.maxFee, root?.maximum_fee, result?.max_fee, result?.maxFee, result?.maximum_fee)

    return {
      baseFeeStroops,
      minFeeStroops: minFee ? Number(minFee) : undefined,
      maxFeeStroops: maxFee ? Number(maxFee) : undefined,
      raw: root
    }
  }

  async function submitSignedXdr(
    signedXdr: string,
    extra: Record<string, unknown> = {}
  ): Promise<{ hash: string; raw: BridgeJson }> {
    const envelope = normalizeText(signedXdr)
    if (!envelope) throw new Error('Signed Stellar XDR is required')

    const endpointCandidates = buildBridgeEndpointCandidates({ ...input, network }, 'submit')
    const payloadCandidates = buildSubmitPayloadCandidates(envelope, extra)
    const response = await postBridgePayload({ ...input, network }, endpointCandidates, payloadCandidates, timeoutMs)
    const hash = normalizeSubmitHash(response, envelope)
    return {
      hash,
      raw: response
    }
  }

  return {
    getAccount,
    getNativeBalance,
    getAssetBalances,
    getFeeStats,
    submitSignedXdr
  }
}
