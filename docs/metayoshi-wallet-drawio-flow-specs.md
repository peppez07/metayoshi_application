# MetaYoshi Wallet Draw.io Flow Specs

Source baseline: `localdev` wallet tree, which currently carries version `0.1.8`.

These specs are written so you can rebuild the diagrams in draw.io with stable node ids, short labels, explicit exception paths, and clear trust boundaries.

## Flow Spec: Wallet Bootstrap And Session Lifecycle

### Metadata
- Audience: engineering, product, QA
- Scope: current
- Goal: explain how the popup moves from first open to register, unlock, connecting, welcome, and wallet home

### Swimlanes
| Lane ID | Actor/System | Boundary Type | Notes |
| --- | --- | --- | --- |
| UI | Popup UI routes | Trusted extension | React routes and route guards |
| STORE | Zustand wallet store | Trusted extension | Vault, accounts, balances, activity |
| SRV | Wallet support server | Server boundary | Used for RTM health and bridge checks |
| RPC | Chain or bridge RPC | External | Used during address and balance sync |

### Nodes
| ID | Lane | Label | Type | Description | Source |
| --- | --- | --- | --- | --- | --- |
| UI-01 | UI | Open popup | action | User opens the extension popup or wallet window | `localdev/src/App.tsx` |
| UI-02 | UI | Route gate | decision | Route guards choose register, unlock, welcome, or wallet routes from persisted state | `localdev/src/App.tsx` |
| UI-03 | UI | Register vault | action | User creates a wallet from a generated phrase or imports by phrase or backup | `localdev/src/pages/Register.tsx` |
| STORE-01 | STORE | Initialize vault | action | Store encrypts mnemonic, derives account addresses, and persists initial state | `localdev/src/store/walletStore.ts` |
| UI-04 | UI | Unlock vault | action | User submits the wallet password on `/unlock` | `localdev/src/pages/Unlock.tsx` |
| STORE-02 | STORE | Restore session | action | Store decrypts the vault, restores the in-memory mnemonic, and marks wallet unlocked | `localdev/src/store/walletStore.ts` |
| UI-05 | UI | Connecting screen | action | Wallet enters the connect-and-sync sequence after register or unlock | `localdev/src/pages/Connecting.tsx` |
| STORE-03 | STORE | Derive address | action | Store ensures the active account has an address for the active network | `localdev/src/pages/Connecting.tsx`, `localdev/src/store/walletStore.ts` |
| SRV-01 | SRV | RTM handshake | action | For RTM, wallet checks `/health`, optional `/v1/status`, and a bridge smoke check | `localdev/src/pages/Connecting.tsx` |
| STORE-04 | STORE | Refresh balance | action | Wallet refreshes the active network balance and sync state | `localdev/src/pages/Connecting.tsx`, `localdev/src/store/walletStore.ts` |
| UI-06 | UI | Welcome guide | state | Wallet sends first-time users to `/welcome` before the full shell | `localdev/src/App.tsx` |
| UI-07 | UI | Wallet home | state | Wallet lands on `/wallet/assets` or `/wallet/activity` based on capabilities | `localdev/src/App.tsx` |
| STORE-05 | STORE | Lock session | action | Autolock, page hide, beforeunload, or missing session mnemonic re-lock the popup | `localdev/src/App.tsx`, `localdev/src/store/walletStore.ts` |
| UI-ERR | UI | Show error | state | Fatal connecting error is shown when address derivation fails | `localdev/src/pages/Connecting.tsx` |
| UI-WARN | UI | Show warning | state | Non-fatal warning is shown when RTM handshake or bridge sync fails | `localdev/src/pages/Connecting.tsx` |

