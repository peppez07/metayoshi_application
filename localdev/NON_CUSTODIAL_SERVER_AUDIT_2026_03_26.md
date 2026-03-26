# Wallet Non-Custodial + Server-Only Audit

Date: 2026-03-26

Scope:
- Repo audited: `metayoshi_application/localdev`
- Focus: whether wallet flows are non-custodial, whether wallet-chain communication is MetaYoshi-only, and which gaps must be fixed
- Paths reviewed: coin modules, wallet send flows, balance and asset collection, fee preview, dapp signing and broadcast, server-registry overlay, bridge config, and protocol-family adapters

Limitations:
- This audit is source-based. It does not prove runtime behavior of external dependencies not present in this repo.
- Monero non-custodial signing depends on an injected runtime (`window.__METAYOSHI_MONERO_RUNTIME__`), so this repo alone cannot prove that runtime is safe or non-exfiltrating.
- Findings are grouped by protocol family because most coin modules inherit family behavior.

## Executive Summary

Short answer:
- The wallet is mostly non-custodial by signing design.
- The wallet is not MetaYoshi-only today.
- Several families still talk directly to third-party RPC or REST endpoints.
- A few send capabilities are declared as non-custodial in shared protocol logic but are disabled in the live wallet UI.

Most important conclusions:
1. I found no clear evidence in this repo of MetaYoshi server-side key custody for mainstream families. Signing is generally local in the extension or in a local helper/runtime.
2. "Only communicates with MetaYoshi server" is false for live code paths. Solana, Sui, Cosmos, Stellar, and TRON still have direct client-side RPC or REST paths.
3. Some production flows are internally inconsistent:
   - local RPC settings still exist even though `createUtxoRpcConfig()` forces `useLocalRpc: false`
   - `resolveNetworkSendCustodyMode()` marks XRP, Cardano, and Monero as non-custodial-capable, but the wallet send actions currently throw `temporarily disabled`
   - Solana, Stellar, and TRON native send rely on direct `rpcUrl`, yet default network definitions leave that field blank

Bottom line:
- Non-custodial posture: mostly yes
- MetaYoshi-only posture: no
- Transport policy and capability truthfulness: inconsistent

## Findings

### 1. The wallet is not MetaYoshi-only

High severity because this is the central question of the audit.

Direct non-MetaYoshi chain communication remains in live code:

- Solana
  - direct RPC balance and asset reads: `src/lib/solanaNonCustodial.ts:53`, `src/lib/solanaNonCustodial.ts:153`, `src/lib/solanaNonCustodial.ts:286`
  - direct transaction submission: `src/lib/solanaNonCustodial.ts:411`, `src/lib/solanaNonCustodial.ts:452`
  - dapp sign-and-send submits directly to RPC: `src/lib/dappSigning.ts:321`, `src/lib/dappSigning.ts:333`
  - fee preview uses direct RPC connections: `src/lib/transactionFeePreview.ts:342`, `src/lib/transactionFeePreview.ts:437`, `src/lib/transactionFeePreview.ts:470`

- Cosmos family
  - signing helper derives direct REST/API candidates from `rpcUrl`: `src/lib/cosmosNonCustodial.ts:88`, `src/lib/cosmosNonCustodial.ts:136`
  - dapp broadcast posts directly to `/cosmos/tx/v1beta1/txs`: `src/lib/dappSigning.ts:167`, `src/lib/dappSigning.ts:467`, `src/lib/dappSigning.ts:474`
  - wallet native send signs locally, then relays through MetaYoshi bridge, so the family is mixed rather than server-only: `src/lib/protocolRegistry.ts:524`

- Sui
  - default direct RPC is publicnode: `src/coins/sui.ts:27`
  - native and asset send build against direct `SuiJsonRpcClient`: `src/lib/suiNonCustodial.ts:22`, `src/lib/suiNonCustodial.ts:105`, `src/lib/suiNonCustodial.ts:121`, `src/lib/suiNonCustodial.ts:159`
  - Sui is bridge-relayed on submission, but not MetaYoshi-only because build-time reads still use direct RPC

- Stellar
  - balance and submit use direct Horizon client: `src/lib/stellarNonCustodial.ts:13`, `src/lib/stellarNonCustodial.ts:45`
  - direct submit: `src/lib/stellarNonCustodial.ts:63`

- TRON
  - `TronWeb` is built from direct `rpcUrl`: `src/lib/tronNonCustodial.ts:13`
  - native and TRC20 submission are direct: `src/lib/tronNonCustodial.ts:67`, `src/lib/tronNonCustodial.ts:105`, `src/lib/tronNonCustodial.ts:124`, `src/lib/tronNonCustodial.ts:145`
  - fee preview also uses direct TRON RPC: `src/lib/transactionFeePreview.ts:519`

