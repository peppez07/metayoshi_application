# MetaYoshi GitHub Release Checklist

Date prepared: `2026-04-05`

## Repository Hygiene

- [ ] Confirm `.env.local` and local secrets are not staged for upload
- [ ] Confirm `metayoshi.build.json` is not staged for upload
- [ ] Confirm `dist/`, release archives, and signing artifacts are not committed
- [ ] Confirm README, CHANGELOG, LICENSE, NOTICE, SECURITY, SUPPORT, CONTRIBUTING, and CODE_OF_CONDUCT are present
- [ ] Confirm issue templates and PR template are present under `.github/`

## Validation

- [ ] Run `npm install`
- [ ] Run `npm run lint`
- [ ] Run `npm run test`
- [ ] Run `npm run build`
- [ ] Review `npm audit --omit=dev`

## Security And Privacy

- [ ] Re-check manifest permissions before store-facing distribution
- [ ] Re-check dapp approval and request isolation before broad production rollout
- [ ] Re-check no runtime logs expose addresses, balances, token sets, or signing payloads
- [ ] Re-check no production credentials or bridge secrets are present in tracked files

## Packaging

- [ ] Verify Chrome/Chromium build output loads correctly
- [ ] Verify Firefox-specific packaging still works
- [ ] Verify icons, logos, and branding usage match the repository notice
- [ ] Verify release archive contents contain only intended files

## Publication

- [ ] Open the repo with the final GitHub description and topics
- [ ] Pin the release audit in project docs or release notes
- [ ] Tag the release only after unresolved high-severity findings are explicitly accepted or fixed
