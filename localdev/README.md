<p align="center">
  <img src="./public/MetayoshiLogo.png" alt="MetaYoshi Wallet logo" width="128" />
</p>

# MetaYoshi Wallet

![Node 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)
![Vite 7](https://img.shields.io/badge/vite-7.x-646CFF?logo=vite&logoColor=white)
![License MIT](https://img.shields.io/badge/license-MIT-16a34a)

MetaYoshi Wallet is a public browser-extension wallet for non-custodial, multi-chain access. Keys stay with the user, signing stays local, and the extension exposes one consistent wallet flow across configured networks.

Control beats trust.

## Release Status

- Repository version: `0.2.1`
- GitHub release-readiness audit completed on `2026-04-05`
- `npm run lint`, `npm run test`, and `npm run build` pass locally
- `npm audit --omit=dev` is clean after dependency refresh
- Known architectural risks and open release blockers are tracked in [docs/github-release-audit-2026-04-05.md](./docs/github-release-audit-2026-04-05.md)

This repository is ready for public GitHub publication after standard documentation and hygiene cleanup. It is not yet a clean browser-store submission candidate while the high-severity architecture items in the release audit remain open.

## Highlights

- Non-custodial by default. Seed phrases and private keys stay with the user.
- Browser extension packaging for Chrome, Brave, Chromium, and Firefox.
- One wallet UI across UTXO, EVM, Cosmos-style, Solana, Sui, and Stellar-style flows.
- Build-time network filtering through `.env.local` or `metayoshi.build.json`.
- Public source with release audit, security policy, support guidance, and contribution standards.

## Configured Network Coverage

The current project metadata includes:

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

Actual availability can still vary by environment configuration and backend availability.

## Quick Start

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

Run the local validation set:

```bash
npm run check:release
```

## Configuration

Copy `.env.example` to `.env.local` and fill in your own values. Do not commit `.env.local`, private credentials, or local build profiles.

Important guardrails:

- Keep all `VITE_*_API_BASE_URL` values on one canonical backend origin unless you are intentionally testing a split deployment.
- If any `VITE_*_API_BASE_URL` points to `localhost` or `127.0.0.1`, also set `VITE_ENABLE_LOCAL_BACKEND_HELP=true`.
- Set both `VITE_BRIDGE_USER` and `VITE_BRIDGE_PASSWORD`, or leave both unset.
- If you set `VITE_DEFAULT_NETWORK`, it must remain enabled after `VITE_DISABLED_COINS`, `VITE_ENABLED_COINS`, and `metayoshi.build.json` filtering.

Hide networks before build with `.env.local`:

```bash
VITE_DISABLED_COINS=sol,sui,doge
```

Or whitelist a smaller set:

```bash
VITE_ENABLED_COINS=eth,base,arb,polygon
```

For a dedicated build profile, create `metayoshi.build.json` from `metayoshi.build.example.json`.

## Scripts

- `npm run dev` starts the Vite development server
- `npm run lint` runs ESLint across the repository
- `npm run test` runs the shipped unit and node-based tests
- `npm run build` creates a production extension build
- `npm run check:release` runs the main local release gate
- `npm run release` builds and repacks release archives

## Extension Permissions

The manifest requests broad optional host permissions for wallet-provider compatibility on supported websites. The current content-script path is deny-by-default for public origins and only injects the inpage provider when the site is explicitly authorized or explicitly allowlisted.

This distinction matters:

- broad host access is still visible to reviewers and store policies
- provider injection is not intended to be globally enabled by default
- browser-store submission still needs the permission story, support text, and privacy text kept in sync with the actual code

## Docs And Standards

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SUPPORT.md](./SUPPORT.md)
- [SECURITY.md](./SECURITY.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [NOTICE.md](./NOTICE.md)
- [docs/release-checklist.md](./docs/release-checklist.md)
- [docs/github-release-audit-2026-04-05.md](./docs/github-release-audit-2026-04-05.md)

## Support

- Website: `https://metayoshi.app`
- Support: `support@metayoshi.app`
- Security: `security@metayoshi.app`

Project support addresses:

- Ethereum / Base / BNB: `0x39904aB90441b7A2C6E5674E0Ce19Ac41607c576`
- Raptoreum: `RFfwc9vv7W6hq3y6H2ZiYsb4PXZZ4Vi83m`
- Cosmos: `cosmos1dutpffteuk2euly728lg7kkn5lpqn9m9c3d56h`
- Dash: `Xt1U9CuRRHEwi5pjjNEVbVah3fbwcy2K4Xm`

## License

Source code is released under the MIT License. See [LICENSE](./LICENSE).

Brand names, logos, icons, and other MetaYoshi / GLab branding are covered separately. See [NOTICE.md](./NOTICE.md).
