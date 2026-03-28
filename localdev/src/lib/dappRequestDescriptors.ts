import type { DappPendingRequest } from './dappPermissions'

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' ? value as Record<string, any> : null
}

export function isAuthSignatureMessage(value: unknown): boolean {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return false
  return text.includes('metayoshi secure bridge auth')
    || text.includes('action=session')
    || text.includes('secure bridge auth')
}

export function isSignatureRequestMethod(method?: string): boolean {
  const normalized = String(method || '').trim()
  return normalized === 'wallet_signMessage'
    || normalized === 'wallet_rtmSignMessage'
    || normalized === 'wallet_signTypedData'
    || normalized === 'wallet_signTransaction'
    || normalized === 'wallet_signAllTransactions'
    || normalized === 'wallet_signAndSendTransaction'
}

export function isNonBroadcastRequestMethod(method?: string): boolean {
  const normalized = String(method || '').trim()
  return isSignatureRequestMethod(normalized)
    || normalized === 'wallet_rtmGetPublicKey'
    || normalized === 'wallet_cosmosGetKey'
    || normalized === 'wallet_cosmosSignDirect'
    || normalized === 'wallet_cosmosSignAmino'
}

export function getDappRequestDisplayType(pendingRequest: DappPendingRequest | null | undefined): string {
  const method = String(pendingRequest?.method || '').trim()
  const payload = asRecord(pendingRequest?.request)
  if (method === 'wallet_rtmGetPublicKey') return 'RTM Public Key Access'
  if (method === 'wallet_rtmSignMessage') return 'RTM Signature'
  if (method === 'wallet_signMessage' && isAuthSignatureMessage(payload?.message)) return 'Auth Signature'
  if (method === 'wallet_signMessage') return 'Message Signature'
  if (method === 'wallet_signTypedData') return 'Typed Data Signature'
  if (method === 'wallet_signTransaction') return 'Transaction Signature'
  if (method === 'wallet_signAllTransactions') return 'Batch Transaction Signature'
  if (method === 'wallet_signAndSendTransaction') return 'Sign And Send Transaction'
  if (method === 'wallet_cosmosGetKey') return 'Cosmos Account Access'
  if (method === 'wallet_cosmosSignDirect') return 'Cosmos Direct Signature'
  if (method === 'wallet_cosmosSignAmino') return 'Cosmos Amino Signature'
  if (method === 'wallet_cosmosSendTx') return 'Cosmos Broadcast'
  if (method === 'wallet_rtmMarketAction') return 'RTM Market Action'
  if (method === 'wallet_rtmIssuerAction') return 'RTM Issuer Action'
  if (method === 'wallet_sendAsset') return 'Asset Transfer'
  if (method === 'wallet_sendTransaction') return 'Transaction'
  return 'Dapp Request'
}

export function getDappResultMeta(input: {
  requestMethod?: string
  amount?: string
}): {
  pageTitle: string
  submittedLabel: string
  identifierLabel: string
  assetLabel: string
  amountLabel: string
  submittedValue: string
} {
  const method = String(input.requestMethod || '').trim()
  if (method === 'wallet_rtmGetPublicKey') {
    return {
      pageTitle: 'Public Key Access Details',
      submittedLabel: 'Shared',
      identifierLabel: 'Public Key',
      assetLabel: 'Type',
      amountLabel: 'Response',
      submittedValue: input.amount || 'Public key shared'
    }
  }
  if (method === 'wallet_rtmSignMessage' || method === 'wallet_signMessage') {
    return {
      pageTitle: 'Signature Details',
      submittedLabel: 'Signed',
      identifierLabel: 'Signature',
      assetLabel: 'Type',
      amountLabel: 'Message Size',
      submittedValue: input.amount || 'Signature recorded'
    }
  }
  if (method === 'wallet_cosmosGetKey' || method === 'wallet_cosmosSignDirect' || method === 'wallet_cosmosSignAmino') {
    return {
      pageTitle: 'Request Details',
      submittedLabel: 'Completed',
      identifierLabel: 'Result',
      assetLabel: 'Type',
      amountLabel: 'Details',
      submittedValue: input.amount || 'Request completed'
    }
  }
  return {
    pageTitle: 'Transaction Details',
    submittedLabel: 'Submitted',
    identifierLabel: 'Transaction ID',
    assetLabel: 'Asset',
    amountLabel: 'Amount',
    submittedValue: input.amount || 'Transaction recorded'
  }
}
