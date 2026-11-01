import type { SendChain } from '../rtm/builder'
import { BTCZ_NETWORK } from '../networks'
import { estimateZcashTxBytes, signZcashTransaction } from './transaction'

/** 0.0001 BTCZ, the classic Zcash-family default fee; well above the 100 zat/kB relay minimum. */
export const BTCZ_MIN_FEE = 10_000n
export const BTCZ_MAX_FEE = 10_000_000n

/** BitcoinZ send rules for a transaction built at chain height `tipHeight`. */
export function btczSendChain(tipHeight: number): SendChain {
  return {
    network: BTCZ_NETWORK,
    estimateBytes: estimateZcashTxBytes,
    sign: (outputs, spends, privateKey) => signZcashTransaction(outputs, spends, privateKey, { tipHeight }),
    minFee: BTCZ_MIN_FEE,
    maxFee: BTCZ_MAX_FEE,
    dust: 1000n
  }
}
