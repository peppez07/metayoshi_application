/**
 * Family A: coins that sign like Bitcoin before SegWit (legacy SIGHASH_ALL
 * digest over P2PKH inputs). The wallet spends only its own P2PKH outputs,
 * which every one of these coins accepts, including SegWit coins.
 *
 * Created transactions use version 1, which old code bases (whose standard
 * policy rejects versions above 1) and current ones both relay.
 */
import { ByteReader, bytesToHex, hexToBytes, reverseBytes } from '../rtm/bytes'
import { estimateTxBytes, signTransaction, type Transaction, type TxInput, type TxOutput } from '../rtm/transaction'
import type { SendChain } from '../rtm/builder'
import type { NetworkParams } from '../networks'

export const LEGACY_TX_VERSION = 1
const MAX_FEE = 10_000_000n

/**
 * Smallest output a node relays: three times the cost of spending it at the
 * relay fee (Bitcoin Core's rule), and never less than the coin's own floor.
 */
export function dustLimit(network: NetworkParams, relayFeePerByte: bigint): bigint {
  const fromRelay = 3n * relayFeePerByte * 182n
  return fromRelay > network.dustSats ? fromRelay : network.dustSats
}

export function legacySendChain(network: NetworkParams, relayFeePerByte: bigint): SendChain {
  return {
    network,
    estimateBytes: estimateTxBytes,
    sign: (outputs, spends, privateKey) => signTransaction(outputs, spends, privateKey, LEGACY_TX_VERSION),
    minFee: 0n,
    maxFee: network.maxFeeSats ?? MAX_FEE,
    dust: dustLimit(network, relayFeePerByte)
  }
}

/**
 * Reads the inputs and outputs of a transaction and ignores what follows them:
 * witnesses, MWEB data (Litecoin), special-transaction payloads (Dash and its
 * forks) and the lock time. History only needs inputs and outputs.
 */
export function parseLegacyTx(hex: string): Transaction {
  const reader = new ByteReader(hexToBytes(hex))
  const version = reader.u32()
  // BIP144 marker (0x00) and non-zero flag: SegWit (0x01) or MWEB (0x08) data follows the outputs.
  if (reader.remaining >= 2 && reader.data[reader.cursor] === 0x00 && reader.data[reader.cursor + 1] !== 0x00) reader.take(2)
  const inputs: TxInput[] = []
  for (let i = reader.compactSize(); i > 0; i -= 1) {
    const txid = bytesToHex(reverseBytes(reader.take(32)))
    const vout = reader.u32()
    const scriptSig = reader.varBytes()
    inputs.push({ txid, vout, scriptSig, sequence: reader.u32() })
  }
  const outputs: TxOutput[] = []
  for (let i = reader.compactSize(); i > 0; i -= 1) {
    const value = reader.u64()
    outputs.push({ value, script: reader.varBytes() })
  }
  return { version, inputs, outputs, locktime: 0 }
}