### Edges
| From | To | Trigger | Outcome | Notes |
| --- | --- | --- | --- | --- |
| UI-01 | UI-02 | Popup loaded | Evaluate wallet state | Persisted state is hydrated first |
| UI-02 | UI-03 | No vault or not initialized | Registration flow opened | `/register` |
| UI-03 | STORE-01 | Create or import confirmed | Vault and first account persisted | Phrase import and full backup restore both land here conceptually |
| STORE-01 | UI-05 | Vault ready | Connecting flow started | Register navigates to `/connecting` |
| UI-02 | UI-04 | Vault exists and wallet locked | Unlock screen opened | `/unlock` |
| UI-04 | STORE-02 | Password submitted | Vault decrypted in memory | Fast unlock restores persisted accounts first |
| STORE-02 | UI-05 | Password valid | Connecting flow started | Unlock navigates to `/connecting` |
| UI-05 | STORE-03 | Connect sequence started | Active network address checked | Fatal if no usable address can be derived |
| STORE-03 | SRV-01 | Active network is RTM | Server and bridge checked | Warning only, not fatal |
| STORE-03 | STORE-04 | Active network is not RTM | Balance refresh starts | Direct refresh path |
| SRV-01 | STORE-04 | Handshake completed or warning tolerated | Balance refresh starts | RTM warnings do not block wallet entry |
| STORE-04 | UI-06 | Onboarding incomplete | Welcome route opened | `/welcome` |
| STORE-04 | UI-07 | Onboarding complete | Wallet shell opened | `/wallet/assets` by default when assets tab is enabled |
| UI-07 | STORE-05 | Page hidden, beforeunload, autolock, or missing session mnemonic | Wallet relocked | Returns future opens to `/unlock` |

### Exceptions
| From | To | Condition | Outcome |
| --- | --- | --- | --- |
| UI-04 | UI-04 | Password invalid | Stay on unlock with explicit error |
| STORE-03 | UI-ERR | Address derivation fails | Connecting stops on fatal error screen |
| SRV-01 | UI-WARN | RTM health or bridge smoke check fails | Warning banner shown, wallet still proceeds |
| STORE-04 | UI-WARN | Balance sync or bridge refresh fails | Warning banner shown, wallet still proceeds |
| UI-02 | UI-04 | Hydrated state shows unlocked but no session mnemonic exists | App forces lock before rendering secure routes |

### Trust Boundaries
- `UI -> STORE`: trusted extension boundary where the popup mutates encrypted vault and session state.
- `STORE -> SRV`: extension crosses to the MetaYoshi support server for RTM health and bridge checks.
- `STORE -> RPC`: extension crosses to chain or bridge RPC for balance refresh and address-dependent state.

### Assumptions
- None. This flow is based on current code.

### Implementation References
- `localdev/src/App.tsx`
- `localdev/src/pages/Register.tsx`
- `localdev/src/pages/Unlock.tsx`
- `localdev/src/pages/Connecting.tsx`
- `localdev/src/store/walletStore.ts`

## Flow Spec: Provider Bridge Runtime

### Metadata
- Audience: engineering, security, partner
- Scope: current
- Goal: explain how a webpage request moves through the inpage provider, content script, background worker, and back

### Swimlanes
| Lane ID | Actor/System | Boundary Type | Notes |
| --- | --- | --- | --- |
| DAPP | Webpage or dapp | External | Calls `window.metayoshi` or `window.rtm` |
| INPAGE | Injected provider | Extension boundary | Maintains provider state and event listeners |
| CONTENT | Content script | Extension boundary | Enforces origin and context protections |
| BG | Background service worker | Trusted extension | Handles RPC methods and popup orchestration |
| STORE | Zustand and persisted wallet state | Trusted extension | Source of account, network, and permission state |

