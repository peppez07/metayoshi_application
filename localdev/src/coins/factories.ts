import { readBridgeCredentialsFromEnv } from '../lib/bridgeCredentials'
import { resolveCosmosAddressConfig } from '../lib/cosmosAddress'
import { sanitizeExplorerUrl, sanitizeRpcUrl } from '../lib/serverOnly'
import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'

export const FULL_ASSET_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export const NATIVE_ONLY_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

type BridgeCredentialConfig = {
  userEnvKey?: string
  passEnvKey?: string
  label?: string
}

export function resolveBridgeCredentials(config?: BridgeCredentialConfig): {
  bridgeUsername?: string
  bridgePassword?: string
} {
  const env = (import.meta as any)?.env || {}
  return readBridgeCredentialsFromEnv(env, {
    userEnvKey: config?.userEnvKey,
    passEnvKey: config?.passEnvKey,
    label: config?.label
  })
}

type EvmCoinFactoryConfig = {
  id: string
  runtimeModelId?: string
  name: string
  symbol: string
  coinSymbol: string
  chainId: number
  bridgeCoinId: string
  bridgeChain?: 'main' | 'test'
  displayChain?: 'main' | 'test'
  logo: string
  rpcEnvKey: string
  rpcUserEnvKey: string
  rpcPasswordEnvKey: string
  bridgeUserEnvKey: string
  bridgePasswordEnvKey: string
  explorerEnvKey: string
  defaultExplorerUrl: string
  capabilities?: NetworkCapabilitiesInput
}

const EVM_DEFAULT_RPC_URLS: Record<string, string> = {}

type CosmosCoinFactoryConfig = {
  id: string
  runtimeModelId?: string
  name: string
  symbol?: string
  coinSymbol?: string
  bridgeCoinId: string
  bridgeChain?: 'main' | 'test'
  displayChain?: 'main' | 'test'
  logo: string
  rpcEnvKey: string
  rpcUserEnvKey: string
  rpcPasswordEnvKey: string
  bridgeUserEnvKey: string
  bridgePasswordEnvKey: string
  explorerEnvKey: string
  defaultRpcUrl: string
  defaultExplorerUrl: string
  capabilities?: NetworkCapabilitiesInput
}

function isAllowedServerRpcUrl(candidateUrl: string, apiBaseUrl: string): boolean {
  try {
    const candidate = new URL(candidateUrl)
    const apiBase = new URL(apiBaseUrl)
    const candidateHost = String(candidate.hostname || '').trim().toLowerCase()
    const apiHost = String(apiBase.hostname || '').trim().toLowerCase()
    if (!candidateHost || !apiHost) return false
    return candidateHost === apiHost || candidateHost.endsWith('.metayoshi.app')
  } catch {
    return false
  }
}

function resolveServerBackedRpcUrl(configuredUrl: unknown, apiBaseUrl: string, defaultRpcUrl = ''): string {
  const preferredDefault = String(defaultRpcUrl || '').trim().replace(/\/+$/, '')
  const fallback = preferredDefault || String(apiBaseUrl || '').trim().replace(/\/+$/, '')
  const explicit = String(configuredUrl || '').trim()
  if (!explicit) return fallback
  return isAllowedServerRpcUrl(explicit, fallback) ? explicit : fallback
}

function resolveDefaultEvmRpcUrl(config: Pick<EvmCoinFactoryConfig, 'id' | 'bridgeCoinId'>): string {
  const direct =
    EVM_DEFAULT_RPC_URLS[String(config.id || '').trim().toLowerCase()]
    || EVM_DEFAULT_RPC_URLS[String(config.bridgeCoinId || '').trim().toLowerCase()]
    || ''
  return String(direct || '').trim()
}

