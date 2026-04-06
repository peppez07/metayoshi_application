# MetaYoshi Dapp Multi-Request and Browser Interference Audit

> Note added on 2026-04-05: this exploratory audit predates subsequent fixes in the current working tree. Some findings in this file no longer match the latest code, including the current deny-by-default provider injection path, the safer request mismatch handling in `DappRequestConfirm`, and the removal of page lifecycle lock handling cited here. Treat this file as historical architecture context and use [github-release-audit-2026-04-05.md](./github-release-audit-2026-04-05.md) for the current GitHub release-readiness audit.

Date: 2026-04-05

Scope:
- `localdev/docs/dapp-flow-audit.md`
- `localdev/public/manifest.json`
- `localdev/src/content/content-script.ts`
- `localdev/src/inpage/inpage-provider.ts`
- `localdev/src/background/service-worker.ts`
- `localdev/src/lib/dappPermissions.ts`
- `localdev/src/lib/extensionSurfaceRoute.ts`
- `localdev/src/App.tsx`
- `localdev/src/pages/dapp/*`
- `localdev/src/pages/tx/TxConfirm.tsx`

Method:
- Static code audit only.
- No independent runtime penetration test was performed.
- No separate report outside `localdev/docs/dapp-flow-audit.md` was found in this repository.

## Executive Summary

The existing `dapp-flow-audit.md` correctly defines a non-custodial boundary between wallet, dapp frontend, backend, and chain. The implementation does not fully preserve that boundary under concurrent dapp usage and ordinary browser navigation.

The main problems are:
- provider injection is effectively enabled on all public websites by default;
- approvals and transaction/signing requests are stored as one global pending approval and one global pending request for the entire extension;
- approved dapps can mutate the wallet-wide active account and active network, affecting unrelated sites and the wallet UI itself;
- extension surface routing is also global, so one request can redirect another open wallet surface;
- normal browser navigation can trigger lock or reload behavior that interrupts dapp flows.

These issues do not mean the wallet is custodial. They do mean the current dapp session model is too global. The upgrade path is to move from wallet-global state to per-origin or per-tab dapp sessions while keeping signing and transfer approval fully local to the wallet.

## What The Existing Report Gets Right

The architectural report in `localdev/docs/dapp-flow-audit.md` is directionally correct on the most important custody boundary:
- the wallet signs and exposes wallet-owned state;
- the frontend orchestrates user flows but should not become a custodian;
- the backend coordinates business logic but should not sign or hold user keys;
- the chain remains the final source of truth.

That model should be kept. The remediation work is mostly about the extension bridge, permission model, and browser session handling.

## Verified Findings

### 1. High: Provider injection is effectively global by default

Evidence:
- `public/manifest.json:49-72` grants `http://*/*` and `https://*/*` host access, injects the content script on all matching pages at `document_start`, and exposes `assets/inpage.js` to all matching pages.
- `src/content/content-script.ts:247-264` returns `true` for public hosts when the allowlist is empty, and also falls back to `true` on read errors for public hosts.
- `README.md:162-168` says the inpage provider is still gated by the wallet allowlist and is not enabled on every page by default, which does not match the current implementation.

Impact:
- Every public site can detect wallet presence.
- Every public site gets the bridge and provider namespace unless it is a blocked internal host.
- Unauthorized sites can still fingerprint the wallet surface and active network metadata via redacted provider state.
- This increases privacy exposure and raises the chance of browser interference during ordinary web navigation.

### 2. High: Multi-request handling is not actually multi-request safe

Evidence:
- `src/lib/dappPermissions.ts:2-4` defines one global storage key for pending approval and one global storage key for pending request.
- `src/background/service-worker.ts:617-652` only reads and writes one pending approval and one pending request record.
- `src/background/service-worker.ts:1937-1989` rejects a new request when another request is already pending and it is not the exact same request.
- `src/background/service-worker.ts:2089-2103` returns `false` when another origin already has a pending approval.

Impact:
- One site can block another unrelated site from requesting access or showing a signing or transfer confirmation.
- Concurrent use across tabs or windows degrades into collisions instead of a queue or isolated sessions.
- A rejected or timed out request can look like a user decision when the real cause was a global slot conflict.

### 3. High: The request confirmation UI can jump to another site's request

Evidence:
- `src/pages/dapp/DappRequestConfirm.tsx:382-385` navigates to whatever pending request is currently in storage if the requested id does not match.
- `src/pages/tx/TxConfirm.tsx:164-179` behaves more safely and clears local state when the request id does not match, rather than redirecting to a different request.

Impact:
- A confirmation screen opened for site A can suddenly change to site B's request.
- This is unsafe in a wallet because it creates cross-origin UI confusion at the exact moment the user is approving a sensitive action.

### 4. High: Dapps mutate wallet-global account and network state

Evidence:
- `src/background/service-worker.ts:2621-2645` implements `wallet_switchEthereumChain` by updating `activeNetworkId` in wallet storage.
- `src/background/service-worker.ts:3223-3253` implements `wallet_selectAccount` by updating `activeAccountId` in wallet storage.
- `src/background/service-worker.ts:3256-3292` implements `wallet_switchNetwork` and `metayoshi_switchNetwork` by updating the same wallet-global `activeNetworkId`.
- `src/background/service-worker.ts:3306-3375` then broadcasts account and network changes to connected dapps.

