# MetaYoshi Wallet Swap And Service Roadmap

## Status

- Classification: `wallet-repo`
- Status: active implementation roadmap
- Source of truth for:
  - swap hardening
  - service-layer reliability upgrades
  - provider/background swap capability planning
- Companion document:
  - `localdev/docs/metayoshi-wallet-fusion-master-runbook.md` remains the broader protocol and architecture runbook

## Purpose

This document turns the current swap and service-gap review into a ranked execution plan that can be implemented in ticket-sized slices without re-scoping the work each time.

Use this roadmap for sequencing. Use the fusion runbook for broader architecture, protocol boundaries, and future protocol-module work.

## Current Baseline

- `/wallet/swap` exists and is functional as a popup-only server-routed flow.
- Swap quote, submit, and status calls are handled directly from the UI through `src/lib/serverExecution.ts`.
- Provider and background layers do not expose swap methods today.
- Secure bridge write sessions are cached too broadly and need account scoping.
- Swap execution is not yet restart-safe or store-owned.
- Service observability is uneven across bridge RPC, swap APIs, and server-address APIs.

## Delivery Rules

- Keep the existing swap page and extend it. Do not create a second swap UI.
- Preserve non-custodial approval behavior.
- Keep degraded mode explicit. Missing route, stale catalog, unsupported adapter, or blocked path must surface clearly.
- Every ticket that changes wallet behavior must validate:
  - `npm run lint`
  - `npm run build`
  - `/wallet/swap`
  - `/wallet/activity`
- Provider-facing tickets must also validate:
  - approval
  - rejection
  - locked-wallet behavior
  - popup reopen and resume behavior

## P0

### P0.1 Secure Bridge Session Isolation

- Goal: prevent secure bridge token reuse across account switches
- Priority reason: security boundary
- Files:
  - `src/lib/utxoRpc.ts`
  - `src/store/walletStore.ts`
- Tasks:
  - key secure bridge sessions by `apiBase + signerAddress`
  - invalidate session cache on account switch, lock, and unlock
  - reject cached sessions when the active signer no longer matches the cached address
- Dependencies: none
- Estimate: `S`
- Acceptance:
  - switching accounts forces a fresh secure auth flow
  - locked state cannot reuse a prior secure session
  - same-account writes still work normally

### P0.2 Persisted Swap State Machine

- Goal: move swap lifecycle ownership from page-local React state into durable wallet state
- Priority reason: restart safety and deterministic behavior
- Files:
  - `src/pages/wallet/Swap.tsx`
  - `src/lib/serverExecution.ts`
  - `src/store/walletStore.ts`
  - `src/lib/catalogDb/repository.ts`
- Tasks:
  - define a durable swap execution record with `quote`, `execution`, `status`, `updatedAt`
  - add store actions for quote persistence, submit, resume, and terminal cleanup
  - persist pending swap records in IndexedDB or extension storage
  - refactor `Swap.tsx` into a thin UI over store actions
- Dependencies:
  - `P0.1`
- Estimate: `M`
- Acceptance:
  - submitted swaps survive popup close and reopen
  - pending swaps resume status polling
  - terminal state is retained in history

### P0.3 Swap Preflight Hardening

- Goal: fail invalid swaps before signing
- Priority reason: user safety and deterministic validation
- Files:
  - `src/pages/wallet/Swap.tsx`
  - `src/lib/serverExecution.ts`
- Tasks:
  - enforce source-balance sufficiency
  - enforce decimal precision when metadata is available
  - reject expired quotes before signature
  - reject stale quotes after amount, pair, or settings drift
  - normalize error messages into explicit user-facing causes
- Dependencies: none
- Estimate: `S`
- Acceptance:
  - insufficient balance fails locally
  - expired quote cannot be signed
  - stale quotes do not submit silently

### P0.4 Pending Swap Activity And Recovery

- Goal: make swaps visible and trackable immediately after submit
- Priority reason: UX continuity and auditability
- Files:
  - `src/pages/wallet/Swap.tsx`
  - `src/store/walletStore.ts`
  - `src/lib/catalogDb/repository.ts`
  - `src/pages/wallet/Activity.tsx`
