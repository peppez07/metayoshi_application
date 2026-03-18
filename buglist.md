Primi accorgimenti e bug da risolvere

1) Definizione e organizzazione delle subnet
Identificare e strutturare possibili subnet dedicate, ad esempio:

api.metayoshi → autenticazione (auth server)
balance.metayoshi → gestione bilanci (coin, asset, token, NFT)
send.metayoshi → invio di qualsiasi tipologia di asset
swap.metayoshi → operazioni di swap tra asset

2) Registro dinamico dei token
Implementare una lista/registro aggiornabile lato server.
Il wallet dovrà interrogare il server per ottenere questo registro aggiornato, permettendo così all’utente di visualizzare e selezionare i token disponibili per l’acquisto. Utilizzando una memoria locale per non sovraccaricare il server di richieste.


-------------------
codex prompt ready: 

You are a senior backend architect and senior full-stack blockchain engineer.

Your task is to modify and extend an existing backend server for a self-custody wallet platform called MetaYoshi.

The backend already supports some swap integrations through providers such as LI.FI and Jupiter.
Now it must be refactored and extended to support a modular multi-chain architecture, including:
- EVM-compatible chains
- Solana
- Cosmos ecosystem chains
- TRON

The backend runs on a Windows Server environment.
Current available toolchains include C and Rust, but for this project you must prefer a practical production backend stack using Node.js / TypeScript where needed for chain SDK compatibility.
Do not propose a rewrite in C or Rust unless strictly necessary.
Favor incremental migration and safe extension of the existing backend.

Your mission is to:
1. analyze the current backend structure,
2. design the target architecture,
3. implement the required changes,
4. fix the listed bugs / product issues,
5. add support for Cosmos and TRON swaps and operations,
6. keep the system modular, maintainable, secure, and production-ready.

==================================================
PRODUCT CONTEXT
==================================================

This is a backend for a self-custody wallet.
The wallet must support:
- authentication
- balances
- sending assets
- swapping assets
- dynamic token registry served by backend
- multi-chain asset support

The user signs transactions from their own wallet.
The backend must never custody user funds or private keys.
The backend is responsible for:
- token and chain metadata
- route discovery
- quote normalization
- transaction generation / preparation
- fee estimation where possible
- risk controls
- caching
- exposing clean APIs to the wallet frontend

Existing integrations may already include:
- LI.FI for EVM and cross-chain flows
- Jupiter for Solana swaps

The backend must now add:
- Cosmos support
- TRON support

Cosmos should be integrated using an architecture compatible with:
- CosmJS
- Cosmos chain-registry metadata
- Skip Go or equivalent routing abstraction
- optional direct Osmosis execution patterns if useful

TRON should be integrated using an architecture compatible with:
- TronWeb
- SunSwap / SUN.io
- TRON RPC-based execution flow
- TRC20 token support

==================================================
BUGLIST / REQUIRED PRODUCT FIXES
==================================================

These issues must be solved as part of the project.

1) Definizione e organizzazione delle subnet
Identificare e strutturare possibili subnet dedicate, ad esempio:

- api.metayoshi → autenticazione (auth server)
- balance.metayoshi → gestione bilanci (coin, asset, token, NFT)
- send.metayoshi → invio di qualsiasi tipologia di asset
- swap.metayoshi → operazioni di swap tra asset

2) Registro dinamico dei token
Implementare una lista/registro aggiornabile lato server.
Il wallet dovrà interrogare il server per ottenere questo registro aggiornato, permettendo così all’utente di visualizzare e selezionare i token disponibili per l’acquisto.
Utilizzando una memoria locale per non sovraccaricare il server di richieste.

You must fully address both items above in architecture and implementation.

==================================================
PRIMARY GOALS
==================================================

Build a production-ready backend architecture with these capabilities:

A. Domain-based backend organization
Design and implement logical service separation for:
- auth
- balance
- send
- swap

