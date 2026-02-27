import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { NATIVE_ONLY_CAPABILITIES, resolveBridgeCredentials } from './factories'
import cosmosLogo from './coinlogos/cosmos.png'

export const CRO_CAPABILITIES: NetworkCapabilitiesInput = NATIVE_ONLY_CAPABILITIES

export function createCroNetwork(ctx: CoinRuntimeContext): Network {
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_CRO_BRIDGE_USER',
    passEnvKey: 'VITE_CRO_BRIDGE_PASSWORD'
  })

  return {
    id: 'cro',
    runtimeModelId: 'crocosmos',
    serverCoinId: 'cronos-pos',
    serverChain: 'main',
    name: 'Cosmos',
    symbol: 'COSMOS',
    coinType: 'UTXO',
    coinSymbol: 'CRO',
    rpcUrl: String((import.meta as any)?.env?.VITE_CRO_RPC || ctx.apiBaseUrl).trim() || ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: String((import.meta as any)?.env?.VITE_CRO_RPC_USER || '').trim(),
    rpcPassword: String((import.meta as any)?.env?.VITE_CRO_RPC_PASSWORD || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl('cronos-pos', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: String((import.meta as any)?.env?.VITE_CRO_EXPLORER || 'https://crypto.org/explorer/account').trim() || 'https://crypto.org/explorer/account',
    capabilities: CRO_CAPABILITIES,
    logo: cosmosLogo
  }
}

export const croCoin: CoinModule = {
  id: 'cro',
  symbol: 'COSMOS',
  coinSymbol: 'CRO',
  capabilities: CRO_CAPABILITIES,
  createNetwork: createCroNetwork
}
