import type { Network } from '../coins'
import type { UtxoFeePreset, UtxoInputStrategy } from './coinFeatureModel'
import { redeemScriptToP2shScriptPubKeyHex } from './utxoAddress'
import {
  assertRtmMultisigSigningInputsMatchRedeemScript,
  parseRtmP2shMultisig,
  type ParsedRtmP2shMultisig
} from './rtmMultisigCore'
import {
  createRawTransaction,
  getAddressUtxos,
  listUtxoUnspent,
  prepareRtmAssetNonCustodialTransaction,
  scanAddressUnspent,
  sendRawTransaction,
  type UtxoRpcConfig,
  type UtxoUnspent
} from './utxoRpc'
import { signLegacyP2shMultisigTransaction } from './utxoSign'
export {
  assertRtmMultisigSigningInputsMatchRedeemScript,
  parseRtmP2shMultisig,
  type ParsedRtmP2shMultisig
} from './rtmMultisigCore'

export interface RtmMultisigSignerMaterial {
  accountId: string
  pubkeyHex: string
  privHex: string
  label?: string
}

export interface SendRtmP2shMultisigInput {
  network: Network
  rpcConfig: UtxoRpcConfig
  senderAddress: string
  to: string
  amount: string
  redeemScriptHex: string
  signerMaterials: RtmMultisigSignerMaterial[]
  donation?: {
    address: string
    amount: string
    required?: boolean
  }
  feePreset?: UtxoFeePreset
  inputStrategy?: UtxoInputStrategy
}

export interface SendRtmP2shMultisigAssetInput {
  rpcConfig: UtxoRpcConfig
  senderAddress: string
  assetId: string
  qty: string
  toAddress: string
  redeemScriptHex: string
  signerMaterials: RtmMultisigSignerMaterial[]
  changeAddress?: string
  assetChangeAddress?: string
  feePerByteSats?: number
}

const DUST_THRESHOLD_SATS = 1_000
const MAX_REASONABLE_FEE_SATS = 10_000_000

function normalizeHex(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/^0x/i, '')
}

function sat(coins: number): number {
  return Math.round(Number(coins) * 1e8)
}

function coins8(sats: number): number {
  return Number((sats / 1e8).toFixed(8))
}

