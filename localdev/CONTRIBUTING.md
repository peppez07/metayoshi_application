# Contributing

## Scope

MetaYoshi Wallet accepts focused contributions that improve wallet safety, runtime correctness, documentation quality, test coverage, and release hygiene.

Before opening a pull request:

- read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- read [SECURITY.md](./SECURITY.md)
- review the current [release audit](./docs/github-release-audit-2026-04-05.md)

## Local Setup

Requirements:

- Node.js `20+`
- npm `10+`

Setup:

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with your own local values only. Never commit local credentials, bridge secrets, or production-like tokens.

## Required Checks

Run these before opening a PR:

```bash
npm run lint
npm run test
npm run build
```

Or run the combined gate:

```bash
npm run check:release
```

## Pull Request Expectations

- Keep changes scoped and reviewable.
- Add or update tests when behavior changes.
- Update README or docs when the public usage story changes.
- Call out security-sensitive or permission-sensitive changes explicitly.
- Do not mix unrelated refactors into bug fixes.

## Sensitive Files

Do not commit:

- `.env.local`
- `.env.*.local`
- `metayoshi.build.json`
- release archives, signing artifacts, or private keys
- local-only notes that expose infrastructure or credentials

## Security Reporting

If you find a vulnerability, do not open a public issue first. Follow [SECURITY.md](./SECURITY.md) and report it privately to `security@metayoshi.app`.