Impact:
- One approved site can change the wallet context for other sites.
- One site can switch the network the user sees in the wallet UI.
- This violates least surprise and makes session isolation weak.

### 5. High: Extension routing is global and can redirect any open wallet surface

Evidence:
- `src/lib/extensionSurfaceRoute.ts:1-44` stores one global route in `chrome.storage.local`.
- `src/background/service-worker.ts:914-925` sets that global route before opening any extension surface.
- `src/background/service-worker.ts:1018-1081` uses the same route store for approval, request, and wallet surfaces.
- `src/App.tsx:263-298` listens for changes to that route key and updates `window.location.hash`.

Impact:
- Any new surface open can redirect an already-open wallet surface.
- This makes side-panel behavior nondeterministic when multiple tabs are interacting with the wallet.
- The route store is effectively a global UI mutex.

### 6. Medium: Normal navigation can lock the wallet or reload the webpage

Evidence:
- `src/App.tsx:236-246` locks the wallet on `pagehide` and `beforeunload`.
- `src/content/content-script.ts:342-365` automatically reloads the top-level webpage once after extension context invalidation.

Impact:
- Moving between wallet surfaces, reloading the extension, or normal page lifecycle events can interrupt an approval flow.
- Forced page reload is intrusive for ordinary browsing and can break dapp state.

### 7. Medium: Browser interference is amplified by current side panel behavior

Evidence:
- `src/background/extensionSurfacePolicy.ts:13-14` keeps approval, request, and wallet surfaces side-panel only.
- `src/background/service-worker.ts:3524-3530` enables `openPanelOnActionClick`.
- Chrome side panel documentation states that `sidePanel.open()` can override the currently active side panel in the corresponding tab or window.

Impact:
- The side panel is usable as a primary wallet surface, but with the current global route design it becomes a shared mutable UI surface.
- Multi-request support should not rely on a single mutable panel route shared through storage.

Reference:
- Chrome Extensions, Declare permissions: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- Chrome Extensions, `chrome.sidePanel`: https://developer.chrome.com/docs/extensions/reference/api/sidePanel

### 8. Medium: Permission state is duplicated across two stores

Evidence:
- `src/background/service-worker.ts:667-697` enforces scope access using both `DAPP_PERMISSIONS_STORAGE_KEY` and wallet-store `authorizedSites`.
- `src/pages/dapp/DappConnectStep2.tsx:97-109` separately adds an authorized site in UI state before writing the approval result.

Impact:
- Revoke, backup, restore, and migration logic can drift.
- It is harder to reason about the real source of truth for dapp authorization.

### 9. Medium: Provider standards support exists, but the implementation still has drift risk

Evidence:
- `src/inpage/inpage-provider.ts:759-780` implements EIP-6963 announce and request events.
- `src/inpage/inpage-provider.ts:782-801` implements a Solana wallet standard bridge.
- `src/inpage/inpage-provider.ts:915-960` still injects `window.ethereum`, `window.solana`, and `window.keplr` aliases directly when those globals are absent.
- `src/inpage/inpage-provider.ts:759-763` uses a remote `https://web.metayoshi.app/favicon.ico` for EIP-6963 provider info instead of a data URI.

Impact:
- Legacy aliases are fine as compatibility shims, but they should not remain the primary discovery model.
- EIP-6963 provider info is not fully aligned with the specification if the icon is not a data URI.
- The Solana bridge is custom enough that it should be regression-tested against current wallet-standard consumers.

References:
- EIP-1193: https://eips.ethereum.org/EIPS/eip-1193
- EIP-6963: https://eips.ethereum.org/EIPS/eip-6963
- Wallet Standard: https://wallet-standard.github.io/wallet-standard/
- Solana wallet standard repository: https://github.com/anza-xyz/wallet-standard

### 10. Medium: Test coverage does not cover the risky paths

Evidence:
- There are tests for `extensionSurfacePolicy`, server registry, and asset scope state.
- There are no focused tests for:
- concurrent dapp approvals;
- concurrent dapp action requests;
- provider injection gating;
- extension route isolation;
- content-script context invalidation;
- per-origin session behavior;
- revoke and reconnect behavior across multiple tabs.

Impact:
- The exact areas with user-facing race conditions currently rely on manual behavior and storage state rather than regression coverage.

## Risk Model For Normal Web Navigation

Under normal browsing, the extension currently does more than it needs to:
- it injects into essentially every public page;
- it opens a persistent event bridge on those pages;
- it exposes provider discovery and partial provider state even before a site is connected;
- it can reload the page after extension context invalidation;
- it can redirect an open wallet surface when another tab triggers a request;
- it can lock during page lifecycle transitions.

This is not a theft path by itself. It is a privacy, safety, and user-trust problem. For a non-custodial wallet, those problems still matter because a confused approval surface is a security issue.

## Recommended Target Architecture

