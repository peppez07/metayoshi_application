import process from 'node:process'

import { ethers } from 'ethers'
import { deriveCosmosAddress, resolveCosmosAddressConfig } from '../src/lib/cosmosAddress'
import { deriveSolanaAddress } from '../src/lib/solanaAddress'
import { deriveStellarAddress } from '../src/lib/stellarAddress'
import { deriveTronAddress } from '../src/lib/tronAddress'
import { TronWeb } from 'tronweb'

type VerifyNetwork = {
  id: string
  name: string
  symbol: string
  coinType: string
  coinSymbol?: string
  runtimeModelId?: string
  serverCoinId: string
  serverChain?: string
  rpcUrl: string
  bridgeUrl: string
  assetLayer: boolean
}

const mnemonic = String(process.env.METAYOSHI_MNEMONIC || '').trim().toLowerCase().replace(/\s+/g, ' ')
if (!mnemonic) {
  throw new Error('Set METAYOSHI_MNEMONIC in the current shell before running this verifier.')
}

const apiBase = String(process.env.METAYOSHI_API_BASE_URL || 'http://127.0.0.1:18080').trim().replace(/\/+$/, '')
const accountIndexRaw = Number(process.env.METAYOSHI_ACCOUNT_INDEX || '0')
const accountIndex = Number.isInteger(accountIndexRaw) && accountIndexRaw >= 0 ? accountIndexRaw : 0
const requestedIds = new Set(
  String(process.env.METAYOSHI_VERIFY_NETWORKS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
)

const NETWORKS: VerifyNetwork[] = [
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', coinType: 'EVM', serverCoinId: 'ethereum', rpcUrl: apiBase, bridgeUrl: `${apiBase}/v1/bridge/ethereum/main`, assetLayer: true },
  { id: 'base', name: 'Base', symbol: 'BASE', coinType: 'EVM', serverCoinId: 'base', rpcUrl: apiBase, bridgeUrl: `${apiBase}/v1/bridge/base/main`, assetLayer: true },
  { id: 'arb', name: 'Arbitrum', symbol: 'ARB', coinType: 'EVM', serverCoinId: 'arbitrum', rpcUrl: apiBase, bridgeUrl: `${apiBase}/v1/bridge/arbitrum/main`, assetLayer: true },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', coinType: 'EVM', serverCoinId: 'polygon', rpcUrl: apiBase, bridgeUrl: `${apiBase}/v1/bridge/polygon/main`, assetLayer: true },
  { id: 'bsc', name: 'BNB Smart Chain', symbol: 'BNB', coinType: 'EVM', serverCoinId: 'bsc', rpcUrl: apiBase, bridgeUrl: `${apiBase}/v1/bridge/bsc/main`, assetLayer: true },
  { id: 'avax', name: 'Avalanche', symbol: 'AVAX', coinType: 'EVM', serverCoinId: 'avalanche', rpcUrl: apiBase, bridgeUrl: `${apiBase}/v1/bridge/avalanche/main`, assetLayer: true },
  { id: 'sol', name: 'Solana', symbol: 'SOL', coinType: 'SOL', runtimeModelId: 'sol', serverCoinId: 'solana', rpcUrl: apiBase, bridgeUrl: `${apiBase}/v1/bridge/solana/main`, assetLayer: true },
  { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', coinType: 'COSMOS', runtimeModelId: 'cosmos', serverCoinId: 'cosmos', rpcUrl: apiBase, bridgeUrl: `${apiBase}/v1/bridge/cosmos/main`, assetLayer: true },
  { id: 'xlm', name: 'Stellar', symbol: 'XLM', coinType: 'XLM', runtimeModelId: 'xlm', serverCoinId: 'stellar', rpcUrl: apiBase, bridgeUrl: `${apiBase}/v1/bridge/stellar/main`, assetLayer: true },
  { id: 'tron', name: 'Tron', symbol: 'TRX', coinType: 'TRON', runtimeModelId: 'tron', serverCoinId: 'tron', rpcUrl: apiBase, bridgeUrl: `${apiBase}/v1/bridge/tron/main`, assetLayer: true },
]

type VerificationRow = {
  networkId: string
  symbol: string
  address: string
  balanceOk: boolean
  balanceStatus: number | null
  balanceSummary: string
  assetsOk: boolean | null
  assetsStatus: number | null
  assetSummary: string
}

function summarizeAssets(json: Record<string, unknown> | null): string {
  const assets = json?.assets
  if (!assets) return 'no assets payload'
  if (Array.isArray(assets)) return `array:${assets.length}`
  if (typeof assets !== 'object') return 'assets payload is not an object'

  const objectAssets = assets as Record<string, unknown>
  const parts: string[] = []
  for (const key of ['erc20', 'erc721Transfers', 'erc1155Transfers', 'tokens', 'nfts', 'balances', 'splTokenAccounts']) {
    const value = objectAssets[key]
    if (Array.isArray(value)) parts.push(`${key}:${value.length}`)
  }
  if (objectAssets.native && typeof objectAssets.native === 'object') parts.push('native:1')
  return parts.join(', ') || 'assets object present'
}

async function fetchServerRoute(
  network: VerifyNetwork,
  address: string,
  route: 'balance' | 'assets'
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null; text: string }> {
  let requestAddress = address
  if (network.coinType === 'TRON' && TronWeb.isAddress(address)) {
    const hex = String(TronWeb.address.toHex(address) || '').trim()
    if (/^41[0-9a-fA-F]{40}$/.test(hex)) {
      requestAddress = `0x${hex.slice(2).toLowerCase()}`
    }
  }
  const params = new URLSearchParams({
    coin: network.serverCoinId,
    chain: String(network.serverChain || 'main').trim() || 'main'
  })
  const url = `${apiBase}/v1/address/${encodeURIComponent(requestAddress)}/${route}?${params.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  })
  const text = await response.text().catch(() => '')
  let json: Record<string, unknown> | null = null
  try {
    json = text ? JSON.parse(text) as Record<string, unknown> : null
  } catch {
    json = null
  }
  return { ok: response.ok, status: response.status, json, text }
}

function evmDerivationPath(accountIndex: number): string {
  return `m/44'/60'/${accountIndex}'/0/0`
}

async function deriveVerifyAddress(network: VerifyNetwork, phrase: string, derivationIndex: number): Promise<string> {
  if (network.coinType === 'EVM') {
    return ethers.HDNodeWallet.fromPhrase(phrase, undefined, evmDerivationPath(derivationIndex)).address
  }
  if (network.coinType === 'COSMOS') {
    const derived = await deriveCosmosAddress(
      phrase,
      derivationIndex,
      resolveCosmosAddressConfig({
        runtimeModelId: String(network.runtimeModelId || '').trim(),
        serverCoinId: network.serverCoinId,
        id: network.id
      })
    )
    return derived.address
  }
  if (network.coinType === 'SOL') {
    return (await deriveSolanaAddress(phrase, derivationIndex)).address
  }
  if (network.coinType === 'XLM') {
    return (await deriveStellarAddress(phrase, derivationIndex)).address
  }
  if (network.coinType === 'TRON') {
    return (await deriveTronAddress(phrase, derivationIndex)).address
  }
  return ''
}

async function main() {
  const rows: VerificationRow[] = []
  const networks = requestedIds.size > 0
    ? NETWORKS.filter((network) => requestedIds.has(network.id))
    : NETWORKS

  for (const network of networks) {
    const address = await deriveVerifyAddress(network, mnemonic, accountIndex)
    if (!address) continue

    let balanceOk = false
    let balanceStatus: number | null = null
    let balanceSummary = ''
    try {
      const balanceResponse = await fetchServerRoute(network, address, 'balance')
      balanceOk = balanceResponse.ok
      balanceStatus = balanceResponse.status
      balanceSummary = balanceResponse.ok
        ? String(balanceResponse.json?.balance || balanceResponse.json?.balanceRaw || 'ok')
        : JSON.stringify(balanceResponse.json?.error || balanceResponse.text || `HTTP ${balanceResponse.status}`).slice(0, 180)
    } catch (error) {
      balanceSummary = error instanceof Error ? error.message : String(error)
    }

    let assetsOk: boolean | null = null
    let assetsStatus: number | null = null
    let assetSummary = 'asset layer disabled'
    if (network.assetLayer) {
      try {
        const assetsResponse = await fetchServerRoute(network, address, 'assets')
        assetsOk = assetsResponse.ok
        assetsStatus = assetsResponse.status
        assetSummary = assetsResponse.ok
          ? summarizeAssets(assetsResponse.json)
          : JSON.stringify(assetsResponse.json?.error || assetsResponse.text || `HTTP ${assetsResponse.status}`).slice(0, 180)
      } catch (error) {
        assetsOk = false
        assetSummary = error instanceof Error ? error.message : String(error)
      }
    }

    rows.push({
      networkId: network.id,
      symbol: network.symbol,
      address,
      balanceOk,
      balanceStatus,
      balanceSummary,
      assetsOk,
      assetsStatus,
      assetSummary
    })
  }

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    apiBase,
    accountIndex,
    rows
  }, null, 2))
}

await main()
