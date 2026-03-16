# MetaYoshi Swap V1 Integration Plan

## Objective

Define a realistic V1 swap system that fits the current MetaYoshi wallet and a new Rust + SQLite backend without introducing custody on the server.

V1 target:

- EVM same-chain swaps through `0x`
- Solana same-chain swaps through `Jupiter`
- One controlled cross-chain route through `LI.FI` or `Across`
- Unified quote schema
- Unified execution lifecycle tracking
- Wallet-only signing
- SQLite-backed persistence
- Modular provider adapters for future expansion

## Current Metayoshi Baseline

Relevant current wallet files:

- `localdev/src/pages/wallet/Swap.tsx`
- `localdev/src/lib/serverExecution.ts`
- `localdev/src/lib/swapEligibility.ts`
- `localdev/src/coins/types.ts`
- `localdev/src/coins/serverRegistry/types.ts`

Current state:

- Wallet swap UI already exists.
- Quote/submit/status RPC contract already exists in the wallet.
- Current swap eligibility is effectively EVM-only.
- Current `serverExecution.ts` is shaped around a server-managed EVM flow and local EVM transaction broadcast.
- Solana support exists elsewhere in the wallet, but not in the swap contract.
- There is no Rust swap backend in this repo yet.

## Hard Requirements To Preserve

- Server must never hold private keys.
- Server must never sign for the user.
- Wallet signs chain-specific payloads locally.
- Provider-specific response formats must not leak into wallet-facing APIs.
- Approvals must be explicit execution steps, not hidden side effects.
- Quote expiry, slippage, route steps, and failures must be first-class modeled fields.

## Main Gap Between Current Wallet And Target V1

The current wallet swap contract is too narrow for the requested V1:

- `ServerSwapQuote` is optimized for one summarized route, not ranked route sets.
- `ServerExecutionMode` does not cover the requested `ExecutionModel` split.
- Execution polling is shaped around simple EVM transaction confirmation and one server status endpoint.
- Current wallet-side asset eligibility blocks non-EVM swap routing.
- The current quote metadata path is loosely typed and carries provider-specific blobs.

The new backend should therefore introduce a new normalized V1 contract while preserving a migration path for the existing wallet screen.

## Recommended Contract Strategy

Do not mutate the current wallet contract in place first.

Introduce a new V1 API surface:

- `POST /v1/quotes`
- `GET /v1/quotes/{id}`
- `POST /v1/executions`
- `GET /v1/executions/{id}`
- `GET /v1/providers/health`
- `GET /v1/assets`
- `GET /v1/chains`

Then add a thin wallet adapter layer in `localdev/src/lib/serverExecution.ts` that translates between:

- current UI state and wallet models
- new backend request/response contracts
- chain-specific signing/broadcast logic

This avoids freezing backend design around the current EVM-only assumptions.

## Proposed Repo Shape

```text
/server
  /Cargo.toml
  /src
    /api
      quotes.rs
      executions.rs
      assets.rs
      chains.rs
      health.rs
      mod.rs
    /config
      mod.rs
    /db
      mod.rs
      models.rs
      queries.rs
    /execution
      mod.rs
      state_machine.rs
    /models
      api.rs
      domain.rs
      ids.rs
      provider.rs
      mod.rs
    /providers
      mod.rs
      traits.rs
      mock.rs
      zero_x
        mod.rs
      jupiter
        mod.rs
      lifi
        mod.rs
    /ranking
      mod.rs
    /services
      quotes.rs
      executions.rs
      assets.rs
      health.rs
      mod.rs
    /tests
      quote_aggregation.rs
      execution_creation.rs
    main.rs
  /migrations
    0001_init.sql
    0002_indexes.sql

/wallet_integration
  /api_contract
    swap_v1_contract.md
  /flow_docs
    wallet_server_sequences.md
  /examples
    evm_quote_and_execute.md
    solana_quote_and_execute.md

/docs
  architecture.md
  sequence_flows.md
  provider_matrix.md
  security.md
  swap_v1_metayoshi_plan.md
```

## Wallet And Backend Responsibility Split

### Wallet

- Builds quote requests from current account/network/asset context
- Resolves user address per chain
- Presents ranked routes
- Shows approvals and warnings explicitly
- Requests execution payload for chosen route
- Signs transactions locally
- Broadcasts locally where the execution model requires it
- Polls backend for lifecycle status

### Backend

- Validates and normalizes quote requests
- Fans out to providers in parallel
- Normalizes provider responses to one domain model
- Ranks routes by preference
- Stores quotes and executions in SQLite
- Builds execution payloads and step metadata
- Tracks execution progression and expiry
- Exposes provider health and supported assets/chains

## Trust Boundary

The backend is an orchestrator, not a custodian.

Safe backend responsibilities:

- route discovery
- response normalization
- quote persistence
- execution orchestration
- status aggregation
- provider health tracking

Forbidden backend responsibilities:

- private key storage
- signing
- silent approval widening
- implicit address substitution
- broadcasting a different payload from what the wallet reviewed

## V1 Execution Models

Keep the enum future-proof even if V1 fully uses only two models:

- `EvmTx`
- `SolanaTx`
- `DepositAddress`
- `Psbt`
- `IntentOrder`

V1 implementation:

- same-chain EVM routes: `EvmTx`
- same-chain Solana routes: `SolanaTx`
- controlled cross-chain routes:
  - source side often `EvmTx` or `SolanaTx`
  - destination fulfillment tracked server-side after source submission

## Provider Fit For Metayoshi V1

### 0x

Use for:

- same-chain EVM swaps

Must model explicitly:

- allowance target
- approval amount
- approval transaction step
- swap transaction step
- quote expiry
- gas estimate

### Jupiter

Use for:

- same-chain Solana swaps