### Nodes
| ID | Lane | Label | Type | Description | Source |
| --- | --- | --- | --- | --- | --- |
| DAPP-01 | DAPP | Call provider | action | Site calls `request`, `connect`, `enable`, `accounts`, or capability methods | `localdev/src/inpage/inpage-provider.ts` |
| INP-01 | INPAGE | Queue request | action | Inpage provider assigns a request id and posts a JSON-RPC message to the content script | `localdev/src/inpage/inpage-provider.ts` |
| CON-01 | CONTENT | Validate origin | decision | Content script blocks internal localhost/private-network origins and invalid extension contexts | `localdev/src/content/content-script.ts` |
| CON-02 | CONTENT | Forward RPC | action | Content script sends `DAPP_INTERNAL_RPC` to the background worker | `localdev/src/content/content-script.ts` |
| BG-01 | BG | Receive RPC | action | Background worker receives the request plus sender origin | `localdev/src/background/service-worker.ts` |
| STORE-01 | STORE | Load state | action | Background reads wallet state, active account, active network, and permissions from storage | `localdev/src/background/service-worker.ts` |
| BG-02 | BG | Resolve method | decision | Background validates method, requested network hints, capabilities, and permission requirements | `localdev/src/background/service-worker.ts` |
| BG-03 | BG | Build response | action | Background returns provider state, accounts, networks, capabilities, or a routed error | `localdev/src/background/service-worker.ts` |
| CON-03 | CONTENT | Return response | action | Content script posts JSON-RPC response back into page context | `localdev/src/content/content-script.ts` |
| INP-02 | INPAGE | Resolve promise | action | Inpage provider resolves or rejects the pending request and updates local provider state | `localdev/src/inpage/inpage-provider.ts` |
| DAPP-02 | DAPP | Consume result | state | Site receives result or explicit JSON-RPC error | `localdev/src/inpage/inpage-provider.ts` |
| STORE-02 | STORE | State changed | state | Wallet state changes after unlock, network switch, account switch, or lock event | `localdev/src/background/service-worker.ts`, `localdev/src/store/walletStore.ts` |
| BG-04 | BG | Broadcast event | action | Background emits `accountsChanged`, `networkChanged`, or `lockChanged` over a runtime port | `localdev/src/background/service-worker.ts` |
| CON-04 | CONTENT | Relay event | action | Content script relays event payloads into the page | `localdev/src/content/content-script.ts` |
| INP-03 | INPAGE | Emit event | action | Inpage provider updates cached state and notifies dapp listeners | `localdev/src/inpage/inpage-provider.ts` |
| DAPP-03 | DAPP | Handle event | state | Site reacts to wallet state updates | `localdev/src/inpage/inpage-provider.ts` |

### Edges
| From | To | Trigger | Outcome | Notes |
| --- | --- | --- | --- | --- |
| DAPP-01 | INP-01 | Site calls provider | Request queued | JSON-RPC envelope created in page context |
| INP-01 | CON-01 | Post message sent | Content bridge receives request | Webpage to extension boundary |
| CON-01 | CON-02 | Origin allowed and context valid | Request forwarded to background | Blocked internal origins stop here |
| CON-02 | BG-01 | Runtime message sent | Background request handling starts | Content to background boundary |
| BG-01 | STORE-01 | RPC received | Wallet state loaded | Reads persisted state and permissions |
| STORE-01 | BG-02 | State available | Method and network resolved | Includes capability and scope checks |
| BG-02 | BG-03 | Method supported | JSON-RPC result or explicit error built | Unsupported methods reject here |
| BG-03 | CON-03 | Response ready | Response returned to content script | Background to content boundary |
| CON-03 | INP-02 | Page message posted | Pending promise resolved or rejected | Extension to webpage boundary |
| INP-02 | DAPP-02 | Provider settled | Site receives result | Also updates local provider cache |
| STORE-02 | BG-04 | Wallet state mutates | Provider event emitted | Triggered by storage change listener |
| BG-04 | CON-04 | Event port message sent | Event relayed into page | Background to content boundary |
| CON-04 | INP-03 | Event posted | Provider listeners notified | Extension to webpage boundary |
| INP-03 | DAPP-03 | Listener registered | Site receives event callback | `accountsChanged`, `networkChanged`, `lockChanged` |

### Exceptions
| From | To | Condition | Outcome |
| --- | --- | --- | --- |
| CON-01 | CON-03 | Origin is localhost, `.local`, loopback, or private IP | Request rejected with blocked internal origin error |
| CON-01 | CON-03 | Extension context invalidated or reloaded | Request rejected with explicit refresh-needed error |
| BG-02 | BG-03 | Requested network hint does not match supported wallet network | Request rejected with unsupported network error |
| BG-02 | BG-03 | Method is unsupported | Request rejected with method not found |
| BG-02 | BG-03 | Wallet is locked for account-returning methods | Request rejected and unlock popup may be opened |

