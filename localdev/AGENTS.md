# AGENTS.md

## Project name
Metayoshi browser extension wallet.

## Mission
Build and maintain a production-grade multi-chain browser extension wallet with:
- robust browser extension behavior
- safe non-custodial signing flows
- clear chain-specific integration boundaries
- reliable packaging across Chromium and Firefox
- backward-compatible wallet and dapp behavior

## Actual project structure
- `src/background/service-worker.ts`: extension background/service worker, popup lifecycle, dapp RPC handling, approval orchestration.
- `src/content/content-script.ts`: webpage bridge bootstrap, runtime error capture, injection allowlist, background messaging.
- `src/inpage/inpage-provider.ts`: injected `window.metayoshi` / `window.rtm` provider surface for dapps.
- `src/App.tsx`: top-level route tree and route guards for auth, wallet, dapp approvals, tx flows, and settings.
- `src/pages/**`: popup pages and route-level flows such as register, unlock, wallet, dapp, tx, and settings.
- `src/components/**`: reusable popup UI, wallet shell, tabs, inputs, toasts, send forms.
- `src/store/**`: Zustand wallet state, persistence, balances, account addressing, activity, send actions.
- `src/coins/**`: network catalog, runtime profiles, server registry, payload builders, interceptors, token/logo assets.
- `src/lib/**`: shared protocol helpers, non-custodial signing modules, RPC adapters, permissions, storage, theming.
- `src/styles/index.css`: global theme tokens, popup component classes, animation utilities, light/dark treatment.
- `app/src/ui/index.html`: popup HTML entry used by Vite and packaged extension routes.
- `public/manifest.json`: base MV3 manifest copied into packaged output.
- `vite.config.ts`: multi-entry extension build for UI, background, content, and inpage scripts.
- `scripts/package-browser.mjs` and `scripts/zip-browser.mjs`: browser-specific packaging and release artifact helpers.
- `agents/**`: local specialist agent-skills used for routing engineering, release, security, and product tasks.
- `skills/**`: reusable workflow skills, references, and templates for repo-adjacent research and artifact generation.
- `C:\Users\Giuseppe Grecu\metayoshi_SERVER\_server_support\website`: companion support website repo for public SDK docs, support pages, and wallet-version sync.
- `dist*`: generated browser builds and packaged artifacts. Treat as outputs unless the task is explicitly about release artifacts.

## Product behavior guardrails
- Keep the existing wallet UI style and flow unless the user explicitly asks for a redesign.
- Preserve the current route model:
  - `/register`, `/unlock`, `/terms`
  - `/wallet/*`
  - `/assets*`
  - `/dapp/*`
  - `/tx/*`
  - `/settings/*`
- Preserve the current visual language:
  - compact extension-sized layouts
  - dark-first wallet chrome with light theme support
  - rounded cards, sheets, and dense information layout
  - orange primary accents and the existing MetaYoshi identity
- Innovate by extending the current product language, not by replacing it.
- Prefer targeted UX improvements, clearer states, and smarter defaults over sweeping rewrites.
- Infer the user's likely intent from the flow, route, and files involved before changing behavior.
- If intent is ambiguous, choose the smallest reversible change that keeps existing behavior stable.
- Keep user-facing copy natural and direct. Avoid robotic or over-explained language in UI text.
- Keep code comments human, short, and useful. Explain why, risk, or constraints; do not narrate obvious code.
- Watch for encoding regressions in user-facing text and comments. Do not introduce mojibake or mixed-encoding literals.

## Global engineering rules
- Prefer small, reviewable changes.
- Do not rewrite major wallet flows unless explicitly requested.
- Preserve extension and dapp compatibility unless a breaking change is approved.
- When wallet version, configured networks, provider methods, approval flows, or public SDK behavior change, review the companion website repo in the same task.
- Every behavior change should include:
  - validation steps
  - docs update if user-facing
  - rollback notes if risky
- Favor explicit errors over silent fallback.
- Favor deterministic behavior over hidden magic.
- Keep secrets and API keys in environment or injected config, never hardcoded.
- Keep signing and approval flows easy to audit.
- Keep wallet version claims aligned across `package.json`, `public/manifest.json`, popup UI labels, provider metadata, and companion website metadata.
- Prefer project-native patterns over introducing a new local architecture.
- Keep route guards, capability gates, and non-custodial checks explicit.
- When touching UX, preserve current spacing, interaction rhythm, and popup-size behavior.
- Do not hardcode bridge credentials, fallback secrets, or auth defaults in the client bundle.
- Do not route chain-specific behavior off ad hoc string checks when `runtimeModelId` or existing capability helpers already define the correct model boundary.
- When adding an EVM chain that should behave like the built-in L2s, add a dedicated `src/coins/*.ts` module via `createEvmCoinModule`, register it in `src/coins/index.ts`, wire selection aliases/chain IDs in `src/coins/coinSelection.ts`, and ensure its logo is present in `vite.config.ts` via `WALLET_LOGO_SPECS`. Do not treat server-registry aliases or interceptor metadata alone as sufficient support.
- Use official network metadata for new chain entries. Do not invent chain names, chain IDs, RPC URLs, symbols, explorers, or bridge coin IDs when a primary-source network document exists.
- Verify old audit notes, reports, and markdown plans against current code before treating them as truth.

