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

## Global engineering rules
- Prefer small, reviewable changes.
- Do not rewrite major wallet flows unless explicitly requested.
- Preserve extension and dapp compatibility unless a breaking change is approved.
- Every behavior change should include:
  - validation steps
  - docs update if user-facing
  - rollback notes if risky
- Favor explicit errors over silent fallback.
- Favor deterministic behavior over hidden magic.
- Keep secrets and API keys in environment or injected config, never hardcoded.
- Keep signing and approval flows easy to audit.

## Architecture principles
- The extension is split into clearly bounded modules:
  - background/service worker
  - content/inpage bridge
  - React UI pages
  - wallet store/state management
  - chain adapters and payload builders
  - browser packaging/manifest handling
- Chain-specific logic must stay isolated behind adapter-style boundaries.
- Browser-specific packaging differences must not silently change wallet semantics.
- Dapp-facing provider compatibility is a product requirement, not a nice-to-have.

## Safety and security rules
- Assume all external input is hostile.
- Non-custodial policy is mandatory.
- Never introduce secret exfiltration, key custody, or remote signing without explicit approval.
- Review every new permission, message bridge, or injected provider change for abuse risk.
- Avoid silent auto-approval behavior.
- Minimize attack surface in background, content, and inpage scripts.

## Delivery rules
- For every non-trivial change, include:
  1. summary of change
  2. files touched
  3. risks
  4. validation performed
  5. follow-up recommendations

## Team routing
When a task is mainly about:
- React UI, extension pages, UX, navigation, state wiring -> frontend-extension-engineer
- chain adapters, RPC behavior, assets, send/swap/runtime model logic -> blockchain-wallet-engineer
- manifest, Vite build, browser packaging, release artifacts -> release-packaging-engineer
- permissions, signing safety, secrets, bridge boundaries -> security-appsec
- smoke, regression, browser validation, release confidence -> qa-browser-release
- change sequencing, compatibility decisions, scope control -> product-wallet-owner
- multi-role delivery coordination across risky changes -> release-orchestrator

If a task spans multiple areas:
- identify a primary owner
- consult affected roles
- do not make cross-cutting breaking changes without noting tradeoffs