### Trust Boundaries
- `DAPP -> INPAGE/CONTENT`: untrusted webpage crosses into extension-managed code.
- `CONTENT -> BG`: restricted extension boundary where sender origin is preserved and evaluated.
- `BG -> STORE`: trusted boundary for reading wallet state, permissions, and runtime context.
- `BG/CONTENT -> DAPP`: responses and events cross back into webpage context and must stay explicit.

### Assumptions
- None. This flow is based on current code.

### Implementation References
- `localdev/src/content/content-script.ts`
- `localdev/src/inpage/inpage-provider.ts`
- `localdev/src/background/service-worker.ts`
- `localdev/src/store/walletStore.ts`

## Flow Spec: Direct Wallet Send And Confirmation

### Metadata
- Audience: engineering, product, QA
- Scope: current
- Goal: explain how a user-initiated send from the popup becomes a signed transaction and tracked activity

### Swimlanes
| Lane ID | Actor/System | Boundary Type | Notes |
| --- | --- | --- | --- |
| UI | Popup wallet send and tx routes | Trusted extension | `/wallet/send`, `/tx/confirm`, `/tx/reject` |
| STORE | Zustand wallet store | Trusted extension | Capability checks, send actions, activity, balance |
| SRV | Bridge or wallet support server | Server boundary | Used by some chains and RTM asset flows |
| RPC | Chain or RPC provider | External | Final transaction broadcast target |

### Nodes
| ID | Lane | Label | Type | Description | Source |
| --- | --- | --- | --- | --- | --- |
| UI-01 | UI | Open send | action | User enters the wallet send flow from the active wallet route | `localdev/src/App.tsx` |
| STORE-01 | STORE | Load send context | action | Store resolves active network, active account, capabilities, and sendable items | `localdev/src/App.tsx`, `localdev/src/store/walletStore.ts` |
| UI-02 | UI | Enter transfer | action | User provides recipient, amount, asset choice, and optional memo | `localdev/src/pages/wallet/Send.tsx`, `localdev/src/pages/tx/TxConfirm.tsx` |
| UI-03 | UI | Review tx | action | User lands on `/tx/confirm` to review fees, totals, and origin summary | `localdev/src/pages/tx/TxConfirm.tsx` |
| UI-04 | UI | Confirm send | decision | Confirm or reject is chosen on the tx confirmation route | `localdev/src/pages/tx/TxConfirm.tsx` |
| STORE-02 | STORE | Validate send | action | Store and tx page enforce lock, sync, balance, fee, and capability checks | `localdev/src/pages/tx/TxConfirm.tsx`, `localdev/src/store/walletStore.ts` |
| STORE-03 | STORE | Route signer | action | Store dispatches to the chain-specific send action for EVM, UTXO, XRP, Solana, Cardano, Stellar, Tron, Monero, Cosmos-like, or asset layer | `localdev/src/pages/tx/TxConfirm.tsx`, `localdev/src/store/walletStore.ts` |
| SRV-01 | SRV | Bridge relay | action | Some network sends use bridge-backed RPC or server-assisted relay endpoints | `localdev/src/store/walletStore.ts` |
| RPC-01 | RPC | Broadcast tx | action | Chain or RPC accepts the signed payload and returns a transaction hash or txid | `localdev/src/store/walletStore.ts` |
| STORE-04 | STORE | Track activity | action | Store adds a pending activity row and starts transaction status polling | `localdev/src/pages/tx/TxConfirm.tsx`, `localdev/src/store/walletStore.ts` |
| STORE-05 | STORE | Refresh balance | action | Store triggers a fast balance refresh after send | `localdev/src/pages/tx/TxConfirm.tsx`, `localdev/src/store/walletStore.ts` |
| UI-05 | UI | Return wallet | state | Wallet returns to connecting or wallet views after success | `localdev/src/pages/tx/TxConfirm.tsx` |
| UI-06 | UI | Reject tx | action | User rejects and wallet records a rejected activity row | `localdev/src/pages/tx/TxConfirm.tsx` |

