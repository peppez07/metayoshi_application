import { ethers } from 'ethers'
import type { Network } from '../coins'
import { estimateNetworkFee, getCoinRuntimeProfile } from '../coins'
import type { UtxoRpcConfig } from './utxoRpc'
import {
  createRawTransaction,
  getAddressMempoolSpentOutpoints,
  getAddressUtxos,
  getBlockchainInfo,
  getUtxoBalance,
  listUtxoUnspent,
  scanAddressUnspent,
  sendRawTransaction,
  validateAddress,
  type UtxoUnspent
} from './utxoRpc'
import { getXrpAccountBalance } from './xrpRpc'
import { signBtczTransparentTransaction, signLegacyP2pkhTransaction, type UnsignedTxInput } from './utxoSign'

export interface ChainBalanceSyncResult {
  balance: string
  syncPercent: number | null
  isSyncing: boolean
}

export interface FetchChainBalanceInput {
  network: Network
  address: string
  rpcConfig?: UtxoRpcConfig
  skipChainSyncProbe?: boolean
  preferAddressIndexBalance?: boolean
  zeroBalanceRecheckMs?: number
}

export interface SendChainTransactionInput {
  network: Network
  to: string
  amount: string
  rpcConfig?: UtxoRpcConfig
  evm?: {
    mnemonic: string
    accountIndex: number
  }
  utxoSend?: () => Promise<{ hash: string }>
}

export interface UtxoDonationInput {
  address: string
  amount: string
  required?: boolean
}

export interface SendUtxoNonCustodialInput {
  network: Network
  rpcConfig: UtxoRpcConfig
  senderAddress: string
  to: string
  amount: string
  donation?: UtxoDonationInput
  deriveSigningKey: (senderAddress: string) => Promise<{ privHex: string }>
}

function resolveProtocol(network: Network): string {
  return getCoinRuntimeProfile(network.id)?.protocol || 'utxo-jsonrpc'
}

export type ChainSendCustodyMode = 'non-custodial' | 'custodial-server' | 'unsupported'

export function resolveChainSendCustodyMode(network: Network): ChainSendCustodyMode {
  const protocol = resolveProtocol(network)
  if (network.id === 'ada') return 'non-custodial'
  if (network.id === 'xmr') {
    const enabled = /^(1|true|yes)$/i.test(String((import.meta as any)?.env?.VITE_ENABLE_XMR_NON_CUSTODIAL || 'false'))
    return enabled ? 'non-custodial' : 'unsupported'
  }
  if (network.coinType === 'EVM') return 'non-custodial'
  if (protocol === 'utxo-jsonrpc') return 'non-custodial'
  if (protocol === 'xrp-jsonrpc-compat') return 'unsupported'
  if (protocol === 'cardano-wallet-compat' || protocol === 'monero-wallet-compat') return 'custodial-server'
  return 'unsupported'
}

function resolveSyncStateFromChainInfo(chainInfo: any): { syncPercent: number | null; isSyncing: boolean } {
  let syncPercent: number | null = null
  let isSyncing = false
  const vpRaw = Number(chainInfo?.verificationprogress)
  const fallbackFromBlocks =
    Number(chainInfo?.headers) > 0
      ? (Number(chainInfo?.blocks) / Number(chainInfo?.headers))
      : NaN
  const progress01 = Number.isFinite(vpRaw) && vpRaw > 0 ? vpRaw : fallbackFromBlocks
  if (Number.isFinite(progress01) && progress01 >= 0) {
    syncPercent = Math.max(0, Math.min(100, progress01 * 100))
  }
  if (typeof chainInfo?.initialblockdownload === 'boolean') {
    isSyncing = chainInfo.initialblockdownload
  } else if (syncPercent !== null) {
    isSyncing = syncPercent < 99.9
  }
  return { syncPercent, isSyncing }
}

function parseCoinAmount(amount: string, decimals: number, symbol: string): number {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error(`Invalid ${symbol} amount`)
  const [whole, fraction = ''] = raw.split('.')
  if (fraction.length > decimals) throw new Error(`${symbol} supports up to ${decimals} decimals`)
  const numeric = Number(raw)
  if (!Number.isFinite(numeric) || numeric <= 0) throw new Error('Amount must be greater than 0')
  return Number(`${whole}.${fraction.padEnd(decimals, '0').slice(0, decimals)}`)
}

function deriveEvmWallet(mnemonic: string, accountIndex: number): ethers.HDNodeWallet {
  return ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/${accountIndex}'/0/0`)
}

function supportsAddressIndex(coinSymbol?: string): boolean {
  const symbol = String(coinSymbol || '').trim().toUpperCase()
  return symbol === 'RTM' || symbol === 'BTCZ' || symbol === 'TIDE' || symbol === 'FIRO'
}