function parseCoins(value: string, label: string): number {
  const parsed = Number(String(value || '').trim())
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be greater than 0`)
  return parsed
}

async function loadSpendableRtmUtxos(rpcConfig: UtxoRpcConfig, senderAddress: string, redeemScriptHex: string): Promise<UtxoUnspent[]> {
  let unspent: UtxoUnspent[] = []
  try {
    const byIndex = await getAddressUtxos(rpcConfig, senderAddress, 1)
    if (byIndex.length > 0) unspent = byIndex
  } catch {
    // continue fallback chain
  }
  if (unspent.length === 0) {
    try {
      const byWallet = await listUtxoUnspent(rpcConfig, senderAddress, 1)
      if (byWallet.length > 0) unspent = byWallet
    } catch {
      // continue fallback chain
    }
  }
  if (unspent.length === 0) {
    unspent = await scanAddressUnspent(rpcConfig, senderAddress)
  }
  const expectedScriptPubKeyHex = redeemScriptToP2shScriptPubKeyHex(redeemScriptHex)
  const spendable = unspent.filter((utxo) => (
    String(utxo.address || senderAddress).trim() === senderAddress
    && normalizeHex(String(utxo.scriptPubKey || '')) === expectedScriptPubKeyHex
    && Number(utxo.confirmations || 0) >= 1
  ))
  if (spendable.length === 0) {
    throw new Error(`No confirmed spendable RTM multisig UTXOs found for address ${senderAddress}`)
  }
  return spendable
}

function resolveSignerMaterials(parsed: ParsedRtmP2shMultisig, signerMaterials: RtmMultisigSignerMaterial[]): RtmMultisigSignerMaterial[] {
  return Array.from(
    new Map(
      signerMaterials.map((item) => [normalizeHex(item.pubkeyHex), item])
    ).values()
  ).filter((item) => parsed.signers.some((signer) => normalizeHex(signer.pubkey) === normalizeHex(item.pubkeyHex)))
}

export async function sendRtmP2shMultisigTransaction(input: SendRtmP2shMultisigInput): Promise<{ hash: string; signedTxHex: string }> {
  const senderAddress = String(input.senderAddress || '').trim()
  const recipientAddress = String(input.to || '').trim()
  if (!senderAddress) throw new Error('RTM multisig sender address is required')
  if (!recipientAddress) throw new Error('Destination address is required')

  const parsed = parseRtmP2shMultisig(input.redeemScriptHex, senderAddress)
  const signerMaterials = resolveSignerMaterials(parsed, input.signerMaterials)
  if (signerMaterials.length < parsed.threshold) {
    throw new Error(`Not enough linked local RTM signers to satisfy this ${parsed.threshold}-of-${parsed.signers.length} wallet yet`)
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

  const rawFeePerByteCoins = input.network.feePerByte ?? 0.00002
  let feePerByteSats = Math.max(1, sat(rawFeePerByteCoins))
  if (feePerByteSats > 500) feePerByteSats = Math.max(1, Math.round(feePerByteSats / 1000))
  const feePreset = String(input.feePreset || 'fast').trim().toLowerCase()
  if (feePreset === 'cheap') feePerByteSats = Math.max(1, Math.floor((feePerByteSats * 80) / 100))
  if (feePreset === 'premium') feePerByteSats = Math.max(1, Math.ceil((feePerByteSats * 145) / 100))

  const amountToSendSats = sat(parseCoins(input.amount, 'Amount'))
  const unspent = await loadSpendableRtmUtxos(input.rpcConfig, senderAddress, parsed.redeemScriptHex)
  const inputStrategy = String(input.inputStrategy || 'minimize-inputs').trim().toLowerCase()
  const sorted = [...unspent].sort((a, b) => (
    inputStrategy === 'consolidate-fragments'
      ? a.amount - b.amount
      : b.amount - a.amount
  ))

  const selectedUtxos: UtxoUnspent[] = []
  let accumulatedSats = 0
  for (const utxo of sorted) {
    selectedUtxos.push(utxo)
    accumulatedSats += sat(utxo.amount)
    const estimatedFeeTry = (10 + (148 * selectedUtxos.length) + (34 * 3)) * feePerByteSats
    if (accumulatedSats >= amountToSendSats + donationAmountSats + estimatedFeeTry) break
    if (selectedUtxos.length >= 25) break
  }

  if (selectedUtxos.length === 0) throw new Error('No UTXOs selected for RTM multisig send')
  const totalAvailableSats = selectedUtxos.reduce((sum, utxo) => sum + sat(utxo.amount), 0)
  const estimatedFeeSats = (10 + (148 * selectedUtxos.length) + (34 * 3)) * feePerByteSats
  if (estimatedFeeSats > MAX_REASONABLE_FEE_SATS) {
    throw new Error(`Estimated fee too high: ${(estimatedFeeSats / 1e8).toFixed(8)} RTM. Check fee settings or UTXO fragmentation.`)
  }
  if (amountToSendSats + donationAmountSats + estimatedFeeSats > totalAvailableSats) {
    throw new Error(`Insufficient balance: need ${coins8(amountToSendSats + donationAmountSats + estimatedFeeSats).toFixed(8)}, have ${coins8(totalAvailableSats).toFixed(8)}`)
  }

  const changeAmountSats = totalAvailableSats - amountToSendSats - donationAmountSats - estimatedFeeSats
  const outputsSats: Record<string, number> = {}
  const addOutput = (address: string, satsValue: number) => {
    if (!address || satsValue <= 0) return
    outputsSats[address] = (outputsSats[address] || 0) + satsValue
  }
  addOutput(recipientAddress, amountToSendSats)
  addOutput(donationAddress, donationAmountSats)
  if (changeAmountSats > DUST_THRESHOLD_SATS) {
    addOutput(senderAddress, changeAmountSats)
  }
  const outputs = Object.fromEntries(Object.entries(outputsSats).map(([address, satsValue]) => [address, coins8(satsValue)]))
  const rawHex = await createRawTransaction(
    input.rpcConfig,
    selectedUtxos.map((utxo) => ({ txid: utxo.txid, vout: utxo.vout })),
    outputs
  )
  const signingInputs = selectedUtxos.map((utxo) => ({
    txid: utxo.txid,
    vout: utxo.vout,
    scriptPubKeyHex: utxo.scriptPubKey,
    amountSats: sat(utxo.amount)
  }))
  const signedHex = await signLegacyP2shMultisigTransaction(
    rawHex,
    signingInputs,
    parsed.redeemScriptHex,
    signerMaterials.map((item) => item.privHex)
  )
  const txid = await sendRawTransaction(input.rpcConfig, signedHex)
  return { hash: txid, signedTxHex: signedHex }
}

export async function sendRtmP2shMultisigAssetTransaction(input: SendRtmP2shMultisigAssetInput): Promise<{ hash: string; signedTxHex: string }> {
  const senderAddress = String(input.senderAddress || '').trim()
  if (!senderAddress) throw new Error('RTM multisig sender address is required')
  const parsed = parseRtmP2shMultisig(input.redeemScriptHex, senderAddress)
  const signerMaterials = resolveSignerMaterials(parsed, input.signerMaterials)
  if (signerMaterials.length < parsed.threshold) {
    throw new Error(`Not enough linked local RTM signers to satisfy this ${parsed.threshold}-of-${parsed.signers.length} wallet yet`)
  }
  const prepared = await prepareRtmAssetNonCustodialTransaction(input.rpcConfig, {
    fromAddress: senderAddress,
    assetId: input.assetId,
    qty: input.qty,
    toAddress: input.toAddress,
    changeAddress: input.changeAddress,
    assetChangeAddress: input.assetChangeAddress,
    feePerByteSats: input.feePerByteSats
  })
  assertRtmMultisigSigningInputsMatchRedeemScript(prepared.signingInputs, parsed.redeemScriptHex)
  const signedHex = await signLegacyP2shMultisigTransaction(
    prepared.rawHex,
    prepared.signingInputs,
    parsed.redeemScriptHex,
    signerMaterials.map((item) => item.privHex)
  )
  const txid = await sendRawTransaction(input.rpcConfig, signedHex)
  return { hash: txid, signedTxHex: signedHex }
}
