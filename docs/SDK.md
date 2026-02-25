# MetaYoshi DApp SDK

Last updated: 2026-02-25

## Overview

MetaYoshi injects a provider into approved pages:

- `window.metayoshi` (primary and only provider interface)

Initialization event:

- `window` event: `metayoshi#initialized`

Current network families exposed in this SDK:
- Raptoreum (`rtm`)
- Dogecoin (`doge`)
- BitcoinZ (`btcz`)
- Firo (`firo`)
- XRP (`xrp`)
- Tidecoin (`tide`)
- Pirate (`arr`)
- Cardano (`ada`)
- Monero (`xmr`)

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

### Network

- `wallet_getNetworks`: returns configured networks.
- `wallet_switchNetwork` with `params: { networkId: string }`: switches active network.
- `wallet_getCapabilities`: returns wallet/network capability object.

### Transactions

- `wallet_sendTransaction` / `metayoshi_sendTransaction`
  - params: `{ to: string, amount: string }`
  - amount is coin units (decimal string, chain precision is validated per network)
  - returns: `{ hash: string, txid: string }`
  - flow: wallet popup opens, unlock is required when locked, user must approve/reject, popup closes after completion.

### Not supported

- `wallet_signMessage` / `metayoshi_signMessage` -> `-32601`

## Convenience helpers

- `window.metayoshi.enable()` -> `wallet_requestAccounts`
- `window.metayoshi.connect()` -> `wallet_connect`
- `window.metayoshi.getProviderState()`
- `window.metayoshi.getNetworks()`
- `window.metayoshi.getCapabilities()`
- `window.metayoshi.switchNetwork(networkId)`

Legacy provider alias:
- `window.rtm` points to the same provider instance as `window.metayoshi`.

## Events

Subscribe with `on`, remove with `removeListener`/`off`.

- `accountsChanged` payload:
  - `{ accounts: string[], address: string | null }`
- `networkChanged` payload:
  - `{ networkId, networkLabel, coinId, coinName, coinSymbol, coinDecimals }`
- `lockChanged` payload:
  - `{ unlocked: boolean }`

Example:

```js
window.metayoshi.on('accountsChanged', (p) => console.log('accountsChanged', p))
window.metayoshi.on('networkChanged', (p) => console.log('networkChanged', p))
window.metayoshi.on('lockChanged', (p) => console.log('lockChanged', p))
```

## Permission model

Scopes:

- `read`
- `sign`
- `send_coin`
- `send_asset`

Current DApp SDK flow uses:
- `read` for connect/accounts/provider state
- `send_coin` for `wallet_sendTransaction`

First request for a scope from an origin may open approval UI (`#/dapp/connect/1`).
Each `wallet_sendTransaction` call opens a dedicated transaction approval popup (`#/dapp/request/confirm`).
On rejection or timeout, the request fails with code `4001`.

## Error codes

Common errors you should handle:

- `4001`: user rejected request (or approval timeout)
- `4900`: provider/extension context disconnected
- `4901`: wallet is locked
- `-32601`: method not implemented / method not found / method not supported
- `-32602`: invalid params
- `-32603`: internal error
