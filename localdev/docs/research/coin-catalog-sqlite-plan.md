# Coin Catalog SQLite Plan

## Short answer

Yes, the extension can use an internal SQLite database for coin metadata, token catalogs, cached balances, fiat prices, NFT metadata, and local transaction history.

The safe design is:

- keep wallet signing truth in explicit code and capability helpers
- keep secret material out of SQLite
- treat SQLite as a local catalog/cache layer, not as the authority for spend/sign compatibility

For this codebase, that means `runtimeModelId`, `resolveNetworkCapabilities`, `resolveCoinModelFamily`, server-registry mapping, and the existing coin modules still decide what the wallet can sign or send.

## Why this fits the current wallet

The current app already separates:

- network/runtime definitions in `src/coins/**`
- chain capability logic in `src/lib/networkCapabilities.ts` and `src/lib/coinModel.ts`
- local wallet state in `src/store/walletStore.ts`
- remote catalog enrichment via `loadServerRegistrySnapshot()`

That is already close to a database-backed catalog model. A local DB would mainly replace large in-memory JSON blobs and ad hoc per-feature caches with indexed tables.

## Research snapshot

Current research input was generated on 2026-03-12 from:

- CoinGecko top-100 market snapshot
- CoinGecko platform list
- CryptoCompare top market-cap metadata
- CryptoCompare bulk coin list

Artifact:

- `docs/research/top100-coin-catalog-snapshot.json`

Observed shape of the current top 100:

- 100 assets total
- 36 native assets
- 64 token assets
- 62 assets have an EVM host runtime hint
- 28 assets have no host platform and behave like native-chain assets
- the rest spread across Solana, Tron, Aptos, Sui, Near, Provenance, Hyperliquid, XRP-style, Substrate-style, and UTXO/privacy families

Useful implications for the DB:

- one flat `coins` table is not enough
- network/runtime identity must be separated from asset identity
- one asset can exist on many host platforms
- token metadata and explorer metadata should be normalized, not duplicated per balance row

Examples from the current snapshot:

- stablecoins: USDT, USDC, USDS, USDe, DAI, PYUSD, BFUSD, USDD
- exchange-linked assets: BNB, WBT, LEO, CRO, BGB, GT, KCS
- meme assets: DOGE, SHIB, PEPE, BONK
- privacy assets: XMR, ZEC
- high multi-platform assets: LINK, USDC, USDE, ENA, AAVE, UNI, USDT

## Architecture recommendation

### 1. Keep three storage classes

Do not put everything into one bucket.

1. Secrets and critical auth state
   - keep in the current encrypted vault flow
   - examples: mnemonic vault, lock state, approval state, session unlock material
2. Static and semi-static catalog data
   - good SQLite fit
   - examples: chain families, explorers, token contracts, logos, symbols, asset taxonomy, runtime hints
3. Volatile runtime cache and local history
   - also a good SQLite fit
   - examples: fiat cache, token balances, NFT cache, sync status, tx history, server snapshots

### 2. Use SQLite as a read-optimized local database

Recommended role for SQLite:

- local catalog index
- queryable cache
- transaction history store
- migration-friendly schema layer

Do not make SQLite the source of wallet behavior for:

- whether a chain is supported for signing
- whether a network is non-custodial
- how a transaction is built
- what derivation model a network uses

Those must stay code-owned.

### 3. Browser-extension delivery model

For Chromium/Firefox parity, do not assume native SQLite bindings.

Pragmatic browser-safe approach:

- SQLite compiled to WASM
- one database owner context only
- message-based access from the background and popup
- fallback-ready storage adapter if one browser lacks the preferred persistence layer

Suggested ownership:

- the background/service worker remains the caller
- a dedicated DB worker or equivalent single-owner module owns the SQLite connection
- popup UI never opens independent DB connections

This avoids cross-context write races and keeps migration control explicit.

## Proposed schema

### Catalog domain

