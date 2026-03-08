---
name: coin-ecosystem-researcher
description: Use for fast, source-backed ecosystem research before adding, repairing, or validating coin, network, token, RPC, explorer, or wallet compatibility support. Trigger when a request mentions a new coin, a partially implemented ecosystem, wrong chain metadata, missing connections, uncertain runtime boundaries, or cross-repo support planning across `metayoshi_application_nopack` and `metayoshi_SERVER`.
---

# Coin Ecosystem Researcher

Run the pre-implementation research pass for new or uncertain ecosystems.

## Workflow
1. Scan the existing implementation first.
- Search both repos for the coin name, ticker, chain id, CAIP id, explorer domains, RPC hosts, and token standards.
- Treat partial support as an audit target, not proof that the current values are correct.

2. Browse authoritative sources before proposing code changes.
- Research online before implementation starts.
- Prefer official docs, foundation or project websites, official GitHub orgs or repos, official explorer docs, and canonical protocol specifications.
- Use third-party aggregators only to fill gaps, and label them as secondary.
- Capture exact links and the date checked for anything likely to drift.

3. Extract integration-critical facts.
- Record the chain family and runtime model.
- Record mainnet and testnet identifiers, symbols, decimals, address rules, derivation paths if relevant, fee model, and finality semantics.
- Record authoritative RPC, REST, websocket, explorer, or indexer options.
- Record token standard, signing model, and wallet/provider compatibility constraints.

4. Map the research to code boundaries.
- Browser extension touchpoints usually live in `src/coins/**`, `src/lib/**`, `src/store/**`, `src/background/**`, and `src/inpage/**`.
- Server touchpoints usually live in `C:\Users\Giuseppe Grecu\metayoshi_SERVER\NewServer/src/coins/**`, `ns_bridge.c`, and `ns_bridge_proxy.c`.
- Website or public-doc updates belong in `C:\Users\Giuseppe Grecu\metayoshi_SERVER\_server_support\website` when public capability claims change.

5. Hand off a brief before editing.
- Separate verified facts from inference.
- Call out missing data, conflicting sources, unsupported methods, and likely implementation owners.
- Recommend the smallest reversible next step for extension-only, server-only, or cross-repo work.

## Standards
- Prefer at least two authoritative confirmations when metadata is likely to be copied around the ecosystem.
- Prefer code or protocol specs over marketing pages when the two differ.
- Keep chain-family terminology exact. Do not collapse UTXO, account-based, Cosmos, Solana, Substrate, and EVM semantics into one model.
- Treat sample endpoints, keys, usernames, or passwords as documentation examples only. Never carry them into code.
- Flag when the available documentation is incomplete enough that implementation would be guesswork.

## Do Not
- Start coding a new ecosystem before the official-source scan is done.
- Treat random blogs, SEO pages, or aggregator summaries as primary truth.
- Assume a partial in-repo implementation is correct because it compiles.
- Hide uncertainty when chain ids, decimals, RPC semantics, or explorer output disagree.
