import assert from 'node:assert/strict'
import test from 'node:test'

import {
  SAFE_MULTISIG_SUPPORTED_CHAIN_IDS,
  getMultisigSupportDescriptor,
  isMultisigDappMethodBlocked
} from './multisig'

function network(input: {
  id: string
  runtimeModelId?: string
  coinType: string
  coinSymbol?: string
  chainId?: number
}) {
  return {
    id: input.id,
    runtimeModelId: input.runtimeModelId || input.id,
    coinType: input.coinType,
    coinSymbol: input.coinSymbol || input.id.toUpperCase(),
    chainId: input.chainId
  }
}

test('safe allowlist includes BSC mainnet and testnet', () => {
  assert.equal(SAFE_MULTISIG_SUPPORTED_CHAIN_IDS.includes(56), true)
  assert.equal(SAFE_MULTISIG_SUPPORTED_CHAIN_IDS.includes(97), true)
})

test('BSC Safe support is wallet-ready on mainnet and configuration-gated on testnet', () => {
  const mainnet = getMultisigSupportDescriptor(network({
    id: 'bnb',
    runtimeModelId: 'bnb',
    coinType: 'EVM',
    coinSymbol: 'BNB',
    chainId: 56
  }))
  assert.equal(mainnet.family, 'safe')
  assert.equal(mainnet.walletReady, true)

  const testnet = getMultisigSupportDescriptor(network({
    id: 'bnb-testnet',
    runtimeModelId: 'bnb',
    coinType: 'EVM',
    coinSymbol: 'tBNB',
    chainId: 97
  }))
  assert.equal(testnet.family, 'unsupported')
  assert.equal(testnet.walletReady, false)
  assert.match(String(testnet.reason || ''), /VITE_SAFE_SERVICE_BASE_URL_97/)

  const configuredTestnet = getMultisigSupportDescriptor(
    network({
      id: 'bnb-testnet',
      runtimeModelId: 'bnb',
      coinType: 'EVM',
      coinSymbol: 'tBNB',
      chainId: 97
    }),
    {
      env: {
        VITE_SAFE_SERVICE_BASE_URL_97: 'https://safe.example.test'
      }
    }
  )
  assert.equal(configuredTestnet.family, 'safe')
  assert.equal(configuredTestnet.walletReady, true)
})

test('runtime support matrix keeps non-implemented families single-signature only', () => {
  const cases = [
    [network({ id: 'srv--bitcoin', runtimeModelId: 'srv--bitcoin', coinType: 'UTXO', coinSymbol: 'BTC' }), 'btc-psbt-v1', 'wallet-ready'],
    [network({ id: 'btcz', runtimeModelId: 'btcz', coinType: 'UTXO', coinSymbol: 'BTCZ' }), 'btcz-transparent-multisig', 'planned'],
    [network({ id: 'rtm', runtimeModelId: 'rtm', coinType: 'UTXO', coinSymbol: 'RTM' }), 'rtm-utxo-asset-multisig-v1', 'wallet-ready'],
    [network({ id: 'dash', runtimeModelId: 'dash', coinType: 'UTXO', coinSymbol: 'DASH' }), 'unsupported', 'unsupported'],
    [network({ id: 'cosmos', runtimeModelId: 'cosmos', coinType: 'COSMOS', coinSymbol: 'ATOM' }), 'unsupported', 'unsupported'],
    [network({ id: 'sol', runtimeModelId: 'sol', coinType: 'SOL', coinSymbol: 'SOL' }), 'unsupported', 'unsupported'],
    [network({ id: 'sui', runtimeModelId: 'sui', coinType: 'SUI', coinSymbol: 'SUI' }), 'unsupported', 'unsupported'],
    [network({ id: 'xrp', runtimeModelId: 'xrp', coinType: 'XRP', coinSymbol: 'XRP' }), 'unsupported', 'unsupported'],
    [network({ id: 'xlm', runtimeModelId: 'xlm', coinType: 'XLM', coinSymbol: 'XLM' }), 'unsupported', 'unsupported'],
    [network({ id: 'tron', runtimeModelId: 'tron', coinType: 'TRON', coinSymbol: 'TRX' }), 'unsupported', 'unsupported'],
    [network({ id: 'xmr', runtimeModelId: 'xmr', coinType: 'XMR', coinSymbol: 'XMR' }), 'unsupported', 'unsupported']
  ] as const

  for (const [input, family, status] of cases) {
    const descriptor = getMultisigSupportDescriptor(input)
    assert.equal(descriptor.family, family)
    assert.equal(descriptor.status, status)
    assert.equal(descriptor.walletReady, status === 'wallet-ready')
  }
})

test('multisig dapp policy blocks sign and send RPC methods', () => {
  assert.equal(isMultisigDappMethodBlocked('eth_sendTransaction'), true)
  assert.equal(isMultisigDappMethodBlocked('wallet_sendTransaction'), true)
  assert.equal(isMultisigDappMethodBlocked('wallet_sendAsset'), true)
  assert.equal(isMultisigDappMethodBlocked('wallet_cosmosSendTx'), true)
  assert.equal(isMultisigDappMethodBlocked('wallet_rtmGetPublicKey'), true)
  assert.equal(isMultisigDappMethodBlocked('wallet_getBalance'), false)
})