- Balance fallbacks still allow direct RPC in some families
  - direct Solana balance fallback: `src/lib/protocolAdapters/balances.ts:149`, `src/lib/protocolAdapters/balances.ts:435`
  - direct EVM fallback remains in code if `rpcUrl` is populated: `src/lib/protocolAdapters/balances.ts:379`
  - direct TRON fallback remains in code if `rpcUrl` is populated: `src/lib/protocolAdapters/balances.ts:470`

Conclusion:
- The repo does not enforce a strict "wallet talks only to MetaYoshi" rule.
- It enforces that rule for some families and some operations, but not consistently.

### 2. Non-custodial posture is mostly true, but it is not uniformly verifiable

Medium-to-high severity because the repo claims broad non-custodial support.

Evidence for mostly non-custodial:
- shared custody classification returns `non-custodial` for cosmos, solana, stellar, tron, sui, cardano, evm, utxo, and xrp: `src/lib/protocolRegistry.ts:732`
- EVM signs locally and relays signed raw transactions through bridge: `src/lib/protocolRegistry.ts:524`
- UTXO signs locally and broadcasts signed raw transactions: `src/lib/protocolRegistry.ts:721`
- Sui signs locally then relays signed bytes: `src/lib/suiNonCustodial.ts:105`, `src/lib/suiNonCustodial.ts:121`, `src/lib/suiNonCustodial.ts:159`
- Stellar, TRON, Solana sign locally in the wallet-side modules before submission
- Cardano constructs via server but signs locally before submit: `src/lib/cardanoNonCustodial.ts:112`, `src/lib/cardanoNonCustodial.ts:145`
- Monero signs via local injected runtime, then submits signed blob through MetaYoshi: `src/lib/moneroNonCustodial.ts:87`, `src/lib/moneroNonCustodial.ts:104`, `src/lib/moneroNonCustodial.ts:152`

Residual verification gap:
- Monero is only "non-custodial" if the injected runtime is trustworthy. This repo cannot verify that runtime because it is not implemented here: `src/lib/moneroNonCustodial.ts:22`, `src/lib/moneroNonCustodial.ts:88`, `src/lib/moneroNonCustodial.ts:91`

Conclusion:
- The wallet repo is architected for non-custodial signing.
- The Monero path is only partially auditable from this repo.

### 3. Capability truthfulness is inconsistent with live wallet behavior

High severity because this creates false expectations for users and future engineering.

Shared protocol logic says these families are non-custodial-capable:
- XRP, Cardano, Monero, Solana, Sui, Stellar, TRON, Cosmos, EVM, UTXO: `src/lib/protocolRegistry.ts:732`

But live wallet send actions still throw for some of them:
- XRP disabled: `src/store/walletStore.ts:7875`
- Cardano disabled: `src/store/walletStore.ts:7885`
- Monero disabled: `src/store/walletStore.ts:7895`

This means:
- protocol-family capability is ahead of actual wallet readiness
- audit/compliance reporting based only on shared protocol code would overstate live support

### 4. "Server-only" and "local RPC" policies conflict with each other

High severity because this creates unclear transport guarantees.

Evidence:
- `createUtxoRpcConfig()` still carries `rpcUrl`, `rpcUsername`, `rpcPassword`, and overrides, but it forcibly sets `useLocalRpc: false`: `src/store/walletStore.ts:1010`, `src/store/walletStore.ts:1054`
- the wallet store still exposes `setUseLocalRpc` and local RPC override state, so the UI and persisted state still model a capability the runtime suppresses in core config
- `sanitizeRpcUrl()` accepts any valid HTTP(S) URL, not just MetaYoshi URLs: `src/lib/serverOnly.ts:54`
- `sanitizeNetworkServerOnly()` preserves that sanitized direct RPC URL in server-only mode: `src/lib/serverOnly.ts:64`, `src/lib/serverOnly.ts:67`

Conclusion:
- The repo mixes three models at once:
  - bridge-first
  - server-only
  - optional direct/local RPC
- The code has not been fully normalized to one policy.

### 5. Sui is the clearest example of a built-in non-MetaYoshi dependency

High severity because it is default behavior, not just a fallback.

Evidence:
- Sui network definition defaults to `https://sui-rpc.publicnode.com`: `src/coins/sui.ts:27`
- server registry intentionally preserves direct `rpcUrl` for Sui while blanking it for most other mapped networks: `src/coins/serverRegistry/runtime.ts:232`
- wallet store refuses to proceed on Sui if no usable direct RPC URL exists: `src/store/walletStore.ts:7262`, `src/store/walletStore.ts:7265`

Conclusion:
- Sui currently depends on direct RPC by design.
- It is non-custodial, but it is not MetaYoshi-only.

