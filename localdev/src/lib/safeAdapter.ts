import { ethers } from 'ethers'
import {
  buildSafeTransactionRecord,
  createSafeContractClient,
  createSafeTransactionServiceClient,
  packSafeExecutionSignatures,
  signSafeHash,
  SafeContractClient,
} from './safeClient'
import {
  SafeAccountInfo,
  SafeAdapterError,
  SafeAdapterOptions,
  SafeConfirmationResult,
  SafeExecutionResult,
  SafeExecutionSigner,
  SafeHashSigner,
  SafeProposalResult,
  SafeServiceConfirmation,
  SafeTransactionData,
  SafeTransactionInput,
  SafeTransactionRecord,
  ZERO_ADDRESS,
  normalizeSafeAddress,
  normalizeSafeOperation,
  normalizeSafeTransactionInput,
  sortSafeConfirmations
} from './safeTypes'

export interface SafeAdapter {
  readonly safeAddress: string
  readonly serviceUrl: string
  getSafeInfo(): Promise<SafeAccountInfo>
  isOwner(address: string): Promise<boolean>
  getCurrentNonce(): Promise<bigint>
  buildTransaction(input: SafeTransactionInput, nonce?: bigint | number | string): Promise<SafeTransactionData>
  getTransactionHash(input: SafeTransactionInput, nonce?: bigint | number | string): Promise<string>
  getTransaction(safeTxHash: string): Promise<SafeTransactionRecord>
  listPendingTransactions(): Promise<SafeTransactionRecord[]>
  getConfirmations(safeTxHash: string): Promise<SafeServiceConfirmation[]>
  proposeTransaction(input: SafeTransactionInput, signer: SafeHashSigner): Promise<SafeProposalResult>
  confirmTransaction(safeTxHash: string, signer: SafeHashSigner): Promise<SafeConfirmationResult>
  executeTransaction(
    input: SafeTransactionInput,
    signer: SafeExecutionSigner,
    options?: { nonce?: bigint | number | string; signatures?: readonly SafeServiceConfirmation[] }
  ): Promise<SafeExecutionResult>
}

export interface SafeAdapterFactoryOptions extends SafeAdapterOptions {
  provider: ethers.Provider
  safeAddress: string
}

function normalizeExecutionSignerAddress(value: string | undefined): string {
  const text = String(value || '').trim()
  if (!text) {
    throw new SafeAdapterError('invalid_safe_address', 'Safe signer address is required')
  }
  if (!ethers.isAddress(text)) {
    throw new SafeAdapterError('invalid_safe_address', `Invalid Safe signer address: ${text}`)
  }
  return ethers.getAddress(text)
}

async function defaultSignHashWithEthersSigner(signer: ethers.Signer, safeTxHash: string): Promise<string> {
  const hashBytes = ethers.getBytes(safeTxHash)
  const anySigner = signer as ethers.Signer & {
    signingKey?: { sign: (digest: Uint8Array) => ethers.SignatureLike | string }
  }
  if (anySigner.signingKey?.sign) {
    const signed = anySigner.signingKey.sign(hashBytes)
    return ethers.Signature.from(signed).serialized
  }
  if (typeof signer.signMessage === 'function') {
    return await signer.signMessage(hashBytes)
  }
  throw new SafeAdapterError('invalid_signature', 'Signer cannot sign Safe hashes')
}

export function createSafeHashSignerFromEthersSigner(
  signer: ethers.Signer,
  address?: string
): SafeHashSigner {
  return {
    address: normalizeExecutionSignerAddress(address || (signer as ethers.Signer & { address?: string }).address || ''),
    signHash: async (safeTxHash) => await defaultSignHashWithEthersSigner(signer, safeTxHash)
  }
}

