import assert from 'node:assert/strict'

import { deriveStellarAddress } from '../src/lib/stellarAddress'
import { createStellarBridgeClient } from '../src/lib/stellarBridgeClient'
import { sendStellarNonCustodial } from '../src/lib/stellarNonCustodial'

type FetchCall = {
  url: string
  method: string
  bodyText: string
  bodyJson: Record<string, unknown> | null
}

const calls: FetchCall[] = []

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  const method = String(init?.method || 'GET').toUpperCase()
  const bodyText = typeof init?.body === 'string' ? init.body : ''
  const bodyJson = (() => {
    try {
      return bodyText ? JSON.parse(bodyText) as Record<string, unknown> : null
    } catch {
      return null
    }
  })()

  calls.push({ url, method, bodyText, bodyJson })

  if (url.includes('/v1/bridge/stellar/main')) {
    const rpcMethod = String(bodyJson?.method || '').trim()
    if (rpcMethod === 'fee_stats') {
      return jsonResponse(200, {
        ok: true,
        id: bodyJson?.id ?? null,
        result: { base_fee: '123' },
        error: null
      })
    }
    if (rpcMethod === 'account') {
      return jsonResponse(200, {
        ok: true,
        id: bodyJson?.id ?? null,
        result: {
          account_id: String((bodyJson?.params as Array<Record<string, unknown>> | undefined)?.[0]?.address || ''),
          sequence: '42',
          balances: [{ asset_type: 'native', balance: '7.5000000' }]
        },
        error: null
      })
    }
    if (rpcMethod === 'submittransaction') {
      const payload = ((bodyJson?.params as Array<Record<string, unknown>> | undefined)?.[0] || {}) as Record<string, unknown>
      assert.ok(String(payload.signedTx || '').length > 0)
      assert.equal(String(payload.signedTx || ''), String(payload.signedXdr || ''))
      return jsonResponse(200, {
        ok: true,
        id: bodyJson?.id ?? null,
        result: 'stellar-bridge-hash',
        error: null
      })
    }
    return jsonResponse(400, { ok: false, error: `unexpected method ${rpcMethod}` })
  }

  if (url.includes('/v1/address/')) {
    return jsonResponse(500, { ok: false, error: 'unexpected address route fallback' })
  }

  throw new Error(`Unexpected fetch URL: ${url}`)
}) as typeof fetch

async function main() {
  const client = createStellarBridgeClient({
    apiBaseUrl: 'https://wallet.example',
    bridgeUrl: 'https://wallet.example/v1/bridge/stellar/main',
    network: 'main'
  })

  const fee = await client.getFeeStats()
  assert.equal(fee.baseFeeStroops, 123)

  const account = await client.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF')
  assert.equal(account.sequence, '42')
  assert.equal(account.nativeBalance, '7.5000000')

  const submitted = await client.submitSignedXdr('AAAAFAKESTELLARXDR')
  assert.equal(submitted.hash, 'stellar-bridge-hash')

  const sendMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
  const from = await deriveStellarAddress(sendMnemonic, 0)
  const to = await deriveStellarAddress(sendMnemonic, 1)
  const sent = await sendStellarNonCustodial({
    rpcUrl: '',
    apiBaseUrl: 'https://wallet.example',
    bridgeUrl: 'https://wallet.example/v1/bridge/stellar/main',
    fromAddress: from.address,
    toAddress: to.address,
    amountXlm: '1',
    privateKeyHex: from.privHex
  })
  assert.equal(sent.hash, 'stellar-bridge-hash')

  const methods = calls
    .filter((call) => call.url.includes('/v1/bridge/stellar/main') && call.method === 'POST')
    .map((call) => String(call.bodyJson?.method || ''))
  assert(methods.includes('fee_stats'))
  assert(methods.includes('account'))
  assert(methods.includes('submittransaction'))

  console.log(JSON.stringify({
    ok: true,
    checkedMethods: methods,
    callCount: calls.length
  }, null, 2))
}

await main()
