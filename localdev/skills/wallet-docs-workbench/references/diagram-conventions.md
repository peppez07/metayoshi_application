# Diagram Conventions

Use this file when drafting draw.io-ready flow artifacts for the wallet app and any supporting server systems.

## Choose The Right Flow Family
- Use a request/approval flow for dapp requests, permissions, and transaction signing.
- Use a lifecycle flow for unlock, bootstrap, registration, sync, and recovery sequences.
- Use a bridge flow for webpage, content script, inpage provider, background worker, and popup coordination.
- Use a wallet-server flow for auth, sync, indexing, notifications, relays, or policy checks.

## Keep Draw.io Output Stable
- Assign every node a stable id such as `UI-01`, `BG-02`, `SRV-03`, or `RPC-04`.
- Keep node labels short, ideally two to six words.
- Put one action or state in each node.
- Put one main result on each edge.
- Keep notes separate from node labels so the same node table can be copied into draw.io cleanly.

## Use Clear Swimlanes
- `DAPP` for the webpage or connected dapp.
- `INPAGE` for injected provider logic.
- `CONTENT` for the content script bridge.
- `BG` for the extension background or service worker.
- `UI` for popup or approval routes.
- `STORE` for Zustand state and wallet helpers.
- `SRV` for backend services, relays, or indexers.
- `RPC` for chain nodes or third-party RPC providers.

## Cover The Paths People Forget
- Locked wallet.
- Missing permission.
- User rejection.
- Expired approval or timeout.
- Background worker unavailable or restarted.
- RPC or server error.
- Unsupported network or capability mismatch.

## Mark Trust Boundaries
- Call out every step that crosses:
  - webpage to extension
  - extension to server
  - extension to RPC
  - server to third-party service
- Mark signing boundaries explicitly. Do not imply server-side signing unless the design actually does that and the user has approved it.

## Separate Current And Planned Behavior
- Label nodes or sections as `current`, `planned`, or `assumed` when mixing states.
- If a server component is not in the repo, list the assumption in a dedicated assumptions section.

## Output Expectation
- Deliver a flow spec with:
  - metadata
  - swimlanes
  - node table
  - edge table
  - exception paths
  - implementation references
- If the user also wants Mermaid, derive it from the same node ids and labels so the diagram and the spec stay aligned.