export function createEvmCoinModule(config: EvmCoinFactoryConfig): {
  createNetwork: (ctx: CoinRuntimeContext) => Network
  coin: CoinModule
  capabilities: NetworkCapabilitiesInput
} {
  const capabilities = config.capabilities || FULL_ASSET_CAPABILITIES
  const env = (import.meta as any)?.env || {}

  const createNetwork = (ctx: CoinRuntimeContext): Network => ({
    id: config.id,
    runtimeModelId: String(config.runtimeModelId || config.id).trim().toLowerCase(),
    serverCoinId: config.bridgeCoinId,
    serverChain: config.bridgeChain || 'main',
    displayChain: config.displayChain || config.bridgeChain || 'main',
    name: config.name,
    symbol: config.symbol,
    coinType: 'EVM',
    coinSymbol: config.coinSymbol,
    chainId: config.chainId,
    rpcUrl: sanitizeRpcUrl(
      resolveServerBackedRpcUrl(env[config.rpcEnvKey], ctx.apiBaseUrl, resolveDefaultEvmRpcUrl(config)),
      ctx.apiBaseUrl
    ),
    rpcWallet: '',
    rpcUsername: String(env[config.rpcUserEnvKey] || '').trim(),
    rpcPassword: String(env[config.rpcPasswordEnvKey] || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl(config.bridgeCoinId, config.bridgeChain || 'main'),
    ...readBridgeCredentialsFromEnv(env, {
      userEnvKey: config.bridgeUserEnvKey,
      passEnvKey: config.bridgePasswordEnvKey,
      label: config.id
    }),
    explorerUrl: sanitizeExplorerUrl(String(env[config.explorerEnvKey] || config.defaultExplorerUrl).trim()) || undefined,
    capabilities,
    logo: config.logo
  })

  const coin: CoinModule = {
    id: config.id,
    symbol: config.symbol,
    coinSymbol: config.coinSymbol,
    capabilities,
    createNetwork
  }

  return { createNetwork, coin, capabilities }
}

export function createCosmosCoinModule(config: CosmosCoinFactoryConfig): {
  createNetwork: (ctx: CoinRuntimeContext) => Network
  coin: CoinModule
  capabilities: NetworkCapabilitiesInput
} {
  // Cosmos-family modules in this wallet are currently native-balance/send focused.
  // Defaulting them to native-only prevents the UI from issuing unsupported
  // bridge asset-RPC calls on chains where the backend exposes no asset layer.
  const capabilities = config.capabilities || NATIVE_ONLY_CAPABILITIES
  const env = (import.meta as any)?.env || {}

  const createNetwork = (ctx: CoinRuntimeContext): Network => {
    const addressConfig = resolveCosmosAddressConfig({
      id: config.id,
      runtimeModelId: config.runtimeModelId || config.id,
      serverCoinId: config.bridgeCoinId
    })

    return {
      id: config.id,
      runtimeModelId: String(config.runtimeModelId || config.id).trim().toLowerCase(),
      serverCoinId: config.bridgeCoinId,
      serverChain: config.bridgeChain || 'main',
      displayChain: config.displayChain || config.bridgeChain || 'main',
      name: config.name,
      symbol: config.symbol || addressConfig.symbol,
      coinType: 'COSMOS',
      coinSymbol: config.coinSymbol || addressConfig.symbol,
      rpcUrl: sanitizeRpcUrl(String(env[config.rpcEnvKey] || config.defaultRpcUrl).trim() || config.defaultRpcUrl, ctx.apiBaseUrl),
      rpcWallet: '',
      rpcUsername: String(env[config.rpcUserEnvKey] || '').trim(),
      rpcPassword: String(env[config.rpcPasswordEnvKey] || '').trim(),
      bridgeUrl: ctx.buildBridgeUrl(config.bridgeCoinId, config.bridgeChain || 'main'),
      ...readBridgeCredentialsFromEnv(env, {
        userEnvKey: config.bridgeUserEnvKey,
        passEnvKey: config.bridgePasswordEnvKey,
        label: config.id
      }),
      explorerUrl: sanitizeExplorerUrl(String(env[config.explorerEnvKey] || config.defaultExplorerUrl).trim()) || undefined,
      capabilities,
      logo: config.logo
    }
  }

  const coin: CoinModule = {
    id: config.id,
    symbol: config.symbol || resolveCosmosAddressConfig({
      id: config.id,
      runtimeModelId: config.runtimeModelId || config.id,
      serverCoinId: config.bridgeCoinId
    }).symbol,
    coinSymbol: config.coinSymbol,
    capabilities,
    createNetwork
  }

  return { createNetwork, coin, capabilities }
}
