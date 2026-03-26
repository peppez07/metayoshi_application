# Solana + TRON Wallet/Server Re-Audit

Date: 2026-03-26

## Scope

- Wallet transport and signing paths for Solana and TRON
- MetaYoshi-only communication requirement
- Focused backend bridge compatibility validation

## Findings After Fix

### Solana

- Native send now builds and signs locally, then relays through MetaYoshi bridge write flow.
- SPL send now builds and signs locally, then relays through MetaYoshi bridge write flow.
- Dapp `signAndSendTransaction` no longer broadcasts with direct `Connection(...)`; it relays through MetaYoshi.
- Fee preview now uses bridge `getLatestBlockhash` and `getFeeForMessage`.
- Asset collection no longer falls back to direct Solana RPC.
- Direct Solana runtime transport markers (`new Connection(...)`, public fallback flags) were removed from wallet source paths.

### TRON

- Native send now signs locally and relays through MetaYoshi bridge `eth_sendRawTransaction` path.
- TRC20 send now reads metadata through MetaYoshi bridge, signs locally, and relays through MetaYoshi.
- Fee preview no longer uses direct `TronWeb` network calls; it now estimates through MetaYoshi bridge EVM-compatible methods.
- Balance fallback no longer uses direct TRON RPC.
- Direct TRON runtime transport markers (`TronWeb({ fullHost })`, `VITE_TRON_API_KEY`) were removed from wallet source paths.
- Local `TronWeb` usage remains only for offline address validation and conversion.

## Validation

### Wallet

- `npm run build` in `metayoshi_application/localdev`: passed
- Source grep for direct runtime transport:
  - no `new Connection(...)`
  - no `TronWeb({ fullHost: ... })`
  - no `VITE_SOL_ALLOW_PUBLIC_RPC_FALLBACK`
  - no `VITE_SOL_ALLOW_DIRECT_ASSET_RPC_FALLBACK`
  - no `VITE_TRON_API_KEY`

### Backend

Focused smoke run:

- command:
  - `powershell -ExecutionPolicy Bypass -File backend_gateway/tools/verify_coin_adapters.ps1 -BinaryPath backend_gateway/build_sui_wallet_fix/Release/newserver.exe`
- temporary startup placeholders were required for unrelated missing envs:
  - `LITECOIN_RPC_URL`
  - `BITCOINCASH_RPC_URL`
  - `ZCASH_RPC_URL`

Relevant results:

- `sol_balance=200`
- `sol_assets=200`
- `sol_history=200`
- `sol_bridge_blockhash=200`
- `sol_bridge_fee_for_message=200`
- `sol_send_invalid=502`
- `tron_balance=200`
- `tron_assets=200`
- `tron_history=200`
- `tron_bridge_chainid=200`
- `tron_bridge_balance=200`
- `tron_send_invalid=502`

## Residual Risks

- TRON is now aligned to the server's current EVM-compatible bridge contract, not a dedicated TVM-native send preparation API.
- Solana SPL preview uses a canonical ATA rent constant because the current bridge policy does not expose `getMinimumBalanceForRentExemption`.
- I did not run a live signed mainnet transaction from the wallet UI; validation is build-level plus backend smoke coverage.

## Conclusion

For wallet runtime flows, Solana and TRON are now MetaYoshi-only for balance fallback, fee preview, send relay, and the covered dapp/broadcast paths.
