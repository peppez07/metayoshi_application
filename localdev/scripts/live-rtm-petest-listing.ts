import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { ethers } from 'ethers'
import { deriveUtxoAddress } from '../src/lib/utxoAddress'
import { signRtmMessage } from '../src/lib/dappSigning'
import { executeRtmMarketAction } from '../src/lib/rtmHtlc'
import { getCoinApiInterceptor } from '../src/coins/interceptors'

type JsonResponse = {
  ok: boolean
  status: number
  body: any
  text: string
}

async function fetchJson(url: string, init: RequestInit = {}): Promise<JsonResponse> {
  const response = await fetch(url, init)
  const text = await response.text().catch(() => '')
  let body: any = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return {
    ok: response.ok,
    status: response.status,
    body,
    text
  }
}

function extractMnemonic(raw: string): string {
  const match = raw.match(/\b([a-z]+(?:\s+[a-z]+){11})\b/)
  if (!match) throw new Error('mnemonic_not_found_in_envfromwallet_a')
  return match[1].trim().toLowerCase().replace(/\s+/g, ' ')
}

async function main() {
  const apiBase = 'https://api.metayoshi.app'
  const envFile = path.resolve('..', '..', 'server_website_metayoshi', 'envfromwallet_a')
  const raw = await fs.readFile(envFile, 'utf8')
  const mnemonic = extractMnemonic(raw)

  const seller = await deriveUtxoAddress(mnemonic, 'RTM', 0, 0, 0)
  const evmWallet = ethers.HDNodeWallet.fromPhrase(mnemonic)

  const challenge = await fetchJson(`${apiBase}/v1/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: seller.address })
  })
  if (!challenge.ok) throw new Error(`auth_challenge_failed:${challenge.status}:${challenge.text}`)
  const nonce = String(challenge.body?.nonce || '').trim()
  const message = String(challenge.body?.message || '').trim()
  if (!nonce || !message) throw new Error('invalid_auth_challenge')

  const signed = await signRtmMessage({ mnemonic, message, address: seller.address })
  const verify = await fetchJson(`${apiBase}/v1/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: seller.address,
      nonce,
      signature: signed.signature,
      addressKind: 'rtm',
      networkId: 'raptoreum'
    })
  })
  if (!verify.ok) throw new Error(`auth_verify_failed:${verify.status}:${verify.text}`)
  const sessionToken = String(verify.body?.sessionToken || '').trim()
  if (!sessionToken) throw new Error('session_token_missing')

  const authHeader = `Bearer ${sessionToken}`
  const inventory = await fetchJson(`${apiBase}/v1/market/rtm/inventory`, {
    headers: { Authorization: authHeader }
  })
  if (!inventory.ok) throw new Error(`inventory_failed:${inventory.status}:${inventory.text}`)
  const petestInventory = Array.isArray(inventory.body?.items)
    ? inventory.body.items.find((item: any) => String(item.assetId || '').trim() === 'PETEST') || null
    : null

  const dashboard = await fetchJson(`${apiBase}/v1/market/rtm/dashboard/${encodeURIComponent(seller.address)}`, {
    headers: { Authorization: authHeader }
  })
  if (!dashboard.ok) throw new Error(`dashboard_failed:${dashboard.status}:${dashboard.text}`)
  const existingPetestListings = Array.isArray(dashboard.body?.seller?.listings)
    ? dashboard.body.seller.listings
      .filter((item: any) => String(item.assetId || '').trim() === 'PETEST')
      .map((item: any) => ({
        listingId: item.listingId,
        status: item.status,
        publiclyVisible: item.publiclyVisible,
        lockFundingTxId: item.lockFundingTxId || null,
        openOrderId: item.openOrderId || null
      }))
    : []

  const secretHex = crypto.randomBytes(32).toString('hex')
  const secretHash = crypto.createHash('sha256').update(Buffer.from(secretHex, 'hex')).digest('hex')
  const createListing = await fetchJson(`${apiBase}/v1/market/rtm/listings`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sellerAddress: seller.address,
      sellerPubkeyHex: seller.pubHex,
      assetId: 'PETEST',
      assetLabel: 'PETEST',
      unitPriceRtm: '1',
      availableQty: '1',
      minQty: '1',
      secretHash,
      lockDurationMinutes: 60
    })
  })
  if (!createListing.ok) throw new Error(`create_listing_failed:${createListing.status}:${createListing.text}`)

  const action = createListing.body?.walletActions?.seller?.lockAsset?.params
  if (!action) {
    console.log(JSON.stringify({
      sellerAddress: seller.address,
      petestInventoryBalance: petestInventory?.balance || null,
      existingPetestListingsBefore: existingPetestListings,
      rawCreateListingResponse: createListing.body
    }, null, 2))
    throw new Error('lock_action_missing_from_listing_response')
  }

  const rpcConfig = {
    networkId: 'rtm',
    coinSymbol: 'RTM',
    apiInterceptor: getCoinApiInterceptor('rtm'),
    rpcUrl: '',
    rpcWallet: 'mainwallet',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: `${apiBase}/v1/bridge/raptoreum/main/wallet/mainwallet`,
    bridgeUsername: 'test_user',
    bridgePassword: 'test_password',
    secureBridgeApiBaseUrl: apiBase,
    secureBridgeWritesEnabled: true,
    secureBridgeSigner: async (msg: string) => ({
      address: ethers.getAddress(evmWallet.address),
      signature: await evmWallet.signMessage(String(msg || ''))
    }),
    useLocalRpc: false
  }

  const lockResult = await executeRtmMarketAction({
    action,
    rpcConfig,
    privateKeyHex: seller.privHex
  })

  const funding = await fetchJson(`${apiBase}/v1/market/rtm/listings/${encodeURIComponent(createListing.body.listingId)}/funding`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ txid: lockResult.hash })
  })
  if (!funding.ok) throw new Error(`listing_funding_failed:${funding.status}:${funding.text}`)

  const listingDetail = await fetchJson(`${apiBase}/v1/market/rtm/listings/${encodeURIComponent(createListing.body.listingId)}`)
  const publicListings = await fetchJson(`${apiBase}/v1/market/rtm/listings?q=PETEST`)

  console.log(JSON.stringify({
    sellerAddress: seller.address,
    petestInventoryBalance: petestInventory?.balance || null,
    existingPetestListingsBefore: existingPetestListings,
    createdListing: {
      listingId: createListing.body?.listingId || null,
      status: createListing.body?.status || null,
      publiclyVisible: createListing.body?.publiclyVisible ?? null
    },
    lockTxid: lockResult.hash,
    fundedListing: {
      listingId: funding.body?.listingId || createListing.body?.listingId || null,
      status: funding.body?.status || null,
      publiclyVisible: funding.body?.publiclyVisible ?? null
    },
    listingDetail: {
      status: listingDetail.body?.status || null,
      publiclyVisible: listingDetail.body?.publiclyVisible ?? null,
      lockFundingTxId: listingDetail.body?.lockFundingTxId || null
    },
    publicPetestListings: Array.isArray(publicListings.body?.items)
      ? publicListings.body.items
        .filter((item: any) => String(item.assetId || '').trim() === 'PETEST')
        .map((item: any) => ({
          listingId: item.listingId,
          sellerAddress: item.sellerAddress,
          status: item.status,
          unitPriceRtm: item.unitPriceRtm,
          availableQty: item.availableQty,
          remainingQty: item.remainingQty,
          publiclyVisible: item.publiclyVisible ?? null
        }))
      : []
  }, null, 2))
}

main().catch((error) => {
  console.error(String(error instanceof Error ? error.stack || error.message : error))
  process.exitCode = 1
})
