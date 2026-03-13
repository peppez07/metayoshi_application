# Documentation Map

This repository keeps two documentation layers:

- Root `docs/` for repository-level exports and architecture reference material
- `localdev/docs/` for the active extension-app source of truth

## Active Source-Of-Truth Docs

- Swap and service implementation roadmap:
  - `../localdev/docs/metayoshi-wallet-swap-services-roadmap.md`
- Fusion architecture and protocol runbook:
  - `../localdev/docs/metayoshi-wallet-fusion-master-runbook.md`

## Root-Level Reference Docs

- draw.io-ready flow specs:
  - `metayoshi-wallet-drawio-flow-specs.md`
  - `metayoshi-wallet-drawio-flow-specs-mermaid.md`

## Cleanup Rule

Do not keep duplicate planning documents in both `docs/` and `localdev/docs/`.

If a document governs implementation inside the extension app, keep the maintained version under `localdev/docs/` and point to it from the repository root instead of copying it.

