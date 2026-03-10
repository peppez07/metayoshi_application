# MetaYoshi Wallet Mermaid Sources

These Mermaid diagrams use the same node ids as `docs/metayoshi-wallet-drawio-flow-specs.md` so they stay aligned with the draw.io-ready specs.

## Wallet Bootstrap And Session Lifecycle

```mermaid
flowchart LR
  UI01["UI-01 Open popup"] --> UI02{"UI-02 Route gate"}
  UI02 -->|"No vault"| UI03["UI-03 Register vault"]
  UI03 --> STORE01["STORE-01 Initialize vault"]
  STORE01 --> UI05["UI-05 Connecting screen"]
  UI02 -->|"Vault locked"| UI04["UI-04 Unlock vault"]
  UI04 --> STORE02["STORE-02 Restore session"]
  STORE02 --> UI05
  UI05 --> STORE03["STORE-03 Derive address"]
  STORE03 -->|"RTM"| SRV01["SRV-01 RTM handshake"]
  STORE03 -->|"Non-RTM"| STORE04["STORE-04 Refresh balance"]
  SRV01 --> STORE04
  STORE04 -->|"Onboarding incomplete"| UI06["UI-06 Welcome guide"]
  STORE04 -->|"Onboarding complete"| UI07["UI-07 Wallet home"]
  UI07 --> STORE05["STORE-05 Lock session"]
  STORE03 -->|"Derivation failed"| UIERR["UI-ERR Show error"]
  SRV01 -->|"Warning only"| UIWARN["UI-WARN Show warning"]
  STORE04 -->|"Bridge warning"| UIWARN
```

## Provider Bridge Runtime

```mermaid
flowchart LR
  DAPP01["DAPP-01 Call provider"] --> INP01["INP-01 Queue request"]
  INP01 --> CON01{"CON-01 Validate origin"}
  CON01 -->|"Allowed"| CON02["CON-02 Forward RPC"]
  CON02 --> BG01["BG-01 Receive RPC"]
  BG01 --> STORE01["STORE-01 Load state"]
  STORE01 --> BG02{"BG-02 Resolve method"}
  BG02 --> BG03["BG-03 Build response"]
  BG03 --> CON03["CON-03 Return response"]
  CON03 --> INP02["INP-02 Resolve promise"]
  INP02 --> DAPP02["DAPP-02 Consume result"]

  STORE02["STORE-02 State changed"] --> BG04["BG-04 Broadcast event"]
  BG04 --> CON04["CON-04 Relay event"]
  CON04 --> INP03["INP-03 Emit event"]
  INP03 --> DAPP03["DAPP-03 Handle event"]

  CON01 -->|"Blocked origin"| CONERR["Blocked with explicit error"]
  BG02 -->|"Unsupported method or network"| BGERR["Return JSON-RPC error"]
```

## Direct Wallet Send And Confirmation

```mermaid
flowchart LR
  UI01["UI-01 Open send"] --> STORE01["STORE-01 Load send context"]
  STORE01 --> UI02["UI-02 Enter transfer"]
  UI02 --> UI03["UI-03 Review tx"]
  UI03 --> UI04{"UI-04 Confirm send"}
  UI04 -->|"Confirm"| STORE02["STORE-02 Validate send"]
  STORE02 --> STORE03["STORE-03 Route signer"]
  STORE03 -->|"Server-assisted path"| SRV01["SRV-01 Bridge relay"]
  STORE03 -->|"Direct path"| RPC01["RPC-01 Broadcast tx"]
  SRV01 --> RPC01
  RPC01 --> STORE04["STORE-04 Track activity"]
  STORE04 --> STORE05["STORE-05 Refresh balance"]
  STORE05 --> UI05["UI-05 Return wallet"]
  UI04 -->|"Reject"| UI06["UI-06 Reject tx"]
  STORE02 -->|"Validation error"| UI03
```

## Dapp Connection Approval

```mermaid
flowchart LR
  DAPP01["DAPP-01 Request connect"] --> INP01["INP-01 Send RPC"]
  INP01 --> CON01["CON-01 Forward request"]
  CON01 --> BG01{"BG-01 Check scopes"}
  BG01 -->|"Missing scopes"| BG02["BG-02 Save approval"]
  BG02 --> BG03["BG-03 Open popup"]
  BG03 --> UI01["UI-01 Review scopes"]
  UI01 --> UI02["UI-02 Confirm connect"]
  UI02 -->|"Approve"| STORE01["STORE-01 Add site"]
  STORE01 --> BG04["BG-04 Grant scopes"]
  BG04 --> BG05["BG-05 Return accounts"]
  BG05 --> DAPP02["DAPP-02 Connected"]

  BG01 -->|"Scopes already granted"| BG05
  UI02 -->|"Reject"| DAPPERR["Return rejection"]
  UI01 -->|"Locked wallet"| UIPW["Password gate"]
  UIPW --> UI01
```

## Dapp Transaction Approval And Execution

```mermaid
flowchart LR
  DAPP01["DAPP-01 Request tx"] --> INP01["INP-01 Forward tx"]
  INP01 --> CON01["CON-01 Relay tx"]
  CON01 --> BG01{"BG-01 Validate tx scope"}
  BG01 --> BG02["BG-02 Save request"]
  BG02 --> BG03["BG-03 Open request popup"]
  BG03 --> UI01["UI-01 Review request"]
  UI01 --> UI02{"UI-02 Approve or reject"}
  UI02 -->|"Approve"| STORE01["STORE-01 Switch context"]
  STORE01 --> STORE02["STORE-02 Execute send"]
  STORE02 -->|"Server-assisted path"| SRV01["SRV-01 Bridge relay"]
  STORE02 -->|"Direct path"| RPC01["RPC-01 Broadcast request"]
  SRV01 --> RPC01
  RPC01 --> STORE03["STORE-03 Record activity"]
  STORE03 --> STORE04["STORE-04 Restore context"]
  STORE04 --> BG04["BG-04 Return result"]
  BG04 --> DAPP02["DAPP-02 Receive tx result"]

  UI02 -->|"Reject"| BGREJ["Return rejection"]
  UI01 -->|"Locked wallet"| UIPW["Password gate"]
  UIPW --> UI01
  STORE02 -->|"Send failed"| BGFAIL["Return failure"]
```