function isClientSignerFormatError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    /offset is outside the bounds of the dataview/i.test(message)
    || /failed to parse unsigned legacy transaction/i.test(message)
    || /unsupported varint size/i.test(message)
    || /invalid typed array length/i.test(message)
    || /input count mismatch/i.test(message)
  )
}

export async function fetchChainBalanceAndSync(input: FetchChainBalanceInput): Promise<ChainBalanceSyncResult> {
  const protocol = resolveProtocol(input.network)
  const address = String(input.address || '').trim()
  if (!address) throw new Error('Address is required')

  if (input.network.coinType === 'EVM') {
    const provider = new ethers.JsonRpcProvider(input.network.rpcUrl, input.network.chainId)
    const bal = await provider.getBalance(address)
    return { balance: ethers.formatEther(bal), syncPercent: 100, isSyncing: false }
  }

  if (!input.rpcConfig) {
    throw new Error(`RPC config is required for ${input.network.symbol}`)
  }

  if (protocol === 'xrp-jsonrpc-compat') {
    let syncPercent: number | null = null
    let isSyncing = false
    try {
      const chainInfo = await getBlockchainInfo(input.rpcConfig)
      const parsed = resolveSyncStateFromChainInfo(chainInfo)
      syncPercent = parsed.syncPercent
      isSyncing = parsed.isSyncing
    } catch {
      // Keep default sync unknown when chain probe fails.
    }
    const balance = await getXrpAccountBalance(input.rpcConfig, address)
    return { balance: balance.balance, syncPercent, isSyncing }
  }

  let syncPercent: number | null = null
  let isSyncing = false
  if (!input.skipChainSyncProbe) {
    try {
      const chainInfo = await getBlockchainInfo(input.rpcConfig)
      const parsed = resolveSyncStateFromChainInfo(chainInfo)
      syncPercent = parsed.syncPercent
      isSyncing = parsed.isSyncing
    } catch {
      // Keep default sync unknown when chain probe fails.
    }
  }
  let balance = await getUtxoBalance(input.rpcConfig, address, {
    preferAddressIndex: input.preferAddressIndexBalance
  })
  if (balance.total <= 0 && input.zeroBalanceRecheckMs && input.zeroBalanceRecheckMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, input.zeroBalanceRecheckMs))
    try {
      const secondRead = await getUtxoBalance(input.rpcConfig, address, {
        preferAddressIndex: input.preferAddressIndexBalance
      })
      if (secondRead.total > balance.total) balance = secondRead
    } catch {
      // Preserve first read.
    }
  }
  return { balance: String(balance.total), syncPercent, isSyncing }
}

export async function validateChainAddress(network: Network, rpcConfig: UtxoRpcConfig | undefined, address: string): Promise<boolean> {
  const protocol = resolveProtocol(network)
  const value = String(address || '').trim()
  if (!value) return false
  if (network.coinType === 'EVM') return ethers.isAddress(value)
  if (protocol === 'xrp-jsonrpc-compat') {
    return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(value) || /^X[1-9A-HJ-NP-Za-km-z]{46,60}$/.test(value)
  }
  if (!rpcConfig) throw new Error(`RPC config is required for ${network.symbol}`)
  const result = await validateAddress(rpcConfig, value)
  return Boolean(result?.isvalid)
}

export async function sendChainTransaction(input: SendChainTransactionInput): Promise<{ hash: string }> {
  const protocol = resolveProtocol(input.network)
  const to = String(input.to || '').trim()
  if (!to) throw new Error('Destination address is required')
  if (protocol === 'xrp-jsonrpc-compat') {
    throw new Error('XRP send is disabled by strict non-custodial policy')
  }
  if (input.network.coinType === 'EVM') {
    const ctx = input.evm
    if (!ctx?.mnemonic) throw new Error('Wallet is locked')
    const provider = new ethers.JsonRpcProvider(input.network.rpcUrl, input.network.chainId)
    const wallet = deriveEvmWallet(ctx.mnemonic, ctx.accountIndex).connect(provider)
    const tx = await wallet.sendTransaction({ to, value: ethers.parseEther(String(input.amount)) })
    return { hash: tx.hash }
  }
  if (protocol === 'utxo-jsonrpc') {
    if (!input.utxoSend) throw new Error('UTXO sender is not configured')
    return input.utxoSend()
  }
  if (!input.rpcConfig) throw new Error(`RPC config is required for ${input.network.symbol}`)
  if (protocol === 'cardano-wallet-compat') {
    void parseCoinAmount(input.amount, 6, 'ADA')
    throw new Error('Cardano send is disabled by strict non-custodial policy')
  }
  if (protocol === 'monero-wallet-compat') {
    void parseCoinAmount(input.amount, 12, 'XMR')
    throw new Error('Monero send is disabled by strict non-custodial policy')
  }
  throw new Error(`Unsupported protocol: ${protocol}`)
}

