import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScopedAssetSnapshotStatus,
  isAssetSnapshotEmpty,
  shouldPreferNetworkAssetSnapshot,
  shouldRetainActiveNetworkProjection
} from './assetScopeState'

test('non-authoritative empty scoped snapshots fall back to populated network state', () => {
  const scoped = { assets: {}, logos: {}, labels: {}, evmNfts: {} }
  const network = { assets: { USDC: 100_000_000 }, logos: {}, labels: { USDC: 'USD Coin' }, evmNfts: {} }
  const status = buildScopedAssetSnapshotStatus({
    snapshot: scoped,
    emptyAuthoritative: false,
    source: 'error:fallback-empty',
    updatedAt: 1
  })

  assert.equal(
    shouldPreferNetworkAssetSnapshot({
      scopedPresent: true,
      scoped,
      network,
      status
    }),
    true
  )
  assert.equal(
    shouldRetainActiveNetworkProjection({
      currentNetwork: network,
      nextScoped: scoped,
      status
    }),
    true
  )
})

test('authoritative empty scoped snapshots do not fall back to stale network state', () => {
  const scoped = { assets: {}, logos: {}, labels: {}, evmNfts: {} }
  const network = { assets: { USDT: 50_000_000 }, logos: {}, labels: { USDT: 'Tether USD' }, evmNfts: {} }
  const status = buildScopedAssetSnapshotStatus({
    snapshot: scoped,
    emptyAuthoritative: true,
    source: 'server:/v1/address/assets',
    updatedAt: 2
  })

  assert.equal(status.emptyAuthoritative, true)
  assert.equal(
    shouldPreferNetworkAssetSnapshot({
      scopedPresent: true,
      scoped,
      network,
      status
    }),
    false
  )
  assert.equal(
    shouldRetainActiveNetworkProjection({
      currentNetwork: network,
      nextScoped: scoped,
      status
    }),
    false
  )
})

test('non-empty snapshots are never treated as empty fallbacks', () => {
  const snapshot = {
    assets: { BONK: 123 },
    logos: {},
    labels: { BONK: 'Bonk' },
    evmNfts: {}
  }

  assert.equal(isAssetSnapshotEmpty(snapshot), false)
  assert.equal(
    shouldPreferNetworkAssetSnapshot({
      scopedPresent: true,
      scoped: snapshot,
      network: { assets: { OTHER: 1 }, logos: {}, labels: {}, evmNfts: {} },
      status: buildScopedAssetSnapshotStatus({
        snapshot,
        emptyAuthoritative: false,
        updatedAt: 3
      })
    }),
    false
  )
})
