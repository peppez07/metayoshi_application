import type { Network } from '../coins'
import { normalizeConfiguredApiBaseUrl, resolveBalanceApiBaseUrl } from './apiBase'
import { resolveRuntimeModelId as resolveNetworkModelId } from './runtimeModel'
import type { UtxoRpcConfig } from './utxoRpc'
import { DEFAULT_WALLET_SERVER_TIMEOUT_MS } from './serverTimeouts'
import { appendOptionalServerAuthHeaders } from './serverRequestAuth'

let tronWebModulePromise: Promise<typeof import('tronweb')> | null = null

function loadTronWebModule() {
  if (!tronWebModulePromise) tronWebModulePromise = import('tronweb')
  return tronWebModulePromise
}

export function deriveServerApiBaseUrl(network: Network): string {
  const env = ((import.meta as any)?.env || {}) as Record<string, unknown>
  const explicitBalanceBase = resolveBalanceApiBaseUrl(normalizeConfiguredApiBaseUrl(env.VITE_BALANCE_API_BASE_URL))
  if (explicitBalanceBase) return explicitBalanceBase

  const secureBridgeBase = resolveBalanceApiBaseUrl(normalizeConfiguredApiBaseUrl(env.VITE_SECURE_BRIDGE_API_BASE_URL))
  if (secureBridgeBase) return secureBridgeBase

  const envBase = normalizeConfiguredApiBaseUrl(env.VITE_API_BASE_URL)
  if (envBase) return resolveBalanceApiBaseUrl(envBase)

  const bridgeUrl = String(network.bridgeUrl || '').trim().replace(/\/+$/, '')
  if (bridgeUrl) {
    const lower = bridgeUrl.toLowerCase()
    const idxV1Bridge = lower.indexOf('/v1/bridge/')
    if (idxV1Bridge >= 0) return resolveBalanceApiBaseUrl(bridgeUrl.slice(0, idxV1Bridge))
    const idxBridge = lower.indexOf('/bridge/')
    if (idxBridge >= 0) return resolveBalanceApiBaseUrl(bridgeUrl.slice(0, idxBridge))
    if (/\/v1$/i.test(bridgeUrl)) return resolveBalanceApiBaseUrl(bridgeUrl.replace(/\/v1$/i, ''))
    return resolveBalanceApiBaseUrl(bridgeUrl)
  }

  return resolveBalanceApiBaseUrl(String(network.rpcUrl || '').trim().replace(/\/+$/, ''))
}

function deriveServerApiBaseCandidates(network: Network, rpcConfig?: UtxoRpcConfig): string[] {
  const env = ((import.meta as any)?.env || {}) as Record<string, unknown>
  const candidates = [
    resolveBalanceApiBaseUrl(normalizeConfiguredApiBaseUrl(env.VITE_BALANCE_API_BASE_URL)),
    resolveBalanceApiBaseUrl(normalizeConfiguredApiBaseUrl(env.VITE_SECURE_BRIDGE_API_BASE_URL)),
    resolveBalanceApiBaseUrl(normalizeConfiguredApiBaseUrl(env.VITE_API_BASE_URL)),
    rpcConfig?.bridgeUrl ? resolveBalanceApiBaseUrl(String(rpcConfig.bridgeUrl).trim().replace(/\/+$/, '')) : '',
    deriveServerApiBaseUrl(network)
  ]
  return [...new Set(candidates.filter(Boolean))]
}

export function resolveServerCoinChain(network: Network): { coin: string; chain: string } | null {
  const coin = String(network.serverCoinId || network.id || '').trim().toLowerCase()
  if (!coin) return null
  const chain = String(network.serverChain || 'main').trim().toLowerCase() || 'main'
  return { coin, chain }
}

async function normalizeTronServerAddress(address: string): Promise<string> {
  const trimmed = String(address || '').trim()
  if (!trimmed) return ''
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed.toLowerCase()
  if (/^41[0-9a-fA-F]{40}$/.test(trimmed)) return `0x${trimmed.slice(2).toLowerCase()}`

  const { TronWeb } = await loadTronWebModule()
  if (!TronWeb.isAddress(trimmed)) return trimmed
  const hex = String(TronWeb.address.toHex(trimmed) || '').trim()
  if (!/^41[0-9a-fA-F]{40}$/.test(hex)) return trimmed
  return `0x${hex.slice(2).toLowerCase()}`
}

export async function normalizeServerAddress(network: Network, address: string): Promise<string> {
  const trimmed = String(address || '').trim()
  if (!trimmed) return ''
  const modelId = String(resolveNetworkModelId(network) || network.id || '').trim().toLowerCase()
  if (modelId === 'tron') return await normalizeTronServerAddress(trimmed)
  return trimmed
}

export async function fetchServerAddressJson(
  network: Network,
  address: string,
  route: 'balance' | 'assets' | 'assets/utxos' | 'history' | 'portfolio' | 'price',
  extraParams: Record<string, string> = {},
  options: { timeoutMs?: number; rpcConfig?: UtxoRpcConfig } = {}
): Promise<{
  address: string
  url: string
  ok: boolean
  status: number
  json: Record<string, unknown> | null
  text: string
}> {
  const coinChain = resolveServerCoinChain(network)
  if (!coinChain) throw new Error('Server coin id is not configured')

  const requestAddress = await normalizeServerAddress(network, address)
  if (!requestAddress) throw new Error('Server address is required')

  const params = new URLSearchParams({
    coin: coinChain.coin,
    chain: coinChain.chain
  })
  for (const [key, value] of Object.entries(extraParams)) {
    const normalized = String(value || '').trim()
    if (normalized) params.set(key, normalized)
  }

  const headers: Record<string, string> = {}
  await appendOptionalServerAuthHeaders(headers, { network, rpcConfig: options.rpcConfig })

  const apiBases = deriveServerApiBaseCandidates(network, options.rpcConfig)
  if (apiBases.length <= 0) throw new Error('Server API base URL is not configured')

  let lastError: Error | null = null
  let lastResponse: {
    address: string
    url: string
    ok: boolean
    status: number
    json: Record<string, unknown> | null
    text: string
  } | null = null

  for (let i = 0; i < apiBases.length; i += 1) {
    const apiBase = apiBases[i]
    const url = `${apiBase}/v1/address/${encodeURIComponent(requestAddress)}/${route}?${params.toString()}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Number(options.timeoutMs ?? DEFAULT_WALLET_SERVER_TIMEOUT_MS))
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      })
      const text = await response.text().catch(() => '')
      const json = (() => {
        try { return text ? JSON.parse(text) as Record<string, unknown> : null } catch { return null }
      })()
      const result = {
        address: requestAddress,
        url,
        ok: response.ok,
        status: response.status,
        json,
        text
      }
      if (!response.ok && response.status >= 500 && i < apiBases.length - 1) {
        lastResponse = result
        continue
      }
      return result
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new Error(`Server ${route} request timed out: ${url}`)
        if (i < apiBases.length - 1) continue
        throw lastError
      }
      lastError = error instanceof Error ? error : new Error(String(error))
      if (i < apiBases.length - 1) continue
      throw lastError
    } finally {
      clearTimeout(timer)
    }
  }

  if (lastResponse) return lastResponse
  if (lastError) throw lastError
  throw new Error(`Server ${route} request failed before a response was returned`)
}