Support either:
- separate subdomains with one gateway and modular services, or
- a modular monolith with clear bounded contexts and future split capability

The preferred public API domains are:
- api.metayoshi
- balance.metayoshi
- send.metayoshi
- swap.metayoshi

You must decide the best implementation approach based on the existing codebase, but keep future microservice extraction easy.

B. Dynamic token registry
Implement a server-side token registry that:
- is centrally managed
- is updateable without redeploying the whole system if possible
- supports all relevant chains
- returns only supported / safe / enabled tokens to the client
- supports metadata such as:
  - chain id / chain key
  - token address / denom / mint / contract
  - symbol
  - name
  - decimals
  - logo URL
  - type (native coin, ERC20, SPL, CW20, TRC20, NFT if needed)
  - visibility / active flag
  - buy enabled
  - swap enabled
  - send enabled
  - risk flag / verification flag
  - coingecko or price source id where applicable
  - tags
  - priority / sort order

The wallet frontend must fetch this registry from the backend.
To avoid overloading the server, implement:
- caching
- ETag or versioning
- TTL
- optional local persistence guidance for frontend consumers

C. Multi-chain operational support
The backend must expose normalized functionality for:
- getting balances
- listing supported tokens
- preparing send transactions
- getting swap quotes
- preparing swap transactions
- estimating fees where possible
- tracking transaction status

D. Cosmos support
Add backend support for Cosmos chains with an extensible adapter model.
Support:
- chain metadata via registry
- address validation
- denom and asset normalization
- balances
- send transaction preparation
- swap quote flow through a routing provider such as Skip Go
- support for IBC-aware route steps if needed
- clean abstraction so more Cosmos chains can be added later

E. TRON support
Add backend support for TRON with an extensible adapter model.
Support:
- TRON address validation
- TRX native asset handling
- TRC20 metadata and balances
- send transaction preparation
- swap quote flow via SunSwap/SUN.io-compatible backend integration
- energy / bandwidth fee awareness
- normalized transaction response model

F. Preserve existing integrations
Do not break current LI.FI and Jupiter integrations.
Instead, refactor them into a clean provider architecture with adapters such as:
- lifiProvider
- jupiterProvider
- skipProvider
- sunswapProvider

==================================================
NON-FUNCTIONAL REQUIREMENTS
==================================================

The solution must be:
- production-ready
- secure
- modular
- testable
- observable
- cache-aware
- backward-compatible where reasonable
- easy to extend to future chains

Follow these principles:
- never store user private keys
- never sign on behalf of the user unless an explicit non-custodial delegated flow already exists and is documented
- validate all inputs strictly
- normalize all chain-specific formats into safe internal models
- add comprehensive logging
- avoid leaking sensitive internal errors
- keep secrets in environment variables or secure secret storage
- support rate limiting on public endpoints
- support idempotency where relevant
- document all new endpoints and env vars

==================================================
TARGET ARCHITECTURE REQUIREMENTS
==================================================

Design and implement a backend architecture with these modules:

1. Core modules
- auth
- balances
- send
- swap
- token-registry
- chain-registry
- caching
- config
- monitoring / health

2. Chain adapters
- evm
- solana
- cosmos
- tron

3. Swap providers
- LI.FI
- Jupiter
- Skip Go (or equivalent Cosmos routing layer)
- SunSwap / SUN.io integration

4. Shared services
- validation
- address utilities
- asset normalization
- chain metadata
- quote normalization
- fee normalization
- caching layer
- HTTP client wrappers
- retry / circuit breaker policy
- error mapping

