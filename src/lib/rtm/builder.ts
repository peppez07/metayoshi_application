import { addressToScript, COIN, decodeAddress } from './address'
import { buildAssetTransferScript } from './assetScript'
import { estimateTxBytes, signTransaction, type SpendInput, type TxOutput } from './transaction'
import { RTM_NETWORK, type NetworkParams } from '../networks'

/** Change below this is added to the fee instead of creating an output. */
export const DUST_SATS = 1000n
/** Refuse fees above this as a guard against fee-rate or fragmentation mistakes. */
export const MAX_FEE_SATS = 10_000_000n
const MAX_INPUTS = 200

export interface CoinUtxo {
  txid: string
  vout: number
  value: bigint
  height: number
}

export interface AssetUtxo {
  txid: string
  vout: number
  assetId: string
  amount: bigint
  height: number
  uniqueId: bigint | null
  script: Uint8Array
  spendable: boolean
}

export interface BuiltTransaction {
  hex: string
  txid: string
  size: number
  fee: bigint
  sent: bigint
  change: bigint
}

interface Selection {
  spends: SpendInput[]
  fee: bigint
  change: bigint
}

/** How one coin sizes, prices and signs a transaction of P2PKH inputs. */
export interface SendChain {
  network: NetworkParams
  estimateBytes: (inputCount: number, outputScripts: Uint8Array[]) => number
  sign: (outputs: TxOutput[], spends: SpendInput[], privateKey: Uint8Array) => { hex: string; txid: string; size: number }
  /** Fee floor per transaction, whatever the fee rate. */
  minFee: bigint
  maxFee: bigint
  /** Change below this goes to the fee; recipients must receive more. */
  dust: bigint
}

export const RTM_SEND_CHAIN: SendChain = {
  network: RTM_NETWORK,
  estimateBytes: estimateTxBytes,
  sign: signTransaction,
  minFee: 0n,
  maxFee: MAX_FEE_SATS,
  dust: DUST_SATS
}

function confirmedCoins(utxos: CoinUtxo[]): CoinUtxo[] {
  return utxos.filter((u) => u.height > 0 && u.value > 0n).sort((a, b) => (b.value > a.value ? 1 : b.value < a.value ? -1 : 0))
}

function feeFor(inputCount: number, scripts: Uint8Array[], feePerByte: bigint, chain: SendChain): bigint {
  const fee = BigInt(chain.estimateBytes(inputCount, scripts)) * feePerByte
  return fee > chain.minFee ? fee : chain.minFee
}

/**
 * Adds coin inputs until `target` plus fee is covered. `fixedSpends` are inputs
 * that must be included (asset inputs, which carry zero RTM).
 */
function selectCoins(params: {
  coins: CoinUtxo[]
  senderScript: Uint8Array
  fixedSpends: SpendInput[]
  outputScripts: Uint8Array[]
  target: bigint
  feePerByte: bigint
  chain: SendChain
}): Selection {
  const { senderScript, fixedSpends, outputScripts, target, feePerByte, chain } = params
  const spends = [...fixedSpends]
  let total = fixedSpends.reduce((n, s) => n + s.value, 0n)
  const withChange = [...outputScripts, senderScript]
  for (const coin of confirmedCoins(params.coins)) {
    const noChangeFee = feeFor(spends.length, outputScripts, feePerByte, chain)
    if (spends.length > fixedSpends.length || target === 0n) {
      const changeFee = feeFor(spends.length, withChange, feePerByte, chain)
      if (total >= target + changeFee + chain.dust) return { spends, fee: changeFee, change: total - target - changeFee }
      if (total >= target + noChangeFee) return { spends, fee: total - target, change: 0n }
    }
    if (spends.length >= MAX_INPUTS) break
    spends.push({ txid: coin.txid, vout: coin.vout, prevScript: senderScript, value: coin.value })
    total += coin.value
  }
  const changeFee = feeFor(spends.length, withChange, feePerByte, chain)
  if (spends.length > 0 && total >= target + changeFee + chain.dust) {
    return { spends, fee: changeFee, change: total - target - changeFee }
  }
  const noChangeFee = feeFor(spends.length, outputScripts, feePerByte, chain)
  if (spends.length > 0 && total >= target + noChangeFee) return { spends, fee: total - target, change: 0n }
  const available = confirmedCoins(params.coins).reduce((n, c) => n + c.value, 0n)
  const symbol = chain.network.symbol
  throw new Error(
    `Insufficient confirmed ${symbol}: need ${formatSats(target + noChangeFee)} ${symbol} including fee, ` +
    `have ${formatSats(available)} ${symbol}`
  )
}

