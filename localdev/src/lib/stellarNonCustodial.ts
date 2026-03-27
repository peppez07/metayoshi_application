import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { Buffer } from 'buffer'
import { Asset, Horizon, Keypair, Operation, StrKey, Transaction, TransactionBuilder, Account } from '@stellar/stellar-sdk'
import * as bip39 from 'bip39'
import { derivePath } from 'ed25519-hd-key'
import {
  createStellarBridgeClient,
  resolveStellarNetworkChain,
  resolveStellarNetworkPassphrase
} from './stellarBridgeClient'

export function validateStellarAddress(rawAddress: string): string {
  const address = String(rawAddress || '').trim()
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new Error('Invalid Stellar address')
  }
  return address
}

export function normalizeStellarAmount(rawAmount: string, decimals = 7): string {
  const amount = String(rawAmount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error('Invalid Stellar amount')
  const [whole, fraction = ''] = amount.split('.')
  const precision = Number.isInteger(decimals) && decimals >= 0 && decimals <= 18 ? Math.trunc(decimals) : 7
  if (fraction.length > precision) {
    throw new Error(`Stellar amount supports up to ${precision} decimals`)
  }
  const normalized = `${whole}.${fraction.padEnd(precision, '0')}`
  const compact = normalized.replace(/\.?0+$/, '')
  if (!compact || compact === '0') throw new Error('Amount must be greater than 0')
  return compact
}

function normalizeHex(value: string, label: string): string {
  const hex = String(value || '').trim().replace(/^0x/i, '').toLowerCase()
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length === 0 || hex.length % 2 !== 0) {
    throw new Error(`Invalid ${label}`)
  }
  return hex
}

function normalizeStellarNetworkPassphrase(networkPassphrase?: string, chain?: ReturnType<typeof resolveStellarNetworkChain>): string {
  const explicit = String(networkPassphrase || '').trim()
  if (explicit) return explicit
  return resolveStellarNetworkPassphrase(chain)
}

function buildStellarAsset(assetCode?: string, assetIssuer?: string): Asset {
  const code = String(assetCode || '').trim()
  const issuer = String(assetIssuer || '').trim()
  if (!code) return Asset.native()
  if (!issuer) throw new Error('Stellar asset issuer is required')
  if (!/^[a-zA-Z0-9]{1,12}$/.test(code)) throw new Error('Invalid Stellar asset code')
  return new Asset(code, validateStellarAddress(issuer))
}

export async function deriveStellarAddress(
  mnemonic: string,
  accountIndex = 0
): Promise<{ address: string; pubHex: string; privHex: string }> {
  const normalized = String(mnemonic || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!bip39.validateMnemonic(normalized)) throw new Error('Invalid mnemonic phrase')
  const seed = await bip39.mnemonicToSeed(normalized)
  const path = `m/44'/148'/${accountIndex}'`
  const { key } = derivePath(path, seed.toString('hex'))
  const secretSeed = Buffer.from(key.slice(0, 32))
  const pair = Keypair.fromRawEd25519Seed(secretSeed)
  return {
    address: pair.publicKey(),
    pubHex: Buffer.from(pair.rawPublicKey()).toString('hex'),
    privHex: Buffer.from(secretSeed).toString('hex')
  }
}

export function buildStellarPaymentTransaction(params: {
  fromAddress: string
  toAddress: string
  amount: string
  sequence: string | number
  feeStroops: string | number
  networkPassphrase?: string
  assetCode?: string
  assetIssuer?: string
  amountDecimals?: number
}): Transaction {
  const fromAddress = validateStellarAddress(params.fromAddress)
  const toAddress = validateStellarAddress(params.toAddress)
  const sequence = String(params.sequence || '').trim()
  const feeStroops = String(params.feeStroops || '').trim()
  if (!/^\d+$/.test(sequence)) throw new Error('Invalid Stellar sequence number')
  if (!/^\d+$/.test(feeStroops) || BigInt(feeStroops) <= 0n) throw new Error('Invalid Stellar fee')

  const amount = normalizeStellarAmount(params.amount, params.amountDecimals ?? 7)
  const asset = buildStellarAsset(params.assetCode, params.assetIssuer)
  const sourceAccount = new Account(fromAddress, sequence)
  const networkPassphrase = normalizeStellarNetworkPassphrase(params.networkPassphrase)

  const builder = new TransactionBuilder(sourceAccount, {
    fee: feeStroops,
    networkPassphrase
  })

  builder.addOperation(Operation.payment({
    destination: toAddress,
    asset,
    amount
  }))

  return builder.setTimeout(180).build()
}

export function signStellarTransaction(transaction: Transaction, privateKeyHex: string, expectedPublicKey?: string): {
  signedXdr: string
  hash: string
  publicKey: string
} {
  const secretSeed = Buffer.from(hexToBytes(normalizeHex(privateKeyHex, 'Stellar private key')))
  const pair = Keypair.fromRawEd25519Seed(secretSeed)
  const publicKey = pair.publicKey()
  if (expectedPublicKey && publicKey !== expectedPublicKey) {
    throw new Error(`Derived Stellar signer does not match active address (${publicKey} != ${expectedPublicKey})`)
  }
  transaction.sign(pair)
  return {
    signedXdr: transaction.toXDR(),
    hash: bytesToHex(transaction.hash()),
    publicKey
  }
}

