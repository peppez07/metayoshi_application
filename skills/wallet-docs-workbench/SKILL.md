---
name: wallet-docs-workbench
description: Draft draw.io-compatible flow specifications, whitepapers, and roadmap documents for wallet apps and supporting server systems. Use when Codex needs to turn code, architecture notes, release plans, or integration flows into structured documentation for browser extension wallets, signing flows, backend services, or stakeholder communication.
---

# Wallet Docs Workbench

Use this skill to turn wallet and server implementation context into reusable documentation artifacts.

## Quick Start
- Read the relevant code paths before drafting.
- Decide whether the request is for:
  - a draw.io-ready flow spec
  - a whitepaper
  - a roadmap
- Load only the reference file needed for the artifact:
  - `references/diagram-conventions.md` for flows
  - `references/artifact-checklists.md` for whitepapers and roadmaps
- Start from the matching template in `assets/templates/`.

## Workflow
1. Map the current system.
- Identify actors, trust boundaries, state transitions, external dependencies, and approval gates.
- Prefer the actual wallet boundaries already present in the repo:
  - background/service worker
  - content/inpage provider bridge
  - popup UI/routes
  - Zustand store
  - chain adapters and runtime helpers
  - packaging and release scripts
- Mark server behavior as assumed, proposed, or externally owned if it is not present in the repo.

2. Pick the artifact and template.
- Use `assets/templates/flow-spec-template.md` for draw.io-ready flows.
- Use `assets/templates/whitepaper-template.md` for whitepapers.
- Use `assets/templates/roadmap-template.md` for roadmaps.

3. Draft with stable conventions.
- Keep flow nodes short and edge labels action-oriented.
- Include rejection, timeout, locked-wallet, and error paths for approval or signing flows.
- Separate current-state facts from planned changes.
- Tie roadmap milestones to validation gates, owner roles, and rollback triggers.

4. Validate before finalizing.
- Confirm every major claim is sourced from code, config, or an explicit assumption.
- Ensure the artifact names app-side versus server-side ownership.
- Keep the tone direct and technical unless the user explicitly wants executive or investor language.

## Artifact Rules

### Draw.io-ready flows
- Use the node and edge format in `assets/templates/flow-spec-template.md`.
- Include:
  - title
  - audience
  - swimlanes
  - node table with stable ids
  - edge table with trigger and outcome labels
  - exception paths
  - implementation references
- Prefer one action per node and one outcome per edge.
- Keep labels short enough to fit inside draw.io shapes without rewriting.
- Add explicit notes when a step crosses webpage, extension, server, or chain trust boundaries.

### Whitepapers
- Use `assets/templates/whitepaper-template.md`.
- Cover:
  - problem and scope
  - architecture
  - wallet and server responsibilities
  - non-custodial and trust model
  - compatibility and chain support constraints
  - security assumptions
  - rollout and operational considerations
- Separate what exists today from planned work.

### Roadmaps
- Use `assets/templates/roadmap-template.md`.
- Group work by milestone rather than backlog order.
- For each milestone, include:
  - objective
  - scope
  - dependencies
  - validation
  - risks
  - rollback or fallback note
- Prefer milestones that can ship and be tested independently.

## Resources
- Read `references/diagram-conventions.md` for draw.io fit rules, node naming, and flow coverage.
- Read `references/artifact-checklists.md` for whitepaper and roadmap review checklists.
- Reuse the templates in `assets/templates/` instead of starting from a blank document.
