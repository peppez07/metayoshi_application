import type {
  CoinModule,
  CoinRuntimeContext,
  CoinType,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { getPackedCoinFeatureByCoinId } from './packed'
import rtmLogo from './coinlogos/raptoreum.png'
import ethLogo from './coinlogos/ethereum.png'
import bnbLogo from './coinlogos/bnb.png'
import polygonLogo from './coinlogos/polygon.png'
import arbitrumLogo from './coinlogos/arbitrum.png'
import baseLogo from './coinlogos/base.png'
import avaxLogo from './coinlogos/avalanche.png'
import bitcoinLogo from './coinlogos/bitcoin.png'
import cosmosLogo from './coinlogos/cosmos.png'
import dashLogo from './coinlogos/dash.png'
import pivxLogo from './coinlogos/pivx.png'
import polkadotLogo from './coinlogos/polkadot-new.png'
import terraLogo from './coinlogos/terra-luna-v2.png'
import terraClassicLogo from './coinlogos/terra-luna.png'
import mantaLogo from './coinlogos/manta-network.png'
import solanaLogo from './coinlogos/solana.png'
import stellarLogo from './coinlogos/stellar.png'
import tronLogo from './coinlogos/tron.png'
import dogeLogo from './coinlogos/dogecoin.png'
import btczLogo from './coinlogos/bitcoinz.png'
import tideLogo from './coinlogos/tide.webp'
import firoLogo from './coinlogos/firo.png'
import xrpLogo from './coinlogos/xrp.png'
import arrLogo from './coinlogos/pirate-chain.png'
import moneroLogo from './coinlogos/monero.png'
import cardanoLogo from './coinlogos/cardano.png'
import { getBuildFeatureFlag } from '../buildConfig'

const ENV = (import.meta as any)?.env || {}

function resolveBridgeCredentials(config?: {
  userEnvKey?: string
  passEnvKey?: string
  fallbackUser?: string
  fallbackPass?: string
}): { bridgeUsername: string; bridgePassword: string } {
  const fallbackUser = String(config?.fallbackUser || 'bridgeuser').trim() || 'bridgeuser'
  const fallbackPass = String(config?.fallbackPass || 'bridgepass').trim() || 'bridgepass'
  const userEnvKey = String(config?.userEnvKey || 'VITE_BRIDGE_USER').trim()
  const passEnvKey = String(config?.passEnvKey || 'VITE_BRIDGE_PASSWORD').trim()
  return {
    bridgeUsername: String(ENV[userEnvKey] || fallbackUser).trim() || fallbackUser,
    bridgePassword: String(ENV[passEnvKey] || fallbackPass).trim() || fallbackPass
  }
}

function normalizeCoinType(value: unknown): CoinType {
  const v = String(value || '').trim().toUpperCase()
  if (v === 'EVM' || v === 'UTXO' || v === 'BTC' || v === 'SOL' || v === 'XRP') return v
  // Keep legacy behavior for account-based non-EVM chains routed by runtime model handlers.
  return 'BTC'
}

function capabilitiesFromPacked(feature: any): NetworkCapabilitiesInput {
  const caps = feature?.settings?.capabilities || {}
  const ui = feature?.settings?.ui || {}
  return {
    features: {
      nativeSend: Boolean(caps.nativeSend),
      assetLayer: Boolean(caps.assetLayer),
      assetSend: Boolean(caps.assetSend),
      activity: true
    },
    ui: {
      showAssetsTab: Boolean(ui.showAssetsTab),
      showAssetsAction: Boolean(ui.showAssetsAction),
      showSendAction: Boolean(ui.showSendAction),
      showActivityTab: Boolean(ui.showActivityTab)
    }
  }
}

function mustPacked(coinId: string): any {
  const feature = getPackedCoinFeatureByCoinId(coinId)
  if (!feature) throw new Error(`Packed coin feature not found for '${coinId}'`)
  return feature
}

type SeedConfig = {
  moduleId: string
  packedCoinId: string
  logo: string
  bridgeCoinId?: string
  serverCoinId?: string
  serverChain?: 'main' | 'test'
  runtimeModelId?: string
  coinType?: CoinType
  name?: string
  symbol?: string
  coinSymbol?: string
  rpcEnvKey?: string
  rpcUserEnvKey?: string
  rpcPasswordEnvKey?: string
  rpcWalletEnvKey?: string
  rpcWalletDefault?: string
  defaultRpcUrl?: string
  bridgeUserEnvKey?: string
  bridgePasswordEnvKey?: string
  explorerEnvKey?: string
  derivation?: Network['derivation']
  utxoAddress?: UtxoAddressSpec
  feePerByte?: number
  estimateFee?: (txBytes: number) => number
  capabilities?: NetworkCapabilitiesInput
}

function toCoinModule(config: SeedConfig): CoinModule {
  const feature = mustPacked(config.packedCoinId)
  const packedSettings = feature?.settings || {}
  const packedIdentity = packedSettings.identity || {}
  const packedBridge = packedSettings.bridge || {}
  const packedExplorer = packedSettings.explorer || {}
  const capabilities = config.capabilities || capabilitiesFromPacked(feature)

  const createNetwork = (ctx: CoinRuntimeContext): Network => {
    const rpcWallet = String(
      (config.rpcWalletEnvKey ? ENV[config.rpcWalletEnvKey] : undefined)
      || config.rpcWalletDefault
      || ''
    ).trim()

    const rpcUrl = String(
      (config.rpcEnvKey ? ENV[config.rpcEnvKey] : undefined)
      || config.defaultRpcUrl
      || ctx.apiBaseUrl
    ).trim() || ctx.apiBaseUrl

    const rpcUsername = String(
      (config.rpcUserEnvKey ? ENV[config.rpcUserEnvKey] : undefined)
      || (config.rpcEnvKey ? '' : 'rpcuser')
    ).trim()
    const rpcPassword = String(
      (config.rpcPasswordEnvKey ? ENV[config.rpcPasswordEnvKey] : undefined)
      || (config.rpcEnvKey ? '' : 'rpcpass')
    ).trim()

    const bridgeCreds = resolveBridgeCredentials({
      userEnvKey: config.bridgeUserEnvKey,
      passEnvKey: config.bridgePasswordEnvKey
    })

    const bridgeCoin = String(config.bridgeCoinId || feature?.bridgeCoinId || config.packedCoinId).trim()
    const bridgeChain = String(config.serverChain || packedBridge.chain || 'main').trim().toLowerCase() === 'test'
      ? 'test'
      : 'main'
    const bridgeWallet = packedBridge.walletScopedPath ? rpcWallet : ''
    const explorerUrl = String(
      (config.explorerEnvKey ? ENV[config.explorerEnvKey] : undefined)
      || packedExplorer.baseUrl
      || ''
    ).trim()

    return {
      id: config.moduleId,
      ...(config.runtimeModelId ? { runtimeModelId: config.runtimeModelId } : {}),
      ...(config.serverCoinId ? { serverCoinId: config.serverCoinId } : {}),
      ...(config.serverChain ? { serverChain: config.serverChain } : {}),
      name: String(config.name || packedIdentity.name || feature.name || config.moduleId),
      symbol: String(config.symbol || packedIdentity.symbol || feature.symbol || '').toUpperCase(),
      coinType: normalizeCoinType(config.coinType || packedIdentity.coinType || feature.coinType),
      coinSymbol: String(config.coinSymbol || packedIdentity.symbol || feature.symbol || '').toUpperCase(),
      chainId: Number.isInteger(packedSettings?.chain?.chainId) ? Number(packedSettings.chain.chainId) : undefined,
      rpcUrl,
      rpcWallet,
      rpcUsername,
      rpcPassword,
      bridgeUrl: ctx.buildBridgeUrl(bridgeCoin, bridgeChain, bridgeWallet || undefined),
      bridgeUsername: bridgeCreds.bridgeUsername,
      bridgePassword: bridgeCreds.bridgePassword,
      explorerUrl: explorerUrl || undefined,
      capabilities,
      derivation: config.derivation,
      feePerByte: config.feePerByte,
      logo: config.logo
    }
  }

  return {
    id: config.moduleId,
    symbol: String(config.symbol || feature.symbol || '').toUpperCase(),
    coinSymbol: String(config.coinSymbol || feature.symbol || '').toUpperCase(),
    capabilities,
    utxoAddress: config.utxoAddress,
    createNetwork,
    estimateFee: config.estimateFee
  }
}

const COMMON_UTXO_FEE_PER_BYTE = 0.00002
const estimateCommonUtxoFee = (txBytes: number): number => txBytes * COMMON_UTXO_FEE_PER_BYTE
const XMR_NON_CUSTODIAL_ENABLED = getBuildFeatureFlag('enableXmrNonCustodial', 'VITE_ENABLE_XMR_NON_CUSTODIAL', false)

export const BTC_ADDRESS_SPEC: UtxoAddressSpec = { bip44CoinType: 0, p2pkhVersion: 0x00 }

const SEEDS: SeedConfig[] = [
  {
    moduleId: 'rtm',
    packedCoinId: 'raptoreum',
    bridgeCoinId: 'raptoreum',
    logo: rtmLogo,
    rpcWalletEnvKey: 'VITE_RTM_WALLET',
    rpcWalletDefault: 'mainwallet',
    explorerEnvKey: 'VITE_RTM_EXPLORER',
    utxoAddress: { bip44CoinType: 175, p2pkhVersion: 0x3c },
    feePerByte: COMMON_UTXO_FEE_PER_BYTE,
    estimateFee: estimateCommonUtxoFee
  },
  { moduleId: 'eth', packedCoinId: 'ethereum', bridgeCoinId: 'ethereum', logo: ethLogo, rpcEnvKey: 'VITE_ETH_RPC', rpcUserEnvKey: 'VITE_ETH_RPC_USER', rpcPasswordEnvKey: 'VITE_ETH_RPC_PASSWORD', bridgeUserEnvKey: 'VITE_ETH_BRIDGE_USER', bridgePasswordEnvKey: 'VITE_ETH_BRIDGE_PASSWORD', explorerEnvKey: 'VITE_ETH_EXPLORER', defaultRpcUrl: 'https://ethereum-rpc.publicnode.com', coinType: 'EVM' },
  { moduleId: 'bnb', packedCoinId: 'bsc', bridgeCoinId: 'bsc', logo: bnbLogo, rpcEnvKey: 'VITE_BNB_RPC', rpcUserEnvKey: 'VITE_BNB_RPC_USER', rpcPasswordEnvKey: 'VITE_BNB_RPC_PASSWORD', bridgeUserEnvKey: 'VITE_BNB_BRIDGE_USER', bridgePasswordEnvKey: 'VITE_BNB_BRIDGE_PASSWORD', explorerEnvKey: 'VITE_BNB_EXPLORER', defaultRpcUrl: 'https://bsc-dataseed.binance.org', coinType: 'EVM' },
  { moduleId: 'polygon', packedCoinId: 'polygon-bor', bridgeCoinId: 'polygon-bor', logo: polygonLogo, rpcEnvKey: 'VITE_POLYGON_RPC', rpcUserEnvKey: 'VITE_POLYGON_RPC_USER', rpcPasswordEnvKey: 'VITE_POLYGON_RPC_PASSWORD', bridgeUserEnvKey: 'VITE_POLYGON_BRIDGE_USER', bridgePasswordEnvKey: 'VITE_POLYGON_BRIDGE_PASSWORD', explorerEnvKey: 'VITE_POLYGON_EXPLORER', defaultRpcUrl: 'https://polygon-bor-rpc.publicnode.com', coinType: 'EVM' },
  { moduleId: 'arb', packedCoinId: 'arbitrum-one', bridgeCoinId: 'arbitrum-one', logo: arbitrumLogo, rpcEnvKey: 'VITE_ARB_RPC', rpcUserEnvKey: 'VITE_ARB_RPC_USER', rpcPasswordEnvKey: 'VITE_ARB_RPC_PASSWORD', bridgeUserEnvKey: 'VITE_ARB_BRIDGE_USER', bridgePasswordEnvKey: 'VITE_ARB_BRIDGE_PASSWORD', explorerEnvKey: 'VITE_ARB_EXPLORER', defaultRpcUrl: 'https://arb1.arbitrum.io/rpc', coinType: 'EVM', symbol: 'ARB', coinSymbol: 'ETH' },
  { moduleId: 'base', packedCoinId: 'base', bridgeCoinId: 'base', logo: baseLogo, rpcEnvKey: 'VITE_BASE_RPC', rpcUserEnvKey: 'VITE_BASE_RPC_USER', rpcPasswordEnvKey: 'VITE_BASE_RPC_PASSWORD', bridgeUserEnvKey: 'VITE_BASE_BRIDGE_USER', bridgePasswordEnvKey: 'VITE_BASE_BRIDGE_PASSWORD', explorerEnvKey: 'VITE_BASE_EXPLORER', defaultRpcUrl: 'https://mainnet.base.org', coinType: 'EVM', symbol: 'BASE', coinSymbol: 'ETH' },
  { moduleId: 'avaxc', packedCoinId: 'avalanche-c-chain', bridgeCoinId: 'avalanche-c-chain', logo: avaxLogo, rpcEnvKey: 'VITE_AVAXC_RPC', rpcUserEnvKey: 'VITE_AVAXC_RPC_USER', rpcPasswordEnvKey: 'VITE_AVAXC_RPC_PASSWORD', bridgeUserEnvKey: 'VITE_AVAXC_BRIDGE_USER', bridgePasswordEnvKey: 'VITE_AVAXC_BRIDGE_PASSWORD', explorerEnvKey: 'VITE_AVAXC_EXPLORER', defaultRpcUrl: 'https://api.avax.network/ext/bc/C/rpc', coinType: 'EVM' },
  { moduleId: 'srv--bitcoin', packedCoinId: 'bitcoin', serverCoinId: 'bitcoin', serverChain: 'main', runtimeModelId: 'bitcoin', logo: bitcoinLogo, utxoAddress: BTC_ADDRESS_SPEC },
  { moduleId: 'srv--cosmos', packedCoinId: 'cosmos', serverCoinId: 'cosmos', serverChain: 'main', runtimeModelId: 'cosmos', logo: cosmosLogo, capabilities: { features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true }, ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true } }, coinType: 'UTXO' },
  { moduleId: 'srv--dash', packedCoinId: 'dash', serverCoinId: 'dash', serverChain: 'main', runtimeModelId: 'dash', logo: dashLogo, explorerEnvKey: 'VITE_DASH_EXPLORER', utxoAddress: { bip44CoinType: 5, p2pkhVersion: 0x4c } },
  { moduleId: 'srv--pivx', packedCoinId: 'pivx', serverCoinId: 'pivx', serverChain: 'main', runtimeModelId: 'pivx', logo: pivxLogo, utxoAddress: { bip44CoinType: 119, p2pkhVersion: 0x1e } },
  {
    moduleId: 'srv--polkadot',
    packedCoinId: 'polkadot',
    serverCoinId: 'polkadot',
    serverChain: 'main',
    runtimeModelId: 'polkadot',
    logo: polkadotLogo,
    derivation: { status: 'unsupported', reason: 'Polkadot non-custodial signer is not implemented yet' },
    capabilities: { features: { nativeSend: false, assetLayer: false, assetSend: false, activity: true }, ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: false, showActivityTab: true } }
  },
  {
    moduleId: 'srv--terra',
    packedCoinId: 'terra',
    serverCoinId: 'terra',
    serverChain: 'main',
    runtimeModelId: 'terra',
    logo: terraLogo,
    derivation: { status: 'unsupported', reason: 'Terra non-custodial signer is not implemented yet' },
    capabilities: { features: { nativeSend: false, assetLayer: false, assetSend: false, activity: true }, ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: false, showActivityTab: true } }
  },
  {
    moduleId: 'srv--terra-classic',
    packedCoinId: 'terra-classic',
    serverCoinId: 'terra-classic',
    serverChain: 'main',
    runtimeModelId: 'terra-classic',
    logo: terraClassicLogo,
    derivation: { status: 'unsupported', reason: 'Terra Classic non-custodial signer is not implemented yet' },
    capabilities: { features: { nativeSend: false, assetLayer: false, assetSend: false, activity: true }, ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: false, showActivityTab: true } }
  },
  {
    moduleId: 'srv--manta-atlantic',
    packedCoinId: 'manta-atlantic',
    serverCoinId: 'manta-atlantic',
    serverChain: 'main',
    runtimeModelId: 'manta-atlantic',
    logo: mantaLogo,
    derivation: { status: 'unsupported', reason: 'Manta Atlantic non-custodial signer is not implemented yet' },
    capabilities: { features: { nativeSend: false, assetLayer: false, assetSend: false, activity: true }, ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: false, showActivityTab: true } }
  },
  { moduleId: 'sol', packedCoinId: 'solana', bridgeCoinId: 'solana', logo: solanaLogo, rpcEnvKey: 'VITE_SOL_RPC', rpcUserEnvKey: 'VITE_SOL_RPC_USER', rpcPasswordEnvKey: 'VITE_SOL_RPC_PASSWORD', bridgeUserEnvKey: 'VITE_SOL_BRIDGE_USER', bridgePasswordEnvKey: 'VITE_SOL_BRIDGE_PASSWORD', explorerEnvKey: 'VITE_SOL_EXPLORER', defaultRpcUrl: 'https://api.mainnet-beta.solana.com', derivation: { status: 'supported' }, coinType: 'SOL' },
  { moduleId: 'xlm', packedCoinId: 'stellar', bridgeCoinId: 'stellar', logo: stellarLogo, rpcEnvKey: 'VITE_XLM_RPC', rpcUserEnvKey: 'VITE_XLM_RPC_USER', rpcPasswordEnvKey: 'VITE_XLM_RPC_PASSWORD', bridgeUserEnvKey: 'VITE_XLM_BRIDGE_USER', bridgePasswordEnvKey: 'VITE_XLM_BRIDGE_PASSWORD', explorerEnvKey: 'VITE_XLM_EXPLORER', defaultRpcUrl: 'https://horizon.stellar.org', derivation: { status: 'supported' }, coinType: 'BTC' },
  { moduleId: 'tron', packedCoinId: 'tron', bridgeCoinId: 'tron', logo: tronLogo, rpcEnvKey: 'VITE_TRON_RPC', rpcUserEnvKey: 'VITE_TRON_RPC_USER', rpcPasswordEnvKey: 'VITE_TRON_RPC_PASSWORD', bridgeUserEnvKey: 'VITE_TRON_BRIDGE_USER', bridgePasswordEnvKey: 'VITE_TRON_BRIDGE_PASSWORD', explorerEnvKey: 'VITE_TRON_EXPLORER', defaultRpcUrl: 'https://api.trongrid.io', derivation: { status: 'supported' }, coinType: 'BTC' },
  { moduleId: 'doge', packedCoinId: 'dogecoin', bridgeCoinId: 'dogecoin', logo: dogeLogo, explorerEnvKey: 'VITE_DOGE_EXPLORER', utxoAddress: { bip44CoinType: 3, p2pkhVersion: 0x1e }, feePerByte: COMMON_UTXO_FEE_PER_BYTE, estimateFee: estimateCommonUtxoFee },
  { moduleId: 'btcz', packedCoinId: 'bitcoinz', bridgeCoinId: 'bitcoinz', logo: btczLogo, explorerEnvKey: 'VITE_BTCZ_EXPLORER', utxoAddress: { bip44CoinType: 177, p2pkhVersion: 0x1cb8 }, feePerByte: COMMON_UTXO_FEE_PER_BYTE, estimateFee: estimateCommonUtxoFee },
  { moduleId: 'tide', packedCoinId: 'tidecoin', bridgeCoinId: 'tidecoin', logo: tideLogo, explorerEnvKey: 'VITE_TIDE_EXPLORER', utxoAddress: { bip44CoinType: 0, p2pkhVersion: 0x21 }, feePerByte: COMMON_UTXO_FEE_PER_BYTE, estimateFee: estimateCommonUtxoFee },
  { moduleId: 'firo', packedCoinId: 'firo', bridgeCoinId: 'firo', logo: firoLogo, explorerEnvKey: 'VITE_FIRO_EXPLORER', utxoAddress: { bip44CoinType: 136, p2pkhVersion: 0x52 }, feePerByte: COMMON_UTXO_FEE_PER_BYTE, estimateFee: estimateCommonUtxoFee },
  { moduleId: 'xrp', packedCoinId: 'xrp', bridgeCoinId: 'xrp', logo: xrpLogo, rpcWalletEnvKey: 'VITE_XRP_RPC_WALLET', rpcUserEnvKey: 'VITE_XRP_RPC_USER', rpcPasswordEnvKey: 'VITE_XRP_RPC_PASSWORD', explorerEnvKey: 'VITE_XRP_EXPLORER', coinType: 'XRP' },
  { moduleId: 'arr', packedCoinId: 'arr', bridgeCoinId: 'arr', logo: arrLogo, explorerEnvKey: 'VITE_ARR_EXPLORER', utxoAddress: { bip44CoinType: 141, p2pkhVersion: 0x3c }, feePerByte: COMMON_UTXO_FEE_PER_BYTE, estimateFee: estimateCommonUtxoFee },
  { moduleId: 'xmr', packedCoinId: 'monero', bridgeCoinId: 'monero', logo: moneroLogo, rpcWalletEnvKey: 'VITE_XMR_RPC_WALLET', rpcUserEnvKey: 'VITE_XMR_RPC_USER', rpcPasswordEnvKey: 'VITE_XMR_RPC_PASSWORD', explorerEnvKey: 'VITE_XMR_EXPLORER', derivation: { status: 'supported' }, coinType: 'BTC', capabilities: { features: { nativeSend: XMR_NON_CUSTODIAL_ENABLED, assetLayer: false, assetSend: false, activity: true }, ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: XMR_NON_CUSTODIAL_ENABLED, showActivityTab: true } } },
  { moduleId: 'ada', packedCoinId: 'cardano', bridgeCoinId: 'cardano', logo: cardanoLogo, rpcWalletEnvKey: 'VITE_ADA_RPC_WALLET', rpcUserEnvKey: 'VITE_ADA_RPC_USER', rpcPasswordEnvKey: 'VITE_ADA_RPC_PASSWORD', explorerEnvKey: 'VITE_ADA_EXPLORER', derivation: { status: 'supported' }, coinType: 'BTC' }
]

export const SEED_COIN_MODULES: CoinModule[] = SEEDS.map(toCoinModule)

export const SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID: Record<string, string> = {
  cosmos: 'srv--cosmos',
  bitcoin: 'srv--bitcoin',
  pivx: 'srv--pivx',
  dash: 'srv--dash',
  terra: 'srv--terra',
  'terra-classic': 'srv--terra-classic',
  polkadot: 'srv--polkadot',
  'manta-atlantic': 'srv--manta-atlantic'
}
