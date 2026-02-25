import { TronWeb } from 'tronweb'

function parseTrxToSun(amount: string): number {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid TRX amount')
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > 6) throw new Error('TRX supports up to 6 decimals')
  const sun = Number(`${whole}${frac.padEnd(6, '0')}`)
  if (!Number.isFinite(sun) || sun <= 0) throw new Error('Amount must be greater than 0')
  return Math.trunc(sun)
}

function buildTronWeb(rpcUrl: string): TronWeb {
  const apiKey = String(import.meta.env.VITE_TRON_API_KEY || '').trim()
  return new TronWeb({
    fullHost: rpcUrl,
    headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : undefined
  } as any)
}

export async function getTronBalance(rpcUrl: string, address: string): Promise<string> {
  const tronWeb = buildTronWeb(rpcUrl)
  const sun = await tronWeb.trx.getBalance(String(address || '').trim())
  const trx = Number(sun) / 1e6
  return trx.toFixed(6).replace(/\.?0+$/, '')
}

export async function sendTronNonCustodial(params: {
  rpcUrl: string
  fromAddress: string
  toAddress: string
  amountTrx: string
  privateKeyHex: string
}): Promise<{ hash: string }> {
  const fromAddress = String(params.fromAddress || '').trim()
  const toAddress = String(params.toAddress || '').trim()
  if (!TronWeb.isAddress(fromAddress)) throw new Error('Invalid TRON sender address')
  if (!TronWeb.isAddress(toAddress)) throw new Error('Invalid TRON destination address')
  const privateKey = String(params.privateKeyHex || '').trim()
  const derivedAddress = TronWeb.address.fromPrivateKey(privateKey)
  if (!derivedAddress || derivedAddress !== fromAddress) {
    throw new Error(`Derived TRON signer does not match active address (${derivedAddress || 'unknown'} != ${fromAddress})`)
  }

  const tronWeb = buildTronWeb(params.rpcUrl)
  const amountSun = parseTrxToSun(params.amountTrx)
  const unsignedTx = await tronWeb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress)
  const signedTx = await tronWeb.trx.sign(unsignedTx as any, privateKey)
  const submitted = await tronWeb.trx.sendRawTransaction(signedTx as any)
  const hash = String((submitted as any)?.txid || '').trim()
  if (!hash) throw new Error(`TRON submit failed: ${String((submitted as any)?.code || (submitted as any)?.message || 'missing txid')}`)
  return { hash }
}