```sql
create table runtime_family (
  id text primary key,              -- evm, utxo, solana, cosmos, xrp, sui, cardano, substrate, ton, ...
  label text not null,
  address_style text not null,      -- hex, base58, bech32, x-address, ss58, ...
  signing_model text not null,      -- ecdsa, ed25519, sr25519, monero, ...
  is_account_based integer not null default 0,
  is_utxo_based integer not null default 0,
  supports_tokens integer not null default 0,
  supports_nfts integer not null default 0
);

create table chain_network (
  id text primary key,              -- internal wallet network id
  runtime_model_id text not null,   -- must stay aligned with code/runtime helpers
  runtime_family_id text not null references runtime_family(id),
  name text not null,
  symbol text not null,
  chain_id integer,                 -- EVM or other numeric ids when applicable
  coin_type text not null,          -- EVM, UTXO, SOL, COSMOS, XRP, ...
  is_testnet integer not null default 0,
  is_enabled integer not null default 1,
  rpc_url text,
  explorer_base_url text,
  server_coin_id text,
  capabilities_json text not null,
  metadata_json text
);

create table asset (
  id text primary key,              -- stable internal asset id
  gecko_id text,
  cryptocompare_symbol text,
  symbol text not null,
  name text not null,
  asset_kind text not null,         -- native, token, nft-collection, nft-item, synthetic, rwa
  status text not null default 'active',
  logo_url text,
  website_url text,
  description text,
  hashing_algorithm text,
  proof_type text,
  launched_at text,
  taxonomy_json text,
  source_json text not null
);

create table asset_network_presence (
  asset_id text not null references asset(id),
  network_id text not null references chain_network(id),
  is_native integer not null default 0,
  contract_address text,
  token_standard text,              -- erc20, erc721, spl, trc20, cw20, native, ...
  decimals integer,
  is_wrapped integer not null default 0,
  bridge_source_asset_id text,
  status text not null default 'active',
  metadata_json text,
  primary key (asset_id, network_id, contract_address)
);

create table asset_category (
  asset_id text not null references asset(id),
  category text not null,
  source text not null,
  primary key (asset_id, category, source)
);

create table asset_explorer (
  id integer primary key,
  asset_id text references asset(id),
  network_id text references chain_network(id),
  explorer_type text not null,      -- address, tx, token, nft, block
  label text not null,
  base_url text not null,
  priority integer not null default 100
);

create table ecosystem_membership (
  asset_id text not null references asset(id),
  ecosystem text not null,          -- bitcoin, ethereum, solana, defi, meme, exchange, privacy, ...
  source text not null,
  primary key (asset_id, ecosystem, source)
);
```

### Cache and history domain

```sql
create table price_snapshot (
  asset_id text not null references asset(id),
  fiat_code text not null,
  price real not null,
  market_cap real,
  volume_24h real,
  fetched_at integer not null,
  expires_at integer,
  source text not null,
  primary key (asset_id, fiat_code, source)
);

create table balance_cache (
  account_id text not null,
  network_id text not null references chain_network(id),
  asset_id text not null references asset(id),
  address text not null,
  raw_balance text not null,
  normalized_balance text,
  fiat_value_json text,
  block_ref text,
  fetched_at integer not null,
  source text not null,
  primary key (account_id, network_id, asset_id, address, source)
);

create table tx_history (
  tx_key text primary key,          -- stable dedupe key, not just tx hash
  network_id text not null references chain_network(id),
  asset_id text references asset(id),
  account_id text,
  address text,
  tx_hash text,
  direction text not null,          -- sent, received, self, approval, swap
  status text not null,             -- pending, confirmed, failed, dropped
  nonce_or_sequence text,
  block_height integer,
  timestamp_ms integer,
  fee_raw text,
  amount_raw text,
  counterparty text,
  memo text,
  raw_payload_json text,
  source text not null,
  discovered_at integer not null,
  updated_at integer not null
);

create table nft_collection_cache (
  collection_id text primary key,
  network_id text not null references chain_network(id),
  contract_address text,
  symbol text,
  name text not null,
  image_url text,
  metadata_json text,
  fetched_at integer not null
);

create table nft_item_cache (
  item_id text primary key,
  collection_id text references nft_collection_cache(collection_id),
  token_id text not null,
  owner_address text,
  metadata_url text,
  image_url text,
  attributes_json text,
  fetched_at integer not null
);

create table sync_checkpoint (
  scope text primary key,           -- prices/usdc, history/account::network, registry/main, ...
  cursor text,
  block_ref text,
  updated_at integer not null
);
```

### Wallet-local user domain

```sql
create table wallet_account_ref (
  account_id text primary key,
  derivation_index integer not null,
  label text not null,
  created_at integer not null
);

create table account_address_ref (
  account_id text not null references wallet_account_ref(account_id),
  network_id text not null references chain_network(id),
  address text not null,
  is_active integer not null default 1,
  metadata_json text,
  primary key (account_id, network_id, address)
);

create table address_book_entry (
  id text primary key,
  network_id text references chain_network(id),
  address text not null,
  label text not null,
  notes text,
  created_at integer not null,
  updated_at integer not null
);
```

