# MetaYoshi App Settings and Integration

Last updated: 2026-02-25

This file documents runtime connection settings, bridge security model, and DApp SDK integration.

## Security first

`VITE_*` variables are bundled into the extension and can be extracted from packaged builds.

For Chrome Web Store/public distribution:
- do not embed shared bridge secrets in `VITE_*`
- keep `BRIDGE_BASIC_PASSWORD` and `BRIDGE_TX_AUTH_KEY` server-only
- use secure server-issued write tokens (`/v1/auth/*` + `/v1/secure/bridge/rpc`)
- configure legacy tx-auth fallback only via runtime settings (`Settings -> Bridge tx auth`)

## Connection modes

- Local mode: direct RPC to local nodes (`useLocalRpc=true`)
- Bridge mode (default): all UTXO calls through MetaYoshi bridge gateway

## Bridge subdomain map

Server env example:

```env
BRIDGE_SUBDOMAIN_MAP=rtm=raptoreum:main,trtm=raptoreum:test,doge=dogecoin:main,btcz=bitcoinz:main,tide=tidecoin:main,firo=firo:main,arrr=arr:main
```

Subdomain endpoints:
- `https://rtm.metayoshi.app/v1/bridge/wallet/mainwallet`
- `https://trtm.metayoshi.app/v1/bridge/wallet/testwallet`
- `https://doge.metayoshi.app/v1/bridge`
- `https://btcz.metayoshi.app/v1/bridge`
- `https://tide.metayoshi.app/v1/bridge`
- `https://firo.metayoshi.app/v1/bridge`
- `https://arrr.metayoshi.app/v1/bridge`
- `https://ada.metayoshi.app/v1/bridge`
- `https://xmr.metayoshi.app/v1/bridge`

Strict routes are always valid:
- `https://rtm.metayoshi.app/v1/bridge/raptoreum/main/wallet/mainwallet`
- `https://trtm.metayoshi.app/v1/bridge/raptoreum/test/wallet/testwallet`
- `https://doge.metayoshi.app/v1/bridge/dogecoin/main`
- `https://btcz.metayoshi.app/v1/bridge/bitcoinz/main`
- `https://tide.metayoshi.app/v1/bridge/tidecoin/main`
- `https://firo.metayoshi.app/v1/bridge/firo/main`
- `https://arrr.metayoshi.app/v1/bridge/arr/main`

## Recommended write auth model

Use secure write flow (recommended/default):
1. `POST /v1/auth/challenge`
2. Wallet signs challenge message
3. `POST /v1/auth/verify` -> short-lived `sessionToken`
4. `POST /v1/auth/op-token` -> one-time `opToken`
5. `POST /v1/secure/bridge/rpc` for write method execution

Current app behavior:
- secure writes enabled by default (`VITE_BRIDGE_SECURE_WRITES_ENABLED=true` unless explicitly disabled)
- if secure endpoints are unavailable, app falls back to legacy bridge write path

Optional explicit API base override:

```env
VITE_SECURE_BRIDGE_API_BASE_URL=https://rtm.metayoshi.app
```

## Legacy write auth fallback (private/local only)

If server still enforces `X-Bridge-Tx-Key` on legacy write endpoints:

- configure the key at runtime in the extension: `Settings -> Bridge tx auth`
- do not place shared tx-auth secrets in `VITE_*`

Derived key format (UTC):

```text
sha256("metayoshi-bridge-tx-v1|YYYY-MM-DD|<BRIDGE_TX_AUTH_KEY>")
```

Important:
- avoid this model for public/store builds
- this is acceptable for private CI/dev integration only

Runtime override UI still exists:
- `Settings -> Bridge tx auth`

## Optional local autoload from sibling server repo

For local development convenience, Vite can scan sibling `metayoshi_SERVER` env files.
Secret bridge values are intentionally ignored and never mapped to `VITE_*`.

Default:

```env
BRIDGE_AUTOCONFIG_FROM_SERVER_ENV=false
```

Autoload is opt-in and intended for local/private builds only.

## Coin enablement

```env
VITE_ENABLED_COINS=rtm
```

Allowed ids:
- `rtm`
- `doge`
- `btcz`
- `tide`
- `firo`
- `xrp`
- `arr`
- `ada`
- `xmr`
- `all`

If omitted/invalid, app falls back to enabled defaults.

## RTM donation policy

Preferred source is bridge policy endpoint (first valid JSON wins):
- `/v1/bridge/donation/raptoreum/main`
- `/v1/bridge/config/donation/raptoreum/main`
- `/v1/bridge/policy/raptoreum/main`

