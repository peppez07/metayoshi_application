# Raptoreum Core RPC / CLI README

Copy/paste guide for running `raptoreumd` and `raptoreum-cli` to:
- connect to JSON-RPC
- read wallet and address balances
- list assets on an address
- send RTM
- send assets
- create, sign, and broadcast raw transactions
- run a PSBT-style flow (where supported by your build)

Assumption: you are running a full node plus wallet (`raptoreumd` + `raptoreum-cli`).

## 0) Install and run

Download binaries from the official Raptoreum Core release source, then start the daemon:

```bash
raptoreumd -server
```

Check sync status:

```bash
raptoreum-cli getblockchaininfo
```

You want `verificationprogress` near `1.0` and height close to a trusted explorer.

## 1) Enable JSON-RPC (`raptoreum.conf`)

Typical config locations:
- Linux: `~/.raptoreumcore/raptoreum.conf`
- Windows: `%APPDATA%\RaptoreumCore\raptoreum.conf`

Deployment DNS for this wallet environment: `rtm.metayoshi.app`.

Example config:

```ini
server=1
daemon=1

rpcuser=rtmuser
rpcpassword=REPLACE_WITH_STRONG_PASSWORD
rpcallowip=127.0.0.1
rpcport=10225

# optional but useful for historical lookups:
txindex=1
```

Restart `raptoreumd` after editing config.

Security notes:
- Do not expose RPC publicly without TLS, strict firewalling, and strong auth.
- Keep `rpcallowip` narrow.

## 2) JSON-RPC request format

Raptoreum Core uses Bitcoin-style JSON-RPC envelopes:

```json
{
  "jsonrpc": "1.0",
  "id": "any-id",
  "method": "methodname",
  "params": []
}
```

### Curl helper

```bash
RPC_USER="rtmuser"
RPC_PASS="REPLACE_WITH_STRONG_PASSWORD"
RPC_URL="http://127.0.0.1:10225/"

rpc() {
  METHOD="$1"
  PARAMS="$2"   # JSON array, ex: '["addr", 1]'
  curl -s --user "$RPC_USER:$RPC_PASS" \
    --data-binary "{\"jsonrpc\":\"1.0\",\"id\":\"curl\",\"method\":\"$METHOD\",\"params\":$PARAMS}" \
    -H 'content-type: text/plain;' \
    "$RPC_URL"
}
```

Example:

```bash
rpc getblockchaininfo '[]'
```

## 3) Wallet basics

Create a receiving address:

```bash
raptoreum-cli getnewaddress
```

Encrypt wallet:

```bash
raptoreum-cli encryptwallet "yourStrongPassword"
```

Unlock for 60 seconds:

```bash
raptoreum-cli walletpassphrase "yourStrongPassword" 60
```

Lock wallet:

```bash
raptoreum-cli walletlock
```

## 4) Read balances

### A) Wallet-level balance

```bash
raptoreum-cli getwalletinfo
raptoreum-cli getbalance
```

### B) Balance of one address (wallet-held)

There is usually no single canonical "address balance" RPC in Bitcoin-family wallets. Common approaches:

1. Sum UTXOs for the address:

```bash
raptoreum-cli listunspent 1 9999999 '["RTM_ADDRESS_HERE"]'
```

2. Total received by the address:

```bash
raptoreum-cli getreceivedbyaddress "RTM_ADDRESS_HERE" 1
```

3. Wallet grouping view:

```bash
raptoreum-cli listaddressgroupings
```

### C) Watch-only tracking

Import an external address:

```bash
raptoreum-cli importaddress "RTM_ADDRESS_HERE" "label" false
```

Rescan if needed:

```bash
raptoreum-cli rescanblockchain
```

## 5) List assets on an address

List asset balances held by one address:

```bash
raptoreum-cli listassetbalancesbyaddress "RTM_ADDRESS_HERE"
```

JSON-RPC example:

```bash
rpc listassetbalancesbyaddress '["RTM_ADDRESS_HERE"]'
```

Find addresses holding an asset:

```bash
raptoreum-cli listaddressesbyasset "ROOT/SUB"
```

Get asset metadata:

```bash
raptoreum-cli getassetdetailsbyname "ROOT/SUB"
```

List unspent outputs containing assets:

```bash
raptoreum-cli listunspentassets 1 9999999 '["RTM_ADDRESS_HERE"]'
```

## 6) Send RTM

Simple send:

```bash
raptoreum-cli sendtoaddress "RTM_DEST_ADDRESS" 12.34
```

JSON-RPC example:

```bash
rpc sendtoaddress '["RTM_DEST_ADDRESS", 12.34]'
```

## 7) Send assets

RPC form:

```text
sendasset "asset_id" qty "to_address" "change_address" "asset_change_address"
```