function formatSats(value: bigint): string {
  const whole = value / COIN
  const fraction = (value % COIN).toString().padStart(8, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

function checkFee(fee: bigint, chain: SendChain): void {
  if (fee > chain.maxFee) throw new Error(`Estimated fee too high: ${formatSats(fee)} ${chain.network.symbol}`)
}

function finish(outputs: TxOutput[], selection: Selection, sent: bigint, privateKey: Uint8Array, chain: SendChain): BuiltTransaction {
  checkFee(selection.fee, chain)
  const signed = chain.sign(outputs, selection.spends, privateKey)
  return { ...signed, fee: selection.fee, sent, change: selection.change }
}

export function buildNativeSend(params: {
  senderAddress: string
  privateKey: Uint8Array
  coins: CoinUtxo[]
  outputs: Array<{ address: string; value: bigint }>
  feePerByte: bigint
  /** Send everything minus the fee to the single recipient. */
  sendMax?: boolean
  /** Coin rules; Raptoreum by default. */
  chain?: SendChain
}): BuiltTransaction {
  const chain = params.chain ?? RTM_SEND_CHAIN
  const network = chain.network
  const senderScript = addressToScript(params.senderAddress, network)
  if (params.outputs.length === 0) throw new Error('No recipients')
  const recipients = params.outputs.map((o) => {
    if (!decodeAddress(o.address, network)) throw new Error(`Invalid ${network.symbol} address: ${o.address}`)
    return { value: o.value, script: addressToScript(o.address, network) }
  })

  if (params.sendMax) {
    if (recipients.length !== 1) throw new Error('Send max requires exactly one recipient')
    const coins = confirmedCoins(params.coins).slice(0, MAX_INPUTS)
    const total = coins.reduce((n, c) => n + c.value, 0n)
    const fee = feeFor(coins.length, [recipients[0].script], params.feePerByte, chain)
    if (coins.length === 0 || total <= fee + chain.dust) throw new Error('Balance is too small to cover the network fee')
    const value = total - fee
    const spends = coins.map((c) => ({ txid: c.txid, vout: c.vout, prevScript: senderScript, value: c.value }))
    return finish([{ value, script: recipients[0].script }], { spends, fee, change: 0n }, value, params.privateKey, chain)
  }

  const target = recipients.reduce((n, o) => n + o.value, 0n)
  for (const r of recipients) if (r.value <= chain.dust) throw new Error('Amount is below the dust threshold')
  const selection = selectCoins({
    coins: params.coins,
    senderScript,
    fixedSpends: [],
    outputScripts: recipients.map((r) => r.script),
    target,
    feePerByte: params.feePerByte,
    chain
  })
  const outputs: TxOutput[] = [...recipients]
  if (selection.change > 0n) outputs.push({ value: selection.change, script: senderScript })
  return finish(outputs, selection, target, params.privateKey, chain)
}

interface AssetPlan {
  spends: SpendInput[]
  outputs: TxOutput[]
}

function planFungible(utxos: AssetUtxo[], amount: bigint, recipientScript: Uint8Array, senderScript: Uint8Array, assetId: string): AssetPlan {
  const sorted = [...utxos].sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0))
  const spends: SpendInput[] = []
  let total = 0n
  for (const utxo of sorted) {
    if (total >= amount) break
    spends.push({ txid: utxo.txid, vout: utxo.vout, prevScript: utxo.script, value: 0n })
    total += utxo.amount
  }
  if (total < amount) throw new Error('Insufficient confirmed spendable asset balance')
  const outputs: TxOutput[] = [{ value: 0n, script: buildAssetTransferScript(recipientScript, { assetId, amount, uniqueId: null }) }]
  if (total > amount) {
    outputs.push({ value: 0n, script: buildAssetTransferScript(senderScript, { assetId, amount: total - amount, uniqueId: null }) })
  }
  return { spends, outputs }
}