## Architecture principles
- The extension is split into clearly bounded modules:
  - background/service worker
  - content/inpage bridge
  - React UI pages
  - wallet store/state management
  - chain adapters and payload builders
  - browser packaging/manifest handling
- In this codebase, those boundaries are primarily implemented in:
  - `src/background`
  - `src/content`
  - `src/inpage`
  - `src/pages` and `src/components`
  - `src/store`
  - `src/coins`
  - `src/lib`
  - `vite.config.ts`, `public/manifest.json`, and `scripts/**`
- Chain-specific logic must stay isolated behind adapter-style boundaries.
- Browser-specific packaging differences must not silently change wallet semantics.
- Dapp-facing provider compatibility is a product requirement, not a nice-to-have.
- UI route decisions should continue to flow through store state plus capability helpers such as:
  - `resolveNetworkCapabilities`
  - `resolveCoinModelFamily`
  - `getEnabledNetworks`
- Wallet persistence, active account/network state, approvals, balances, and send flows should stay centered in the Zustand store and its helpers, not scattered into route components.
- Provider behavior exposed to webpages must remain consistent across:
  - `src/inpage/inpage-provider.ts`
  - `src/content/content-script.ts`
  - `src/background/service-worker.ts`
- Global listeners in bridge/background code must have explicit lifecycle ownership. Do not attach per-connection listeners without cleanup.
- Dapp transaction routing should align with runtime model helpers, not only literal network ids.

## Safety and security rules
- Assume all external input is hostile.
- Non-custodial policy is mandatory.
- Never introduce secret exfiltration, key custody, or remote signing without explicit approval.
- Review every new permission, message bridge, or injected provider change for abuse risk.
- Avoid silent auto-approval behavior.
- Minimize attack surface in background, content, and inpage scripts.
- Treat bundled bridge usernames/passwords as secret-like operational material. Missing config must fail explicitly, not fall back to production-looking defaults.

## Delivery rules
- For every non-trivial change, include:
  1. summary of change
  2. files touched
  3. risks
  4. validation performed
  5. follow-up recommendations
- Add rollback notes when the change affects wallet behavior, bridge behavior, approvals, or browser packaging.
- Prefer concrete validation using repo commands when applicable:
  - `npm run lint`
  - `npm run build`
  - `npm run build:chrome`
  - `npm run build:firefox`
  - `npm run build:browsers`
  - `npm run test:api:firo-eth`
- For wallet version, SDK, provider, or configured-network changes that affect public docs, also validate:
  - `node C:\Users\Giuseppe Grecu\metayoshi_SERVER\_server_support\website\scripts\sync-wallet-metadata.mjs --check`
- For UI work, validate the affected route flow and extension-sized layout, not just compilation.
- For provider/security work, validate approval, rejection, and locked-wallet cases explicitly.
- For packaging work, verify expected outputs such as:
  - `dist/background.js`
  - `dist/assets/ui.js`
  - `dist/assets/ui.css`
  - `dist/app/src/ui/index.html`
- For text-heavy UI changes, scan for encoding corruption in rendered labels, placeholders, token labels, and comments.

## Team routing
When a task is mainly about:
- React UI, popup pages, route flow, wallet shell, component behavior, theme continuity, state wiring in `src/pages`, `src/components`, `src/App.tsx`, `src/styles` -> frontend-extension-engineer
- chain adapters, runtime profiles, RPC behavior, balances, payload builders, asset support, server registry, send logic in `src/coins`, `src/lib`, `src/store/walletStore.ts` -> blockchain-wallet-engineer
- new coin ecosystem R&D, official-doc and trusted-GitHub verification, partial or wrong chain metadata, or pre-implementation support discovery across the extension repo and companion server repo -> coin-ecosystem-researcher
- wallet-facing SDK docs, provider method documentation, cross-repo public capability claims, and website-facing support copy -> docs-sdk-maintainer
- manifest, Vite multi-entry build, popup entry HTML, packaging scripts, browser output artifacts in `vite.config.ts`, `public/manifest.json`, `app/src/ui/index.html`, `scripts/**` -> release-packaging-engineer
- wallet release/version drift and companion website sync in `C:\Users\Giuseppe Grecu\metayoshi_SERVER\_server_support\website` -> wallet-website-sync-owner
- permissions, message bridges, origin validation, storage safety, dapp approvals, secret handling in `src/background`, `src/content`, `src/inpage`, `src/lib/dappPermissions.ts`, `src/lib/bridgeAuth.ts` -> security-appsec
- smoke, regression, popup flow validation, packaged build checks, release confidence -> qa-browser-release
- change sequencing, compatibility decisions, feature scope, user intent tradeoffs -> product-wallet-owner
- architecture diagrams, draw.io-compatible flows, whitepapers, technical roadmaps spanning wallet app and server responsibilities -> wallet-documentation-architect
- multi-role delivery coordination across risky changes, release gating, cross-area sequencing -> release-orchestrator

If a task spans multiple areas:
- identify a primary owner
- consult affected roles
- do not make cross-cutting breaking changes without noting tradeoffs
