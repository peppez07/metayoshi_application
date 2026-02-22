# MetaYoshi Bridge API (All UTXO Coins)

Last updated: 2026-02-21

This document describes the bridge endpoints used by the MetaYoshi app for:
- Raptoreum mainnet (`raptoreum/main`)
- Raptoreum testnet (`raptoreum/test`)
- Dogecoin mainnet (`dogecoin/main`)
- BitcoinZ mainnet (`bitcoinz/main`)
- Tidecoin mainnet (`tidecoin/main`)
- Firo mainnet (`firo/main`)

## 1) Route formats

Strict routes (always valid):
- `POST /v1/bridge/:coin/:chain`
- `POST /v1/bridge/:coin/:chain/wallet/:wallet`

Subdomain shortcuts (when server `BRIDGE_SUBDOMAIN_MAP` is configured):
- `https://rtm.metayoshi.app/v1/bridge/wallet/mainwallet`
- `https://trtm.metayoshi.app/v1/bridge/wallet/testwallet`
- `https://doge.metayoshi.app/v1/bridge`
- `https://btcz.metayoshi.app/v1/bridge`
- `https://tide.metayoshi.app/v1/bridge`
- `https://firo.metayoshi.app/v1/bridge`

Coin IDs for strict paths:
- `raptoreum`
- `dogecoin`
- `bitcoinz`
- `tidecoin`
- `firo`

Chain IDs:
- `main`
- `test` (Raptoreum testnet)

## 2) Authentication models

### A) Bridge JSON-RPC + legacy write auth

For `/v1/bridge*` routes:
- `Authorization: Basic <base64(BRIDGE_BASIC_USER:BRIDGE_BASIC_PASSWORD)>`
- `Content-Type: application/json`

Legacy write protection (optional server policy):
- `X-Bridge-Tx-Key: <derived-or-static-write-key>`

### B) Secure write flow (recommended for production/store builds)

Write operations should use server-issued short-lived tokens instead of embedding shared write secrets in the extension:

1. `POST /v1/auth/challenge` with wallet signing address (`0x...`)
2. Wallet signs challenge message
3. `POST /v1/auth/verify` to get short-lived session token
4. `POST /v1/auth/op-token` to mint one-time operation token
5. `POST /v1/secure/bridge/rpc` with `operation + opToken`

Server-side controls:
- one-time token consumption
- payload hash binding
- TTL enforcement
- policy and rate-limit checks

## 3) JSON-RPC bridge request template

```json
{
  "jsonrpc": "1.0",
  "id": "req-1",
  "method": "getwalletinfo",
  "params": []
}
```

## 4) Core endpoints

### Get allowed methods for a coin

`GET /v1/bridge/methods/:coin`

```bash
curl -u bridgeuser:BRIDGE_PASSWORD \
  https://rtm.metayoshi.app/v1/bridge/methods/raptoreum
```

### Generic bridge RPC

`POST /v1/bridge/:coin/:chain`

### Wallet-scoped bridge RPC

`POST /v1/bridge/:coin/:chain/wallet/:wallet`

## 5) Send helper endpoints (legacy helper API)

### Send coin

`POST /v1/bridge/send/coin/:coin/:chain/:wallet`

Body:

```json
{
  "to": "DEST_ADDRESS",
  "amount": 1.25,
  "subtractFeeFromAmount": false,
  "comment": "optional",
  "commentTo": "optional"
}
```

### Send asset

`POST /v1/bridge/send/asset/:coin/:chain/:wallet`

Body:

```json
{
  "assetId": "ROOT/SUB",
  "qty": "1",
  "toAddress": "RTM_DEST_ADDRESS",
  "changeAddress": "",
  "assetChangeAddress": ""
}
```

## 6) Secure write endpoints

### 6.1 `POST /v1/auth/challenge`

Request:

```json
{
  "address": "0x..."
}
```

Success response (shape):

```json
{
  "ok": true,
  "nonce": "...",
  "message": "MetaYoshi auth challenge ...",
  "expiresInSec": 180
}
```

### 6.2 `POST /v1/auth/verify`

Request:

```json
{
  "address": "0x...",
  "nonce": "...",
  "signature": "0x..."
}
```

Success response (shape):

```json
{
  "ok": true,
  "tokenType": "Bearer",
  "sessionToken": "...",
  "address": "0x...",
  "expiresInSec": 300
}
```

### 6.3 `POST /v1/auth/op-token`

Headers:
- `Authorization: Bearer <sessionToken>`

Request:

```json
{
  "operation": {
    "coin": "raptoreum",
    "chain": "main",
    "wallet": "mainwallet",
    "method": "sendtoaddress",
    "params": ["DEST_ADDRESS", 0.1]
  }
}
```

Success response (shape):

```json
{
  "ok": true,
  "opToken": "...",
  "operationHash": "...",
  "expiresInSec": 60
}
```

### 6.4 `POST /v1/secure/bridge/rpc`

Headers:
- `Authorization: Bearer <sessionToken>`
- `Content-Type: application/json`

Request:

```json
{
  "operation": {
    "coin": "raptoreum",
    "chain": "main",
    "wallet": "mainwallet",
    "method": "sendtoaddress",
    "params": ["DEST_ADDRESS", 0.1]
  },
  "opToken": "..."
}
```

Success response (JSON-RPC shape):

```json
{
  "result": "<txid>",
  "error": null,
  "id": null
}
```

Notes:
- Only bridge write methods are accepted on `/v1/secure/bridge/rpc`.
- Read methods should continue using `/v1/bridge/*`.

## 7) App behavior (current)

The extension currently:
- prefers secure write flow for write RPC (`VITE_BRIDGE_SECURE_WRITES_ENABLED=true` by default)
- falls back to legacy bridge write path if secure endpoints are unavailable
- retries candidate `X-Bridge-Tx-Key` values when server uses date-rotation/skew policies

## 8) Common errors

- `403 Missing or invalid transaction authorization key`
  - Legacy write path rejected. Use secure write flow, or provide valid legacy `X-Bridge-Tx-Key`.
- `401 Invalid or already used challenge`
  - Re-run challenge/verify. Tokens and challenges are short-lived and single-use.
- `502 txn-mempool-conflict (code 18)`
  - Inputs already spent by a pending mempool tx. Wait for confirmation or use different UTXOs.
- `-32601 RPC method not allowed`
  - Method is outside the allowlist from `/v1/bridge/methods/:coin`.

## 9) Practical checklist

### BTCZ non-custodial policy note

MetaYoshi policy is strict non-custodial signing only:
- no `importprivkey` from the extension to bridge/server
- no server-side wallet signing fallback

BTCZ send is handled client-side for transparent Overwinter/Sapling transactions
(ZIP143/ZIP243 signature hash for transparent inputs only). Shielded spends/outputs
and JoinSplits are not signed by the extension.

1. Verify strict coin/chain route or subdomain mapping.
2. Verify Basic auth for `/v1/bridge*`.
3. For production writes, use secure challenge/session/op-token flow.
4. Keep bridge master secrets (`BRIDGE_BASIC_PASSWORD`, `BRIDGE_TX_AUTH_KEY`) server-side only.
5. If using legacy writes temporarily, include valid `X-Bridge-Tx-Key`.