/**
 * Unique assets hold token ranges [uniqueId, uniqueId + amount/COIN). The
 * lowest IDs are sent; the rest of a partially used range returns as change.
 */
function planUnique(utxos: AssetUtxo[], amount: bigint, recipientScript: Uint8Array, senderScript: Uint8Array, assetId: string): AssetPlan {
  if (amount % COIN !== 0n) throw new Error('Unique assets can only be sent in whole tokens')
  let remaining = amount / COIN
  const sorted = [...utxos].sort((a, b) => ((a.uniqueId ?? 0n) < (b.uniqueId ?? 0n) ? -1 : 1))
  const spends: SpendInput[] = []
  const sendOutputs: TxOutput[] = []
  const changeOutputs: TxOutput[] = []
  for (const utxo of sorted) {
    if (remaining === 0n) break
    if (utxo.uniqueId === null) continue
    const count = utxo.amount / COIN
    const take = count < remaining ? count : remaining
    spends.push({ txid: utxo.txid, vout: utxo.vout, prevScript: utxo.script, value: 0n })
    sendOutputs.push({ value: 0n, script: buildAssetTransferScript(recipientScript, { assetId, amount: take * COIN, uniqueId: utxo.uniqueId }) })
    if (take < count) {
      changeOutputs.push({
        value: 0n,
        script: buildAssetTransferScript(senderScript, { assetId, amount: (count - take) * COIN, uniqueId: utxo.uniqueId + take })
      })
    }
    remaining -= take
  }
  if (remaining > 0n) throw new Error('Insufficient confirmed spendable unique tokens')
  return { spends, outputs: [...sendOutputs, ...changeOutputs] }
}

export function buildAssetSend(params: {
  senderAddress: string
  privateKey: Uint8Array
  toAddress: string
  assetId: string
  isUnique: boolean
  amount: bigint
  assetUtxos: AssetUtxo[]
  coins: CoinUtxo[]
  feePerByte: bigint
}): BuiltTransaction {
  const destination = decodeAddress(params.toAddress)
  if (!destination) throw new Error(`Invalid RTM address: ${params.toAddress}`)
  if (destination.kind !== 'p2pkh') throw new Error('Assets can only be sent to standard R... addresses')
  if (params.amount <= 0n) throw new Error('Asset amount must be greater than zero')
  const senderScript = addressToScript(params.senderAddress)
  const recipientScript = addressToScript(params.toAddress)
  const usable = params.assetUtxos.filter((u) => u.assetId === params.assetId && u.spendable && u.height > 0)
  const plan = params.isUnique
    ? planUnique(usable, params.amount, recipientScript, senderScript, params.assetId)
    : planFungible(usable, params.amount, recipientScript, senderScript, params.assetId)
  const selection = selectCoins({
    coins: params.coins,
    senderScript,
    fixedSpends: plan.spends,
    outputScripts: plan.outputs.map((o) => o.script),
    target: 0n,
    feePerByte: params.feePerByte,
    chain: RTM_SEND_CHAIN
  })
  const outputs = [...plan.outputs]
  if (selection.change > 0n) outputs.push({ value: selection.change, script: senderScript })
  return finish(outputs, selection, params.amount, params.privateKey, RTM_SEND_CHAIN)
}