- Tasks:
  - insert a pending swap activity row on successful submit
  - update existing rows by `executionId` and receipt txid
  - restore pending swap activity after reopen
  - show clearer pending, failed, rejected, and expired states
- Dependencies:
  - `P0.2`
- Estimate: `M`
- Acceptance:
  - swap appears in activity immediately
  - resume behavior updates the same row instead of duplicating it
  - pending swap state survives restart

### P0.5 Service Observability Parity

- Goal: instrument swap and server-address APIs like bridge RPC
- Priority reason: operations and debugging
- Files:
  - `src/lib/serverExecution.ts`
  - `src/lib/serverAddressApi.ts`
  - `src/store/apiMonitorStore.ts`
  - `src/components/WalletFrame.tsx`
- Tasks:
  - wrap quote, submit, and status calls with request monitoring
  - wrap server-address balance, assets, history, portfolio, and price calls similarly
  - capture network id and route name in monitor entries
  - expose failures through existing diagnostics state instead of console-only logging
- Dependencies: none
- Estimate: `S`
- Acceptance:
  - quote and submit calls show in request monitoring
  - failures and slow calls are visible from the wallet shell

## P1

### P1.1 Store-Owned Swap Service Layer

- Goal: separate UI from swap business logic
- Files:
  - `src/pages/wallet/Swap.tsx`
  - `src/lib/serverExecution.ts`
  - `src/store/walletStore.ts`
  - new `src/lib/swap/*`
- Tasks:
  - extract quote, submit, and status orchestration into wallet-local service helpers
  - centralize normalization and validation outside the page
  - keep `Swap.tsx` as a form and review surface only
- Dependencies:
  - `P0.2`
  - `P0.3`
  - `P0.5`
- Estimate: `M`
- Acceptance:
  - page no longer owns transport and polling lifecycle
  - service layer is testable independently

### P1.2 Catalog Freshness And Refresh Controls

- Goal: make stale swap destination data explicit
- Files:
  - `src/store/walletStore.ts`
  - `src/lib/catalogDb/repository.ts`
  - `src/pages/wallet/Swap.tsx`
- Tasks:
  - expose `lastMetayoshiServerSyncAt` into store state
  - add manual catalog refresh from the swap page
  - mark stale results after a threshold
  - show explicit cached-only mode when server sync fails
- Dependencies: none
- Estimate: `S`
- Acceptance:
  - user can see last sync time
  - swap destination search can be refreshed on demand

### P1.3 Signed Quote Attestation

- Goal: bind displayed quote details to a verifiable payload
- Files:
  - `src/lib/serverExecution.ts`
  - `src/pages/wallet/Swap.tsx`
- Tasks:
  - extend quote payload with route hash, adapter id, signed expiry, and fee model
  - include attested quote fields in the user approval message
  - reject submit if attested fields drift from the displayed quote
- Dependencies:
  - `P1.1`
- Estimate: `M`
- Acceptance:
  - submit path verifies the displayed quote before signature and send

### P1.4 Service Retry And Circuit Breakers

- Goal: standardize retries and degraded-mode behavior across wallet services
- Files:
  - `src/lib/serverExecution.ts`
  - `src/lib/serverAddressApi.ts`
  - `src/lib/requestCache.ts`
  - `src/store/walletStore.ts`
- Tasks:
  - classify transient vs terminal service errors
  - add bounded retries where safe
  - add per-network cooldown or circuit-breaker state after repeated failures
  - surface degraded mode explicitly to the UI
- Dependencies:
  - `P0.5`
- Estimate: `M`
- Acceptance:
  - repeated failures degrade predictably and recover explicitly

### P1.5 Provider And Background Swap Capability Design

- Goal: expose explicit swap-related capabilities without weakening approval boundaries
- Files:
  - `src/inpage/inpage-provider.ts`
  - `src/background/service-worker.ts`
  - `src/lib/dappPermissions.ts`
  - `src/pages/dapp/DappRequestConfirm.tsx`
- Tasks:
  - add read-only quote and capability methods first
  - extend the method matrix and permission model
  - decide whether execution RPC should be supported or intentionally deferred
  - if execution is supported, route it through explicit approval UI
- Dependencies:
  - `P1.1`
- Estimate: `M`
- Acceptance:
  - swap-related provider capabilities are explicit and discoverable
  - no swap execution bypasses user approval

