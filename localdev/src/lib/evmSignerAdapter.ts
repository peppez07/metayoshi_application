import { ethers } from 'ethers'

import type { EvmExternalSignTxInput, EvmExternalSigner } from './evmExternalSigner'

type JsonObject = Record<string, any>

export interface EvmTransactionInput {
  to?: string
  value?: string
  data?: string
  gasLimit?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  nonce?: string
  chainId?: string | number
  type?: number
}

export interface EvmSignerAdapter {
  source: 'local' | 'external'
  signMessage: (message: Uint8Array) => Promise<string>
  signTypedData: (domain: JsonObject, types: JsonObject, message: JsonObject) => Promise<string>
  signTransaction: (input: EvmExternalSignTxInput) => Promise<string>
  sendTransaction?: (input: EvmExternalSignTxInput) => Promise<{ hash: string }>
}

function parseRpcQuantityToBigInt(value: unknown): bigint {
  const raw = String(value ?? '').trim()
  if (!raw) return 0n
  if (/^0x[0-9a-f]+$/i.test(raw)) return BigInt(raw)
  if (/^\d+$/.test(raw)) return BigInt(raw)
  throw new Error(`Invalid RPC quantity: ${raw}`)
}

function evmDerivationPath(accountIndex: number): string {
  return `m/44'/60'/${accountIndex}'/0/0`
}

function deriveEvmWallet(mnemonic: string, accountIndex: number) {
  return ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, evmDerivationPath(accountIndex))
}

function resolveAccountIndex(accountIndex?: number): number {
  return Number.isInteger(accountIndex) && Number(accountIndex) >= 0 ? Number(accountIndex) : 0
}

export function normalizeEvmTransactionInput(tx: EvmTransactionInput | undefined): EvmExternalSignTxInput {
  const candidate = tx || {}
  return {
    data: String(candidate.data || '').trim() || undefined,
    to: String(candidate.to || '').trim() || undefined,
    valueWei: candidate.value !== undefined ? parseRpcQuantityToBigInt(candidate.value) : undefined,
    gasLimit: candidate.gasLimit !== undefined ? parseRpcQuantityToBigInt(candidate.gasLimit) : undefined,
    gasPrice: candidate.gasPrice !== undefined ? parseRpcQuantityToBigInt(candidate.gasPrice) : undefined,
    maxFeePerGas: candidate.maxFeePerGas !== undefined ? parseRpcQuantityToBigInt(candidate.maxFeePerGas) : undefined,
    maxPriorityFeePerGas: candidate.maxPriorityFeePerGas !== undefined ? parseRpcQuantityToBigInt(candidate.maxPriorityFeePerGas) : undefined,
    nonce: candidate.nonce !== undefined ? Number(parseRpcQuantityToBigInt(candidate.nonce)) : undefined,
    chainId: candidate.chainId !== undefined ? Number(parseRpcQuantityToBigInt(candidate.chainId)) : undefined,
    type: candidate.type === 2 ? 2 : undefined
  }
}

function toLocalEvmTransactionRequest(input: EvmExternalSignTxInput): any {
  return {
    data: input.data,
    to: input.to,
    value: input.valueWei,
    gasLimit: input.gasLimit,
    gasPrice: input.gasPrice,
    maxFeePerGas: input.maxFeePerGas,
    maxPriorityFeePerGas: input.maxPriorityFeePerGas,
    nonce: input.nonce,
    chainId: input.chainId,
    type: input.type
  }
}

export function createEvmSignerAdapter(input: {
  mnemonic: string
  accountIndex?: number
  externalSigner?: EvmExternalSigner | null
}): EvmSignerAdapter {
  if (input.externalSigner) {
    const externalSigner = input.externalSigner
    return {
      source: 'external',
      signMessage: async (message) => await externalSigner.signMessage(ethers.getBytes(message)),
      signTypedData: async (domain, types, message) => await externalSigner.signTypedData(domain, types, message),
      signTransaction: async (tx) => {
        if (typeof externalSigner.signTransaction !== 'function') {
          throw new Error('Configured external signer cannot produce raw signed transactions')
        }
        return await externalSigner.signTransaction(tx)
      },
      sendTransaction: async (tx) => await externalSigner.sendTransaction(tx)
    }
  }

  const wallet = deriveEvmWallet(input.mnemonic, resolveAccountIndex(input.accountIndex))
  return {
    source: 'local',
    signMessage: async (message) => await wallet.signMessage(message),
    signTypedData: async (domain, types, message) => await wallet.signTypedData(domain, types, message),
    signTransaction: async (tx) => await wallet.signTransaction(toLocalEvmTransactionRequest(tx))
  }
}
