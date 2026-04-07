import assert from 'node:assert/strict'
import test from 'node:test'

import { createEvmSignerAdapter } from './evmSignerAdapter'

const TEST_MNEMONIC = 'test test test test test test test test test test test junk'

test('local EVM signer adapter signs messages and raw transactions', async () => {
  const adapter = createEvmSignerAdapter({ mnemonic: TEST_MNEMONIC, accountIndex: 0 })
  assert.equal(adapter.source, 'local')

  const messageSignature = await adapter.signMessage(new TextEncoder().encode('metayoshi'))
  assert.match(messageSignature, /^0x[0-9a-f]+$/i)

  const signedTx = await adapter.signTransaction({
    to: '0x0000000000000000000000000000000000000001',
    valueWei: 1n,
    gasLimit: 21_000n,
    gasPrice: 1n,
    nonce: 0,
    chainId: 1,
    type: 2
  })
  assert.match(signedTx, /^0x[0-9a-f]+$/i)
})

test('external EVM signer adapter routes every supported action through the external signer', async () => {
  const calls: string[] = []
  const adapter = createEvmSignerAdapter({
    mnemonic: TEST_MNEMONIC,
    externalSigner: {
      mode: 'hardware',
      getAddress: async () => '0x0000000000000000000000000000000000000001',
      signMessage: async () => {
        calls.push('signMessage')
        return '0xmessage'
      },
      signTypedData: async () => {
        calls.push('signTypedData')
        return '0xtyped'
      },
      signTransaction: async () => {
        calls.push('signTransaction')
        return '0xsignedtx'
      },
      sendTransaction: async () => {
        calls.push('sendTransaction')
        return { hash: '0xhash' }
      }
    }
  })

  assert.equal(adapter.source, 'external')
  assert.equal(await adapter.signMessage(new Uint8Array([1, 2, 3])), '0xmessage')
  assert.equal(await adapter.signTypedData({}, { Example: [] }, {}), '0xtyped')
  assert.equal(await adapter.signTransaction({ chainId: 56, nonce: 1 }), '0xsignedtx')
  assert.deepEqual(await adapter.sendTransaction?.({ chainId: 56, nonce: 1 }), { hash: '0xhash' })
  assert.deepEqual(calls, ['signMessage', 'signTypedData', 'signTransaction', 'sendTransaction'])
})

test('external EVM signer adapter does not silently fall back to mnemonic signing for raw transactions', async () => {
  const adapter = createEvmSignerAdapter({
    mnemonic: TEST_MNEMONIC,
    externalSigner: {
      mode: 'hardware',
      getAddress: async () => '0x0000000000000000000000000000000000000001',
      signMessage: async () => '0xmessage',
      signTypedData: async () => '0xtyped',
      sendTransaction: async () => ({ hash: '0xhash' })
    }
  })

  await assert.rejects(
    async () => await adapter.signTransaction({ chainId: 56, nonce: 1 }),
    /cannot produce raw signed transactions/i
  )
})
