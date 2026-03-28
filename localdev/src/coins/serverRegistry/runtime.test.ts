import assert from 'node:assert/strict'
import test from 'node:test'

import { applyDiscoveredChainCapabilities } from './runtime'

test('discovered chain capability narrowing keeps asset UI visible when balances are disabled', () => {
  const result = applyDiscoveredChainCapabilities({
    features: {
      nativeSend: true,
      assetLayer: true,
      assetSend: true,
      activity: true,
      swap: false
    },
    ui: {
      showAssetsTab: true,
      showAssetsAction: true,
      showSendAction: true,
      showActivityTab: true,
      showSwapAction: false
    }
  }, {
    supportsBalances: false,
    supportsSend: true,
    supportsSwap: false
  })

  assert.equal(result?.features?.assetLayer, true)
  assert.equal(result?.ui?.showAssetsTab, true)
  assert.equal(result?.ui?.showAssetsAction, true)
  assert.equal(result?.features?.activity, false)
  assert.equal(result?.ui?.showActivityTab, false)
})

test('supportsNormalizedBalances only narrows normalized balance surfaces', () => {
  const result = applyDiscoveredChainCapabilities({
    features: {
      nativeSend: true,
      assetLayer: true,
      assetSend: true,
      activity: true,
      swap: true
    },
    ui: {
      showAssetsTab: true,
      showAssetsAction: true,
      showSendAction: true,
      showActivityTab: true,
      showSwapAction: true
    }
  }, {
    supportsBalances: true,
    supportsNormalizedBalances: false,
    supportsSend: false,
    supportsSwap: true
  })

  assert.equal(result?.features?.activity, false)
  assert.equal(result?.ui?.showActivityTab, false)
  assert.equal(result?.ui?.showAssetsTab, true)
  assert.equal(result?.ui?.showAssetsAction, true)
  assert.equal(result?.features?.assetSend, false)
  assert.equal(result?.ui?.showSendAction, false)
  assert.equal(result?.ui?.showSwapAction, true)
})