## P2

### P2.1 Official Swap Router Orchestration

- Goal: replace generic server-only routing with protocol-aware swap orchestration
- Files:
  - `src/pages/wallet/Swap.tsx`
  - `src/store/walletStore.ts`
  - new `src/lib/protocol/*` or `src/lib/swap/*`
  - `docs/metayoshi-wallet-fusion-master-runbook.md`
- Tasks:
  - read official router config and default adapter
  - enforce approved-adapter checks
  - enforce blocked route and blocked token checks
  - keep missing-module and degraded-mode states explicit
- Dependencies:
  - `P1.1`
  - `P1.3`
- Estimate: `L`
- Acceptance:
  - blocked route and adapter approval are visible before signing

### P2.2 Reward And Cashback Receipt Pipeline

- Goal: separate chain completion from reward or cashback lifecycle
- Files:
  - `src/store/walletStore.ts`
  - `src/lib/catalogDb/repository.ts`
  - `src/background/service-worker.ts`
  - new queue and receipt service files under `src/lib`
- Tasks:
  - build deterministic spend and swap receipt schema
  - add restart-safe reward submission queue states
  - prevent duplicate submission across restarts
  - keep rewardability separate from chain transaction success
- Dependencies:
  - `P2.1`
- Estimate: `L`
- Acceptance:
  - reward submission is conservative, restart-safe, and separately observable

### P2.3 Intent-Aware Routing

- Goal: make EVM `send`, `swap`, and `approve` intents affect execution behavior rather than remain informational only
- Files:
  - `src/lib/coinFeatureModel.ts`
  - `src/pages/wallet/Swap.tsx`
  - `src/pages/wallet/Send.tsx`
  - `src/pages/tx/TxConfirm.tsx`
- Tasks:
  - use intent to influence fee policy and approval messaging
  - separate approve-risk messaging from swap-risk messaging
  - keep runtime-model boundaries explicit
- Dependencies:
  - `P1.1`
- Estimate: `M`
- Acceptance:
  - intent controls are no longer informational-only metadata

### P2.4 Route Trust Scoring UI

- Goal: make route trust and degradation visible during quote review
- Files:
  - `src/pages/wallet/Swap.tsx`
  - `src/lib/serverExecution.ts`
- Tasks:
  - display sponsor trust, adapter identity, bridge domain, and route class
  - distinguish direct, sponsored, intent, and degraded routes
  - surface route risk warnings before signing
- Dependencies:
  - `P1.3`
  - `P2.1`
- Estimate: `S`
- Acceptance:
  - quote review explains who is involved in execution, not just output numbers

### P2.5 Adjacent Service Debt

- Goal: clean incomplete service stubs after swap core is stable
- Files:
  - `src/store/walletStore.ts`
  - `src/pages/settings/PasswordSettings.tsx`
  - `src/lib/coinFeatureModel.ts`
- Tasks:
  - replace the current password-change stub with real vault re-encryption
  - review informational-only model controls and either wire them or relabel them clearly
- Dependencies: none
- Estimate: `S`
- Acceptance:
  - password change works end to end
  - settings and model controls do not imply behavior that does not exist

## Recommended Sprint Sequence

### Sprint 1

- `P0.1`
- `P0.3`
- `P0.5`

### Sprint 2

- `P0.2`
- `P0.4`

### Sprint 3

- `P1.1`
- `P1.2`

### Sprint 4

- `P1.3`
- `P1.4`
- `P1.5`

### Sprint 5+

- `P2.1`
- `P2.2`
- `P2.3`
- `P2.4`
- `P2.5`

## Critical Path

1. `P0.1`
2. `P0.2`
3. `P0.4`
4. `P1.1`
5. `P1.3`
6. `P2.1`
7. `P2.2`

## Documentation Cleanup Decisions

- `localdev/docs/metayoshi-wallet-swap-services-roadmap.md` is now the active ticket-planning document for swap and service work.
- `localdev/docs/metayoshi-wallet-fusion-master-runbook.md` remains the broader architecture and protocol runbook.
- The duplicate root copy of the fusion runbook should not remain a parallel source of truth. Root-level docs should point to the `localdev/docs` source instead.

