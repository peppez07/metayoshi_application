# Flow Spec: [Flow Name]

## Metadata
- Audience: [engineering | product | security | QA | partner]
- Scope: [current | planned | mixed]
- Goal: [what this flow explains]

## Swimlanes
| Lane ID | Actor/System | Boundary Type | Notes |
| --- | --- | --- | --- |
| DAPP | Webpage or dapp | External | |
| INPAGE | Injected provider | Extension boundary | |
| CONTENT | Content script | Extension boundary | |
| BG | Background/service worker | Trusted extension | |
| UI | Popup/approval route | Trusted extension | |
| STORE | Zustand/runtime helper | Trusted extension | |
| SRV | Backend service | Server boundary | |
| RPC | Chain/RPC provider | External | |

## Nodes
| ID | Lane | Label | Type | Description | Source |
| --- | --- | --- | --- | --- | --- |
| BG-01 | BG | Receive request | action | [what starts here] | [file path or assumption] |
| UI-01 | UI | Show approval | action | [what the user sees] | [file path or assumption] |

## Edges
| From | To | Trigger | Outcome | Notes |
| --- | --- | --- | --- | --- |
| BG-01 | UI-01 | Approval required | User prompt opened | |

## Exceptions
| From | To | Condition | Outcome |
| --- | --- | --- | --- |
| BG-01 | BG-ERR | Wallet locked | Reject request with explicit error |

## Trust Boundaries
- [boundary crossing and why it matters]

## Assumptions
- [server or future-state assumptions]

## Implementation References
- [absolute or repo-relative file paths]
