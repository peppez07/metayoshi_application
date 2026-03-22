import type {
  CoinModule,
  CoinRuntimeContext,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { resolveBridgeCredentials } from './factories'
import { BTCZ_API_INFO } from './interceptors'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl } from '../lib/serverOnly'

export const BTCZ_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export const BTCZ_ADDRESS_SPEC: UtxoAddressSpec = {
  bip44CoinType: 177,
  p2pkhVersion: 0x1cb8
}

export const BTCZ_FEE_PER_BYTE = 0.00002

export function estimateBtczFee(txBytes: number): number {
  return txBytes * BTCZ_FEE_PER_BYTE
}

export function createBtczNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_BTCZ_BRIDGE_USER',
    passEnvKey: 'VITE_BTCZ_BRIDGE_PASSWORD'
  })

  return {
    id: 'btcz',
    runtimeModelId: 'btcz',
    serverCoinId: 'bitcoinz',
    serverChain: 'main',
    displayChain: 'main',
    name: 'BitcoinZ',
    symbol: 'BTCZ',
    coinType: 'UTXO',
    coinSymbol: 'BTCZ',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: String(env.VITE_BTCZ_RPC_USER || '').trim(),
    rpcPassword: String(env.VITE_BTCZ_RPC_PASSWORD || '').trim(),
    bridgeUrl: ctx.buildBridgeUrl('bitcoinz', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(import.meta.env.VITE_BTCZ_EXPLORER || BTCZ_API_INFO.defaultExplorerUrl || '').trim()) || undefined,
    capabilities: BTCZ_CAPABILITIES,
    feePerByte: BTCZ_FEE_PER_BYTE,
    logo: getUnifiedLogoByName('bitcoinz')
  }
}

export const btczCoin: CoinModule = {
  id: 'btcz',
  symbol: 'BTCZ',
  coinSymbol: 'BTCZ',
  capabilities: BTCZ_CAPABILITIES,
  utxoAddress: BTCZ_ADDRESS_SPEC,
  createNetwork: createBtczNetwork,
  estimateFee: estimateBtczFee
}
