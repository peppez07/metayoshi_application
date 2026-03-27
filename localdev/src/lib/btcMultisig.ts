import * as btc from '@scure/btc-signer'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import type { Network } from '../coins'
import type { UtxoFeePreset, UtxoInputStrategy } from './coinFeatureModel'
import {
  getAddressMempoolSpentOutpoints,
  getAddressUtxos,
  getUtxoBalance,
  listUtxoUnspent,
  scanAddressUnspent,
  sendRawTransaction,
  type UtxoRpcConfig,
  type UtxoUnspent
} from './utxoRpc'

export interface ParsedBtcP2wshMultisig {
  address: string
  threshold: number
  scriptType: 'p2wsh'
  witnessScriptHex: string
  signers: Array<{ pubkey: string }>
}

export interface BtcMultisigSignerMaterial {
  accountId: string
  pubkeyHex: string
  privHex: string
  label?: string
}

export interface SendBtcP2wshMultisigInput {
  network: Network
  rpcConfig: UtxoRpcConfig
  senderAddress: string
  to: string
  amount: string
  threshold: number
  witnessScriptHex: string
  signerMaterials: BtcMultisigSignerMaterial[]
  donation?: {
    address: string
    amount: string
    required?: boolean
  }
  feePreset?: UtxoFeePreset
  inputStrategy?: UtxoInputStrategy
}

const DUST_THRESHOLD_SATS = 1_000
const MAX_REASONABLE_FEE_SATS = 10_000_000
const MAX_SELECTED_INPUTS = 25

function normalizeHex(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/^0x/i, '')
}

function parseSmallIntegerOpcode(opcode: number): number {
  if (opcode === 0x00) return 0
  if (opcode >= 0x51 && opcode <= 0x60) return opcode - 0x50
  throw new Error('Unsupported multisig small integer opcode')
}

function readPushData(script: Uint8Array, offset: number): { data: Uint8Array; nextOffset: number } {
  if (offset >= script.length) throw new Error('Unexpected end of witness script')
  const pushLength = script[offset]
  if (pushLength < 1 || pushLength > 75) {
    throw new Error('Only direct push witness scripts are supported for BTC multisig v1')
  }
  const start = offset + 1
  const end = start + pushLength
  if (end > script.length) throw new Error('Unexpected end of witness script push')
  return {
    data: script.slice(start, end),
    nextOffset: end
  }
}

export function parseBtcP2wshMultisig(witnessScriptHex: string, address?: string): ParsedBtcP2wshMultisig {
  const normalizedWitnessScriptHex = normalizeHex(witnessScriptHex)
  if (!normalizedWitnessScriptHex || normalizedWitnessScriptHex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(normalizedWitnessScriptHex)) {
    throw new Error('Witness script must be valid hex')
  }

  const witnessScriptBytes = hexToBytes(normalizedWitnessScriptHex)
  if (witnessScriptBytes.length < 1 || witnessScriptBytes[witnessScriptBytes.length - 1] !== 0xae) {
    throw new Error('Witness script must end with OP_CHECKMULTISIG')
  }

  const threshold = parseSmallIntegerOpcode(witnessScriptBytes[0])
  let offset = 1
  const pubkeys: string[] = []
  while (offset < witnessScriptBytes.length - 2) {
    const { data, nextOffset } = readPushData(witnessScriptBytes, offset)
    if (data.length !== 33 || (data[0] !== 0x02 && data[0] !== 0x03)) {
      throw new Error('Witness script contains a non-compressed public key')
    }
    pubkeys.push(bytesToHex(data))
    offset = nextOffset
  }

  if (pubkeys.length === 0) throw new Error('Witness script must contain at least one signer')
  const signerCount = parseSmallIntegerOpcode(witnessScriptBytes[offset])
  if (offset + 2 !== witnessScriptBytes.length) {
    throw new Error('Witness script contains unsupported trailing data')
  }
  if (signerCount !== pubkeys.length) {
    throw new Error('Witness script signer count does not match embedded public keys')
  }
  if (threshold < 1 || threshold > signerCount) {
    throw new Error('Witness script threshold is invalid')
  }

  const payment = btc.multisig(threshold, pubkeys.map((item) => hexToBytes(item)), false, true)
  const expectedWitnessScriptHex = bytesToHex(payment.witnessScript || new Uint8Array())
  if (normalizeHex(expectedWitnessScriptHex) !== normalizedWitnessScriptHex) {
    throw new Error('Witness script does not normalize to a supported p2wsh multisig script')
  }

  const resolvedAddress = String(payment.address || '').trim()
  if (!resolvedAddress) throw new Error('Failed to derive BTC multisig address from witness script')
  const normalizedAddress = String(address || '').trim()
  if (normalizedAddress && normalizedAddress !== resolvedAddress) {
    throw new Error(`BTC multisig address does not match witness script (${normalizedAddress} != ${resolvedAddress})`)
  }

  return {
    address: resolvedAddress,
    threshold,
    scriptType: 'p2wsh',
    witnessScriptHex: normalizedWitnessScriptHex,
    signers: pubkeys.map((pubkey) => ({ pubkey }))
  }
}