The correct target is:
- one global wallet state for the user's own wallet UI;
- one permission record per origin;
- one dapp session per origin plus browser target;
- one request queue per session, not one request slot for the entire extension;
- one approval or request UI instance tied to a specific request id and session key.

A good session key shape is:
- `origin`
- `tabId`
- `frameId` if needed later
- `walletSessionId`
- `sessionNetworkId`
- `sessionAccountId`

The wallet should stay non-custodial:
- all private key material remains local;
- the dapp only gets addresses, balances, signatures, or broadcast results after approval;
- login signing and on-chain sending remain distinct request types;
- backend services never become signers.

## Remediation Plan

### Phase 0: Containment

1. Change default injection from allow-all to deny-by-default for public sites.
2. Move broad host access to `optional_host_permissions` where the browser flow permits it.
3. If always-on injection must stay for compatibility, only inject the minimal discovery stub by default and defer the full bridge until the site is authorized or the user explicitly enables the site.
4. Remove automatic webpage reload after context invalidation. Emit a provider `4900` error and require explicit reconnect instead.
5. Stop locking the wallet on `pagehide` and `beforeunload`. Keep idle lock, explicit lock, and full extension close behavior instead.
6. Fix the README so it matches the real permission model.

### Phase 1: Replace the global pending slots

1. Replace `DAPP_PENDING_APPROVAL_STORAGE_KEY` with a keyed approval map, indexed by `approvalId`.
2. Replace `DAPP_PENDING_REQUEST_STORAGE_KEY` with a keyed request map, indexed by `requestId`.
3. Add a request queue per `sessionKey`.
4. Allow unrelated sites to have independent pending items.
5. Keep deduplication only for exact retries from the same origin plus account plus network plus payload.
6. When a queue is busy, return a deterministic session-local status instead of pretending the user rejected the request.

### Phase 2: Separate wallet-global state from dapp session state

1. Introduce a `dappSessions` store keyed by origin plus browser target.
2. Store `selectedAccountId` and `selectedNetworkId` in the session, not in the wallet-global state.
3. Make `eth_accounts`, `eth_chainId`, `wallet_getProviderState`, and similar methods resolve from the session.
4. Make `wallet_switchEthereumChain` and `wallet_selectAccount` mutate the session by default.
5. If the user wants to change the main wallet view too, make that an explicit secondary action in the wallet UI.

### Phase 3: Isolate the extension surface

1. Remove the single global `EXTENSION_SURFACE_ROUTE_STORAGE_KEY`.
2. Encode route and request identity into the surface instance itself.
3. For side-panel flows, keep routing scoped to the tab or window target.
4. Never redirect an existing confirmation surface to a different request id.
5. If a request is missing or replaced, show a terminal state screen instead of navigating to another request.

### Phase 4: Standards-aligned web3 provider upgrade

1. Treat EIP-1193 as the EVM baseline and keep `window.ethereum` as a compatibility layer, not the primary discovery path.
2. Keep EIP-6963 as the preferred EVM discovery path.
3. Change the EIP-6963 icon to a data URI and freeze the detail object when announcing.
4. Return `4100` for authorization failures and reserve `4001` for real user rejection, following EIP-1193 guidance.
5. Return `4901` when a request targets a chain the provider is not connected to, instead of collapsing every mismatch into a generic error.
6. Keep custom multichain methods namespaced under `metayoshi_*` unless they fully conform to an existing standard.
7. For Solana, keep the current feature set but migrate the registration path toward the official wallet-standard helper model to reduce drift.
8. For Cosmos, keep Keplr compatibility as an adapter layer, not as the wallet's primary internal model.

### Phase 5: Permission model cleanup

1. Make one store the source of truth for dapp authorization.
2. Store scopes, timestamps, display name, favicon, selected account, selected network, and last-used metadata together.
3. Keep wallet backup and restore logic aligned with that one store.
4. Ensure revoke removes both permission and session state atomically.

### Phase 6: Security and UX hardening

1. Bind every approval screen to origin, account, network, method, and a request payload hash.
2. Display the exact site origin prominently on every approval and signing surface.
3. Rate-limit connection and signing spam per origin.
4. Cap request payload size and reject malformed serialized transaction blobs early.
5. Keep login signing clearly separated from transfer or broadcast approval.

### Phase 7: Test coverage

1. Add unit tests for injection gating and optional-host permission decisions.
2. Add unit tests for request queue semantics and deduplication.
3. Add unit tests for per-origin session account and network isolation.
4. Add UI tests for request mismatch handling so the app never redirects to another request.
5. Add integration tests for two dapps in two tabs requesting access at the same time.
6. Add integration tests for extension reload or service-worker restart without webpage reload.

## Suggested Implementation Order

1. Fix injection defaults, auto-reload, and `pagehide` locking.
2. Replace global pending approval and request storage with keyed maps.
3. Remove global route storage and bind every approval surface to a request id.
4. Introduce per-origin session account and network state.
5. Normalize EIP-1193 and EIP-6963 behavior.
6. Clean up permission persistence and add regression tests.

This order reduces browser interference first, then removes the highest-risk race conditions, then upgrades the provider model without weakening the non-custodial design.