### Edges
| From | To | Trigger | Outcome | Notes |
| --- | --- | --- | --- | --- |
| UI-01 | STORE-01 | Send route opened | Active context loaded | Send route is capability-gated |
| STORE-01 | UI-02 | Send supported | Form shown | Unsupported networks are redirected away from send |
| UI-02 | UI-03 | Send details accepted | Tx review opened | Confirmation route receives prepared state |
| UI-03 | UI-04 | User reviews details | Confirm or reject decision | Fees are estimated here |
| UI-04 | STORE-02 | Confirm pressed | Final validation starts | Sync policy and fee checks run before broadcast |
| STORE-02 | STORE-03 | Validation passed | Chain-specific send path chosen | Uses runtime model and capabilities |
| STORE-03 | SRV-01 | Selected path needs bridge/server assistance | Server-assisted relay performed | Applies only to some networks and asset flows |
| STORE-03 | RPC-01 | Selected path signs locally or uses external signer | Transaction broadcast attempted | Store talks to RPC directly where supported |
| SRV-01 | RPC-01 | Bridge request accepted | Final chain broadcast attempted | Server to RPC boundary |
| RPC-01 | STORE-04 | Hash or txid returned | Pending activity recorded | Activity is network-scoped |
| STORE-04 | STORE-05 | Pending activity created | Balance refresh queued | Also begins transaction status tracking |
| STORE-05 | UI-05 | Refresh queued | Wallet returns to post-send route | Current flow navigates to `/connecting` on success |
| UI-04 | UI-06 | Reject pressed | Rejected activity recorded | Reject route lands on activity view |

### Exceptions
| From | To | Condition | Outcome |
| --- | --- | --- | --- |
| STORE-01 | UI-05 | Active network lacks native send or asset send capability | Send route is redirected away |
| STORE-02 | UI-03 | Wallet locked, sync blocked, unsupported asset path, or insufficient fee balance | Explicit error shown on confirm route |
| STORE-03 | UI-03 | Chain-specific signer throws | Explicit transaction failure shown |
| RPC-01 | UI-03 | Broadcast fails or hash is missing | Send remains failed and user stays on error state |
| UI-04 | UI-06 | User rejects manually | Rejected activity row recorded instead of broadcast |

### Trust Boundaries
- `UI -> STORE`: trusted boundary where user intent becomes a wallet send action.
- `STORE -> SRV`: extension crosses to bridge-backed server infrastructure for some networks.
- `STORE/SRV -> RPC`: signed transaction or relay payload crosses to external RPC or node infrastructure.

### Assumptions
- `localdev/src/pages/wallet/Send.tsx` is treated as the entry form route, while the final approval logic is sourced from `localdev/src/pages/tx/TxConfirm.tsx`.

### Implementation References
- `localdev/src/App.tsx`
- `localdev/src/pages/wallet/Send.tsx`
- `localdev/src/pages/tx/TxConfirm.tsx`
- `localdev/src/store/walletStore.ts`

## Flow Spec: Dapp Connection Approval

### Metadata
- Audience: engineering, security, partner, QA
- Scope: current
- Goal: explain how a dapp obtains wallet permissions and how the popup approval sequence completes

### Swimlanes
| Lane ID | Actor/System | Boundary Type | Notes |
| --- | --- | --- | --- |
| DAPP | Webpage or dapp | External | Requests `connect` or `requestAccounts` |
| INPAGE | Injected provider | Extension boundary | Creates JSON-RPC request |
| CONTENT | Content script | Extension boundary | Bridges to background worker |
| BG | Background service worker | Trusted extension | Persists pending approval and opens popup |
| UI | Popup approval routes | Trusted extension | `/dapp/connect/1` and `/dapp/connect/2` |
| STORE | Zustand and storage state | Trusted extension | Active account, network, authorized sites |