Expected JSON shape:

```json
{
  "donation": {
    "enabled": true,
    "required": true,
    "percent": 1,
    "address": "RTM_DONATION_ADDRESS"
  }
}
```

Client fallback envs (only when policy endpoint unavailable):
- `VITE_RTM_DONATION_POLICY_URL`
- `VITE_RTM_DONATION_ADDRESS`
- `VITE_RTM_DONATION_PERCENT`
- `VITE_RTM_DONATION_REQUIRED`

## DApp SDK

Primary injected object:
- `window.metayoshi`

Init event:
- `metayoshi#initialized`

Full runtime SDK reference:
- `docs/SDK.md`

Helpers:
- `window.metayoshi.connect()`
- `window.metayoshi.enable()`
- `window.metayoshi.getProviderState()`
- `window.metayoshi.getNetworks()`
- `window.metayoshi.getCapabilities()`
- `window.metayoshi.switchNetwork(networkId)`

Current implementation status (as of 2026-02-25):
- SDK/network usage: `rtm`, `doge`, `btcz`, `firo`, `xrp`, `tide`, `arr`, `ada`, `xmr`
- `wallet_signMessage`: not supported in DApp SDK (`-32601`)
- `wallet_sendTransaction`: supported with explicit popup approval

## Runtime architecture notes

- Wallet runtime uses a unified chain RPC adapter layer for:
  - balance
  - sync
  - validate
  - send
- Chain-specific handlers are still used underneath where required (for example XRP, Cardano, Monero compatibility mappings).
- Account names are stored per network (`account.networkNames[networkId]`), so renaming an account on one coin does not rename it on other coins.

## DApp permission and storage model

Wallet state:
- stored in `chrome.storage.local` under `metayoshi-storage`
- persists as Zustand envelope (`{ state, version }`) or legacy plain object
- mnemonic session secret is not persisted

DApp permission storage keys:
- `metayoshi-dapp-permissions-v1`
- `metayoshi-dapp-pending-approval-v1`
- `metayoshi-dapp-pending-request-v1`

Injected-provider allowlist key:
- `dapp_injection_allowlist_v1`

Approval flow:
1. DApp requests `read`, `sign`, `send_coin`, or `send_asset` scope
2. Background opens popup `#/dapp/connect/1` when scope not yet granted
3. User approves/rejects
4. Approvals persist by normalized origin
5. Rejection/timeout returns `4001`

Transaction request flow (`wallet_sendTransaction`):
1. DApp sends params `{ to, amount }` (decimal coin units)
2. Background ensures `read` + `send_coin` scopes
3. Background opens popup `#/dapp/request/confirm`
4. If wallet is locked, popup asks for password unlock first
5. User approves or rejects transaction
6. Popup closes after result is written; dApp receives tx hash result or `4001`/error

## Manifest scope (store review)

Current extension permissions:
- `permissions`: `storage`

Current host permissions (from `public/manifest.json`):
- `https://metayoshi.app/*`
- `https://*.metayoshi.app/*`
- `https://gateway.pinata.cloud/*`
- `https://ipfs.io/*`
- `https://cloudflare-ipfs.com/*`
- `http://localhost/*`
- `http://127.0.0.1/*`
- `https://localhost/*`
- `https://127.0.0.1/*`
- `http://host.docker.internal/*`

If adding a new DApp host/domain:
1. Add host in `public/manifest.json` under `host_permissions`
2. Add to `content_scripts[].matches`
3. Add to `web_accessible_resources[].matches`
4. Update `dapp_injection_allowlist_v1` if runtime allowlist is enforced
5. Rebuild extension packages

## Build targets

- Chromium: `npm run build:chromium`
- Firefox: `npm run build:firefox`
- Chromium ZIP: `npm run zip:chromium`
- Firefox AMO ZIP: `npm run zip:firefox`
- Both: `npm run build:browsers`

Output directories:
- `dist-chromium/`
- `dist-firefox/`

Chromium submission artifact:
- `Metayoshi-chromium.zip` (archive root contains `manifest.json`)

Firefox submission artifact:
- `Metayoshi-firefox.zip` (archive root contains `manifest.json`)

Firefox data collection metadata (AMO):
- Default generated value: `browser_specific_settings.gecko.data_collection_permissions.required = ["none"]`
- Override with env vars when packaging:
  - `FIREFOX_DATA_COLLECTION_REQUIRED=none,technicalAndInteractionData,websiteActivity`
  - `FIREFOX_DATA_COLLECTION_OPTIONAL=...`