### 6. Solana, Stellar, and TRON native sends are wired against direct RPC despite blank default `rpcUrl`

High severity because this is both an integration gap and a product mismatch.

Default network definitions leave direct RPC blank:
- Solana: `src/coins/sol.ts:26`
- Stellar: `src/coins/xlm.ts:24`
- TRON: `src/coins/tron.ts:24`

Server registry also keeps `rpcUrl` blank for mapped networks except Sui:
- `src/coins/serverRegistry/runtime.ts:232`

But wallet sends call direct-RPC modules:
- Solana native send: `src/store/walletStore.ts:7898`
- Stellar native send: `src/store/walletStore.ts:7957`
- TRON native send: `src/store/walletStore.ts:7982`

Conclusion:
- These send paths are not aligned with the server-only network model.
- In default MetaYoshi-server mode, they are likely incomplete or dependent on out-of-band RPC configuration.

### 7. Dapp flows can bypass MetaYoshi transport even when wallet-native flows do not

High severity because dapp surfaces are part of the same wallet trust boundary.

Evidence:
- Solana dapp sign-and-send submits directly to RPC: `src/lib/dappSigning.ts:321`, `src/lib/dappSigning.ts:333`
- Cosmos dapp broadcast posts directly to chain REST: `src/lib/dappSigning.ts:467`, `src/lib/dappSigning.ts:474`
- dapp request confirmation routes to those helpers: `src/pages/dapp/DappRequestConfirm.tsx:466`

Conclusion:
- Even if wallet-native send is migrated to MetaYoshi-only, the dapp surface must be migrated too or the policy will still be false.

### 8. UTXO and EVM are the closest to the intended architecture, but compatibility fallbacks remain

Medium severity.

EVM:
- main path is local sign plus MetaYoshi relay
- direct RPC fallback still exists in balance code if `rpcUrl` is populated: `src/lib/protocolAdapters/balances.ts:379`

UTXO:
- main path is bridge-first and non-custodial
- local/direct compatibility remains in `utxoRpc.ts`
- explorer fallback helpers still exist, including external explorer default for Raptoreum: `src/lib/utxoRpc.ts:190`

Conclusion:
- EVM and UTXO are the cleanest families, but the repo still contains escape hatches and legacy compatibility paths that prevent a strict server-only claim.

## Family Matrix

| Family | Included wallet networks | Non-custodial by design | MetaYoshi-only today | Notes |
|---|---|---:|---:|---|
| EVM | ETH, BASE, ARB, OP, BNB, AVAX C, Polygon, etc. | Yes | Mostly, but not strictly | Main send path is local sign plus bridge relay. Direct balance fallback still exists if `rpcUrl` is manually populated. |
| UTXO | BTC, DOGE, DASH, ZEC, RTM, BTCZ, FIRO, etc. | Yes | Mostly, but not strictly | Main path is bridge-first. Local/explorer compatibility remains in code. |
| XRP | XRP | Yes in shared protocol logic | Yes for bridge transport, but disabled in wallet UI | Native send action currently disabled. |
| Cosmos family | Cosmos, Osmosis, Akash, Kujira, Stargaze, Celestia, etc. | Yes | No | Local signing exists, but account lookup and dapp broadcast still use direct REST/RPC candidates. |
| Solana | SOL | Yes | No | Direct RPC for send, token send, dapp send, and fee preview. |
| Sui | SUI | Yes | No | Uses direct `SuiJsonRpcClient`, defaulting to publicnode, then relays signed tx through MetaYoshi. |
| Stellar | XLM | Yes | No | Direct Horizon reads and submit. |
| TRON | TRX | Yes | No | Direct TronWeb reads, fee estimation, native send, and TRC20 send. |
| Cardano | ADA | Yes | Yes for current implemented flow | Server-assisted construct and submit, local signing. Native wallet send currently disabled. |
| Monero | XMR | Intended yes | Yes for submit, but signer trust is external | Depends on injected runtime not present in repo. Native wallet send currently disabled. |

## Big Remediation Plan

### Phase 0: Decide and publish the transport policy

Goal:
- Stop the repo from claiming something it does not enforce.

Work:
1. Choose one explicit product policy:
   - strict MetaYoshi-only in production
   - server-first with explicit approved exceptions
   - development-only direct RPC allowed behind hard build flags
2. Encode that policy in one shared module used by wallet send, balance, fee preview, dapp broadcast, and server-registry overlay.
3. Add a short architecture note defining:
   - what counts as non-custodial
   - what counts as MetaYoshi-only
   - what exceptions, if any, are allowed

Acceptance criteria:
- no code path can silently choose direct third-party RPC in production mode
- transport policy is testable and documented

### Phase 1: Make the wallet truthful before making it broader

