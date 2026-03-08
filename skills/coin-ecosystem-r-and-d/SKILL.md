---
name: coin-ecosystem-r-and-d
description: Fast research workflow for new or partially implemented coin ecosystems. Use when Codex needs to gather trusted online facts before adding or correcting network support, RPC connections, explorers, tokens, provider behavior, or server-side adapter coverage across `metayoshi_application_nopack` and `metayoshi_SERVER`.
---

# Coin Ecosystem R And D

Use this skill to produce a short, reliable research brief before implementation work starts.

## Quick Start
- Search the local repos for the ecosystem name, ticker, chain ids, RPC domains, explorer domains, token standards, and any existing adapter or runtime references.
- Read `references/source-priority.md` before browsing.
- Read `references/research-checklist.md` while extracting facts.
- Start from `assets/research-brief-template.md` when summarizing findings.

## Workflow
1. Classify the request.
- New ecosystem support
- Partial or wrong implementation
- Missing RPC or explorer connection
- Provider or wallet compatibility uncertainty
- Cross-repo parity problem between extension and server

2. Inspect the current codebase state.
- Browser extension hotspots:
  - `src/coins/**`
  - `src/lib/**`
  - `src/store/**`
  - `src/background/**`
  - `src/content/**`
  - `src/inpage/**`
- Server hotspots:
  - `C:\Users\Giuseppe Grecu\metayoshi_SERVER\NewServer/src/coins/**`
  - `C:\Users\Giuseppe Grecu\metayoshi_SERVER\NewServer/src/ns_bridge.c`
  - `C:\Users\Giuseppe Grecu\metayoshi_SERVER\NewServer/src/ns_bridge_proxy.c`
  - `C:\Users\Giuseppe Grecu\metayoshi_SERVER\NewServer/docs/**`

3. Browse trusted sources before recommending code.
- Start with official websites, project docs, foundation docs, official GitHub orgs or repos, official explorer docs, and canonical protocol standards.
- Prefer primary sources over tutorials, blog posts, and token aggregators.
- If a third-party source is required, label it clearly and use it only as a gap-filler.
- Capture exact URLs and check dates for anything that can change.

4. Extract integration facts.
- Identity: chain name, symbol, decimals, native asset id, chain family, CAIP or chain id.
- Connectivity: RPC, REST, websocket, explorer, indexer, rate limits, auth requirements.
- Wallet semantics: address format, derivation path if relevant, signing model, fee model, nonce or sequence rules, confirmation or finality model.
- Compatibility: token standards, provider method expectations, unsupported flows, bridge or backend dependencies.

5. Map facts to implementation owners.
- Extension-only if the repo already has server support and the missing work is UI, runtime profile, or provider wiring.
- Server-only if the wallet UI is already modeled and the missing work is upstream adapter coverage or endpoint parity.
- Cross-repo if runtime semantics, network metadata, provider output, or public docs must stay aligned.

6. Produce a handoff brief.
- Use the template in `assets/research-brief-template.md`.
- Separate confirmed facts, likely assumptions, and unresolved gaps.
- Include exact source links, impacted files, likely risks, and validation ideas for the next coding step.

## Rules
- Browse before implementation for any new or uncertain ecosystem claim.
- Prefer two authoritative confirmations when practical.
- Keep exact names, ids, decimals, and endpoint paths copied from primary sources.
- Treat conflicting source data as a blocker to be surfaced, not normalized away.
- Never invent explorer endpoints, chain ids, or bridge credentials.

## Resources
- `references/source-priority.md`: Source ranking and conflict rules.
- `references/research-checklist.md`: Fact checklist for chain integration work.
- `assets/research-brief-template.md`: Reusable output format for the research handoff.