function supportsAddressIndex(coinSymbol: string): boolean {
  const symbol = String(coinSymbol || '').trim().toUpperCase()
  return symbol === 'BTC'
}

function sat(coins: number): number {
  return Math.round(Number(coins) * 1e8)
}

function parseCoins(value: string, label: string): number {
  const parsed = Number(String(value || '').trim())
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be greater than 0`)
  return parsed
}

function estimateP2wshInputVbytes(threshold: number, witnessScriptLength: number): number {
  const witnessItemBytes = 2 + threshold * 74 + witnessScriptLength + (witnessScriptLength < 0xfd ? 1 : 3)
  return 41 + Math.ceil(witnessItemBytes / 4)
}

function estimateOutputVbytes(address: string): number {
  return String(address || '').trim().toLowerCase().startsWith('bc1') ? 31 : 34
}

function buildSignedBtcTransaction(params: {
  recipientAddress: string
  recipientAmountSats: number
  donationAddress?: string
  donationAmountSats?: number
  changeAddress?: string
  changeAmountSats?: number
  selectedUtxos: UtxoUnspent[]
  witnessScriptHex: string
  threshold: number
  signerMaterials: BtcMultisigSignerMaterial[]
}): { hex: string; txid: string; vsize: number } {
  const parsed = parseBtcP2wshMultisig(params.witnessScriptHex)
  const payment = btc.multisig(parsed.threshold, parsed.signers.map((item) => hexToBytes(item.pubkey)), false, true)
  const tx = new btc.Transaction()

  for (const utxo of params.selectedUtxos) {
    tx.addInput({
      txid: String(utxo.txid || '').trim(),
      index: Number(utxo.vout),
      witnessUtxo: {
        amount: BigInt(sat(utxo.amount)),
        script: payment.script
      },
      witnessScript: hexToBytes(parsed.witnessScriptHex)
    })
  }

  tx.addOutputAddress(params.recipientAddress, BigInt(params.recipientAmountSats))
  if ((params.donationAmountSats || 0) > 0 && params.donationAddress) {
    tx.addOutputAddress(params.donationAddress, BigInt(params.donationAmountSats || 0))
  }
  if ((params.changeAmountSats || 0) > DUST_THRESHOLD_SATS && params.changeAddress) {
    tx.addOutputAddress(params.changeAddress, BigInt(params.changeAmountSats || 0))
  }

  for (const signer of params.signerMaterials) {
    tx.sign(hexToBytes(normalizeHex(signer.privHex)))
  }
  tx.finalize()

  return {
    hex: tx.hex,
    txid: tx.id,
    vsize: tx.vsize
  }
}

async function loadSpendableBtcUtxos(
  network: Network,
  rpcConfig: UtxoRpcConfig,
  senderAddress: string
): Promise<UtxoUnspent[]> {
  let unspent: UtxoUnspent[] = []
  if (supportsAddressIndex(String(network.coinSymbol || ''))) {
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
      // wallet does not hold address
    }
  }
  if (unspent.length === 0) {
    const scanned = await scanAddressUnspent(rpcConfig, senderAddress)
    if (scanned.length > 0) unspent = scanned
  }
  if (unspent.length > 0 && supportsAddressIndex(String(network.coinSymbol || ''))) {
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
    unspent = unspent.filter((utxo) => String(utxo.address || senderAddress).trim() === senderAddress)
  }
  if (unspent.length > 0) return unspent

  const balanceHint = await getUtxoBalance(rpcConfig, senderAddress, {
    preferAddressIndex: supportsAddressIndex(String(network.coinSymbol || '')),
    preferSendApiBase: true
  }).catch(() => null)
  if (balanceHint && balanceHint.total > 0 && balanceHint.confirmed <= 0) {
    throw new Error(`Funds are present but not yet spendable (unconfirmed). Confirmed: ${balanceHint.confirmed}, total: ${balanceHint.total}`)
  }
  if (balanceHint && balanceHint.total > 0) {
    throw new Error('Detected pending unconfirmed spend from this BTC multisig address. Wait for confirmation, then retry.')
  }
  throw new Error(`No confirmed spendable UTXOs found for address ${senderAddress}`)
}

export async function sendBtcP2wshMultisigTransaction(input: SendBtcP2wshMultisigInput): Promise<{ hash: string; signedTxHex: string }> {
  const network = input.network
  const senderAddress = String(input.senderAddress || '').trim()
  const recipientAddress = String(input.to || '').trim()
  if (!senderAddress) throw new Error('BTC multisig sender address is required')
  if (!recipientAddress) throw new Error('Destination address is required')

  const parsed = parseBtcP2wshMultisig(input.witnessScriptHex, senderAddress)
  const uniqueSignerMaterials = Array.from(
    new Map(
      input.signerMaterials.map((item) => [normalizeHex(item.pubkeyHex), item])
    ).values()
  ).filter((item) => parsed.signers.some((signer) => normalizeHex(signer.pubkey) === normalizeHex(item.pubkeyHex)))

  if (uniqueSignerMaterials.length < parsed.threshold) {
    throw new Error(`Not enough linked local BTC signers to satisfy this ${parsed.threshold}-of-${parsed.signers.length} wallet yet`)
  }

  const donationAddress = String(input.donation?.address || '').trim()
  const donationAmountCoins = input.donation?.amount ? parseCoins(input.donation.amount, 'Donation amount') : 0
  const donationAmountSats = donationAmountCoins > 0 ? sat(donationAmountCoins) : 0
  if (input.donation?.required && donationAmountSats <= 0) {
    throw new Error('Donation is required by bridge policy')
  }
  if ((donationAmountSats > 0 || input.donation?.required) && !donationAddress) {
    throw new Error('Donation address is missing from bridge policy')
  }

  const rawFeePerByteCoins = network.feePerByte ?? 0.00002
  let feePerByteSats = Math.max(1, sat(rawFeePerByteCoins))
  if (feePerByteSats > 500) feePerByteSats = Math.max(1, Math.round(feePerByteSats / 1000))
  const feePreset = String(input.feePreset || 'fast').trim().toLowerCase()
  if (feePreset === 'cheap') feePerByteSats = Math.max(1, Math.floor((feePerByteSats * 80) / 100))
  if (feePreset === 'premium') feePerByteSats = Math.max(1, Math.ceil((feePerByteSats * 145) / 100))

  const amountToSendSats = sat(parseCoins(input.amount, 'Amount'))
  const witnessScriptLength = hexToBytes(parsed.witnessScriptHex).length
  const approxInputVbytes = estimateP2wshInputVbytes(parsed.threshold, witnessScriptLength)
  const outputCountWithoutChange = 1 + (donationAmountSats > 0 ? 1 : 0)
  const approximateOutputVbytes = estimateOutputVbytes(recipientAddress)
    + (donationAmountSats > 0 ? estimateOutputVbytes(donationAddress) : 0)
    + estimateOutputVbytes(senderAddress)

  const unspent = await loadSpendableBtcUtxos(network, input.rpcConfig, senderAddress)
  const sorted = [...unspent].sort((a, b) => (
    String(input.inputStrategy || 'minimize-inputs').trim().toLowerCase() === 'consolidate-fragments'
      ? a.amount - b.amount
      : b.amount - a.amount
  ))

  const selectedUtxos: UtxoUnspent[] = []
  let accumulatedSats = 0
  for (const utxo of sorted) {
    selectedUtxos.push(utxo)
    accumulatedSats += sat(utxo.amount)
    const approximateFee = (11 + approximateOutputVbytes + approxInputVbytes * selectedUtxos.length) * feePerByteSats
    if (accumulatedSats >= amountToSendSats + donationAmountSats + approximateFee) break
    if (selectedUtxos.length >= MAX_SELECTED_INPUTS) break
  }

  if (selectedUtxos.length === 0) throw new Error('No UTXOs selected for BTC multisig send')
  const totalAvailableSats = selectedUtxos.reduce((sum, utxo) => sum + sat(utxo.amount), 0)

  let feeGuessSats = (11 + approximateOutputVbytes + approxInputVbytes * selectedUtxos.length) * feePerByteSats
  if (feeGuessSats > MAX_REASONABLE_FEE_SATS) {
    throw new Error(`Estimated fee too high: ${(feeGuessSats / 1e8).toFixed(8)} BTC. Check fee settings or UTXO fragmentation.`)
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const changeAmountSats = totalAvailableSats - amountToSendSats - donationAmountSats - feeGuessSats
    if (changeAmountSats < 0) break
    const built = buildSignedBtcTransaction({
      recipientAddress,
      recipientAmountSats: amountToSendSats,
      donationAddress,
      donationAmountSats,
      changeAddress: senderAddress,
      changeAmountSats,
      selectedUtxos,
      witnessScriptHex: parsed.witnessScriptHex,
      threshold: parsed.threshold,
      signerMaterials: uniqueSignerMaterials
    })
    const exactFeeSats = built.vsize * feePerByteSats
    if (exactFeeSats > MAX_REASONABLE_FEE_SATS) {
      throw new Error(`Estimated fee too high: ${(exactFeeSats / 1e8).toFixed(8)} BTC. Check fee settings or UTXO fragmentation.`)
    }
    if (exactFeeSats === feeGuessSats) {
      const txid = await sendRawTransaction(input.rpcConfig, built.hex)
      return { hash: txid, signedTxHex: built.hex }
    }
    feeGuessSats = exactFeeSats
  }

  throw new Error(`Insufficient balance: need ${((amountToSendSats + donationAmountSats + feeGuessSats) / 1e8).toFixed(8)}, have ${(totalAvailableSats / 1e8).toFixed(8)}`)
}
