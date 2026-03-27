# MetaYoshi Wallet

MetaYoshi Wallet is a Manifest V3 browser-extension wallet for multi-chain, non-custodial access across EVM, UTXO, Cosmos-family, Solana, Sui, Cardano, XRP, Monero, Stellar, and TRON-style runtimes.

This repository is a public GitHub snapshot of the wallet source. The runnable extension app lives in [`localdev/`](./localdev).

Current public source version: `0.2.1`

## Audit Snapshot

This summary is based on the current public source in this repository, not on marketing copy.

### Working Core

- Manifest V3 extension architecture with background service worker, content script, and injected inpage provider
- Side-panel / popup wallet UI with onboarding, unlock, wallet, assets, activity, send, swap, settings, dapp approvals, and transaction approvals
- Non-custodial seed-based wallet initialization and local vault encryption
- Full backup export / restore, recovery phrase restore, and encrypted vault JSON restore
- Account management, blockchain visibility controls, authorized site controls, password and autolock settings
- Dapp connection flow and request approval flow
- Provider surfaces for `window.metayoshi`, `window.rtm`, EVM-style requests, Solana flows, and Keplr-style Cosmos interactions
- Build-time filtering of supported networks with `VITE_DISABLED_COINS`, `VITE_ENABLED_COINS`, and `metayoshi.build.json`

### Bundled Network Coverage

The bundled registry currently includes roughly:

- `45` EVM networks
- `36` Cosmos-family networks
- `7` UTXO networks
- `1` each for Solana, Sui, Cardano, Monero, XRP, Stellar, and TRON

Examples of bundled mainnets include Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche C-Chain, BNB Smart Chain, zkSync Era, Scroll, Linea, Solana, Sui, Cosmos Hub, Osmosis, Celestia, TRON, XRP, Cardano, Monero, Stellar, Bitcoin, Dogecoin, Dash, Zcash, BitcoinZ, and Raptoreum.

Actual availability in a build still depends on:

- your `.env.local`
- build-time network filtering
- backend availability
- whether a given flow is implemented for that runtime in this public build

### Beta Or Limited Areas

The wallet includes real implementations for these areas, but they are not all equally mature:

- Multisig is beta. The UI is present and functional for Safe-based EVM multisig, but other multisig families are not implemented and true cross-chain execution is not available yet.
- Swap is backend-dependent. The UI exists, but it requires server support and an API key for the live swap flow.
- Some runtime-specific send flows are intentionally limited in this build. The store currently marks XRP, Cardano, and Monero sends as temporarily disabled.
- Monero non-custodial support is gated behind an external runtime hook and optional feature flags.
- Some chains can be listed in the registry but still rely on backend bridge support for balances, sends, activity, token reads, or swap.
- Watch-only and multisig account handling exist, but support depends on the selected chain and account type.

### Security And Operational Notes

- This repo does not include production secrets.
- The extension requests broad `http://*/*` and `https://*/*` host permissions because provider injection and dapp support need page access across arbitrary sites.
- The content script can load on broad origins, but wallet connection and approval flows remain permission-scoped in the wallet.
- Public builds should be treated as self-hosted or testable source unless you also control the required backend.

## Repository Layout

- [`localdev/`](./localdev): main wallet app, Vite project, extension build output, scripts, and source
- [`localdev/src/background/service-worker.ts`](./localdev/src/background/service-worker.ts): extension background runtime
- [`localdev/src/content/content-script.ts`](./localdev/src/content/content-script.ts): content script bridge
- [`localdev/src/inpage/inpage-provider.ts`](./localdev/src/inpage/inpage-provider.ts): injected provider logic
- [`localdev/src/App.tsx`](./localdev/src/App.tsx): extension routes and app shell
- [`localdev/src/store/`](./localdev/src/store): wallet state, persistence, account logic, network sync
- [`localdev/src/coins/`](./localdev/src/coins): bundled network registry and runtime models

## Requirements

- Node.js `20+`
- npm `10+`
- Chrome, Brave, or another Chromium browser for unpacked extension testing

## Quick Start

From the repository root:

```bash
cd localdev
npm install
cp .env.example .env.local
```

On Windows Command Prompt or PowerShell, use `copy .env.example .env.local` instead.

Edit `localdev/.env.local` for your environment, then build:

```bash
npm run build
```

The unpacked extension output is generated in:

```text
localdev/dist
```

## Environment Configuration

The public baseline environment file is [`localdev/.env.example`](./localdev/.env.example).

Important defaults and rules:

- `VITE_API_BASE_URL` is the canonical wallet backend origin
- keep all `VITE_*_API_BASE_URL` values on the same backend origin unless you are intentionally testing a custom deployment
- if any API base points to `localhost` or `127.0.0.1`, also set `VITE_ENABLE_LOCAL_BACKEND_HELP=true`
- if you set one of `VITE_BRIDGE_USER` or `VITE_BRIDGE_PASSWORD`, you must set both
- if you set `VITE_DEFAULT_NETWORK`, it must remain enabled after all build filters are applied
- swap and some secure server flows may require `VITE_APP_API_KEY`

Minimal public-style example:

```bash
VITE_API_BASE_URL=https://api.metayoshi.app
VITE_AUTH_API_BASE_URL=https://api.metayoshi.app
VITE_BALANCE_API_BASE_URL=https://api.metayoshi.app
VITE_SEND_API_BASE_URL=https://api.metayoshi.app
VITE_SWAP_API_BASE_URL=https://api.metayoshi.app
VITE_SECURE_BRIDGE_API_BASE_URL=https://api.metayoshi.app
VITE_BRIDGE_AUTOCONFIG_FROM_SERVER_ENV=false
VITE_BRIDGE_AUTOCONFIG_INCLUDE_SECRETS=false
VITE_ENABLE_LOCAL_BACKEND_HELP=false
VITE_DEFAULT_NETWORK=eth
VITE_SWAP_API_VERSION=v1
```

## Build Profiles And Network Filtering

You can ship a narrower wallet build by excluding chains at build time.

Use `.env.local`:

```bash
VITE_DISABLED_COINS=ada,xmr,xrp,doge
```

Or whitelist only specific chains:

```bash
VITE_ENABLED_COINS=eth,base,arb,polygon
```

For a more explicit build profile, create `localdev/metayoshi.build.json` based on [`localdev/metayoshi.build.example.json`](./localdev/metayoshi.build.example.json):

```json
{
  "coins": {
    "disabled": ["sol", "sui", "doge"]
  },
  "features": {
    "swapSolanaV1Enabled": false
  }
}
```

Behavior notes:

- hidden coins are removed from the built wallet network list, not merely hidden in one screen
- `metayoshi.build.json` takes precedence over `VITE_ENABLED_COINS` and `VITE_DISABLED_COINS`
- the build config can also use `"enabled": "tested"` or an explicit enabled array

## Build And Run From Source

### Development

```bash
cd localdev
npm install
npm run dev
```

This starts the Vite app for local UI development.

### Production Extension Build

```bash
cd localdev
npm run build
```

### Validated Build

```bash
cd localdev
npm run build:validated
```

This runs the environment validation script before the build.

### Release Packaging

```bash
cd localdev
npm run release
```

This builds the extension and repacks release artifacts into `localdev/releases`.

## Load The Wallet In Chrome / Brave / Chromium

1. Build the extension:

```bash
cd localdev
npm run build
```

2. Open `chrome://extensions`
3. Enable `Developer mode`
4. Click `Load unpacked`
5. Select the folder:

```text
<repo>\localdev\dist
```

6. Pin the MetaYoshi extension if needed
7. Open the side panel or extension action and complete onboarding

If you rebuild, Chrome usually needs either:

- `Reload` on the extension card in `chrome://extensions`
- or removing and reloading `localdev/dist`

## Load The Wallet In Firefox

The manifest includes Firefox-specific settings, but this repo is primarily structured around Chromium-style unpacked testing.

For temporary Firefox loading:

1. Build the extension in `localdev/dist`
2. Open `about:debugging`
3. Choose `This Firefox`
4. Click `Load Temporary Add-on`
5. Select the generated manifest file:

```text
<repo>\localdev\dist\manifest.json
```

Note that temporary add-ons are removed when Firefox closes unless you package and sign them separately.

## What The Wallet Can Do Today

- Create and unlock a local encrypted wallet
- Restore from full backup, recovery phrase, or encrypted vault JSON
- Manage multiple accounts
- Import watch-only accounts where supported
- Control visible blockchains in the UI
- Connect to dapps and approve requests
- Review and approve transactions inside the extension
- Show assets, activity, send flows, and model-specific chain pages
- Support Safe-based EVM multisig workflows in beta
- Sync additional networks and catalog entries from a backend registry

## What Is Still Beta Or Backend-Dependent

- Safe multisig support is beta and limited to EVM Safe-style flows
- Swap depends on backend support and `VITE_APP_API_KEY`
- Some token, NFT, bridge, and activity reads depend on server endpoints
- Not every bundled chain has the same level of non-custodial signing support
- XRP, Cardano, and Monero send paths are currently marked disabled in this public build
- Monero non-custodial execution requires extra runtime wiring beyond a default public build

## Available Scripts

From [`localdev/`](./localdev):

- `npm run dev`
- `npm run build`
- `npm run build:validated`
- `npm run lint`
- `npm run preview`
- `npm run release`
- `npm run validate:env`
- `npm run smoke:evm-token-send-prep`
- `npm run verify:server-balances`

## Permissions

The current built manifest requests:

- `storage`
- `unlimitedStorage`
- `sidePanel`
- `tabs`
- host access to `http://*/*` and `https://*/*`

This is expected for the current provider-injection and dapp-connection model.

## Public Repo Constraints

This public repository does not ship:

- live production bridge credentials
- private deployment secrets
- internal operational backend configuration

If a backend-connected flow is unavailable in your local build, check:

1. `.env.local`
2. backend reachability
3. API key / bridge credentials
4. whether the chain and flow are implemented in this public build

## License And Branding

Source code is MIT-licensed. See [`localdev/LICENSE`](./localdev/LICENSE).

MetaYoshi / GLab names, logos, icons, and branding are not granted under the MIT code license for unrestricted redistribution. See [`localdev/NOTICE.md`](./localdev/NOTICE.md).
