import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { normalizeSuiAddress } from './suiAddress'
import { createSuiBridgeClient } from './suiBridgeClient'
import { sendBridgeSuiSignedRelay, type UtxoRpcConfig } from './utxoRpc'

export const SUI_NATIVE_COIN_TYPE = '0x2::sui::SUI'

type BaseSuiSendInput = {
  rpcConfig: UtxoRpcConfig
  mnemonic: string
  accountIndex: number
  fromAddress: string
}

type SuiTransferRecipientInput = {
  toAddress: string
}

function normalizeMnemonic(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function deriveSuiKeypair(mnemonic: string, accountIndex: number): Ed25519Keypair {
  const path = `m/44'/784'/${Math.max(0, Math.trunc(accountIndex || 0))}'/0'/0'`
  return Ed25519Keypair.deriveKeypair(normalizeMnemonic(mnemonic), path)
}

function assertSignerMatchesFromAddress(keypair: Ed25519Keypair, fromAddress: string): string {
  const normalizedFrom = normalizeSuiAddress(fromAddress)
  const derivedAddress = normalizeSuiAddress(keypair.toSuiAddress())
  if (normalizedFrom !== derivedAddress) {
    throw new Error(`Active SUI address does not match derived signer address (${normalizedFrom} != ${derivedAddress})`)
  }
  return normalizedFrom
}

function parsePositiveRawAmount(value: string, label: string): bigint {
  const raw = String(value || '').trim()
  if (!/^\d+$/.test(raw)) throw new Error(`${label} amount must be a positive integer`)
  const amount = BigInt(raw)
  if (amount <= 0n) throw new Error(`${label} amount must be greater than 0`)
  return amount
}

async function signAndRelaySuiTransaction(
  client: ReturnType<typeof createSuiBridgeClient>,
  keypair: Ed25519Keypair,
  tx: Transaction,
  rpcConfig: UtxoRpcConfig,
  kind: 'coin' | 'asset'
): Promise<{ hash: string }> {
  tx.setSenderIfNotSet(keypair.toSuiAddress())
  const bytes = await tx.build({ client })
  const signed = await keypair.signTransaction(bytes)
  const sent = await sendBridgeSuiSignedRelay(rpcConfig, {
    kind,
    txBytesBase64: signed.bytes,
    signatures: [signed.signature]
  })
  return { hash: sent.txid }
}

async function listSuiCoinObjects(
  client: ReturnType<typeof createSuiBridgeClient>,
  owner: string,
  coinType: string
): Promise<Array<{ coinObjectId: string; balance: bigint }>> {
  const rows: Array<{ coinObjectId: string; balance: bigint }> = []
  let cursor: string | null | undefined = null

  while (true) {
    const page: any = await client.getCoins({
      owner,
      coinType,
      cursor,
      limit: 50
    })
    for (const row of page.data || []) {
      const balanceText = String((row as any)?.balance || '').trim()
      const coinObjectId = String((row as any)?.coinObjectId || '').trim()
      if (!coinObjectId || !/^\d+$/.test(balanceText)) continue
      const balance = BigInt(balanceText)
      if (balance <= 0n) continue
      rows.push({ coinObjectId, balance })
    }
    if (!page.hasNextPage || !page.nextCursor) break
    cursor = page.nextCursor
  }

  rows.sort((a, b) => {
    if (a.balance === b.balance) return a.coinObjectId.localeCompare(b.coinObjectId)
    return a.balance > b.balance ? -1 : 1
  })
  return rows
}

export async function sendSuiNativeNonCustodial(
  input: BaseSuiSendInput & SuiTransferRecipientInput & { amountMist: string }
): Promise<{ hash: string }> {
  const amountMist = parsePositiveRawAmount(input.amountMist, 'SUI')
  const recipient = normalizeSuiAddress(input.toAddress)
  const keypair = deriveSuiKeypair(input.mnemonic, input.accountIndex)
  assertSignerMatchesFromAddress(keypair, input.fromAddress)
  const client = createSuiBridgeClient(input.rpcConfig)

  const tx = new Transaction()
  const [coin] = tx.splitCoins(tx.gas, [amountMist])
  tx.transferObjects([coin], recipient)

  return await signAndRelaySuiTransaction(client, keypair, tx, input.rpcConfig, 'coin')
}

export async function sendSuiCoinAssetNonCustodial(
  input: BaseSuiSendInput & SuiTransferRecipientInput & {
    coinType: string
    amountRaw: string
  }
): Promise<{ hash: string }> {
  const coinType = String(input.coinType || '').trim()
  if (!coinType) throw new Error('Sui coinType is required')
  const amountRaw = parsePositiveRawAmount(input.amountRaw, 'Sui token')
  const recipient = normalizeSuiAddress(input.toAddress)
  const keypair = deriveSuiKeypair(input.mnemonic, input.accountIndex)
  const fromAddress = assertSignerMatchesFromAddress(keypair, input.fromAddress)
  const client = createSuiBridgeClient(input.rpcConfig)
  const coins = await listSuiCoinObjects(client, fromAddress, coinType)

  let selectedTotal = 0n
  const selectedIds: string[] = []
  for (const row of coins) {
    selectedIds.push(row.coinObjectId)
    selectedTotal += row.balance
    if (selectedTotal >= amountRaw) break
  }

  if (selectedTotal < amountRaw || selectedIds.length === 0) {
    throw new Error(`Insufficient ${coinType} balance`)
  }

  const tx = new Transaction()
  const primaryCoinId = selectedIds[0]
  if (selectedIds.length > 1) {
    tx.mergeCoins(primaryCoinId, selectedIds.slice(1))
  }
  const [transferCoin] = tx.splitCoins(primaryCoinId, [amountRaw])
  tx.transferObjects([transferCoin], recipient)

  return await signAndRelaySuiTransaction(client, keypair, tx, input.rpcConfig, 'asset')
}

export async function sendSuiObjectAssetNonCustodial(
  input: BaseSuiSendInput & SuiTransferRecipientInput & { objectId: string }
): Promise<{ hash: string }> {
  const objectId = normalizeSuiAddress(input.objectId)
  const recipient = normalizeSuiAddress(input.toAddress)
  const keypair = deriveSuiKeypair(input.mnemonic, input.accountIndex)
  assertSignerMatchesFromAddress(keypair, input.fromAddress)
  const client = createSuiBridgeClient(input.rpcConfig)

  const tx = new Transaction()
  tx.transferObjects([objectId], recipient)

  return await signAndRelaySuiTransaction(client, keypair, tx, input.rpcConfig, 'asset')
}

function decodeBase64Bytes(value: string): Uint8Array {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error('Prepared Sui transaction bytes are required')
  const raw = atob(normalized)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

export async function signAndRelayPreparedSuiTransaction(
  input: BaseSuiSendInput & {
    txBytesBase64: string
    relayKind?: 'coin' | 'asset'
  }
): Promise<{ hash: string }> {
  const txBytes = decodeBase64Bytes(input.txBytesBase64)
  const keypair = deriveSuiKeypair(input.mnemonic, input.accountIndex)
  assertSignerMatchesFromAddress(keypair, input.fromAddress)
  const signed = await keypair.signTransaction(txBytes)
  const sent = await sendBridgeSuiSignedRelay(input.rpcConfig, {
    kind: input.relayKind === 'coin' ? 'coin' : 'asset',
    txBytesBase64: signed.bytes,
    signatures: [signed.signature]
  })
  return { hash: sent.txid }
}
