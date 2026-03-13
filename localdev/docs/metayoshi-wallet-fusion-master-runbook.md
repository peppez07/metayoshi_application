# MetaYoshi Wallet Fusion Master Runbook

> Status note
>
> This file remains the broader architecture and protocol runbook.
>
> The active implementation board for swap and service hardening now lives in:
> `localdev/docs/metayoshi-wallet-swap-services-roadmap.md`
>
> Use this runbook for architecture boundaries, protocol-module scope, and long-horizon fusion planning.
> Use the swap/services roadmap for ranked execution order, ticket slicing, and sprint sequencing.

## 1. Execution Summary

- Classification: `cross-repo`
- Primary owner: `release-orchestrator`
- Consult roles:
  - `product-wallet-owner`
  - `frontend-extension-engineer`
  - `blockchain-wallet-engineer`
  - `security-appsec`
  - `docs-sdk-maintainer`
  - `wallet-website-sync-owner`
  - `qa-browser-release`
- Current execution pass: wallet-first
- Allowed edit repo in this pass: `C:\Users\Giuseppe Grecu\metayoshi_application_nopack`
- Reference-only repos in this pass:
  - `C:\Users\Giuseppe Grecu\MYToken\mytoken`
  - `C:\Users\Giuseppe Grecu\Metayoshi_Website\actual`
  - `C:\Users\Giuseppe Grecu\Metayoshi_Website\rebranding`
  - `C:\Users\Giuseppe Grecu\metayoshi_SERVER`
- Deliverable for this pass: one internal runbook file owned by the wallet repo
- Scope: full fusion planning and implementation sequencing for MYT, registry discovery, cashback, staking, jackpot, swap, UTXO receipts, and WalletConnect classification

## 2. Purpose

This file is the single execution source of truth for bringing MetaYoshi protocol features into the browser extension wallet without mixing repos, inventing unsupported public claims, or introducing custody assumptions.

This runbook exists to replace fragmented planning notes with one wallet-owned document that defines:

- architecture boundaries
- agent order
- module and ABI consumption rules
- execution phases
- file targets in the wallet repo
- acceptance criteria
- validation requirements
- blockers and deferred follow-ups

## 3. Non-Negotiable Boundaries

### 3.1 Repo boundaries

- Edit only the wallet repo in this pass.
- Do not modify `MYToken` contracts, scripts, docs, or deploy files in this pass.
- Do not modify website repos in this pass.
- Do not modify the server repo in this pass.

### 3.2 Public-claims boundaries

- This runbook is internal only.
- No website copy, support copy, SDK copy, or public metadata should be updated from this pass.
- No claim about MYT availability, supported reward flows, swap support, staking, jackpot, or live module status should be published until wallet behavior is implemented and validated against live protocol configuration.

### 3.3 Security boundaries

- The wallet remains fully non-custodial.
- All writes remain user-signed.
- Protocol reads and writes must use official registry-resolved modules only.
- Opaque contract calls are never auto-classified as rewardable actions.
- Reward submission is post-execution, explicit, persisted, and retry-safe.

## 4. Source Of Truth Rules

### 4.1 Protocol truth

For the wallet-first pass, `C:\Users\Giuseppe Grecu\MYToken\mytoken` is treated as the current protocol truth.

This includes:

- `contracts/core/MYTToken.sol`
- `contracts/core/MetaYoshiRegistry.sol`
- `contracts/wallet/MetaYoshiSpendRouter.sol`
- `contracts/wallet/MetaYoshiSwapRouter.sol`
- concrete rewards contracts under `contracts/rewards/*`

### 4.2 ABI consumption rule

- The wallet must read concrete contract ABIs or concrete function surfaces from protocol implementations when wallet behavior requires them.
- Minimal interface files in `contracts/interfaces/*` are not sufficient by themselves for full-fusion reads.
- If an interface omits a read method that the wallet needs, the wallet consumes the concrete implementation surface and marks the dependency explicitly in code and docs.

### 4.3 Registry rule

`MetaYoshiRegistry` is the only source of truth for official module addresses.

The wallet must resolve at minimum:

- `MODULE_TOKEN`
- `MODULE_CASHBACK`
- `MODULE_STAKING`
- `MODULE_JACKPOT`
- `MODULE_SPEND_ROUTER`
- `MODULE_SWAP_ROUTER`

No long-term hardcoded production module addresses are allowed in wallet logic.

## 5. Current Wallet Integration Surfaces

The existing wallet shell already provides stable entry points that protocol features must extend rather than replace.

### 5.1 Route surfaces

Current shell routes in `src/App.tsx`:

- `/wallet/assets`
- `/wallet/activity`
- `/wallet/send`
- `/wallet/swap`
- `/wallet/model/*`
- `/dapp/*`
- `/tx/*`
- `/settings/*`

### 5.2 Main UI shell

Current shell ownership:

- `src/pages/wallet/WalletLayout.tsx`: wallet home shell, quick actions, network and account selection
- `src/pages/wallet/Assets.tsx` and `src/pages/wallet/AssetsPage.tsx`: asset list surfaces
- `src/pages/wallet/Activity.tsx`: transaction history surface
- `src/pages/wallet/Send.tsx`: send flow
- `src/pages/wallet/Swap.tsx`: current placeholder swap flow to extend, not replace

### 5.3 State and background surfaces

- `src/store/walletStore.ts`: central protocol and queue state owner
- `src/background/service-worker.ts`: provider request routing and dapp classification boundary
- `src/inpage/inpage-provider.ts`: injected provider surface
- `src/pages/dapp/*`: user-facing dapp approvals and request handling

## 6. Target Architecture

```text
Wallet Shell
  -> Wallet Route Shell
  -> Protocol Feature Gates
  -> Protocol Status Banner
  -> MYT / Cashback / Staking / Jackpot / Swap UI

Wallet Store
  -> Registry Resolver Cache
  -> MYT Read Model
  -> Cashback Read Model
  -> Staking Read Model
  -> Jackpot Read Model
  -> Spend Router Read/Write Service
  -> Swap Router Read/Write Service
  -> Receipt Pipeline
  -> Reward Submission Queue

Background / Provider Layer
  -> WalletConnect / dapp request classification
  -> post-execution rewardability decisions
  -> explicit user approval boundaries
```

### 6.1 Ownership rules

- React pages render protocol state but do not own protocol orchestration.
- `walletStore` owns registry resolution, protocol data caching, queue persistence, and protocol-derived wallet state.
- Background and provider code own dapp request boundaries and must not infer rewardability optimistically.
- Core wallet send and swap flows remain operational even when MetaYoshi protocol modules are missing or inactive.

## 7. Agent Execution Order

Use the wallet-first sequence below inside implementation and review work.

1. `MetaYoshi Wallet React Extension Shell Agent`
2. `MetaYoshi Wallet Core Integration Agent`
3. `MetaYoshi Wallet Protocol State Agent`
4. `MetaYoshi Wallet Receipt Pipeline Agent`
5. `MetaYoshi Wallet EVM Adapter Agent`
6. `MetaYoshi Wallet UTXO Adapter Agent`
7. `MetaYoshi Price Normalization Agent`
8. `MetaYoshi Reward Submission Agent`
9. `MetaYoshi Wallet Reward UX Worker Agent`
10. `MetaYoshi Wallet Swap UI Worker Agent`
11. `MetaYoshi Wallet Connectivity Agent`
12. `MetaYoshi Wallet Extension Security Agent`
13. `Wallet Integration Review`

## 8. Protocol Module And ABI Map

### 8.1 Registry

- Source: `MetaYoshiRegistry.sol`
- Wallet responsibilities:
  - resolve active module addresses
  - cache per network
  - invalidate on network change, app cold start, registry refresh, or module failure

### 8.2 MYT token

- Source: `MYTToken.sol`
- Wallet reads required:
  - `balanceOf`
  - lifecycle state
  - transfer restriction messaging
  - reward validation state messaging
  - transfer-tax preview
- Wallet UX responsibilities:
  - show token state banner
  - warn on paused, restricted, deprecated, or blocked conditions

### 8.3 Cashback engine

- Source of actual read surfaces: `MetaYoshiCashbackEngine.sol`
- Wallet reads required:
  - config
  - action enablement
  - reward-block state
  - merchant block state
  - reward preview helpers
  - user reward stats
  - reward inventory and budget views when surfaced

### 8.4 Staking engine

- Source of actual read and write surfaces: `MetaYoshiStakingEngine.sol`
- Wallet reads required:
  - config
  - pending rewards
  - `stakeState`
  - eligibility
  - score
  - holding timer
  - holding multiplier
  - activity multiplier
  - lock multiplier
- Wallet writes required:
  - `syncSelf`
  - `lockStake`
  - `unlockStake`
  - `claimRewards`
  - `claimAllRewards`

### 8.5 Jackpot engine

- Source of actual read surfaces: `MetaYoshiJackpotEngine.sol`
- Wallet reads required:
  - participants
  - `previewParticipant`
  - parameter surfaces needed for eligibility UX
- Wallet rule:
  - jackpot drawing and funding are not wallet user actions in this pass
  - wallet is read-only for jackpot operation surfaces unless a later pass explicitly changes that

