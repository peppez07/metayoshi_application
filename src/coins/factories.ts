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
  fallbackUser?: string
  fallbackPass?: string
}

export function resolveBridgeCredentials(config?: BridgeCredentialConfig): {
  bridgeUsername: string
  bridgePassword: string
} {
  const fallbackUser = String(config?.fallbackUser || 'bridgeuser').trim() || 'bridgeuser'
  const fallbackPass = String(config?.fallbackPass || 'bridgepass').trim() || 'bridgepass'
  const userEnvKey = String(config?.userEnvKey || 'VITE_BRIDGE_USER').trim()
  const passEnvKey = String(config?.passEnvKey || 'VITE_BRIDGE_PASSWORD').trim()

  const env = (import.meta as any)?.env || {}
  const bridgeUsername = String(env[userEnvKey] || fallbackUser).trim() || fallbackUser
  const bridgePassword = String(env[passEnvKey] || fallbackPass).trim() || fallbackPass
  return { bridgeUsername, bridgePassword }
}

type EvmCoinFactoryConfig = {
  id: string
  name: string
  symbol: string
  coinSymbol: string
  chainId: number
  bridgeCoinId: string
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

export function createEvmCoinModule(config: EvmCoinFactoryConfig): {
  createNetwork: (ctx: CoinRuntimeContext) => Network
  coin: CoinModule
  capabilities: NetworkCapabilitiesInput
} {
  const capabilities = config.capabilities || FULL_ASSET_CAPABILITIES
  const env = (import.meta as any)?.env || {}

  const createNetwork = (ctx: CoinRuntimeContext): Network => ({
    id: config.id,
    name: config.name,
    symbol: config.symbol,
    coinType: 'EVM',
    coinSymbol: config.coinSymbol,
    chainId: config.chainId,
    rpcUrl: String(env[config.rpcEnvKey] || config.defaultRpcUrl).trim() || config.defaultRpcUrl,
    rpcWallet: '',
    rpcUsername: String(env[config.rpcUserEnvKey] || '').trim(),
    rpcPassword: String(env[config.rpcPasswordEnvKey] || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl(config.bridgeCoinId, 'main'),
    bridgeUsername: String(env[config.bridgeUserEnvKey] || 'bridgeuser').trim() || 'bridgeuser',
    bridgePassword: String(env[config.bridgePasswordEnvKey] || 'bridgepass').trim() || 'bridgepass',
    explorerUrl: String(env[config.explorerEnvKey] || config.defaultExplorerUrl).trim() || config.defaultExplorerUrl,
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
