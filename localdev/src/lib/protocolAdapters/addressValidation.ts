import type { Network } from '../../coins'
import { isSuiAddress } from '../suiAddress'
import { isCosmosLikeModelId } from '../runtimeModel'
import { isValidCosmosAddress } from './cosmos'

const MONERO_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/
const CARDANO_ADDRESS_RE = /^(addr1|addr_test1)[0-9a-z]{20,}$/i

let ethersModulePromise: Promise<typeof import('ethers')> | null = null
let solanaWeb3ModulePromise: Promise<typeof import('@solana/web3.js')> | null = null
let stellarSdkModulePromise: Promise<typeof import('@stellar/stellar-sdk')> | null = null
let tronWebModulePromise: Promise<typeof import('tronweb')> | null = null

function loadEthersModule() {
  if (!ethersModulePromise) ethersModulePromise = import('ethers')
  return ethersModulePromise
}

function loadSolanaWeb3Module() {
  if (!solanaWeb3ModulePromise) solanaWeb3ModulePromise = import('@solana/web3.js')
  return solanaWeb3ModulePromise
}

function loadStellarSdkModule() {
  if (!stellarSdkModulePromise) stellarSdkModulePromise = import('@stellar/stellar-sdk')
  return stellarSdkModulePromise
}

function loadTronWebModule() {
  if (!tronWebModulePromise) tronWebModulePromise = import('tronweb')
  return tronWebModulePromise
}

export async function validateProtocolAddress(
  network: Network,
  modelId: string,
  protocol: string,
  value: string
): Promise<boolean | null> {
  const normalizedValue = String(value || '').trim()
  if (!normalizedValue) return false
  if (modelId === 'sol') {
    try {
      const { PublicKey } = await loadSolanaWeb3Module()
      void new PublicKey(normalizedValue)
      return true
    } catch {
      return false
    }
  }
  if (modelId === 'xlm') {
    const { StrKey } = await loadStellarSdkModule()
    return StrKey.isValidEd25519PublicKey(normalizedValue)
  }
  if (modelId === 'tron') {
    const tronweb = await loadTronWebModule()
    return tronweb.TronWeb.isAddress(normalizedValue)
  }
  if (modelId === 'sui') {
    return isSuiAddress(normalizedValue)
  }
  if (isCosmosLikeModelId(modelId)) {
    return isValidCosmosAddress(network, normalizedValue)
  }
  if (modelId === 'ada' || protocol === 'cardano-wallet-compat') {
    return CARDANO_ADDRESS_RE.test(normalizedValue)
  }
  if (modelId === 'xmr' || protocol === 'monero-wallet-compat') {
    const length = normalizedValue.length
    const startsOk = normalizedValue.startsWith('4') || normalizedValue.startsWith('8') || normalizedValue.startsWith('9')
    return startsOk && (length === 95 || length === 106) && MONERO_BASE58_RE.test(normalizedValue)
  }
  if (network.coinType === 'EVM') {
    const { ethers } = await loadEthersModule()
    return ethers.isAddress(normalizedValue)
  }
  if (protocol === 'xrp-jsonrpc-compat') {
    return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(normalizedValue) || /^X[1-9A-HJ-NP-Za-km-z]{46,60}$/.test(normalizedValue)
  }
  return null
}