### 8.6 Spend router

- Source: `MetaYoshiSpendRouter.sol`
- Wallet writes required:
  - canonical spend receipt submission
  - route preview validation
- Wallet reads required:
  - router config
  - blocked user / merchant / source-chain checks
  - approved submitter policy visibility where relevant

### 8.7 Swap router

- Source: `MetaYoshiSwapRouter.sol`
- Wallet reads required:
  - router config
  - default adapter
  - approved adapter checks
  - blocked route and blocked token checks
  - allowlist checks when active
- Wallet writes required:
  - same-chain exact-input swap execution
  - optional cashback forwarding visibility

## 9. Wallet-Local Services To Implement

All of the following are wallet-local services owned by the wallet repo.

### 9.1 Registry resolver

- network-scoped
- resolves the six required module ids
- caches results with explicit refresh triggers
- returns explicit degraded mode, not silent fallback

### 9.2 MYT protocol read model

- reads token balance and lifecycle state
- derives wallet-facing restriction messaging
- exposes transfer-tax preview messaging where relevant
- exposes reward-recipient validation messaging for wallet UX

### 9.3 Cashback read adapter

- exposes reward previews and user stats
- exposes whether a spend action is likely blocked before submission
- does not duplicate reward math as wallet truth

### 9.4 Staking read/write adapter

- exposes score, balances, holding timers, lock state, pending rewards
- prepares and submits lock, unlock, and claim calls
- treats inactive or missing modules as explicit feature disablement

### 9.5 Jackpot read adapter

- exposes eligibility preview, participant state, and history-ready read model
- never implies guaranteed winnings

### 9.6 Spend receipt pipeline

- canonical receipt builder
- deterministic `spendId`
- deterministic `metadataHash`
- deterministic `merchantTag`
- separately derived `normalizedValue18`
- local validation before queueing

### 9.7 Reward submission queue

- persisted by account + chain + `spendId`
- state model:
  - `CREATED`
  - `QUEUED`
  - `SUBMITTING`
  - `SUBMITTED`
  - `CONFIRMED`
  - `FAILED_RETRYABLE`
  - `FAILED_TERMINAL`
  - `DROPPED_DUPLICATE`
- restart-safe
- transient/terminal error split is mandatory

### 9.8 Swap adapter orchestration layer

- extends the current `src/pages/wallet/Swap.tsx` flow
- does not create a second swap UI
- resolves official swap router first
- surfaces adapter, route, rewardability, and blocked-state checks explicitly

## 10. Required Behavioral Rules

### 10.1 Rewardability rules

The wallet must never treat the following as rewardable submissions:

- approvals
- allowance resets
- self-transfers
- wallet maintenance moves
- UTXO change outputs
- ambiguous contract calls
- dry-run or quote-only swap operations
- failed swaps

### 10.2 Submission rules

- Reward submission happens after a chain action is executed and classified.
- Reward submission state is distinct from the chain transaction state.
- The wallet never assumes reward success from optimistic local state.
- Duplicate suppression uses `spendId` first and canonical receipt hash second.

### 10.3 Degraded-mode rules

If a module is missing, inactive, or unusable:

- disable the related UI feature explicitly
- show why the feature is unavailable
- do not guess module addresses
- do not silently fall back to stale cached addresses

### 10.4 WalletConnect and dapp rules

- All dapp-originated actions remain user-approved.
- Rewardability is determined conservatively after the actual action shape is known.
- Unsupported request types fail safely without reward inference.

## 11. Phase Backlog

## Phase 1: Registry Discovery And MYT State

### Goals

- registry resolver
- MYT token read model
- protocol status banner
- explicit degraded mode

### Wallet targets

- `src/store/walletStore.ts`
- wallet-local protocol service layer under `src/lib` or a dedicated protocol folder
- `src/pages/wallet/WalletLayout.tsx`
- `src/pages/wallet/Assets.tsx` and `src/pages/wallet/AssetsPage.tsx`

### Acceptance criteria

- wallet resolves official modules from registry
- wallet shows MYT lifecycle state
- missing/inactive module states are explicit

## Phase 2: EVM Receipt Pipeline And Reward Queue

### Goals

- EVM payment classification
- canonical receipt builder
- dedupe by `spendId`
- persisted queue
- cashback sync state

### Wallet targets

- `src/store/walletStore.ts`
- send confirmation flow
- activity state model
- protocol submission service

### Acceptance criteria

- EVM self-transfers are excluded
- approvals are excluded
- submission queue survives restart
- activity shows tx state separately from reward state

## Phase 3: Staking Reads And Write Preparation

### Goals

