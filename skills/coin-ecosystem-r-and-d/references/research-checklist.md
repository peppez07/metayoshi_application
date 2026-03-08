# Research Checklist

Use this checklist while building the pre-implementation brief.

## Identity
- Official project name
- Ticker or native symbol
- Mainnet and testnet names
- Chain family or runtime model
- Chain id, genesis id, or CAIP identifier if applicable
- Native asset decimals

## Connectivity
- Official RPC endpoints or endpoint patterns
- REST or websocket support
- Explorer and tx lookup URLs
- Indexer or balance API options
- Auth, rate-limit, or API-key requirements

## Wallet Semantics
- Address format and checksum rules
- Derivation path if wallet-derived accounts are relevant
- Signing model and payload format
- Fee model, gas model, or UTXO selection rules
- Confirmation or finality semantics
- Token standards and contract conventions

## Compatibility
- Supported JSON-RPC or REST methods relevant to the wallet
- Unsupported or partial behaviors called out by the project
- Known provider quirks for wallets or dapps
- Browser-extension implications
- Backend or bridge implications

## Repo Mapping
- Extension files likely affected
- Server files likely affected
- Website or public-doc files likely affected
- Whether the task is extension-only, server-only, or cross-repo

## Output Requirements
- Exact source links
- Check date
- Facts vs inference split
- Risks and unknowns
- Suggested validation for the implementation step
