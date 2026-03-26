import type { Network } from '../coins'

const DEFAULT_EVM_PREVIEW_RECIPIENT = '0x000000000000000000000000000000000000dEaD'
const DEFAULT_SOLANA_PREVIEW_RECIPIENT = '11111111111111111111111111111111'
const DEFAULT_TRON_PREVIEW_RECIPIENT = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'
const DEFAULT_SUI_PREVIEW_RECIPIENT = '0x0000000000000000000000000000000000000000000000000000000000000001'

export function resolveFeePreviewRecipient(
  network: Pick<Network, 'coinType' | 'id' | 'runtimeModelId'>,
  senderAddress?: string,
  recipientAddress?: string
): string {
  const recipient = String(recipientAddress || '').trim()
  if (recipient) return recipient

  const modelId = String(network.runtimeModelId || network.id || '').trim().toLowerCase()

  if (network.coinType === 'EVM') {
    return DEFAULT_EVM_PREVIEW_RECIPIENT
  }

  if (modelId === 'sol') {
    return DEFAULT_SOLANA_PREVIEW_RECIPIENT
  }

  if (modelId === 'tron') {
    return DEFAULT_TRON_PREVIEW_RECIPIENT
  }

  if (modelId === 'sui') {
    return DEFAULT_SUI_PREVIEW_RECIPIENT
  }

  if (network.coinType === 'UTXO') {
    return String(senderAddress || '').trim()
  }

  return ''
}
