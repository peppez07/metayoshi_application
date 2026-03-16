import type { Network } from '../coins'

const DEFAULT_EVM_PREVIEW_RECIPIENT = '0x000000000000000000000000000000000000dEaD'

export function resolveFeePreviewRecipient(
  network: Pick<Network, 'coinType'>,
  senderAddress?: string,
  recipientAddress?: string
): string {
  const recipient = String(recipientAddress || '').trim()
  if (recipient) return recipient

  if (network.coinType === 'EVM') {
    return DEFAULT_EVM_PREVIEW_RECIPIENT
  }

  if (network.coinType === 'UTXO') {
    return String(senderAddress || '').trim()
  }

  return ''
}
