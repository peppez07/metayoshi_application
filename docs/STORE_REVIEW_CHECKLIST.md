# Store Review Checklist

This checklist reflects the current MetaYoshi (Raptoreum-only) packaging profile.

## Permissions (least privilege)

- `permissions`: `storage`
- No `host_permissions`: the wallet's only network traffic is the WebSocket
  connection to the configured ElectrumX servers, which needs no host permission.
- No `alarms`, `notifications` or `externally_connectable`

## Content script scope

The content script is declared for all `http(s)` pages but only injects the provider
on allowlisted hosts. The allowlist is stored under `dapp_injection_allowlist_v1`
and defaults to `metayoshi.app` and `*.metayoshi.app`.

## Security statements for submission

- Non-custodial: the recovery phrase is encrypted locally (PBKDF2-SHA256, 310k
  iterations, AES-GCM) and only decrypted into memory; it is never persisted in plain text.
- Transactions are built and signed in the extension. ElectrumX servers receive
  only public addresses (as script hashes) and signed transactions.
- Every server must report the Raptoreum mainnet genesis hash before it is used.
- dApp connect and send requests require explicit approval and per-origin scopes,
  stored under `metayoshi-dapp-permissions-v1`.
- The extension makes no other network requests. Explorer and IPFS links open
  only when the user clicks them.

## Packaging artifacts

- Chromium package source: `dist-chromium/`
- Firefox package source: `dist-firefox/`

```bash
npm run build:browsers   # both packages
npm run zip:chromium     # Chromium upload ZIP
npm run zip:firefox      # Firefox upload ZIP
```