- staking views
- pending rewards
- lock/unlock/claim UX
- blocked/ineligible handling

### Wallet targets

- `src/pages/wallet/*`
- `src/store/walletStore.ts`
- transaction preparation and confirmation flow

### Acceptance criteria

- wallet can read and display staking state
- user-signed staking actions are prepared through official modules only
- paused or blocked states are surfaced before action

## Phase 4: Jackpot Eligibility And History UX

### Goals

- eligibility preview
- participant visibility
- safe jackpot messaging

### Wallet targets

- wallet home surfaces
- dedicated jackpot panels within existing wallet routes
- activity or protocol history surfaces as appropriate

### Acceptance criteria

- wallet exposes jackpot eligibility without implying certainty
- blocked or ineligible states are clear

## Phase 5: Same-Chain Swap Router Integration

### Goals

- extend existing swap page
- route preview validation
- adapter approval checks
- rewardability preview
- swap cashback status

### Wallet targets

- `src/pages/wallet/Swap.tsx`
- `src/store/walletStore.ts`
- transaction confirmation and activity surfaces

### Acceptance criteria

- current placeholder swap page is extended rather than replaced
- blocked routes and unapproved adapters are explicit
- swap execution and cashback state remain separate

## Phase 6: UTXO Rewardable Spend Classification

### Goals

- change-output exclusion
- internal movement suppression
- low-confidence fail-closed behavior

### Wallet targets

- UTXO parsing and transaction normalization helpers
- queue and receipt pipeline
- activity explanation surfaces

### Acceptance criteria

- change is excluded from rewardable spend
- ambiguous UTXO transactions do not auto-submit
- the wallet can explain exclusion reasons

## Phase 7: WalletConnect And Dapp-Originated Rewardability

### Goals

- dapp request classification
- safe post-execution rewardability decisions
- unsupported request handling

### Wallet targets

- `src/background/service-worker.ts`
- `src/inpage/inpage-provider.ts`
- `src/pages/dapp/*`
- shared queue and receipt services

### Acceptance criteria

- unsupported request types do not become receipts
- all writes remain user-approved
- rewardability logic is conservative and explicit

## 12. Validation Matrix

### 12.1 Required wallet repo validation

For code changes from this runbook:

- `npm run lint`
- `npm run build`
- route validation for:
  - `/wallet/assets`
  - `/wallet/activity`
  - `/wallet/send`
  - `/wallet/swap`
  - dapp approval and request flows
- extension-sized layout validation for all new MYT and protocol states

### 12.2 Protocol behavior scenarios the wallet must validate against

- MYT states:
  - `DRAFT`
  - `ACTIVE`
  - `PAUSED`
  - `RESTRICTED`
  - `DEPRECATED`
- blocked user
- reward-blocked user
- missing module
- inactive module
- duplicate `spendId` across restart
- transient vs terminal submission failure split
- EVM self-transfer rejection
- UTXO change exclusion
- ambiguous UTXO fail-closed behavior
- swap route blocked
- adapter unapproved
- same-token swap rejected
- cashback optionality preserved
- WalletConnect request classification for safe vs unsupported methods

### 12.3 Deferred reference-repo validation

If a later pass edits `MYToken`:

- run Hardhat compile and relevant tests there before any wallet-facing claim is treated as final

If a later pass edits website or support surfaces:

- run wallet metadata and public-claims sync validation there

## 13. Explicit Blockers And Degraded Cases

The wallet pass must mark a feature blocked or degraded instead of guessing when any of the following is true:

- deployed registry is unavailable
- required module is not registered
- required module is inactive
- concrete contract surface is missing a needed read method
- deployed contract behavior diverges from the source-of-truth contract currently referenced by the wallet
- required price source or route metadata is unavailable with acceptable confidence

Blocked means:

- feature is disabled
- user sees why
- no fallback claim is published

## 14. Deferred Follow-Ups Outside This Pass

- token repo refactors or interface cleanup
- deploy script changes
- on-chain ABI packaging decisions in the token repo
- website feature announcements
- support or SDK documentation publication
- server-side metadata synchronization

## 15. Acceptance Criteria For This Runbook Itself

This document is complete only if it remains decision-complete for a wallet-first implementation pass.

That means an implementer can read this file and know:

- which repo can change
- which repos cannot change
- where protocol features attach to the current wallet shell
- which contract surfaces are authoritative
- which features are phased
- which validations are mandatory
- which blockers must disable features instead of inventing behavior

## 16. Closing Rule

Every non-trivial implementation derived from this runbook must close with:

1. classification
2. primary owner
3. consult roles
4. allowed repo edited
5. files changed
6. validations run
7. public-claims check result
8. remaining risks or follow-ups
