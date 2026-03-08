# Source Priority

Use sources in this order unless the task explicitly requires something else.

## Tier 1
- Official project or foundation websites
- Official developer docs
- Official GitHub organizations and repositories
- Official explorer or indexer documentation
- Canonical protocol specifications, standards, or improvement proposals

Use Tier 1 sources for chain ids, RPC methods, explorer APIs, token standards, fee rules, signing rules, and wallet compatibility claims.

## Tier 2
- Official SDK package pages that point back to the project
- Official release notes and changelogs
- Maintainer-authored examples inside official repos
- First-party public support portals

Use Tier 2 to confirm implementation details or recent changes when Tier 1 documentation is thin.

## Tier 3
- Established ecosystem registries
- Well-known infra provider docs for that exact chain
- Reputable community-maintained references

Use Tier 3 only when primary docs are incomplete. Label these sources as secondary and do not rely on them alone for risky metadata.

## Avoid As Primary Truth
- Marketing blogs
- SEO tutorials
- Random Medium posts
- Aggregator summaries
- Social posts without linked canonical documentation

## Conflict Rules
- Prefer protocol specs and official code over marketing copy.
- Prefer maintained docs over stale examples.
- Prefer the chain's own documentation over wallet-specific integrations describing it.
- If authoritative sources disagree on chain ids, decimals, endpoints, or provider semantics, stop and surface the conflict.