function buildAdapter(options: SafeAdapterFactoryOptions): SafeAdapter {
  const contractClient: SafeContractClient = createSafeContractClient(options.provider, options.safeAddress)
  const serviceClient = createSafeTransactionServiceClient(options)

  return {
    safeAddress: contractClient.safeAddress,
    serviceUrl: serviceClient.baseUrl,
    async getSafeInfo() {
      return await contractClient.getSafeAccountInfo()
    },
    async isOwner(address: string) {
      return await contractClient.isOwner(address)
    },
    async getCurrentNonce() {
      const info = await contractClient.getSafeAccountInfo()
      if (info.nonce === null) {
        throw new SafeAdapterError('rpc_error', 'Safe nonce is unavailable')
      }
      return info.nonce
    },
    async buildTransaction(input: SafeTransactionInput, nonce?: bigint | number | string) {
      const currentNonce = nonce ?? (await this.getCurrentNonce())
      return normalizeSafeTransactionInput({
        ...input,
        operation: normalizeSafeOperation(input.operation),
        gasToken: input.gasToken || ZERO_ADDRESS,
        refundReceiver: input.refundReceiver || ZERO_ADDRESS
      }, currentNonce)
    },
    async getTransactionHash(input: SafeTransactionInput, nonce?: bigint | number | string) {
      return await contractClient.getSafeTransactionHash(input, nonce)
    },
    async getTransaction(safeTxHash: string) {
      return await serviceClient.getTransaction(safeTxHash)
    },
    async listPendingTransactions() {
      return await serviceClient.listPendingTransactions(contractClient.safeAddress)
    },
    async getConfirmations(safeTxHash: string) {
      return await serviceClient.getConfirmations(safeTxHash)
    },
    async proposeTransaction(input: SafeTransactionInput, signer: SafeHashSigner) {
      const safeInfo = await contractClient.getSafeAccountInfo()
      const transaction = await this.buildTransaction(input, safeInfo.nonce ?? 0n)
      const safeTxHash = await contractClient.getSafeTransactionHash(input, transaction.nonce)
      const signature = await signSafeHash(signer, safeTxHash)
      const proposal = await serviceClient.proposeTransaction({
        safeAddress: contractClient.safeAddress,
        safeTransaction: transaction,
        safeTxHash,
        senderAddress: signer.address,
        senderSignature: signature
      })
      const record = buildSafeTransactionRecord(input, transaction.nonce, safeTxHash)
      return { safeTxHash, transaction: record, proposal, signature }
    },
    async confirmTransaction(safeTxHash: string, signer: SafeHashSigner) {
      const signature = await signSafeHash(signer, safeTxHash)
      const confirmation = await serviceClient.confirmTransaction({
        safeTxHash,
        safeAddress: contractClient.safeAddress,
        senderAddress: signer.address,
        senderSignature: signature
      })
      return { safeTxHash, signature, confirmation }
    },
    async executeTransaction(
      input: SafeTransactionInput,
      signer: SafeExecutionSigner,
      options?: { nonce?: bigint | number | string; signatures?: readonly SafeServiceConfirmation[] }
    ) {
      const safeInfo = await contractClient.getSafeAccountInfo()
      const transaction = await this.buildTransaction(input, options?.nonce ?? safeInfo.nonce ?? 0n)
      const safeTxHash = await contractClient.getSafeTransactionHash(input, transaction.nonce)
      const confirmations = options?.signatures ? sortSafeConfirmations(options.signatures) : await serviceClient.getConfirmations(safeTxHash)
      if (safeInfo.threshold !== null && confirmations.length < safeInfo.threshold) {
        throw new SafeAdapterError(
          'insufficient_confirmations',
          `Safe transaction requires ${safeInfo.threshold} confirmations, found ${confirmations.length}`
        )
      }
      const signatures = packSafeExecutionSignatures(confirmations)
      const request = await contractClient.buildExecTransactionRequest(input, signatures, transaction.nonce)
      const response = await signer.sendTransaction(request)
      const hash = String((response as ethers.TransactionResponse)?.hash || (response as { hash?: string })?.hash || '').trim()
      if (!hash) {
        throw new SafeAdapterError('execution_failed', 'Safe execution transaction did not return a hash')
      }
      return {
        safeTxHash,
        hash,
        transaction: request,
        signatures
      }
    }
  }
}

export function createSafeAdapter(options: SafeAdapterFactoryOptions): SafeAdapter {
  return buildAdapter(options)
}

export async function fetchSafeAccountInfo(options: SafeAdapterFactoryOptions): Promise<SafeAccountInfo> {
  return await createSafeContractClient(options.provider, options.safeAddress).getSafeAccountInfo()
}

export async function fetchSafePendingTransactions(options: SafeAdapterFactoryOptions): Promise<SafeTransactionRecord[]> {
  return await createSafeTransactionServiceClient(options).listPendingTransactions(normalizeSafeAddress(options.safeAddress))
}

export async function computeSafeTransactionHash(
  options: SafeAdapterFactoryOptions,
  input: SafeTransactionInput,
  nonce?: bigint | number | string
): Promise<string> {
  return await createSafeContractClient(options.provider, options.safeAddress).getSafeTransactionHash(input, nonce)
}

export async function proposeSafeTransaction(
  options: SafeAdapterFactoryOptions,
  input: SafeTransactionInput,
  signer: SafeHashSigner
): Promise<SafeProposalResult> {
  return await createSafeAdapter(options).proposeTransaction(input, signer)
}

export async function confirmSafeTransaction(
  options: SafeAdapterFactoryOptions,
  safeTxHash: string,
  signer: SafeHashSigner
): Promise<SafeConfirmationResult> {
  return await createSafeAdapter(options).confirmTransaction(safeTxHash, signer)
}

export async function executeSafeTransaction(
  options: SafeAdapterFactoryOptions,
  input: SafeTransactionInput,
  signer: SafeExecutionSigner,
  executionOptions?: { nonce?: bigint | number | string; signatures?: readonly SafeServiceConfirmation[] }
): Promise<SafeExecutionResult> {
  return await createSafeAdapter(options).executeTransaction(input, signer, executionOptions)
}

export { SafeAdapterError } from './safeTypes'
export type {
  SafeAccountInfo,
  SafeConfirmationResult,
  SafeExecutionResult,
  SafeExecutionSigner,
  SafeHashSigner,
  SafeProposalResult,
  SafeServiceConfirmation,
  SafeTransactionData,
  SafeTransactionInput,
  SafeTransactionRecord
} from './safeTypes'
