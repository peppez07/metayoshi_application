import type {
  CoinModule,
  CoinRuntimeContext,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { NATIVE_ONLY_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl } from '../lib/serverOnly'

export const ZEC_CAPABILITIES: NetworkCapabilitiesInput = NATIVE_ONLY_CAPABILITIES
export const ZEC_ADDRESS_SPEC: UtxoAddressSpec = {
  bip44CoinType: 133,
  p2pkhVersion: 0x1cb8
}

export const ZEC_FEE_PER_BYTE = 0.00002

export function estimateZecFee(txBytes: number): number {
  return txBytes * ZEC_FEE_PER_BYTE
}

export function createZecNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_ZEC_BRIDGE_USER',
    passEnvKey: 'VITE_ZEC_BRIDGE_PASSWORD'
  })
  return {
    id: 'zec',
    runtimeModelId: 'zec',
    serverCoinId: 'zcash',
    serverChain: 'main',
    displayChain: 'main',
    name: 'Zcash',
    symbol: 'ZEC',
    coinType: 'UTXO',
    coinSymbol: 'ZEC',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: String(env.VITE_ZEC_RPC_USER || '').trim(),
    rpcPassword: String(env.VITE_ZEC_RPC_PASSWORD || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl('zcash', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(import.meta.env.VITE_ZEC_EXPLORER || '').trim()) || undefined,
    capabilities: ZEC_CAPABILITIES,
    feePerByte: ZEC_FEE_PER_BYTE,
    logo: getUnifiedLogoByName('zcash')
  }
}

export const zecCoin: CoinModule = {
  id: 'zec',
  symbol: 'ZEC',
  coinSymbol: 'ZEC',
  capabilities: ZEC_CAPABILITIES,
  utxoAddress: ZEC_ADDRESS_SPEC,
  createNetwork: createZecNetwork,
  estimateFee: estimateZecFee
}
