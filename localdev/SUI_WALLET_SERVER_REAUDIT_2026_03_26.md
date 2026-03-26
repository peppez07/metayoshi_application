# SUI Wallet/Server Re-Audit - March 26, 2026

## Scope
- Wallet signing, fee preview, send, balance refresh, and same-chain swap submit for Sui.
- Wallet transport policy for Sui network config.
- Backend bridge allowlist and smoke coverage for wallet-required Sui JSON-RPC methods.

## Fixed in this slice
- Removed the wallet's baked-in public Sui RPC default.
- Stopped the server-registry overlay from restoring a direct Sui `rpcUrl`.
- Forced Sui `rpcUrl` to stay empty in server-only sanitization and wallet RPC config assembly.
- Kept Sui wallet signing on MetaYoshi bridge transport for:
  - native send
  - coin/object asset send
  - fee preview dry-run client
  - same-chain prepared swap signing + relay
- Added explicit backend allowlist entries for:
  - `suix_getReferenceGasPrice`
  - `suix_getLatestSuiSystemState`
  - `sui_getProtocolConfig`
- Extended backend adapter smoke coverage with Sui bridge probes for gas price and protocol config.

## Source re-audit result
- Wallet no longer ships `VITE_SUI_RPC_URL` or `https://sui-rpc.publicnode.com` as a Sui default.
- Wallet Sui transaction building now uses `createSuiBridgeClient(...)` instead of a direct RPC URL.
- Wallet-created Sui RPC config now clears `rpcUrl` when the active model is `sui`.
- Imported server-only network payloads also clear `rpcUrl` when the model is `sui`.
- Residual note: the backend still has its own Sui upstream fallback in `backend_gateway/src/coins/adapter_sui.c` if operators do not configure `SUI_RPC_URL` or `SUI_RPC_URLS`. That is server-to-provider traffic, not wallet-to-provider traffic.

## Validation performed
- Wallet build:
  - `npm run build`
  - Result: passed on March 26, 2026.
- Backend build:
  - `cmake -S backend_gateway -B backend_gateway/build_sui_wallet_fix -G "Visual Studio 17 2022" -A x64`
  - `cmake --build backend_gateway/build_sui_wallet_fix --config Release`
  - Result: passed on March 26, 2026.
- Focused backend Sui smoke on the fresh binary:
  - `/health` -> `200`
  - `GET /v1/status?coin=sui&chain=main` -> `200`
  - `GET /v1/address/{address}/balance?coin=sui&chain=main` -> `200`
  - `GET /v1/address/{address}/assets?coin=sui&chain=main` -> `200`
  - `POST /v1/bridge/sui/main` `sui_getChainIdentifier` -> `200`
  - `POST /v1/bridge/sui/main` `suix_getReferenceGasPrice` -> `200`
  - `POST /v1/bridge/sui/main` `sui_getProtocolConfig` -> `200`
  - `POST /v1/bridge/sui/main` `suix_getCoins` -> `200`

## Current Sui status
- Wallet signing remains non-custodial.
- Wallet-to-chain communication for the covered Sui flows now goes through MetaYoshi server surfaces only.
- Backend Sui bridge exposes the methods needed by the current wallet signing and fee-preview path.

## Remaining Sui follow-up
- If operator-controlled provider routing is required, set `SUI_RPC_URL` or `SUI_RPC_URLS` explicitly so the backend does not rely on its built-in fallback list.
- Add an end-to-end UI smoke for Sui send and Sui swap submit once a disposable funded test wallet is available.
- Revisit Sui dapp/connect features separately if direct third-party Sui dapp transport is introduced later.
