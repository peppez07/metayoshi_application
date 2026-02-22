import type {
  CoinChain,
  CoinPayloadCatalog,
  CoinPayloadBuilders,
  UtxoTxInputRef
} from './types'

function envelope(method: string, params: unknown[], id = 'metayoshi'): {
  jsonrpc: '1.0'
  id: string
  method: string
  params: unknown[]
} {
  return { jsonrpc: '1.0', id, method, params }
}

/** Factory for UTXO-style bridge payloads.
 *  Most supported coins share the same RPC payload structure. */
export function createUtxoPayloadCatalog(input: {
  networkId: string
  symbol: string
  coinId: string
  chain: CoinChain
}): CoinPayloadCatalog {
  const builders: CoinPayloadBuilders = {
    getBlockchainInfo: (id = 'metayoshi') => envelope('getblockchaininfo', [], id),
    getWalletInfo: (id = 'metayoshi') => envelope('getwalletinfo', [], id),
    validateAddress: (address: string, id = 'metayoshi') => envelope('validateaddress', [address], id),
    listUnspent: (address?: string, minConf = 1, maxConf = 9999999, id = 'metayoshi') => {
      const params: unknown[] = [minConf, maxConf]
      if (address) params.push([address])
      return envelope('listunspent', params, id)
    },
    scanTxOutSet: (address: string, id = 'metayoshi') => envelope('scantxoutset', ['start', [`addr(${address})`]], id),
    createRawTransaction: (inputs: UtxoTxInputRef[], outputs: Record<string, number>, id = 'metayoshi') =>
      envelope('createrawtransaction', [inputs, outputs], id),
    sendRawTransaction: (hex: string, id = 'metayoshi') => envelope('sendrawtransaction', [hex], id),
    sendAsset: (
      assetId: string,
      qty: number,
      toAddress: string,
      changeAddress = '',
      assetChangeAddress = '',
      id = 'metayoshi'
    ) => envelope('sendasset', [assetId, qty, toAddress, changeAddress, assetChangeAddress], id)
  }

  return {
    ...input,
    builders,
    helperExamples: {
      sendCoin: {
        to: 'RXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        amount: 0.1,
        subtractFeeFromAmount: false
      },
      sendAsset: {
        assetId: 'ROOT|SUB',
        qty: 1,
        toAddress: 'RXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        changeAddress: '',
        assetChangeAddress: ''
      }
    }
  }
}