## Important modeling rules

### Separate network from asset

Bad model:

- one row per symbol with mixed chain/token meaning

Good model:

- `asset` stores the thing users recognize
- `chain_network` stores how the wallet talks to a chain
- `asset_network_presence` joins them

This is required for:

- USDT on Ethereum vs Tron vs Solana
- wrapped assets
- one token deployed on many chains
- NFTs and fungibles on the same host chain family

### Make `runtimeModelId` first-class

Do not infer runtime behavior from symbol or display name.

The DB should store:

- `runtime_family_id`
- `runtime_model_id`
- `coin_type`

The app should still resolve actual behavior through the existing helpers and modules.

### Store raw values as strings

For balances, fees, supplies, and token amounts:

- store raw atomic units as text
- derive UI decimals separately

That avoids precision loss for:

- EVM 18-decimal assets
- large UTXO balances
- NFT quantity edge cases
- bridge and server payload reuse

### Cache is disposable

All cache tables need:

- `fetched_at`
- `expires_at` or equivalent checkpoint
- explicit `source`

This makes rollback and corruption recovery easy.

## Recommended implementation phases

### Phase 0: catalog only

Add SQLite without changing wallet behavior.

Scope:

- `runtime_family`
- `chain_network`
- `asset`
- `asset_network_presence`
- `asset_explorer`
- `ecosystem_membership`

Populate from:

- current bundled coin modules
- current server registry snapshot
- curated seed data from the research snapshot

### Phase 1: cache and price data

Add:

- `price_snapshot`
- `balance_cache`
- `sync_checkpoint`

Keep Zustand as the live UI state, but hydrate it from DB-backed queries.

### Phase 2: transaction history

Add:

- `tx_history`

This is the first phase where dedupe rules matter. Use a stable `tx_key` so the same event does not reappear under different API sources.

### Phase 3: NFT and rich asset metadata

Add:

- `nft_collection_cache`
- `nft_item_cache`

This phase benefits most from indexed local storage because NFT metadata is noisy and expensive to re-fetch.

### Phase 4: optional user-local features

Add only if useful:

- address book
- labels
- watchlists
- local notes

Do not move the encrypted mnemonic vault here as part of the first migration.

## Recommended access pattern in this repo

### Keep these code-owned

- `src/coins/**`
- `src/lib/networkCapabilities.ts`
- `src/lib/coinModel.ts`
- transaction builders
- signing modules

### Introduce a small DB boundary

Suggested new module areas:

- `src/lib/catalogDb/driver.ts`
- `src/lib/catalogDb/schema.ts`
- `src/lib/catalogDb/migrations.ts`
- `src/lib/catalogDb/queries.ts`
- `src/lib/catalogDb/repository.ts`

Suggested responsibilities:

- `driver.ts`: SQLite/adapter ownership
- `schema.ts`: DDL constants
- `migrations.ts`: versioned migrations
- `queries.ts`: typed reads/writes
- `repository.ts`: wallet-facing API used by the store/background

## Risks

- browser support differences if persistence relies on one storage backend only
- background lifecycle issues if more than one context opens the DB
- stale catalog rows if server-registry sync rules are not explicit
- accidental coupling where DB metadata starts deciding chain behavior
- large history/NFT tables if TTL and pruning are not enforced

## Validation checklist

When implementation starts, validate at least:

1. catalog bootstrap with no server access
2. catalog refresh from server registry
3. locked-wallet state with DB present
4. popup open/close cycles without duplicate DB handles
5. Chrome and Firefox build parity
6. tx history dedupe across pending and confirmed updates
7. token balances and NFTs for at least:
   - one EVM network
   - one UTXO network
   - one Solana-like network
   - one XRP/Cosmos/Sui style network already supported here

## Rollback notes

Safe rollback path:

1. keep the current Zustand + server-registry flow as the source of truth during Phase 0 and Phase 1
2. gate all DB reads behind one feature flag
3. if the DB misbehaves, disable the flag and rebuild from the existing in-memory/network flow
4. treat cache tables as disposable and re-creatable

## Recommendation

The right next step is not "move the wallet into SQLite".

The right next step is:

1. add a catalog/cache database behind a narrow repository boundary
2. seed it from the current registry plus the generated top-100 research snapshot
3. keep signing, approvals, derivation, and capability truth in code
4. migrate balances/history only after the catalog layer is stable
