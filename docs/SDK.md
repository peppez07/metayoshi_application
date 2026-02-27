# MetaYoshi DApp SDK

Last updated: 2026-02-27

## Overview

MetaYoshi injects a provider into approved pages:

- `window.metayoshi` (primary)
- `window.rtm` (legacy alias to same provider)

Initialization event:

- `window` event: `metayoshi#initialized`

## Supported network families

The SDK is multi-chain and follows the currently enabled wallet networks/runtime models (for example EVM, UTXO, XRP, Solana, Stellar, TRON, Cardano, Monero, Cosmos model mappings).

Use `wallet_getNetworks` and `wallet_getCapabilities` at runtime instead of hardcoding a static coin list.

## Injection scope

Provider injection is limited by extension manifest host matches and runtime allowlist.
If your origin is outside that scope, `window.metayoshi` will not exist.

## Quick start

```js
function waitForMetaYoshi() {
  if (window.metayoshi?.isMetaYoshi) return Promise.resolve(window.metayoshi)
  return new Promise((resolve) => {
    window.addEventListener('metayoshi#initialized', () => resolve(window.metayoshi), { once: true })
  })
}

const wallet = await waitForMetaYoshi()
const accounts = await wallet.request({ method: 'wallet_requestAccounts' })
console.log(accounts)
```

## Provider state

```js
const state = await window.metayoshi.getProviderState()
```

Returned shape:

```ts
{
  connected: boolean
  unlocked: boolean
  coinId: string | null
  coinName: string | null
  coinSymbol: string | null
  coinDecimals: number | null
  chainId: string | null
  networkId: string | null
  networkLabel: string | null
  accounts: string[]
  selectedAddress: string | null
}
```

## Supported methods

All methods are available via:

```js
await window.metayoshi.request({ method, params })
```

Alias namespaces supported for wallet RPC methods below:

- `metayoshi_*`
- `rtm_*` (legacy compatibility)

### Account and connection

- `wallet_connect`: ensures `read` scope and returns provider state.
- `wallet_requestAccounts`: ensures `read` scope and returns `[activeAddress]`.
- `wallet_accounts`: returns `[activeAddress]` when unlocked, otherwise `[]`.
- `wallet_selectAccount` with `params: { index: number }`: switches active account.

### Network and capabilities

- `wallet_getNetworks`: returns enabled networks including:
  - `id`, `runtimeModelId`, `name`, `symbol`, `coinType`, `chainId`, `active`
  - `capabilities`: `nativeSend`, `assetLayer`, `assetSend`, `activity`
- `wallet_switchNetwork` with `params: { networkId: string }`: switches active network.
- `wallet_getCapabilities`: returns active network capabilities and method availability.

### Transactions

- `wallet_sendTransaction` / `metayoshi_sendTransaction`
  - params: `{ to: string, amount: string }`
  - amount is coin units (decimal string, precision validated per active network)
  - returns: `{ hash: string, txid: string }`

- `wallet_sendAsset` / `metayoshi_sendAsset`
  - params: `{ assetId: string, qty: string, toAddress: string }`
  - returns: `{ hash: string, txid: string }`
  - actual support depends on active network capability flags (`assetSend=true`)

### Not supported

- `wallet_signMessage` / `metayoshi_signMessage` -> `-32601`

## Convenience helpers

- `window.metayoshi.enable()` -> `wallet_requestAccounts`
- `window.metayoshi.connect()` -> `wallet_connect`
- `window.metayoshi.getProviderState()`
- `window.metayoshi.getNetworks()`
- `window.metayoshi.getCapabilities()`
- `window.metayoshi.switchNetwork(networkId)`
- `window.metayoshi.sendTransaction({ to, amount })`
- `window.metayoshi.sendAsset({ assetId, qty, toAddress })`
- `window.metayoshi.sdkInfo()` -> combined `{ provider, state, capabilities, networks }`

## Events

Subscribe with `on`, remove with `removeListener`/`off`.

- `accountsChanged` payload:
  - `{ accounts: string[], address: string | null }`
- `networkChanged` payload:
  - `{ networkId, networkLabel, coinId, coinName, coinSymbol, coinDecimals }`
- `lockChanged` payload:
  - `{ unlocked: boolean }`

## Permission model

Scopes:

- `read`
- `sign`
- `send_coin`
- `send_asset`

Current SDK flow uses:

- `read` for connect/accounts/provider state
- `send_coin` for `wallet_sendTransaction`
- `send_asset` for `wallet_sendAsset`

First request for a scope from an origin may open approval UI (`#/dapp/connect/1`).
Each send request opens a dedicated transaction approval popup (`#/dapp/request/confirm`).
On rejection or timeout, the request fails with code `4001`.

## Error codes

Common errors to handle:

- `4001`: user rejected request (or approval timeout)
- `4900`: provider/extension context disconnected
- `4901`: wallet is locked
- `-32601`: method not implemented / method not found / method not supported
- `-32602`: invalid params
- `-32603`: internal error
