# MetaYoshi DApp SDK

Last updated: 2026-02-28

## Overview

MetaYoshi injects one provider object under multiple aliases:

- `window.metayoshi` (primary)
- `window.rtm` (legacy alias)
- `window.ethereum` (EIP-1193 compatibility alias)

All aliases point to the same provider instance.

Initialization event:

- `window` event: `metayoshi#initialized`

## Provider compatibility

The provider supports:

- `provider.request({ method, params })` (EIP-1193 style)
- `provider.send(method, params)` and `provider.send({ method, params })`
- `provider.sendAsync(payload, callback)`
- `provider.enable()` (maps to `wallet_requestAccounts`)

Provider flags:

- `isMetaYoshi: true`
- `isRtm: true`
- `isMultiChain: true`
- `isMetaMask: false`

## Runtime network model

Use `wallet_getNetworks` and `wallet_getCapabilities` at runtime.

Each network entry includes:

- `id`
- `runtimeModelId`
- `name`
- `symbol`
- `coinType` (for example `EVM`, `UTXO`, `XRP`, `SOL`)
- `chainId` (number when applicable)
- `chainIdHex` (hex string when applicable)
- `active`
- `capabilities`: `nativeSend`, `assetLayer`, `assetSend`, `activity`

Notes:

- `coinType` + `runtimeModelId` identify chain execution model.
- EVM networks expose `chainId`/`chainIdHex` and support EIP-1193 chain methods.
- UTXO and other non-EVM models still use the same provider API, but not all EIP-1193 methods apply.
- Layer classification (L1/L2/L3) is not explicitly provided as a dedicated field; dapps should map it using `runtimeModelId` and `chainId` if needed.

## Provider state

```js
const state = await window.metayoshi.getProviderState()
```

Shape:

```ts
{
  connected: boolean
  unlocked: boolean
  coinId: string | null
  coinName: string | null
  coinSymbol: string | null
  coinDecimals: number | null
  chainId: string | null
  chainIdHex: string | null
  networkId: string | null
  networkLabel: string | null
  accounts: string[]
  selectedAddress: string | null
}
```

## Supported RPC methods

Call through:

```js
await window.metayoshi.request({ method, params })
```

Wallet namespace aliases are supported:

- `wallet_*`
- `metayoshi_*`
- `rtm_*`

### Account and connection

- `wallet_connect`
- `wallet_requestAccounts`
- `wallet_accounts`
- `wallet_selectAccount` with `params: { index: number }`

EIP-1193 account methods:

- `eth_requestAccounts`
- `eth_accounts`

### Network methods

- `wallet_getProviderState`
- `wallet_getNetworks`
- `wallet_getCapabilities`
- `wallet_switchNetwork` with `params: { networkId: string }`

EIP-1193 network methods:

- `eth_chainId` -> returns hex chain id (for example `0x1`)
- `net_version` -> returns decimal chain id string
- `wallet_switchEthereumChain` with `params: [{ chainId: "0x..." }]`
- `wallet_addEthereumChain` with `params: [{ chainId: "0x...", ... }]`

`wallet_addEthereumChain` behavior in MetaYoshi:

- It does not create a new chain config from dapp input.
- It validates that the requested `chainId` already exists in wallet-enabled networks.
- On match, it switches active network and returns `null`.
- If not found, it throws `4902`.

### Transaction methods

- `wallet_sendTransaction`
- `eth_sendTransaction`
- `wallet_sendAsset`

`wallet_sendTransaction` params:

```ts
{ to: string, amount: string }
```

`amount` is decimal coin units and validated against active network decimals.

`eth_sendTransaction` params:

```ts
[{ to: string, value: string | number }]
```

- `value` must be wei integer (hex or decimal).
- MetaYoshi converts wei to coin decimal string internally.
- Returns approval/execution result as `{ hash, txid }`.

`wallet_sendAsset` params:

```ts
{ assetId: string, qty: string, toAddress: string }
```

Asset method availability depends on active network capability (`assetSend`).

### Unsupported signing methods

These currently return `-32601`:

- `wallet_signMessage` / aliases
- `eth_sign`
- `personal_sign`
- `eth_signTypedData`
- `eth_signTypedData_v1`
- `eth_signTypedData_v3`
- `eth_signTypedData_v4`

## Events

Subscribe with `on`, remove with `removeListener` or `off`.

- `accountsChanged`: `{ accounts: string[], address: string | null }`
- `networkChanged`: `{ networkId, networkLabel, coinId, coinName, coinSymbol, coinDecimals, chainId, chainIdHex }`
- `chainChanged`: `chainIdHex | chainId` string
- `lockChanged`: `{ unlocked: boolean }`
- `connect`: emitted when account access becomes active
- `disconnect`: emitted on lock/context disconnect

## Permission and approval flow

Scopes:

- `read`
- `sign`
- `send_coin`
- `send_asset`

Current flow:

- Connect/account methods require `read`.
- Native transfer methods require `read` + `send_coin`.
- Asset transfer methods require `read` + `send_asset`.

UI routes used by extension:

- Connection approval: `#/dapp/connect/1`
- Transaction approval: `#/dapp/request/confirm`

## Error codes

- `4001`: user rejected request (or approval timeout)
- `4900`: provider/bridge disconnected (extension context invalidated)
- `4901`: wallet locked
- `4902`: requested chain not configured in wallet
- `-32601`: method unsupported/not found
- `-32602`: invalid params
- `-32603`: internal/runtime error

## Quick start

```js
function waitForMetaYoshi() {
  if (window.metayoshi?.isMetaYoshi) return Promise.resolve(window.metayoshi)
  return new Promise((resolve) => {
    window.addEventListener('metayoshi#initialized', () => resolve(window.metayoshi), { once: true })
  })
}

const provider = await waitForMetaYoshi()
const accounts = await provider.request({ method: 'eth_requestAccounts' })
const chainId = await provider.request({ method: 'eth_chainId' })

console.log({ accounts, chainId })
```
