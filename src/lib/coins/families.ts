/** Picks the transaction rules for a network's family. */
import type { NetworkParams } from '../networks'
import { RTM_SEND_CHAIN, type SendChain } from '../rtm/builder'
import { parseTx, type Transaction } from '../rtm/transaction'
import { parseZcashTx } from '../btcz/transaction'
import { btczSendChain } from '../btcz/chain'
import { legacySendChain, parseLegacyTx } from './legacy'

export interface SendContext {
  tipHeight: number
  relayFeePerByte: bigint
}

export function sendChainFor(network: NetworkParams, context: SendContext): SendChain {
  switch (network.family) {
    case 'rtm': return RTM_SEND_CHAIN
    case 'btcz': return btczSendChain(context.tipHeight)
    case 'legacy': return legacySendChain(network, context.relayFeePerByte)
    default: throw new Error(`${network.name} transactions are not supported yet`)
  }
}

export function parseNetworkTx(network: NetworkParams, hex: string): Transaction {
  switch (network.family) {
    case 'rtm': return parseTx(hex)
    case 'btcz': return parseZcashTx(hex)
    case 'legacy': return parseLegacyTx(hex)
    default: throw new Error(`${network.name} transactions are not supported yet`)
  }
}

/** Families that need the chain height to sign (expiry heights). */
export function needsTipHeight(network: NetworkParams): boolean {
  return network.family === 'btcz'
}