export async function sendUtxoNonCustodialTransaction(input: SendUtxoNonCustodialInput): Promise<{ hash: string }> {
  const net = input.network
  const rpcConfig = input.rpcConfig
  if (net.coinType !== 'UTXO') throw new Error('Active network is not UTXO')
  if (!net.coinSymbol) throw new Error('Network missing coinSymbol')
  const senderAddress = String(input.senderAddress || '').trim()
  if (!senderAddress) throw new Error(`No address derived for ${net.name}`)
  const senderValid = await validateChainAddress(net, rpcConfig, senderAddress)
  if (!senderValid) {
    throw new Error(`Active sender address is invalid for ${net.symbol}: ${senderAddress}`)
  }

  let unspent: UtxoUnspent[] = []
  if (supportsAddressIndex(net.coinSymbol)) {
    try {
      const byIndex = await getAddressUtxos(rpcConfig, senderAddress, 1)
      if (byIndex.length > 0) unspent = byIndex
    } catch {
      // address index not available
    }
  }
  if (unspent.length === 0) {
    try {
      const byWallet = await listUtxoUnspent(rpcConfig, senderAddress, 1)
      if (byWallet.length > 0) unspent = byWallet
    } catch {
      // wallet doesn't hold address
    }
  }
  if (unspent.length === 0) {
    const scanned = await scanAddressUnspent(rpcConfig, senderAddress)
    if (scanned.length > 0) unspent = scanned
  }
  if (unspent.length > 0 && supportsAddressIndex(net.coinSymbol)) {
    try {
      const mempoolSpent = await getAddressMempoolSpentOutpoints(rpcConfig, senderAddress)
      if (mempoolSpent.size > 0) {
        unspent = unspent.filter((utxo) => !mempoolSpent.has(`${utxo.txid}:${utxo.vout}`))
      }
    } catch {
      // getaddressmempool may be unavailable
    }
  }
  if (unspent.length > 0) {
    const normalizedSender = senderAddress
    const before = unspent.length
    unspent = unspent.filter((utxo) => String(utxo.address || normalizedSender).trim() === normalizedSender)
    if (unspent.length !== before) {
      console.warn(`[${net.symbol}] filtered ${before - unspent.length} non-sender UTXOs before signing`)
    }
  }
  if (unspent.length === 0) {
    const balanceHint = await getUtxoBalance(rpcConfig, senderAddress, {
      preferAddressIndex: supportsAddressIndex(net.coinSymbol)
    }).catch(() => null)
    if (balanceHint && balanceHint.total > 0 && balanceHint.confirmed <= 0) {
      throw new Error(`Funds are present but not yet spendable (unconfirmed). Confirmed: ${balanceHint.confirmed}, total: ${balanceHint.total}`)
    }
    if (balanceHint && balanceHint.total > 0) {
      throw new Error('Detected pending unconfirmed spend from this address (mempool conflict). Wait for confirmation, then retry.')
    }
    throw new Error(`No confirmed spendable UTXOs found for address ${senderAddress}`)
  }

  const amountToSend = parseFloat(String(input.amount))
  const sat = (coins: number): number => Math.round(Number(coins) * 1e8)
  const coins8 = (sats: number): number => Number((sats / 1e8).toFixed(8))
  const donationAddress = String(input.donation?.address || '').trim()
  const donationAmountCoins = Number(input.donation?.amount ?? 0)
  const donationAmountSats = Number.isFinite(donationAmountCoins) && donationAmountCoins > 0 ? sat(donationAmountCoins) : 0
  if (input.donation?.required && donationAmountSats <= 0) {
    throw new Error('Donation is required by bridge policy')
  }
  if ((donationAmountSats > 0 || input.donation?.required) && !donationAddress) {
    throw new Error('Donation address is missing from bridge policy')
  }
  if (donationAmountSats > 0) {
    const donationValid = await validateChainAddress(net, rpcConfig, donationAddress)
    if (!donationValid) {
      throw new Error(`Donation address is invalid for ${net.symbol}: ${donationAddress}`)
    }
  }

  const rawFeePerByteCoins = net.feePerByte ?? estimateNetworkFee(net.id, 1) ?? 0.0000002
  let feePerByteSats = Math.max(1, sat(rawFeePerByteCoins))
  if (feePerByteSats > 500) feePerByteSats = Math.max(1, Math.round(feePerByteSats / 1000))
  const OVERHEAD_BYTES = 10
  const INPUT_BYTES = 148
  const OUTPUT_BYTES = 34
  const MAX_REASONABLE_FEE_SATS = 10_000_000
  const DUST_THRESHOLD_SATS = 1_000
  const amountToSendSats = sat(amountToSend)
  const outputsWithoutChange = 1 + (donationAmountSats > 0 ? 1 : 0)

  const sorted = [...unspent].sort((a, b) => b.amount - a.amount)
  const selectedUtxos: UtxoUnspent[] = []
  let accumulatedSats = 0
  for (const utxo of sorted) {
    selectedUtxos.push(utxo)
    accumulatedSats += sat(utxo.amount)
    const txBytesTry = OVERHEAD_BYTES + INPUT_BYTES * selectedUtxos.length + OUTPUT_BYTES * (outputsWithoutChange + 1)
    const estimatedFeeTry = txBytesTry * feePerByteSats
    if (accumulatedSats >= amountToSendSats + donationAmountSats + estimatedFeeTry) break
    if (selectedUtxos.length >= 25) break
  }

  const txBytes = OVERHEAD_BYTES + INPUT_BYTES * selectedUtxos.length + OUTPUT_BYTES * (outputsWithoutChange + 1)
  const estimatedFeeSats = txBytes * feePerByteSats
  const totalAvailableSats = selectedUtxos.reduce((sum, utxo) => sum + sat(utxo.amount), 0)
  if (estimatedFeeSats > MAX_REASONABLE_FEE_SATS) {
    throw new Error(`Estimated fee too high: ${coins8(estimatedFeeSats)} ${net.coinSymbol}. Check fee settings / UTXO fragmentation.`)
  }
  if (amountToSendSats + donationAmountSats + estimatedFeeSats > totalAvailableSats) {
    throw new Error(`Insufficient balance: need ${coins8(amountToSendSats + donationAmountSats + estimatedFeeSats).toFixed(8)}, have ${coins8(totalAvailableSats).toFixed(8)}`)
  }
  const changeAmountSats = totalAvailableSats - amountToSendSats - donationAmountSats - estimatedFeeSats

  const derived = await input.deriveSigningKey(senderAddress)
  const inputs = selectedUtxos.map((utxo) => ({ txid: utxo.txid, vout: utxo.vout }))
  const toAddress = String(input.to || '').trim()
  const outputsSats: Record<string, number> = {}
  const addOutputSats = (address: string, satsValue: number) => {
    if (!address || satsValue <= 0) return
    outputsSats[address] = (outputsSats[address] || 0) + satsValue
  }
  addOutputSats(toAddress, amountToSendSats)
  addOutputSats(donationAddress, donationAmountSats)
  if (changeAmountSats > DUST_THRESHOLD_SATS) {
    addOutputSats(senderAddress, changeAmountSats)
  }
  const outputs = Object.fromEntries(Object.entries(outputsSats).map(([address, satsValue]) => [address, coins8(satsValue)]))

  const coinSymbol = String(net.coinSymbol || '').trim().toUpperCase()
  const isSaplingTransparent = coinSymbol === 'BTCZ' || coinSymbol === 'ARRR'
  let saplingBranchId: number | undefined
  if (isSaplingTransparent) {
    try {
      const chainInfo = await getBlockchainInfo(rpcConfig)
      const branchRaw = String((chainInfo as any)?.consensus?.chaintip ?? (chainInfo as any)?.consensus?.nextblock ?? '').trim()
      if (/^[0-9a-fA-F]{8}$/.test(branchRaw)) {
        saplingBranchId = Number.parseInt(branchRaw, 16) >>> 0
      }
    } catch (err) {
      console.warn(`[${net.symbol}] could not resolve consensus branch id, using Sapling signer default`, err)
    }
  }

  const rawHex = await createRawTransaction(rpcConfig, inputs, outputs)
  const signingInputs: UnsignedTxInput[] = selectedUtxos.map((utxo) => ({
    txid: utxo.txid,
    vout: utxo.vout,
    scriptPubKeyHex: utxo.scriptPubKey,
    amountSats: sat(utxo.amount)
  }))
  let signedHex = ''
  try {
    signedHex = isSaplingTransparent
      ? await signBtczTransparentTransaction(rawHex, signingInputs, derived.privHex, { consensusBranchId: saplingBranchId })
      : await signLegacyP2pkhTransaction(rawHex, signingInputs, derived.privHex)
  } catch (signErr) {
    if (isSaplingTransparent && isClientSignerFormatError(signErr)) {
      throw new Error(`${net.symbol} client-side signing failed while parsing transaction format. Only transparent Overwinter/Sapling transactions are supported.`)
    }
    throw signErr
  }

  try {
    const txid = await sendRawTransaction(rpcConfig, signedHex)
    return { hash: txid }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/txn-mempool-conflict|\(code\s*18\)|code\s*18/i.test(message)) {
      throw new Error('Transaction conflicts with a pending mempool transaction from this wallet. Wait for at least 1 confirmation and try again.')
    }
    throw error
  }
}