async function submitViaHorizon(params: {
  rpcUrl: string
  transaction: Transaction
  privateKeyHex: string
  expectedPublicKey?: string
}): Promise<{ hash: string }> {
  const rpcUrl = String(params.rpcUrl || '').trim()
  if (!rpcUrl) throw new Error('Horizon RPC URL is required for Stellar fallback submission')

  const secretSeed = Buffer.from(hexToBytes(normalizeHex(params.privateKeyHex, 'Stellar private key')))
  const pair = Keypair.fromRawEd25519Seed(secretSeed)
  if (params.expectedPublicKey && pair.publicKey() !== params.expectedPublicKey) {
    throw new Error(`Derived Stellar signer does not match active address (${pair.publicKey()} != ${params.expectedPublicKey})`)
  }

  const server = new Horizon.Server(rpcUrl)
  const submitted = await server.submitTransaction(params.transaction)
  const hash = String((submitted as any)?.hash || params.transaction.hash() && bytesToHex(params.transaction.hash()) || '').trim()
  if (!hash) throw new Error('Horizon submit succeeded but tx hash is missing')
  return { hash }
}

export async function getStellarBalance(rpcUrl: string, address: string): Promise<string> {
  const normalizedAddress = validateStellarAddress(address)
  const client = createStellarBridgeClient()
  try {
    return await client.getNativeBalance(normalizedAddress)
  } catch {
    // Fall back to Horizon only if a direct URL was explicitly configured.
  }

  const url = String(rpcUrl || '').trim()
  if (!url) return '0'

  const server = new Horizon.Server(url)
  try {
    const account = await server.loadAccount(normalizedAddress)
    const native = account.balances.find((b: any) => b.asset_type === 'native')
    const amount = String((native as any)?.balance ?? '0').trim()
    return amount || '0'
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/not found|resource missing/i.test(message)) return '0'
    throw error
  }
}

export async function sendStellarNonCustodial(params: {
  rpcUrl: string
  fromAddress: string
  toAddress: string
  amountXlm: string
  privateKeyHex: string
  assetCode?: string
  assetIssuer?: string
  bridgeUrl?: string
  bridgeUsername?: string
  bridgePassword?: string
  apiBaseUrl?: string
  networkPassphrase?: string
}): Promise<{ hash: string }> {
  const fromAddress = validateStellarAddress(params.fromAddress)
  const toAddress = validateStellarAddress(params.toAddress)
  const isAssetTransfer = Boolean(String(params.assetCode || '').trim())
  const amountDecimals = isAssetTransfer ? 7 : 7
  const amount = normalizeStellarAmount(params.amountXlm, amountDecimals)
  const chain = resolveStellarNetworkChain()
  const networkPassphrase = normalizeStellarNetworkPassphrase(params.networkPassphrase, chain)

  const bridgeClient = createStellarBridgeClient({
    apiBaseUrl: params.apiBaseUrl,
    bridgeUrl: params.bridgeUrl,
    bridgeUsername: params.bridgeUsername,
    bridgePassword: params.bridgePassword,
    network: chain
  })

  try {
    const account = await bridgeClient.getAccount(fromAddress)
    if (!account.sequence) throw new Error('Stellar bridge returned no account sequence')
    const feeStats = await bridgeClient.getFeeStats()
    const transaction = buildStellarPaymentTransaction({
      fromAddress,
      toAddress,
      amount,
      sequence: account.sequence,
      feeStroops: String(feeStats.baseFeeStroops || 100),
      networkPassphrase,
      assetCode: params.assetCode,
      assetIssuer: params.assetIssuer,
      amountDecimals
    })
    const signed = signStellarTransaction(transaction, params.privateKeyHex, fromAddress)
    const submitted = await bridgeClient.submitSignedXdr(signed.signedXdr, {
      kind: isAssetTransfer ? 'asset' : 'native',
      fromAddress,
      toAddress,
      amount,
      assetCode: params.assetCode,
      assetIssuer: params.assetIssuer
    })
    const hash = String(submitted.hash || signed.hash || '').trim()
    if (!hash) throw new Error('Stellar bridge submit succeeded but tx hash is missing')
    return { hash }
  } catch (bridgeError) {
    if (!String(params.rpcUrl || '').trim()) throw bridgeError

    const server = new Horizon.Server(params.rpcUrl)
    const sourceAccount = await server.loadAccount(fromAddress)
    const baseFee = await server.fetchBaseFee()
    const transaction = buildStellarPaymentTransaction({
      fromAddress,
      toAddress,
      amount,
      sequence: sourceAccount.sequenceNumber(),
      feeStroops: String(baseFee),
      networkPassphrase,
      assetCode: params.assetCode,
      assetIssuer: params.assetIssuer,
      amountDecimals
    })
    const signed = signStellarTransaction(transaction, params.privateKeyHex, fromAddress)
    const submitted = await submitViaHorizon({
      rpcUrl: params.rpcUrl,
      transaction,
      privateKeyHex: params.privateKeyHex,
      expectedPublicKey: fromAddress
    }).catch(() => null)
    if (submitted?.hash) return submitted
    return { hash: signed.hash }
  }
}

export async function sendStellarAssetNonCustodial(params: {
  rpcUrl: string
  fromAddress: string
  toAddress: string
  amount: string
  assetCode: string
  assetIssuer: string
  privateKeyHex: string
  bridgeUrl?: string
  bridgeUsername?: string
  bridgePassword?: string
  apiBaseUrl?: string
  networkPassphrase?: string
}): Promise<{ hash: string }> {
  return await sendStellarNonCustodial({
    rpcUrl: params.rpcUrl,
    fromAddress: params.fromAddress,
    toAddress: params.toAddress,
    amountXlm: params.amount,
    assetCode: params.assetCode,
    assetIssuer: params.assetIssuer,
    privateKeyHex: params.privateKeyHex,
    bridgeUrl: params.bridgeUrl,
    bridgeUsername: params.bridgeUsername,
    bridgePassword: params.bridgePassword,
    apiBaseUrl: params.apiBaseUrl,
    networkPassphrase: params.networkPassphrase
  })
}

