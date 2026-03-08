# [Project Or Feature] Whitepaper

## Summary
[One-paragraph overview of the wallet/server capability and why it exists.]

## Problem Statement
- [user or market problem]
- [current limitation]
- [scope boundary]

## System Overview
- Wallet app responsibilities:
  - [extension responsibilities]
- Server responsibilities:
  - [backend responsibilities]
- External dependencies:
  - [RPCs, relays, indexers, browser APIs]

## Architecture
### Wallet
- [background/content/inpage/UI/store/coins/lib boundaries]

### Server
- [services, APIs, workers, data flows]

### Interfaces
- [wallet to dapp]
- [wallet to server]
- [server to chain or third-party systems]

## Trust Model
- Non-custodial boundary:
  - [where keys live]
- Signing boundary:
  - [where approvals happen]
- Sensitive inputs:
  - [origins, payloads, secrets, RPC responses]

## Security And Failure Modes
- [approval abuse cases]
- [bridge risks]
- [server trust assumptions]
- [degraded mode or outage behavior]

## Compatibility Constraints
- Browsers:
  - [Chromium, Firefox, packaging notes]
- Dapps:
  - [provider compatibility expectations]
- Chains:
  - [runtime model and adapter constraints]

## Current State Vs Planned State
### Current
- [implemented behavior]

### Planned
- [future milestones]

## Validation
- [build, lint, QA, security, flow validation]

## Operational Notes
- [deploy, packaging, monitoring, support, rollback]

## Open Questions
- [items requiring confirmation]
