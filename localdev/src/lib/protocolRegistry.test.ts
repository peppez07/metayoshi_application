import assert from 'node:assert/strict'
import test from 'node:test'

import { createEmptyAccountAddresses, getAccountAddressForNetwork, getRuntimeSupportDescriptor } from './multisig'

test('TRON and Monero coin types resolve to their own protocol families', () => {
  assert.equal(getRuntimeSupportDescriptor({
    id: 'tron',
    runtimeModelId: 'tron',
    coinType: 'TRON',
    coinSymbol: 'TRX'
  }).runtimeFamily, 'tron')

  assert.equal(getRuntimeSupportDescriptor({
    id: 'xmr',
    runtimeModelId: 'xmr',
    coinType: 'XMR',
    coinSymbol: 'XMR'
  }).runtimeFamily, 'monero')
})

test('account address lookup uses dedicated TRON and XMR slots before generic fallbacks', () => {
  const addresses = createEmptyAccountAddresses()
  addresses.TRON = 'TTronAddress123'
  addresses.XMR = '47MoneroAddress456'

  const account = {
    id: 'acc-1',
    addresses,
    networkAddresses: {}
  }

  assert.equal(getAccountAddressForNetwork(account, 'tron', 'TRON'), 'TTronAddress123')
  assert.equal(getAccountAddressForNetwork(account, 'xmr', 'XMR'), '47MoneroAddress456')
})
