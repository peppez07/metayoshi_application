import type {
  CoinModule,
  CoinRuntimeContext,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { resolveBridgeCredentials } from './factories'
import { RTM_API_INFO } from './interceptors'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl } from '../lib/serverOnly'

export const RTM_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export const RTM_ADDRESS_SPEC: UtxoAddressSpec = {
  bip44CoinType: 175,
  p2pkhVersion: 0x3c
}

// RTM relay fee baseline is ~0.0001 RTM/kB. We keep a conservative margin.
export const RTM_FEE_PER_BYTE = 0.00002

export function estimateRtmFee(txBytes: number): number {
  return txBytes * RTM_FEE_PER_BYTE
}

export function createRtmNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const wallet = String(env.VITE_RTM_WALLET || RTM_API_INFO.defaultWallet || 'mainwallet').trim() || 'mainwallet'
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_RTM_BRIDGE_USER',
    passEnvKey: 'VITE_RTM_BRIDGE_PASSWORD'
  })
  return {
    id: 'rtm',
    runtimeModelId: 'rtm',
    serverCoinId: 'raptoreum',
    serverChain: 'main',
    displayChain: 'main',
    name: 'Raptoreum',
    symbol: 'RTM',
    coinType: 'UTXO',
    coinSymbol: 'RTM',
    rpcUrl: '',
    rpcWallet: wallet,
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('raptoreum', 'main', wallet),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(import.meta.env.VITE_RTM_EXPLORER || RTM_API_INFO.defaultExplorerUrl || '').trim()) || undefined,
    capabilities: RTM_CAPABILITIES,
    feePerByte: RTM_FEE_PER_BYTE,
    logo: getUnifiedLogoByName('raptoreum')
  }
}

export const rtmCoin: CoinModule = {
  id: 'rtm',
  symbol: 'RTM',
  coinSymbol: 'RTM',
  capabilities: RTM_CAPABILITIES,
  utxoAddress: RTM_ADDRESS_SPEC,
  createNetwork: createRtmNetwork,
  estimateFee: estimateRtmFee
}