Goal:
- eliminate false capability signals and inconsistent UX first

Work:
1. Align `resolveNetworkSendCustodyMode()` with actual live wallet readiness.
2. If XRP, Cardano, and Monero remain disabled, mark them as disabled in capability/UI surfaces rather than reporting them as live non-custodial send families.
3. Decide whether `useLocalRpc` is a real supported mode.
4. If not supported, remove or dev-gate:
   - `useLocalRpc`
   - local RPC override UI/state
   - dead compatibility messaging

Acceptance criteria:
- capability flags match actual runtime behavior
- audit output from the repo is no longer misleading

### Phase 2: Migrate all direct wallet-chain communication behind MetaYoshi

Goal:
- make MetaYoshi the only production transport surface

Priority order:
1. Solana
   - replace direct `Connection` reads and submissions with MetaYoshi server endpoints or bridge RPC
   - migrate dapp sign-and-send to server relay
   - migrate fee preview to bridge/server
2. Cosmos
   - replace direct REST account/chain-id lookup with MetaYoshi endpoints
   - replace `broadcastCosmosTx()` direct chain POST with MetaYoshi broadcast endpoint
   - keep local signing, move network I/O to server
3. Sui
   - remove `publicnode` default from `src/coins/sui.ts`
   - move transaction build inputs and metadata reads behind MetaYoshi where possible
   - keep local signing, relay via MetaYoshi only
4. Stellar and TRON
   - add or standardize MetaYoshi-backed endpoints for balance, fee estimation, transaction submit, and token metadata where needed
   - remove direct Horizon and TronWeb submit dependence from production flows

Acceptance criteria:
- production send, asset send, fee preview, and dapp broadcast do not require third-party RPC URLs

### Phase 3: Normalize network configuration and registry overlay

Goal:
- stop mixing bridge-first and direct-RPC-first network models

Work:
1. Make `sanitizeRpcUrl()` respect the chosen production policy.
2. If production is server-only, reject non-MetaYoshi RPC URLs in production builds.
3. Update server-registry overlay so mapped networks do not preserve direct RPC URLs except in explicit dev/test mode.
4. Remove the Sui special case in `serverRegistry/runtime.ts` once MetaYoshi-only Sui transport exists.
5. Ensure families that still require direct RPC are not shipped with blank `rpcUrl` and misleading send capability.

Acceptance criteria:
- network objects no longer describe impossible or contradictory transport states

### Phase 4: Bring disabled families to one clear state

Goal:
- either fully support them or clearly defer them

Work:
1. XRP
   - decide whether to fully enable wallet send through the existing non-custodial bridge path or keep it disabled
2. Cardano
   - either enable native send with current construct-sign-submit flow or mark send as unsupported until complete
3. Monero
   - verify the injected runtime contract
   - document threat model for that runtime
   - either enable with strong guarantees or keep behind explicit feature gating

Acceptance criteria:
- no family is simultaneously described as supported and blocked

### Phase 5: Add regression tests that enforce policy

Goal:
- prevent reintroduction of direct transport drift

Recommended tests:
1. Static transport audit test
   - fail CI on production paths that instantiate direct chain clients without approved allowlist
2. Family transport tests
   - confirm each supported family uses MetaYoshi endpoints in production mode
3. Capability truth tests
   - if send is disabled in wallet, capabilities must not present it as available
4. Dapp transport tests
   - ensure dapp sign-and-send and broadcast paths follow the same production transport policy
5. Config tests
   - ensure server-registry overlay does not inject direct RPC into production networks unintentionally

### Phase 6: Rollout order

Safest delivery order:
1. Policy and truthfulness cleanup
2. Solana migration
3. Cosmos migration
4. Sui migration
5. Stellar and TRON migration
6. XRP/Cardano/Monero readiness decision
7. CI enforcement and cleanup of old compatibility paths

## Recommended Immediate Next Tasks

If work starts now, the most useful first implementation batch is:

1. Remove the Sui publicnode default and gate direct Sui RPC behind an explicit dev-only flag.
2. Make Solana dapp sign-and-send and fee preview use MetaYoshi transport instead of direct `Connection`.
3. Replace Cosmos direct dapp broadcast with a MetaYoshi server endpoint.
4. Align wallet send capabilities with the currently disabled XRP, Cardano, and Monero actions.
5. Decide whether `useLocalRpc` survives as a supported development feature or should be removed from persisted wallet state.

## Final Verdict

The wallet repo is closer to "non-custodial" than it is to "MetaYoshi-only."

That distinction matters:
- non-custodial is mostly true from the signing perspective
- MetaYoshi-only is false from the transport perspective

The main fix is not one bug. It is a repo-wide transport-policy cleanup plus family-by-family migration of direct RPC paths behind MetaYoshi server surfaces.