Must model explicitly:

- current API host configuration
- API-key-aware config
- base64 serialized transaction payloads
- setup or wrap/unwrap steps when present
- quote expiry semantics

### LI.FI or Across

Recommendation: start with `LI.FI` for V1.

Reason:

- easier to normalize mixed DEX + bridge route steps into a unified schema
- broader controlled routing surface
- cleaner path to adding more chains later

If strict operational control is preferred over breadth, switch to `Across`.

## Migration Impact On Existing Wallet Code

### `localdev/src/lib/serverExecution.ts`

Refactor into:

- request/response schema definitions
- chain-specific execution payload handling
- quote/execution REST client
- execution polling helpers

Remove the current implicit assumptions that:

- all swaps are EVM-shaped
- all broadcastable steps are EVM transactions
- provider details live in untyped metadata blobs

### `localdev/src/lib/swapEligibility.ts`

Expand from EVM-only gating to:

- EVM same-chain support
- Solana same-chain support
- controlled cross-chain allowlist based on backend-supported capabilities

Eligibility should be driven by backend `chains/assets/providers` capability data, not hardcoded wallet assumptions.

### `localdev/src/pages/wallet/Swap.tsx`

UI changes needed:

- show multiple ranked route options
- show route preference selector:
  - `BestValue`
  - `Fastest`
  - `LowestGas`
  - `Safest`
- show execution model label
- show explicit approval step on EVM
- show quote expiry countdown per route
- show cross-chain pending state breakdown

## Recommended Build Order

### Phase 1: Contract And Types

- Define normalized chain and asset identifiers.
- Define wallet-facing V1 API schemas.
- Define Rust domain models.
- Define SQLite schema.
- Freeze the trust boundary and signing rules.

Exit criteria:

- wallet and backend teams can code against the same contract
- no provider-specific fields exposed in wallet API

### Phase 2: Backend Core

- Create Rust server skeleton with `axum`
- Add config loading
- Add `sqlx` SQLite pool and migrations
- Implement provider trait
- Implement mock provider
- Implement quote aggregation service
- Implement ranking engine

Exit criteria:

- `POST /v1/quotes` returns normalized ranked routes from mocks

### Phase 3: Execution Core

- Add execution creation flow
- Add explicit state machine
- Persist executions and steps
- Add polling/status endpoints

Exit criteria:

- `POST /v1/executions` creates durable execution records
- status lifecycle is testable without live providers

### Phase 4: Real Providers

- Add `0x` adapter
- Add `Jupiter` adapter
- Add `LI.FI` or `Across` adapter
- Add provider retry, timeout, and health scoring

Exit criteria:

- one EVM same-chain route works end-to-end
- one Solana same-chain route works end-to-end
- one controlled cross-chain route works end-to-end

### Phase 5: Wallet Integration

- Add new wallet REST client
- Add route display and preference handling
- Add EVM approval UX
- Add Solana transaction payload UX
- Add execution polling UI updates

Exit criteria:

- wallet can quote, choose, sign, submit, and track all V1 route classes

## Risks To Resolve Early

### 1. Chain Identifier Drift

Current wallet networks use app-specific IDs like `eth`, `arb`, `sol`.

Backend needs a canonical chain registry that can map:

- wallet network IDs
- CAIP-like identifiers
- provider-specific chain identifiers

Without that mapping, provider adapters will become brittle.

### 2. Asset Identity Drift

Current wallet asset IDs are heterogeneous:

- `native:<networkId>`
- EVM contract-address-derived IDs
- Solana mint-based IDs

The backend must persist canonical `asset_id` values plus alias rows for:

- wallet asset IDs
- provider token identifiers
- contract addresses
- mint addresses

### 3. Execution Payload Diversity

EVM and Solana payloads must not be represented as one generic opaque blob.

Use an explicit union shape:

- `EvmTransactionPayload`
- `SolanaTransactionPayload`

Future variants:

- `DepositAddressPayload`
- `PsbtPayload`
- `IntentOrderPayload`

### 4. Quote Lifetime Mismatch

Providers expose expiry differently.

Normalize every quote to:

- `quoted_at`
- `expires_at`
- `is_stale`

The wallet should never assume a quote remains valid past `expires_at`.

### 5. Cross-Chain Finality Ambiguity

Cross-chain routes can sit in indeterminate states for minutes.

The execution state machine therefore needs explicit intermediate states and timestamped updates, not a simple pending boolean.

## Recommended First Coding Tasks In This Repo

1. Create `/server` Rust project skeleton with `axum`, `tokio`, `serde`, `sqlx`, `tracing`, `uuid`, `chrono`, `thiserror`.
2. Add SQLite migrations for chains, assets, providers, quotes, quote steps, executions, execution steps, provider health, and token aliases.
3. Write normalized Rust domain models and API DTOs.
4. Refactor wallet `serverExecution.ts` into a V1 client module that can consume ranked routes and typed execution payloads.
5. Add a wallet feature flag so the current swap screen can switch between legacy and V1 contracts during rollout.

## Acceptance Criteria For V1

The V1 design is ready when all of the following are true:

- wallet signs locally for every route
- server stores no private keys
- wallet-facing quote schema is provider-agnostic
- approvals are explicit EVM execution steps
- Solana swap payloads are returned in a chain-specific typed form
- cross-chain routes use one controlled provider path only
- execution state machine is persisted and test-covered
- provider timeout, retry, and health scoring exist
- chain and asset registries are normalized enough to avoid adapter-specific hacks

## Recommendation

Proceed with a greenfield `/server` implementation and a compatibility refactor on the wallet side.

Do not extend the current `serverExecution.ts` contract directly as the backend source of truth. It is useful as a temporary client transport, but not strong enough to be the canonical V1 swap architecture for MetaYoshi.
