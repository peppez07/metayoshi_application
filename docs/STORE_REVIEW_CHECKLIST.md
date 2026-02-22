# Chrome Web Store Review Checklist

Last updated: 2026-02-20

This checklist reflects the current MetaYoshi extension packaging profile.

## Permissions (least privilege)

- `permissions`: `storage`
- No `alarms`
- No `notifications`
- No `externally_connectable`

## Host scope

Declared in `public/manifest.json`:
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

## Content script scope

Content script + web-accessible resources are limited to:
- `metayoshi.app` / `*.metayoshi.app`
- localhost variants (`localhost` and `127.0.0.1`)

Runtime host allowlist key:
- `dapp_injection_allowlist_v1`

## Security statements for submission

Use these points in your store submission notes:
- The extension does not require privileged Chrome APIs beyond `storage`.
- DApp connect/send requests require explicit user approval and scoped origin permissions.
- DApp permissions are persisted by normalized origin under `metayoshi-dapp-permissions-v1`.
- Wallet session mnemonic is kept in memory and not persisted to storage.
- For public builds, bridge master secrets are kept server-side; secure write flow uses short-lived server-issued tokens.
- Legacy `X-Bridge-Tx-Key` support is retained only for compatibility/private deployments.

## Packaging artifacts

- Chromium package source: `dist-chromium/`
- Firefox package source: `dist-firefox/`
- Chromium CWS upload ZIP: `Metayoshi-chromium.zip`
- Firefox AMO upload ZIP: `Metayoshi-firefox.zip`

Regenerate packages:

```bash
npm run build:browsers
```

Create Firefox upload ZIP (manifest at root, no Finder metadata):

```bash
npm run zip:firefox
```

Create Chromium upload ZIP (manifest at root, no Finder metadata):

```bash
npm run zip:chromium
```
