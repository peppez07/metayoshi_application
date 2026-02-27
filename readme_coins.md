Non-Custodial Multi-Chain Wallet Architecture

This document defines the full architecture for a non-custodial wallet supporting the real chains currently mapped in the server configuration.

The wallet supports the following networks:

EVM-Based Chains

Ethereum Arbitrum Base Polygon Avalanche (C-Chain / P-Chain / X-Chain as mapped) BNB Smart Chain (BSC / opBNB) Optimism Scroll Linea Mantle Metis Moonbeam Moonriver Pulsechain Evmos Berachain Taiko Unichain Soneium Sonic Syscoin EVM Haqq Kava EVM Sei EVM Fraxtal Blast Celo Iris EVM XPLA EVM Tron EVM (as mapped) And all other chains mapped to the "eth" engine in the server configuration.

These chains use the EVM engine.

Cosmos-SDK Chains

Cosmos Osmosis Juno Injective Celestia Neutron Saga Stride Stargaze Regen Persistence Coreum Kujira Cheqd Chihuahua Sentinel Teritori Nolus Passage Dymension Babylon Lava Nibiru Elys Rizon Rebus Sifchain Lumera Akash Fetch Comdex

These chains use the Cosmos engine.

UTXO Chains

Bitcoin Bitcoin Testnet BitcoinZ Dash Defichain PIVX Raptoreum Dogecoin (as mapped under doge model)

These chains use the UTXO engine.

Solana

Solana Solana Testnet

These chains use the Solana engine.

XRP

XRP Ledger

Uses XRP engine.

Monero

Monero

Uses Monero engine.

Cardano

Cardano

Uses Cardano engine.

=====================================================================

1. Chain Abstraction Model

Each chain is represented by:

chainId

engine type

rpc endpoints

derivation path

address format

explorer URLs

Engine Types:

EVM

COSMOS

UTXO

SOLANA

XRP

MONERO

CARDANO

Each engine implements:

deriveAddress()

validateAddress()

buildTx()

signTx()

broadcastTx()

detectAssets()

getBalance()

=====================================================================

2. Transaction Builder

Each engine builds unsigned transactions specific to its protocol.

EVM Transaction Builder

Supports:

Native transfers (ETH, MATIC, AVAX, BNB, etc.)

ERC20 transfers

ERC721 transfers

ERC1155 transfers

Arbitrary contract calls

Transaction Type:

Type 2 (EIP-1559)

Fields:

nonce

chainId

to

value

data

gasLimit

maxFeePerGas

maxPriorityFeePerGas

Gas estimated via eth_estimateGas.

Cosmos Transaction Builder

Supports:

MsgSend (native)

MsgExecuteContract (CW20)

MsgExecuteContract (CW721)

Requires:

accountNumber

sequence

chainId

fee object

Gas simulated via /simulate endpoint.

UTXO Transaction Builder

Supports native transfers only.

Flow:

Fetch UTXOs

Coin selection

Estimate vBytes

Calculate fee = feeRate * vBytes

Create PSBT

Solana Transaction Builder

Supports:

SOL transfer

SPL token transfer

NFT transfer

Requires:

recent blockhash

compiled message

XRP Transaction Builder

Supports:

Payment

Issued currencies

Requires:

Sequence

Fee

Monero Transaction Builder

Uses integrated Monero wallet library. Handles ring signatures and stealth addresses internally.

Cardano Transaction Builder

Supports:

ADA transfer

Native multi-asset transfer

NFT transfer

Requires protocol parameters and UTXO selection.

=====================================================================

3. Signing Flow

Derive address from seed (BIP39).

Fetch chain state (nonce, sequence, UTXOs, blockhash, etc.).

Build unsigned transaction.

Show human-readable summary to user.

Sign using:

secp256k1 (EVM, Cosmos, UTXO, XRP default)

ed25519 (Solana, Cardano)

Monero-specific signing

Broadcast to RPC.

Track confirmations.

Signer types:

Local software signer

Hardware wallet signer

WalletConnect signer

=====================================================================

4. Asset Detection

EVM:

Native coin always visible

ERC20 via Transfer logs or indexer

NFTs via Transfer events

Cosmos:

Native via bank module

CW20 via contract history

CW721 via contract events

UTXO:

Native only

Solana:

SPL via getTokenAccountsByOwner

NFT via Metaplex metadata

XRP:

Native XRP

Trustlines = issued tokens

Monero:

Native XMR only

Cardano:

ADA + native assets from UTXOs

=====================================================================

5. Token Indexing Strategy

Hybrid approach recommended:

Client:

Signing

Broadcasting

Backend Indexer (read-only):

Asset discovery

NFT ownership

Transaction history

Balance aggregation

Endpoints: GET /{chain}/address/{addr}/assets GET /{chain}/address/{addr}/balances GET /{chain}/address/{addr}/nfts GET /{chain}/address/{addr}/txs

=====================================================================

6. NFT Indexing

EVM:

Track Transfer logs

Fetch tokenURI metadata

Filter spam collections

Solana:

Parse Token Program instructions

Fetch Metaplex metadata

Cosmos:

Track CW721 contract events

Cardano:

Parse multi-asset UTXOs

=====================================================================

7. Gas Strategy

EVM:

Use EIP-1559

maxFeePerGas = baseFee * 2 + priority

Offer Slow / Market / Fast tiers

Support speed-up and cancel (same nonce)

Cosmos:

Simulate gas

Apply multiplier (1.2–1.5)

UTXO:

Fee rate tiers (sat/vB)

Support RBF

Solana:

Default fee

Optional priority fee boost

XRP:

Use suggested fee

Monero:

Fee from wallet library

Cardano:

Compute using protocol parameters

=====================================================================

8. Security Model

Private keys never leave device

All signing happens client-side

Transaction summary strictly matches signed payload

Contract interaction warnings for unknown contracts

Spam NFT filtering

=====================================================================

Final Architecture

Core Components:

Chain Registry

Engine Router

Transaction Builder

Signer Interface

Broadcaster

Indexer Client

This architecture supports all currently mapped chains including Ethereum, Arbitrum, Base, Polygon, Avalanche, BSC, Solana, XRP, Monero, Cardano, Cosmos ecosystem chains, and UTXO-based networks like Bitcoin and Dash.

End of document.