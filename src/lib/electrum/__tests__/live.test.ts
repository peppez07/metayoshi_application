/**
 * Live check against a real ElectrumX for Raptoreum server. Skipped unless
 * RTM_LIVE_SERVER is set, e.g.
 *   RTM_LIVE_SERVER=wss://144.202.18.233:50004 NODE_EXTRA_CA_CERTS=server.crt npm run test:live
 * NODE_EXTRA_CA_CERTS is only needed for a self-signed certificate.
 */
import { afterAll, describe, expect, test } from 'vitest'
import { ElectrumClient } from '../client'
import { RtmElectrum } from '../rtmElectrum'
import { parseTx } from '../../rtm/transaction'
import { addressToScript } from '../../rtm/address'
import { describeTx } from '../../rtm/history'

const SERVER = process.env.RTM_LIVE_SERVER ?? ''
const ADDRESS = process.env.RTM_LIVE_ADDRESS ?? 'RVLFQj4RiMCDDrWGZXRd2ui1NKGQ9ieooz'

describe.skipIf(!SERVER)(`live ElectrumX ${SERVER}`, () => {
  const api = new RtmElectrum(new ElectrumClient(SERVER))
  afterAll(() => api.client.close())

  test('is Raptoreum mainnet with a ready asset index', async () => {
    const features = await api.verifyNetwork()
    console.log('server:', features)
    expect(features.assetsReady).toBe(true)
    expect(await api.tipHeight()).toBeGreaterThan(1_400_000)
  }, 30_000)

  test('serves balance, unspent outputs and history for an address', async () => {
    const [balance, utxos, history] = await Promise.all([api.balance(ADDRESS), api.listUnspent(ADDRESS), api.history(ADDRESS)])
    console.log(`${ADDRESS}: balance`, balance, `utxos ${utxos.length}`, `history ${history.length}`)
    const utxoTotal = utxos.filter((u) => u.height > 0).reduce((n, u) => n + u.value, 0n)
    expect(utxoTotal).toBeLessThanOrEqual(balance.confirmed + (balance.unconfirmed > 0n ? balance.unconfirmed : 0n))
    if (history.length > 0) {
      const heights = new Map(history.map((h) => [h.txid, h.height]))
      const fetchTx = async (txid: string) => {
        const height = heights.get(txid)
        return height === undefined ? null : parseTx(await api.getTransactionAt(txid, height))
      }
      const latest = history[history.length - 1]
      const effect = await describeTx((await fetchTx(latest.txid))!, addressToScript(ADDRESS), fetchTx)
      console.log('latest tx', latest.txid, effect)
    }
  }, 60_000)

  test('serves asset balances, metadata and unspent asset outputs', async () => {
    const assets = await api.assetBalances(ADDRESS)
    console.log(`assets held: ${assets.length}`)
    for (const holding of assets.slice(0, 3)) {
      const [metadata, utxos] = await Promise.all([api.assetMetadata(holding.assetId), api.assetUnspent(ADDRESS, holding.assetId)])
      console.log(metadata?.name, holding.confirmed.toString(), `utxos ${utxos.length}`)
      expect(metadata?.assetId).toBe(holding.assetId)
      expect(utxos.reduce((n, u) => n + (u.height > 0 ? u.amount : 0n), 0n)).toBeLessThanOrEqual(holding.confirmed)
    }
  }, 60_000)

  test('reports a usable fee rate', async () => {
    const rate = await api.feePerByte()
    console.log(`fee rate: ${rate} sat/byte`)
    expect(rate).toBeGreaterThanOrEqual(1n)
    expect(rate).toBeLessThan(1000n)
  }, 30_000)
})
