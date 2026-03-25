import type {
  CoinModule,
  CoinRuntimeContext,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { resolveBridgeCredentials } from './factories'
import { FIRO_API_INFO } from './interceptors/firo'
import { getUnifiedLogoByName } from './logos'
import { sanitizeExplorerUrl } from '../lib/serverOnly'

export const FIRO_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export const FIRO_ADDRESS_SPEC: UtxoAddressSpec = {
  bip44CoinType: 136,
  p2pkhVersion: 0x52
}

export const FIRO_FEE_PER_BYTE = 0.00002

export function estimateFiroFee(txBytes: number): number {
  return txBytes * FIRO_FEE_PER_BYTE
}

export function createFiroNetwork(ctx: CoinRuntimeContext): Network {
  const env = (import.meta as any)?.env || {}
  const { bridgeUsername, bridgePassword } = resolveBridgeCredentials({
    userEnvKey: 'VITE_FIRO_BRIDGE_USER',
    passEnvKey: 'VITE_FIRO_BRIDGE_PASSWORD'
  })

  return {
    id: 'firo',
    runtimeModelId: 'firo',
    serverCoinId: 'firo',
    serverChain: 'main',
    displayChain: 'main',
    name: 'Firo',
    symbol: 'FIRO',
    coinType: 'UTXO',
    coinSymbol: 'FIRO',
    rpcUrl: '',
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('firo', 'main'),
    bridgeUsername,
    bridgePassword,
    explorerUrl: sanitizeExplorerUrl(String(import.meta.env.VITE_FIRO_EXPLORER || FIRO_API_INFO.defaultExplorerUrl || '').trim()) || undefined,
    capabilities: FIRO_CAPABILITIES,
    feePerByte: FIRO_FEE_PER_BYTE,
    logo: getUnifiedLogoByName('firo')
  }
}

export const firoCoin: CoinModule = {
  id: 'firo',
  symbol: 'FIRO',
  coinSymbol: 'FIRO',
  capabilities: FIRO_CAPABILITIES,
  utxoAddress: FIRO_ADDRESS_SPEC,
  createNetwork: createFiroNetwork,
  estimateFee: estimateFiroFee
}