Basic send (wallet chooses change):

```bash
raptoreum-cli sendasset "ROOT/SUB" 1 "RTM_DEST_ADDRESS" "" ""
```

JSON-RPC example:

```bash
rpc sendasset '["ROOT/SUB", 1, "RTM_DEST_ADDRESS", "", ""]'
```

Explicit RTM and asset change addresses:

```bash
raptoreum-cli sendasset "ROOT/SUB" 1 "RTM_DEST_ADDRESS" "RTM_CHANGE_ADDR" "ASSET_CHANGE_ADDR"
```

Note: in many wallet builds, fee-paying RTM inputs are still auto-selected by the wallet even when change addresses are supplied.

## 8) Raw transaction flow (create -> fund -> sign -> broadcast)

List spendable UTXOs:

```bash
raptoreum-cli listunspent 1 9999999
```

Create raw tx:

```bash
raptoreum-cli createrawtransaction \
  '[{"txid":"TXID_HERE","vout":0}]' \
  '{"RTM_DEST_ADDRESS":1.234}'
```

Fund raw tx (adds fee and change):

```bash
raptoreum-cli fundrawtransaction "RAW_HEX_HERE"
```

Sign with wallet:

```bash
raptoreum-cli signrawtransactionwithwallet "FUNDED_RAW_HEX_HERE"
```

Sign with explicit private keys:

```bash
raptoreum-cli signrawtransactionwithkey \
  "FUNDED_RAW_HEX_HERE" \
  '["WIF_PRIVKEY_1","WIF_PRIVKEY_2"]'
```

Broadcast:

```bash
raptoreum-cli sendrawtransaction "SIGNED_RAW_HEX_HERE"
```

Decode and inspect:

```bash
raptoreum-cli decoderawtransaction "RAW_HEX_HERE"
raptoreum-cli getrawtransaction "TXID" true
```

## 9) PSBT-style flow (where available)

Check command availability first:

```bash
raptoreum-cli help walletcreatefundedpsbt
raptoreum-cli help walletprocesspsbt
raptoreum-cli help finalizepsbt
```

Create/fund PSBT:

```bash
raptoreum-cli walletcreatefundedpsbt \
  '[]' \
  '{"RTM_DEST_ADDRESS":1.234}' \
  0 \
  '{}' \
  true
```

Process/sign PSBT with wallet:

```bash
raptoreum-cli walletprocesspsbt "PSBT_BASE64_HERE"
```

Finalize PSBT:

```bash
raptoreum-cli finalizepsbt "SIGNED_PSBT_BASE64_HERE"
```

If finalization returns transaction hex, broadcast it:

```bash
raptoreum-cli sendrawtransaction "FINAL_TX_HEX_HERE"
```

## 10) Signing-only flow for existing raw tx

If you already have funded raw hex:

```bash
raptoreum-cli signrawtransactionwithwallet "RAW_HEX"
raptoreum-cli signrawtransactionwithkey "RAW_HEX" '["WIF_PRIVKEY"]'
```

`signrawtransaction` is removed in modern v2.x builds; use:
- `signrawtransactionwithwallet`
- `signrawtransactionwithkey`

## 11) Useful operational commands

```bash
raptoreum-cli help
raptoreum-cli help "command"
raptoreum-cli getnetworkinfo
raptoreum-cli getmempoolinfo
raptoreum-cli resendwallettransactions
raptoreum-cli backupwallet "DEST_PATH"
```

## 12) JSON snippets (ready to paste)

Get wallet balance:

```json
{"jsonrpc":"1.0","id":"bal","method":"getbalance","params":[]}
```

List UTXOs for one address:

```json
{"jsonrpc":"1.0","id":"utxo","method":"listunspent","params":[1,9999999,["RTM_ADDRESS_HERE"]]}
```

List assets on one address:

```json
{"jsonrpc":"1.0","id":"assets","method":"listassetbalancesbyaddress","params":["RTM_ADDRESS_HERE"]}
```

Send RTM:

```json
{"jsonrpc":"1.0","id":"sendrtm","method":"sendtoaddress","params":["RTM_DEST_ADDRESS",12.34]}
```

Send asset:

```json
{"jsonrpc":"1.0","id":"sendasset","method":"sendasset","params":["ROOT/SUB",1,"RTM_DEST_ADDRESS","",""]}
```

Sign raw tx with wallet:

```json
{"jsonrpc":"1.0","id":"sign","method":"signrawtransactionwithwallet","params":["RAW_HEX_HERE"]}
```

Broadcast raw tx:

```json
{"jsonrpc":"1.0","id":"broadcast","method":"sendrawtransaction","params":["SIGNED_RAW_HEX_HERE"]}
```
