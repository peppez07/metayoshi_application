# MetaYoshi Wallet

MetaYoshi Wallet is the public browser-extension wallet for the MetaYoshi project. It is built for non-custodial, multi-chain access: users keep control of their keys, approve their own actions, and work through one consistent wallet flow across configured networks.

This repository is the source for MetaYoshi Wallet `0.1.6`.

## Why MetaYoshi

- Non-custodial by default. Private keys and seed phrases stay with the user.
- One wallet flow across UTXO and account-based chains.
- Real network integrations instead of a mock-only demo experience.
- Open source code that the community can inspect, test, and improve.

MetaYoshi is aimed at practical daily usage: connect, review, approve, and manage assets through a familiar browser extension interface while keeping custody in your own hands.

## Current focus

MetaYoshi `0.1.6` is focused on:

- browser-extension wallet UX
- multi-chain runtime support
- bridge-backed network access where required
- packaging for Chrome, Brave, Chromium, and Firefox
- safer public startup defaults for open-source distribution

The public startup flow now prefers a bridge-free network when possible, so open-source builds no longer depend on the legacy RTM-first boot path.

## Configured network coverage

The project metadata for `0.1.6` currently includes these configured networks:

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

Available networks in a given deployment can still depend on environment configuration and backend availability.

## Local setup

Requirements:

- Node.js `20+`
- npm `10+`

Install dependencies:

```bash
npm install
```

Start local development:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Build browser packages:

```bash
npm run build:browsers
```

To use local environment values, copy `.env.example` to `.env.local` and fill in your own settings.

Important:

- this public repo does not include live server credentials
- some backend-connected flows require your own server configuration
- if `VITE_DEFAULT_NETWORK` is not set, the wallet prefers an enabled public-friendly startup network automatically

## Available scripts

- `npm run dev`
- `npm run build`
- `npm run build:browsers`
- `npm run build:chrome`
- `npm run build:brave`
- `npm run build:firefox`
- `npm run zip:browsers`
- `npm run lint`
- `npm run test:api:firo-eth`

## Support the project

If you want to help MetaYoshi grow, the most useful support is practical support:

- star the repository and follow releases
- test the wallet on supported chains and report reproducible issues
- contribute fixes, documentation, and UX improvements
- help review public claims so docs stay aligned with the real product
- share the project with users who care about non-custodial multi-chain tooling

Community support helps improve wallet reliability, documentation quality, and the pace of new integrations.

## Website and contact

- Website: `https://metayoshi.app`
- Support: `admin@metayoshi.app`

For broader project direction, see the public website, FAQ, and whitepaper pages.

## Publish safety

This repository is meant to be shareable without local secrets.

Before pushing publicly:

- do not commit `.env.local`
- do not commit `dist/`, `node_modules/`, `.zip`, `.crx`, or `.pem` artifacts
- do not commit internal workflow files such as `AGENTS.md`, `agents/`, or `skills/`
- use placeholder values only in examples and docs
- do not publish unreleased token references or internal infrastructure details

## License

Source code is released under the MIT License. See [LICENSE](./LICENSE).

Brand names, logos, icons, and other MetaYoshi / GLab branding are covered separately. See [NOTICE.md](./NOTICE.md).