### Nodes
| ID | Lane | Label | Type | Description | Source |
| --- | --- | --- | --- | --- | --- |
| DAPP-01 | DAPP | Request connect | action | Site calls `wallet_connect` or `wallet_requestAccounts` | `localdev/src/inpage/inpage-provider.ts` |
| INP-01 | INPAGE | Send RPC | action | Inpage provider forwards the request to the extension bridge | `localdev/src/inpage/inpage-provider.ts` |
| CON-01 | CONTENT | Forward request | action | Content script forwards to background with sender origin | `localdev/src/content/content-script.ts` |
| BG-01 | BG | Check scopes | decision | Background checks existing permissions and computes missing scopes like `read` | `localdev/src/background/service-worker.ts` |
| BG-02 | BG | Save approval | action | Pending approval is stored in extension storage with expiry and requested scopes | `localdev/src/background/service-worker.ts` |
| BG-03 | BG | Open popup | action | Background opens the managed popup on `/dapp/connect/1` | `localdev/src/background/service-worker.ts` |
| UI-01 | UI | Review scopes | action | Step 1 shows origin, requested scopes, account, requested network, and derived address | `localdev/src/pages/dapp/DappConnectStep1.tsx` |
| UI-02 | UI | Confirm connect | action | Step 2 summarizes permissions and asks the user to connect or cancel | `localdev/src/pages/dapp/DappConnectStep2.tsx` |
| STORE-01 | STORE | Add site | action | Approved origin is added to authorized sites | `localdev/src/pages/dapp/DappConnectStep2.tsx`, `localdev/src/store/walletStore.ts` |
| BG-04 | BG | Grant scopes | action | Background marks scopes approved and updates last-connected time | `localdev/src/background/service-worker.ts` |
| BG-05 | BG | Return accounts | action | Background re-reads wallet state, enforces unlocked status, and returns provider state or accounts | `localdev/src/background/service-worker.ts` |
| DAPP-02 | DAPP | Connected | state | Site receives provider state or account list | `localdev/src/inpage/inpage-provider.ts` |

### Edges
| From | To | Trigger | Outcome | Notes |
| --- | --- | --- | --- | --- |
| DAPP-01 | INP-01 | Site requests connect or accounts | RPC request created | Webpage to extension boundary |
| INP-01 | CON-01 | Provider posts message | Request reaches content script | |
| CON-01 | BG-01 | Runtime message sent | Background starts permission flow | |
| BG-01 | BG-02 | Missing scope detected | Pending approval persisted | Approval includes expiry and requested network id |
| BG-02 | BG-03 | Approval persisted | Managed popup opened | Reuses existing popup if already open |
| BG-03 | UI-01 | Popup route loaded | User sees connection details | Step 1 |
| UI-01 | UI-02 | User continues | Final approval screen shown | Step 2 |
| UI-02 | STORE-01 | User approves | Authorized site added locally | Popup also marks approval as approved in storage |
| STORE-01 | BG-04 | Approval state observed | Scopes granted and last-connected updated | Background waits on stored decision |
| BG-04 | BG-05 | Approval accepted | Provider response assembled | Locked and uninitialized checks happen here |
| BG-05 | DAPP-02 | JSON-RPC response returned | Site receives connected state | Accounts or provider state returned |

### Exceptions
| From | To | Condition | Outcome |
| --- | --- | --- | --- |
| BG-01 | BG-05 | Required scopes already exist | Connect returns immediately without popup |
| BG-03 | DAPP-02 | Popup cannot be opened | Request rejected with user-facing approval error |
| UI-01 | UI-02 | No address exists on the requested network | Connect button stays disabled |
| UI-01 | UI-02 | Wallet is locked | Password gate wraps the approval UI |
| UI-02 | DAPP-02 | User rejects or approval times out | Request rejected with explicit rejection error |
| BG-05 | DAPP-02 | Wallet still locked after approval | Unlock popup may open and request returns lock error |

