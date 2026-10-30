# MetaYoshi dApp SDK (Raptoreum)

MetaYoshi injects one provider under two names:

- `window.metayoshi` (primary)
- `window.rtm` (alias)

The `metayoshi#initialized` window event fires when the provider is ready.
MetaYoshi does not inject `window.ethereum` and implements no `eth_*` methods.

## Calling the provider

```js
const accounts = await window.metayoshi.request({ method: 'wallet_requestAccounts' })
```

Also available: `provider.send(method, params)`, `provider.sendAsync(payload, callback)`,
`provider.enable()` (same as `wallet_requestAccounts`) and these helpers:

| Helper | Equivalent |
| --- | --- |
| `connect()` | `wallet_connect` |
| `getProviderState()` | `wallet_getProviderState` |
| `getNetworks()` | `wallet_getNetworks` |
| `getCapabilities()` | `wallet_getCapabilities` |
| `sendTransaction({ to, amount })` | `wallet_sendTransaction` |
| `sendAsset({ assetId, qty, toAddress })` | `wallet_sendAsset` |

Every `wallet_*` method can also be called as `metayoshi_*` or `rtm_*`.

## Methods

| Method | Scope | Result |
| --- | --- | --- |
| `wallet_getProviderState` | none | provider state (below) |
| `wallet_getNetworks` | none | `[{ id: 'rtm', name, symbol, coinType, decimals, capabilities, active }]` |
| `wallet_getCapabilities` | none | features, scopes and method list |
| `wallet_connect` | `read` | provider state |
| `wallet_requestAccounts` | `read` | `[address]` |
| `wallet_accounts` | `read` already granted | `[address]`, or `[]` when locked or not connected |
| `wallet_selectAccount` `{ index }` | `read` | `{ selectedAddress, accounts }` |
| `wallet_sendTransaction` `{ to, amount }` | `read`, `send_coin` | `{ hash, txid }` |
| `wallet_sendAsset` `{ assetId, qty, toAddress }` | `read`, `send_asset` | `{ hash, txid }` |
| `wallet_signMessage` | — | error `-32601` (not supported yet) |

- `amount` is a decimal RTM string with at most 8 decimals, for example `"1.5"`.
- `assetId` is the 64-character asset ID (the creation transaction hash), not the asset name.
- `qty` is a decimal string within the asset's `decimal_point`; for unique assets it is a whole number of tokens.
- Asset recipients must be standard `R…` (P2PKH) addresses.

Each send opens the wallet popup. The wallet builds and signs the transaction locally,
shows the exact network fee, and broadcasts through its ElectrumX server only after the user approves.

## Provider state

```ts
{
  connected: boolean
  unlocked: boolean
  coinId: 'rtm'
  coinName: 'Raptoreum'
  coinSymbol: 'RTM'
  coinDecimals: 8
  chainId: 'rtm'
  chainIdHex: null
  networkId: 'rtm'
  networkLabel: 'Raptoreum'
  accounts: string[]
  selectedAddress: string | null
}
```

## Events

Subscribe with `on`; remove with `removeListener` or `off`.

- `accountsChanged`: `{ accounts: string[], address: string | null }`
- `lockChanged`: `{ unlocked: boolean }`
- `connect` / `disconnect`: account access became available or was lost

## Errors

| Code | Meaning |
| --- | --- |
| `4001` | User rejected the request, or the approval timed out |
| `4901` | Wallet is locked; the unlock popup was opened |
| `-32602` | Invalid parameters |
| `-32601` | Method not supported |
| `-32603` | Wallet not initialized, no account, or the transaction failed |

## Permissions

A site's scopes are granted once in the connect popup and listed under
Settings → Show authorized websites, where they can be revoked.

An example page is in [`examples/dapp-example.html`](../examples/dapp-example.html).
