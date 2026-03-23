# MetaYoshi Wallet

Public GitHub snapshot of the MetaYoshi browser-extension wallet.

This workspace keeps the current wallet source in a GitHub-friendly layout. The actual extension app lives in `localdev/`.

## Current wallet status

MetaYoshi is currently a non-custodial multi-chain browser wallet with:

- Manifest V3 extension architecture
- popup flows for register, unlock, onboarding, wallet, assets, dapp approvals, transaction approvals, and settings
- injected provider surfaces for `window.metayoshi` and `window.rtm`
- compatibility layers for EVM-style requests, Solana signing flows, and Keplr-style Cosmos interactions
- backup and restore flows for full backup, recovery phrase, and encrypted vault JSON
- browser packaging for Chrome, Brave, Chromium, and Firefox

Current public source version: `0.2.1`

## Configured network coverage

The bundled wallet metadata currently includes:

- Raptoreum
- Bitcoin
- Ethereum
- Arbitrum
- Optimism
- Base
- Polygon
- Avalanche C-Chain
- Cronos
- Cronos POS
- Cosmos Hub
- Solana
- Sui
- Dogecoin
- Firo
- Dash
- BitcoinZ
- zkSync Era

Actual availability in a given build can still vary based on environment configuration, enabled network settings, and backend availability.

## Repository layout

- `localdev/`: main extension app and the runnable Vite project

Key extension code inside `localdev/`:

- `src/background/service-worker.ts`
- `src/content/content-script.ts`
- `src/inpage/inpage-provider.ts`
- `src/App.tsx`
- `src/pages/**`
- `src/components/**`
- `src/store/**`
- `src/coins/**`

## Local setup

Requirements:

- Node.js `20+`
- npm `10+`

Run the wallet from the app directory:

```bash
cd localdev
npm install
npm run dev
```

Build the extension:

```bash
cd localdev
npm run build
```

Useful scripts in `localdev/`:

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run preview`

## Public repo constraints

This GitHub snapshot does not ship live operational secrets.

- `VITE_API_BASE_URL` is required for runtime network loading
- `VITE_AUTH_API_BASE_URL`, `VITE_BALANCE_API_BASE_URL`, `VITE_SEND_API_BASE_URL`, and `VITE_SWAP_API_BASE_URL` are optional wallet overrides; if omitted the wallet derives the correct service host from `VITE_API_BASE_URL`, including apex `metayoshi.app` / `metayoshi.com` and known service subdomains such as `api.`, `balance.`, `send.`, or `swap.`
- bridge credentials are optional, but if used both `VITE_BRIDGE_USER` and `VITE_BRIDGE_PASSWORD` must be set
- backend-connected flows require your own environment and server support
- production-like bridge credentials are intentionally not bundled here

If you are running this repo locally, create your own `.env.local` inside `localdev/` and supply the required values for your environment.

## License and branding

Source code is MIT-licensed. See [localdev/LICENSE](./localdev/LICENSE).

MetaYoshi / GLab names, logos, icons, and branding are not granted under the MIT code license for public redistribution without permission. See [localdev/NOTICE.md](./localdev/NOTICE.md).