### Trust Boundaries
- `DAPP -> INPAGE/CONTENT`: untrusted webpage asks for wallet visibility.
- `BG -> UI`: background crosses into popup approval UI but keeps the decision state in extension storage.
- `UI -> STORE`: trusted approval UI modifies authorized-site state.

### Assumptions
- None. This flow is based on current code.

### Implementation References
- `localdev/src/inpage/inpage-provider.ts`
- `localdev/src/content/content-script.ts`
- `localdev/src/background/service-worker.ts`
- `localdev/src/pages/dapp/DappConnectStep1.tsx`
- `localdev/src/pages/dapp/DappConnectStep2.tsx`
- `localdev/src/store/walletStore.ts`

## Flow Spec: Dapp Transaction Approval And Execution

### Metadata
- Audience: engineering, security, QA
- Scope: current
- Goal: explain how a dapp transaction request becomes a wallet approval, chain send, and response back to the dapp

### Swimlanes
| Lane ID | Actor/System | Boundary Type | Notes |
| --- | --- | --- | --- |
| DAPP | Webpage or dapp | External | Requests `wallet_sendTransaction` or `wallet_sendAsset` |
| INPAGE | Injected provider | Extension boundary | Sends request and awaits result |
| CONTENT | Content script | Extension boundary | Bridges to background worker |
| BG | Background service worker | Trusted extension | Checks scopes, stores pending request, waits for decision |
| UI | Popup request confirmation route | Trusted extension | `/dapp/request/confirm` |
| STORE | Zustand wallet store | Trusted extension | Switches network/account, signs, tracks activity |
| SRV | Bridge or relay server | Server boundary | Used by some chain paths |
| RPC | Chain or RPC provider | External | Final broadcast target |

### Nodes
| ID | Lane | Label | Type | Description | Source |
| --- | --- | --- | --- | --- | --- |
| DAPP-01 | DAPP | Request tx | action | Site asks to send native coin or asset via the provider SDK | `localdev/src/inpage/inpage-provider.ts` |
| INP-01 | INPAGE | Forward tx | action | Inpage provider posts the JSON-RPC request into the extension bridge | `localdev/src/inpage/inpage-provider.ts` |
| CON-01 | CONTENT | Relay tx | action | Content script forwards the request to the background worker | `localdev/src/content/content-script.ts` |
| BG-01 | BG | Validate tx scope | decision | Background checks initialization, network capability, active account, and required scopes | `localdev/src/background/service-worker.ts` |
| BG-02 | BG | Save request | action | Pending request is stored with request id, origin, network id, account id, and payload | `localdev/src/background/service-worker.ts` |
| BG-03 | BG | Open request popup | action | Background opens `/dapp/request/confirm?id=...` and waits for decision | `localdev/src/background/service-worker.ts` |
| UI-01 | UI | Review request | action | Popup shows origin, network, runtime model, recipient, amount, asset id, and gas fields | `localdev/src/pages/dapp/DappRequestConfirm.tsx` |
| UI-02 | UI | Approve or reject | decision | User explicitly rejects or approves after an optional password gate | `localdev/src/pages/dapp/DappRequestConfirm.tsx` |
| STORE-01 | STORE | Switch context | action | Wallet temporarily switches to the request account and network before execution | `localdev/src/pages/dapp/DappRequestConfirm.tsx` |
| STORE-02 | STORE | Execute send | action | Wallet routes to `sendAssetTransfer` or the chain-specific send action | `localdev/src/pages/dapp/DappRequestConfirm.tsx`, `localdev/src/store/walletStore.ts` |
| SRV-01 | SRV | Bridge relay | action | Server-assisted path is used where the selected chain flow requires it | `localdev/src/store/walletStore.ts` |
| RPC-01 | RPC | Broadcast request | action | Transaction reaches the chain and returns a hash or txid | `localdev/src/store/walletStore.ts` |
| STORE-03 | STORE | Record activity | action | Wallet records a pending activity row and starts status tracking | `localdev/src/pages/dapp/DappRequestConfirm.tsx`, `localdev/src/store/walletStore.ts` |
| STORE-04 | STORE | Restore context | action | Wallet restores the previous active account and network after completion | `localdev/src/pages/dapp/DappRequestConfirm.tsx` |
| BG-04 | BG | Return result | action | Background sees executed, rejected, timeout, or failed status and replies to the dapp | `localdev/src/background/service-worker.ts` |
| DAPP-02 | DAPP | Receive tx result | state | Site receives `{ hash, txid }` or an explicit rejection or failure error | `localdev/src/inpage/inpage-provider.ts` |

