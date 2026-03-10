# Artifact Checklists

Use this file to review whitepapers and roadmaps before finalizing them.

## Whitepaper Checklist
- State the audience: engineering, partner, investor, auditor, or product.
- Define the problem, scope, and non-goals.
- Explain the wallet architecture using real module boundaries.
- Separate wallet responsibilities from server responsibilities.
- Describe the non-custodial model and signing boundaries.
- List trust assumptions, threat considerations, and abuse-sensitive surfaces.
- Explain compatibility constraints for browsers, dapps, and supported chains.
- Distinguish implemented behavior from roadmap items.
- Name operational dependencies such as RPC providers, relays, indexers, or packaging steps.
- Avoid marketing filler unless the user explicitly asks for a promotional tone.

## Roadmap Checklist
- Group work into milestones that can be shipped and verified independently.
- Give each milestone a concrete objective and scope boundary.
- Name the primary owner and any consulted roles.
- List dependencies across UI, store, chain logic, bridge/security, server, packaging, and QA.
- Include validation steps, not just feature statements.
- Add risks and a rollback or fallback note for risky milestones.
- Avoid fake certainty with dates. If dates are not known, use phases or target windows instead.
- Call out any milestone that changes wallet semantics, approvals, or provider compatibility.

## Shared Quality Checks
- Cite source files, configs, tickets, or assumptions for major claims.
- Keep terminology consistent across diagrams, whitepapers, and roadmaps.
- Include locked, rejected, failed, or degraded states where they affect user behavior.
- Flag missing information instead of filling gaps with invented details.
