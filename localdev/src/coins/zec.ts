import type {
  CoinModule,
  CoinRuntimeContext,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { NATIVE_ONLY_CAPABILITIES, resolveBridgeCredentials } from './factories'
import { getUnifiedLogoByName } from './logos'

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
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials()
  return {
    id: 'zec',
    runtimeModelId: 'zec',
    serverCoinId: 'zcash',
    serverChain: 'main',
    name: 'Zcash',
    symbol: 'ZEC',
    coinType: 'UTXO',
    coinSymbol: 'ZEC',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('zcash', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: String(import.meta.env.VITE_ZEC_EXPLORER || '').trim(),
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