### Edges
| From | To | Trigger | Outcome | Notes |
| --- | --- | --- | --- | --- |
| DAPP-01 | INP-01 | Site requests transaction | RPC payload created | Webpage to extension boundary |
| INP-01 | CON-01 | Provider posts message | Content bridge receives tx request | |
| CON-01 | BG-01 | Runtime message sent | Background starts transaction review flow | |
| BG-01 | BG-02 | Request passes capability and scope checks | Pending request persisted | `read + send_coin` or `read + send_asset` may be required |
| BG-02 | BG-03 | Pending request stored | Request popup opened | Managed popup is reused when possible |
| BG-03 | UI-01 | Popup route loaded | User sees the pending request | Includes runtime model and gas fields where relevant |
| UI-01 | UI-02 | User reviews request | Approve or reject chosen | Password gate wraps locked-wallet cases |
| UI-02 | STORE-01 | Approve pressed | Wallet switches to request account and network | Previous context is remembered for restore |
| STORE-01 | STORE-02 | Request context active | Chain-specific send action executed | Uses runtime model to select send implementation |
| STORE-02 | SRV-01 | Selected path needs bridge/server support | Server-assisted relay performed | Applies only to some chains |
| STORE-02 | RPC-01 | Selected path can broadcast directly | RPC broadcast attempted | Direct signer path |
| SRV-01 | RPC-01 | Relay accepted | Final chain broadcast attempted | Server to RPC boundary |
| RPC-01 | STORE-03 | Hash or txid returned | Pending activity and polling recorded | Balance refresh follows in the store |
| STORE-03 | STORE-04 | Send completed | Prior UI context restored | Previous network/account restored in `finally` |
| STORE-04 | BG-04 | Stored status changes to executed | Background returns success result | Waiter resolves in background worker |
| BG-04 | DAPP-02 | JSON-RPC response returned | Dapp receives hash or error | Final response crosses back to webpage |

### Exceptions
| From | To | Condition | Outcome |
| --- | --- | --- | --- |
| BG-01 | DAPP-02 | Wallet uninitialized, no active account, unsupported send capability, or unsupported network hint | Request rejected before popup |
| BG-03 | DAPP-02 | Popup cannot be opened | Request rejected with approval-popup error |
| UI-01 | UI-02 | Wallet locked | Password gate is required before approval |
| UI-02 | BG-04 | User rejects or request times out | Background returns user rejection |
| UI-02 | UI-01 | Sync policy blocks sending | Popup shows explicit sync-block reason and approval is disabled |
| STORE-02 | BG-04 | Chain send throws or broadcast fails | Background returns transaction failure |
| STORE-04 | BG-04 | Context restore fails | Request result stays authoritative even if UI restore does not complete cleanly |

### Trust Boundaries
- `DAPP -> INPAGE/CONTENT`: untrusted webpage asks the extension to spend funds.
- `BG -> UI`: background opens a trusted approval route and waits on extension storage state.
- `STORE -> SRV`: extension crosses to bridge or relay infrastructure for some chains.
- `STORE/SRV -> RPC`: signed payload or relay request crosses to external chain infrastructure.

### Assumptions
- None. This flow is based on current code.

### Implementation References
- `localdev/src/inpage/inpage-provider.ts`
- `localdev/src/content/content-script.ts`
- `localdev/src/background/service-worker.ts`
- `localdev/src/pages/dapp/DappRequestConfirm.tsx`
- `localdev/src/store/walletStore.ts`
