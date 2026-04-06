# MetaYoshi GitHub Release Audit

Date: 2026-04-05

Scope:

- repository hygiene for public GitHub publication
- existing public documentation and community health files
- local validation commands
- manifest and dapp-session release risk review

Validation performed:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm audit --omit=dev`

## Executive Summary

MetaYoshi Wallet is in a reasonable state for public GitHub source publication after documentation and repository hygiene cleanup. The repository now has the expected public-facing standards files, a stronger README, a release checklist, issue templates, CI, and Dependabot configuration.

The project is not yet a clean broad-distribution candidate for browser stores or security-sensitive public rollout. The main remaining blockers are architectural rather than packaging-only:

- dapp approvals and requests still use one global pending slot
- extension surface routing is still global

## What Was Fixed During This Audit

- Added ignore rules for `.env.local`, `.env.*.local`, and `metayoshi.build.json`
- Removed verbose runtime `console.log` tracing from EVM asset loading paths
- Removed the temporary scratch file `scripts/tmp-import-test.ts`
- Added `npm run test` and `npm run check:release`
- Refreshed dependencies and lockfile until `npm audit --omit=dev` returned clean
- Added GitHub community files and automation:
  - `CONTRIBUTING.md`
  - `CODE_OF_CONDUCT.md`
  - `SUPPORT.md`
  - `CHANGELOG.md`
  - `.github/ISSUE_TEMPLATE/*`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/workflows/ci.yml`
  - `.github/dependabot.yml`
- Added this release audit and a repository release checklist
- Marked the older dapp browser audit as historical context where it no longer matches current code

## Validation Results

### Pass

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm audit --omit=dev`

### Warnings

- Vite production build still emits chunk-size warnings above `500 kB`

## Verified Findings

### 1. High: Dapp approvals and requests still use global pending state

Evidence:

- `src/lib/dappPermissions.ts` defines `DAPP_PENDING_APPROVAL_STORAGE_KEY` and `DAPP_PENDING_REQUEST_STORAGE_KEY` as single storage records
- `src/background/service-worker.ts` rejects unrelated requests when another origin already occupies the pending slot

Impact:

- concurrent dapps in separate tabs can block each other
- global request state increases UI confusion risk for a wallet product
- this remains a release blocker for broad public distribution even though GitHub source publication is acceptable

### 2. High: Extension surface routing is still global

Evidence:

- `src/lib/extensionSurfaceRoute.ts` stores one route value in `chrome.storage.local`
- `src/App.tsx` consumes that route and applies it to whatever open wallet surface is listening

Impact:

- a new approval or request surface can redirect another already-open surface
- side-panel behavior stays coupled across tabs and windows

### 3. Medium: Production bundle size remains large

Evidence:

- `npm run build` reports several chunks well above the default Vite warning threshold

Impact:

- large chunks can hurt extension startup cost and review confidence
- chunking and lazy-loading work should be scheduled before broader distribution

### 4. Low: Older internal audit notes contain stale findings

Evidence:

- `docs/dapp-multirequest-browser-audit-2026-04-05.md` no longer fully matches current code in areas such as default provider injection and request mismatch handling

Impact:

- stale reports create confusion during external review unless clearly marked

## Release Decision

### GitHub Source Publication

Acceptable after this audit patch, as long as:

- local secrets remain excluded from upload
- the release audit is kept visible
- maintainers do not present the current architecture as production-hardened beyond the evidence in this repository

### Browser Store Or Broad Production Rollout

Not yet recommended until the high-severity dapp session isolation and extension routing findings are resolved or explicitly accepted with compensating controls.
