import assert from 'node:assert/strict'
import test from 'node:test'

import { getExtensionSurfaceOpenPolicy } from './extensionSurfacePolicy'

test('wallet surface stays side-panel only', () => {
  assert.deepEqual(getExtensionSurfaceOpenPolicy('wallet'), {
    fallbackToTabOnSidePanelFailure: false,
    preferPopupWindow: false
  })
})

test('approval surface stays side-panel only', () => {
  assert.deepEqual(getExtensionSurfaceOpenPolicy('approval'), {
    fallbackToTabOnSidePanelFailure: false,
    preferPopupWindow: false
  })
})

test('request surface stays side-panel only', () => {
  assert.deepEqual(getExtensionSurfaceOpenPolicy('request'), {
    fallbackToTabOnSidePanelFailure: false,
    preferPopupWindow: false
  })
})
