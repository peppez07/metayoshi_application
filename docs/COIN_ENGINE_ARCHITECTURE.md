# Coin Engine Architecture

This document defines the reusable structure used by the wallet runtime so new coins can reuse existing logic instead of duplicating scripts.

## 1. Core principle

A coin should declare **identity + configuration** only:

- network id / runtime model id
- chain type (`EVM`, `UTXO`, etc.)
- RPC / bridge endpoints
- capability flags

All behavior (address derivation, validation, send, asset read/send) should be resolved from shared engine code.

## 2. Shared runtime model resolver

Use `src/lib/runtimeModel.ts` as the single source of truth for model-family checks:

- `resolveRuntimeModelId()`
- `isCosmosLikeModelId()`
- `isCroCosmosModelId()`
- `requiresMnemonicForNetwork()`

This avoids repeating model switch logic in multiple files.

## 3. Engine behavior ownership

- `src/lib/chainRpcAdapter.ts`
  - chain custody mode
  - native send dispatch per engine
  - address validation and balance fetch
- `src/store/walletStore.ts`
  - account/address lifecycle
  - user action routing (send native / send asset)
  - high-level UX + activity recording
- `src/lib/*NonCustodial.ts`
  - protocol-specific transaction construction/signing

## 4. Add a new coin (high-level checklist)

1. Prefer `src/coins/factories.ts` to create coin modules so new coins are config-first instead of hand-written logic.
2. Add/adjust a coin module in `src/coins/` with the correct `runtimeModelId`, `coinType`, endpoints, and capabilities.
3. For standard runtime networks, add symbol/coin-id mapping once in `src/coins/standardRuntimeMeta.ts` (shared by payload and interceptor registries).
4. If chain-specific behavior already exists in an engine family (EVM/UTXO/Cosmos/etc), only wire metadata; do not duplicate send/sign code.
5. If a new model family is required, extend `src/lib/runtimeModel.ts` and adapter dispatch once.
6. Run `npm run build`.

## 5. Current quality direction

The architecture is moving toward:

- thin coin configs
- shared factories for repeated chain families
- centralized engine decision logic
- one metadata source for payload + interceptor runtime resolution
- non-custodial signing modules by chain family
- reusable send/read paths for all mapped coins in the same family