5. API surface
Prefer versioned REST APIs such as:
- /v1/auth/*
- /v1/balances/*
- /v1/send/*
- /v1/swap/*
- /v1/token-registry/*
- /v1/chains/*

If subdomain-based routing exists, map them cleanly:
- api.metayoshi for auth and common APIs
- balance.metayoshi for balance endpoints
- send.metayoshi for send endpoints
- swap.metayoshi for swap endpoints

Support both internal modularity and future gateway split.

==================================================
DYNAMIC TOKEN REGISTRY SPEC
==================================================

Implement the token registry as a first-class backend module.

Required features:
- persistent storage for tokens and metadata
- admin update capability
- import / sync jobs if useful
- manual override capability
- enabled / disabled flags by chain and token
- optional tags like featured, new, hidden, deprecated, scam-risk, experimental
- versioned registry response
- cache headers
- fast lookup by:
  - chain
  - symbol
  - address / contract / denom / mint
  - token type
  - enabled status

Suggested API endpoints:
- GET /v1/token-registry
- GET /v1/token-registry/:chain
- GET /v1/token-registry/:chain/:tokenId
- POST /v1/admin/token-registry
- PATCH /v1/admin/token-registry/:id
- POST /v1/admin/token-registry/import
- POST /v1/admin/token-registry/sync

Implement server-side caching and response optimization.
Also define how the frontend should use local cache safely:
- compare version
- refresh by TTL
- support manual refresh
- invalidate cache when registry version changes

==================================================
BALANCE MODULE REQUIREMENTS
==================================================

Implement / improve a balance service that supports:
- native balances
- fungible token balances
- NFT balances if already present or easy to preserve
- per-chain normalized response shape

The balance module must support:
- EVM balances
- Solana balances
- Cosmos balances
- TRON balances

Return consistent data models regardless of chain-specific internals.

==================================================
SEND MODULE REQUIREMENTS
==================================================

Implement / improve a send module that supports preparing transactions for:
- native assets
- fungible tokens
- chain-specific transfer rules

Required chains:
- EVM
- Solana
- Cosmos
- TRON

Do not broadcast blindly without validation.
Provide:
- tx preview
- estimated fee where possible
- chain-specific warnings
- normalized response containing:
  - chain
  - asset
  - amount
  - estimated fees
  - raw/unsigned tx payload or structured signing payload
  - expiration / TTL if relevant

==================================================
SWAP MODULE REQUIREMENTS
==================================================

Implement / refactor a swap module that supports:
- quote aggregation
- provider routing
- provider fallback
- provider-specific adapter pattern
- normalized quote responses
- normalized transaction preparation flow

Support:
- EVM / cross-chain via LI.FI
- Solana via Jupiter
- Cosmos via Skip Go or equivalent
- TRON via SunSwap / SUN.io direct integration or equivalent supported path

The swap quote response should normalize:
- provider
- source chain
- destination chain
- source token
- destination token
- input amount
- output amount
- min received
- slippage
- fee breakdown
- route steps
- estimated time
- warnings
- raw provider payload as optional debug data

Implement safe slippage controls and provider validation.

==================================================
COSMOS REQUIREMENTS
==================================================

Implement a Cosmos adapter with:
- bech32 address validation
- chain metadata loading from chain registry
- denom normalization
- balances
- send preparation
- swap support through Skip Go-compatible routing
- support for multi-step route metadata if IBC is involved
- extensibility for multiple Cosmos chains

Design internal interfaces so additional Cosmos chains can be added through configuration, not major code changes.

==================================================
TRON REQUIREMENTS
==================================================

Implement a TRON adapter with:
- TRON address validation
- TRX native coin support
- TRC20 token support
- balances
- send preparation
- swap quote + execution-preparation path through SunSwap-compatible integration
- fee/resource model awareness for energy and bandwidth
- clear transaction status handling

==================================================
SUBDOMAIN / ROUTING REQUIREMENTS
==================================================

Design and implement the best practical organization for the subdomains:

- api.metayoshi
- balance.metayoshi
- send.metayoshi
- swap.metayoshi

You must:
- define whether to use reverse proxy routing, gateway routing, or app-level tenant/domain handling
- implement a clean and documented approach
- add local development equivalents
- add configuration examples
- add deployment notes for Windows Server hosting

If full split is too invasive for now, implement a modular monolith with:
- domain-based routers
- host-based routing support
- easy future extraction into separate services

==================================================
EXPECTED DELIVERABLES
==================================================

You must produce the work in phases and execute them, not just describe them.

Deliver:

1. Initial analysis
- inspect existing project structure
- identify current backend language/framework
- identify existing swap integrations
- identify config system
- identify routing structure
- identify token handling gaps
- identify balance/send/swap code paths

2. Architecture plan
- propose final module layout
- propose chain adapter interfaces
- propose provider interfaces
- propose token registry schema
- propose endpoint contract changes
- propose caching strategy
- propose subdomain routing strategy

3. Implementation
Make actual code changes in the repository.
Refactor carefully and keep backward compatibility where reasonable.

4. Bug fixes
Explicitly solve:
- subnet/service organization
- dynamic token registry with local-cache-friendly frontend contract

5. Documentation
Update or create:
- README sections
- architecture notes
- new environment variables
- API endpoint documentation
- example requests/responses
- deployment notes for Windows Server
- subdomain / reverse proxy notes

6. Testing
Add:
- unit tests
- integration tests where practical
- adapter-level tests
- validation tests
- token registry tests
- swap quote normalization tests

7. Final report
At the end, provide:
- summary of all modified files
- explanation of each major change
- migration notes
- remaining limitations
- next recommended improvements

==================================================
IMPLEMENTATION STYLE RULES
==================================================

Rules you must follow:
- do not produce only high-level advice
- do actual implementation-oriented work
- inspect existing files before changing architecture assumptions
- prefer incremental refactor over destructive rewrite
- preserve existing working behavior unless necessary to change
- create clean interfaces and abstractions
- avoid duplicated logic
- centralize chain metadata and normalization
- use environment-based config
- write readable, maintainable code
- add TODO comments only when truly necessary
- keep code production-minded

When uncertain:
- infer the best practical solution from the existing codebase
- do not stop for trivial ambiguity
- choose a reasonable implementation and document the choice

==================================================
SUGGESTED INTERNAL INTERFACES
==================================================

Use or adapt interfaces like these if useful:

ChainAdapter:
- validateAddress(address)
- getNativeAsset()
- getBalances(address)
- prepareTransfer(params)
- estimateFees(params)
- getTokenMetadata(tokenId)
- normalizeAsset(asset)
- getTxStatus(txHash)

SwapProvider:
- getQuote(params)
- prepareSwap(params)
- supportsRoute(params)
- normalizeQuote(providerQuote)
- normalizePreparedTx(providerTx)

TokenRegistryService:
- listTokens(filters)
- getToken(chain, tokenId)
- syncTokens(source)
- upsertToken(token)
- disableToken(tokenId)
- getRegistryVersion()

==================================================
PRIORITY ORDER
==================================================

Execute the work in this order:

Priority 1:
- inspect current codebase
- define module boundaries
- implement token registry
- refactor provider architecture

Priority 2:
- implement TRON adapter
- implement Cosmos adapter
- integrate swap providers

Priority 3:
- implement subdomain/domain routing structure
- improve caching
- add tests
- update docs

Priority 4:
- improve observability and operational hardening

==================================================
OUTPUT FORMAT
==================================================

Work step by step and keep a running engineering log.

For each phase:
1. Explain what you found
2. Explain what you will change
3. Apply the code changes
4. Show key diffs or summarize them clearly
5. State risks or compatibility notes

At the very end, provide:
- completed checklist
- changed files
- manual setup steps
- env vars to add
- deployment steps for Windows Server
- API examples for frontend integration

Now begin by inspecting the existing backend repository structure and identifying:
- framework/language
- current swap flow
- current token management approach
- current balance/send/swap endpoints
- current configuration/deployment pattern

Then propose the exact refactor plan and start implementing it.