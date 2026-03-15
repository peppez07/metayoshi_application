# Public RPC Research for RPC-Only Adapter Coins

Research date: 2026-03-15

Scope:
- Source list: `C:\Users\Giuseppe Grecu\metayoshi_SERVER\NewServer\PUBLICNODE_SUPPORTED_COINS.md`
- Target section: `### RPC-Only Adapter (bridge RPC only, high-level capabilities disabled)`
- Goal: identify public endpoints the server can review if it wants to upgrade some of these chains beyond raw bridge RPC.

Important:
- `Confirmed` means I found a current public source that explicitly publishes the endpoint.
- `Inferred` means the endpoint follows the naming rule already documented in `PUBLICNODE_SUPPORTED_COINS.md` and the current PublicNode homepage shows the protocol surface for that chain.
- For Cosmos / CometBFT chains, the strongest low-friction upgrade path is usually chains that already expose `RPC + WS + GRPC + GRPC-WEB + REST`.

## Best upgrade candidates first

These are the strongest immediate targets because current public sources already show richer protocol surfaces than "RPC only":

- `Avalanche P/X + Fuji P/X`: PublicNode currently lists Avalanche `P-Chain RPC`, `X-Chain RPC`, `Fuji P-Chain RPC`, `Fuji X-Chain RPC`.
- `Polygon Heimdall + Amoy Heimdall`: PublicNode currently lists `Heimdall RPC`, `Heimdall WS RPC`, `Heimdall REST`, plus the Amoy equivalents.
- `Berachain beacon + Bepolia beacon`: PublicNode exposes dedicated beacon endpoints.
- `Avail + Turing`: PublicNode exposes both mainnet and Turing RPC/WS endpoints.
- `Polkadot + Kusama + Peaq + Agung`: PublicNode homepage currently lists dedicated RPC/WS support.
- `Sui + Sui Testnet`: PublicNode homepage lists mainnet and testnet RPC/WS support.
- `Starknet + Starknet Sepolia`: PublicNode homepage lists mainnet and Sepolia RPC/WS support.
- `TRON Solidity`: official TronGrid docs expose Solidity HTTP methods.
- Most Cosmos-family entries below: chain-registry or PublicNode already expose `RPC + REST`, and PublicNode currently advertises broader surfaces for many of them.

## Confirmed public endpoints

| Coin | Candidate public endpoint(s) | Notes | Source |
| --- | --- | --- | --- |
| `akash` | RPC `https://rpc-akash.ecostake.com:443` REST `https://rest-akash.ecostake.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/akash/chain.json |
| `atomone` | RPC `https://atomone-rpc.allinbits.com:443` REST `https://atomone-api.allinbits.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/atomone/chain.json |
| `asset-mantle` | RPC `https://rpc.assetmantle.one` REST `https://rest.assetmantle.one` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/assetmantle/chain.json |
| `axelar` | RPC `https://rpc-axelar.imperator.co:443` REST `https://lcd-axelar.imperator.co:443` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/axelar/chain.json |
| `babylon` | RPC `https://babylon.nodes.guru/rpc` REST `https://babylon.nodes.guru/api` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/babylon/chain.json |
| `berachain-beacon` | Beacon RPC `https://berachain-beacon-rpc.publicnode.com` | Confirmed | https://berachain-beacon-rpc.publicnode.com/ |
| `berachain-bepolia-beacon` | Beacon API `https://berachain-bepolia-beacon-rpc.publicnode.com` | Confirmed | https://berachain-bepolia-beacon-rpc.publicnode.com/ |
| `bitcanna` | RPC `https://rpc.bitcanna.io/` REST `https://lcd.bitcanna.io` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/bitcanna/chain.json |
| `bitway` | RPC `https://rpc.bitway.com` REST `https://rest.bitway.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/bitway/chain.json |
| `celestia` | RPC `https://public-celestia-rpc.numia.xyz` REST `https://public-celestia-lcd.numia.xyz` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/celestia/chain.json |
| `cheqd` | RPC `https://rpc.cheqd.net` REST `https://api.cheqd.net` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/cheqd/chain.json |
| `chihuahua` | RPC `https://rpc.chihuahua.wtf` REST `https://api.chihuahua.wtf` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/chihuahua/chain.json |
| `chiliz` | Recommended `https://rpc.ankr.com/chiliz` Alternative `https://chiliz-rpc.publicnode.com` | Official docs publish both | https://docs.chiliz.com/quick-start/connect-to-mainnet-and-testnet |
| `chiliz-spicy` | Recommended `https://spicy-rpc.chiliz.com/` Alternative `https://chiliz-spicy.publicnode.com/` | Official docs publish both | https://docs.chiliz.com/quick-start/developer-toolbox |
| `comdex` | RPC `https://rpc.comdex.one` REST `https://rest.comdex.one` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/comdex/chain.json |
| `coreum` | RPC `https://full-node.mainnet-1.coreum.dev:26657` REST `https://rest-coreum.ecostake.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/coreum/chain.json |
| `cosmos` | RPC `https://rpc.cosmoshub-main.ccvalidators.com:443` REST `https://rest.cosmoshub-main.ccvalidators.com:443` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/chain.json |
| `cronos-pos` | RPC `https://rpc.mainnet.crypto.org/` REST `https://rest.mainnet.crypto.org/` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/cryptoorgchain/chain.json |
| `dora` | RPC `https://vota-rpc.dorafactory.org/` REST `https://vota-rest.dorafactory.org` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/doravota/chain.json |
| `dydx` | RPC `https://dydx-rpc.kingnodes.com:443` REST `https://community.nuxian-node.ch:6797/dydx/crpc` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/dydx/chain.json |
| `dymension` | RPC `https://dym-m-rpc.agoranodes.com` REST `https://dym-m-api.agoranodes.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/dymension/chain.json |
| `dymension-testnet` | RPC `https://rpc-dymension-playground35.mzonder.com` REST `https://api-dymension-playground35.mzonder.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/testnets/dymensiontestnet1/chain.json |
| `elys` | RPC `https://rpc.elys.network:443` REST `https://api.elys.network` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/elys/chain.json |
| `elys-testnet` | RPC `https://rpc.testnet.elys.network` REST `https://api.testnet.elys.network` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/testnets/elystestnet/chain.json |
| `evmos` | RPC `https://rpc.lavenderfive.com:443/evmos` REST `https://rest.bd.evmos.org:1317` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/evmos/chain.json |
| `evmos-testnet` | RPC `https://evmos.test.rpc.coldyvalidator.net` REST `https://evmos.test.api.coldyvalidator.net` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/testnets/evmostestnet/chain.json |
| `fetch` | RPC `https://rpc-fetchhub.fetch.ai:443` REST `https://rest-fetchhub.fetch.ai` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/fetchhub/chain.json |
| `injective` | RPC `https://injective-rpc.highstakes.ch` REST `https://injective-api.highstakes.ch` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/chain.json |
| `injective-testnet` | RPC `https://injective-testnet-rpc.polkachu.com` REST `https://injective-testnet-api.polkachu.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/testnets/injectivetestnet/chain.json |
| `juno` | RPC `https://rpc-juno.itastakers.com` REST `https://rest.lavenderfive.com:443/juno` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/juno/chain.json |
| `kujira` | RPC `https://rpc.kaiyo.kujira.setten.io` REST `https://lcd.kaiyo.kujira.setten.io` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/kujira/chain.json |
| `lava` | RPC `https://lava.tendermintrpc.lava.build` REST `https://lava-api.finteh.org:443` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/lava/chain.json |
| `lumera` | RPC `https://rpc.lumera.io:443` REST `https://lcd.lumera.io:443` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/lumera/chain.json |
| `medibloc` | RPC `https://rpc.gopanacea.org` REST `https://api.gopanacea.org` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/panacea/chain.json |
| `neutron` | RPC `https://rpc-lb.neutron.org` REST `https://rest-lb.neutron.org` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/neutron/chain.json |
| `nolus` | RPC `https://rpc.nolus.network` REST `https://lcd.nolus.network` | Chain-registry currently omits the scheme in the raw JSON; normalize to `https://` | https://raw.githubusercontent.com/cosmos/chain-registry/master/nolus/chain.json |
| `omniflix` | RPC `https://omniflix-rpc.kingnodes.com` REST `https://api.omniflix.nodestake.org` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/omniflixhub/chain.json |
| `oraichain` | RPC `https://rpc.orai.io` REST `http://lcd.orai.io` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/oraichain/chain.json |
| `osmosis` | RPC `https://rpc.osmosis.zone/` REST `https://lcd.osmosis.zone/` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/chain.json |
| `passage` | RPC `https://rpc.passage.vitwit.com` REST `https://api.passage.vitwit.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/passage/chain.json |
| `persistence` | RPC `https://rpc.core.persistence.one` REST `https://rest.core.persistence.one` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/persistence/chain.json |
| `quicksilver` | RPC `https://rpc.quicksilver.zone:443` REST `https://lcd.quicksilver.zone:443` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/quicksilver/chain.json |
| `rebus` | RPC `https://api.rebuschain.com:26657/` REST `https://api.rebuschain.com:1317/` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/rebus/chain.json |
| `regen` | RPC `https://rpc-regen.ecostake.com` REST `http://public-rpc.regen.vitwit.com:1317` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/regen/chain.json |
| `rizon` | RPC `https://rpcapi.rizon.world/` REST `https://restapi.rizon.world/` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/rizon/chain.json |
| `saga` | RPC `https://rpc-saga.keplr.app` REST `https://saga-mainnet-lcd.autostake.com:443` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/saga/chain.json |
| `sentinel` | RPC `https://rpc-sentinel.busurnode.com` REST `https://api-sentinel.busurnode.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/sentinel/chain.json |
| `shentu` | RPC `https://rpc.shentu.org:443` REST `https://rest.shentu.org/` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/shentu/chain.json |
| `sifchain` | RPC `https://sifchain-rpc.polkachu.com` REST `https://api-sifchain-ia.cosmosia.notional.ventures/` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/sifchain/chain.json |
| `stargaze` | RPC `https://rpc.stargaze-apis.com/` REST `https://rest.stargaze-apis.com/` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/stargaze/chain.json |
| `stride` | RPC `https://stride-rpc.polkachu.com/` REST `https://stride-api.polkachu.com/` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/stride/chain.json |
| `sui` | RPC `https://sui-rpc.publicnode.com` | PublicNode currently lists mainnet and testnet RPC/WS for Sui | https://publicnode.com/ |
| `sui-testnet` | RPC `https://sui-testnet-rpc.publicnode.com` | Confirmed by PublicNode chain page | https://sui-testnet.publicnode.com/ |
| `teritori` | RPC `https://teritori-rpc.polkachu.com` REST `https://teritori-api.polkachu.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/teritori/chain.json |
| `terra` | RPC `https://rpc.lavenderfive.com:443/terra2` REST `https://phoenix-lcd.terra.dev:443` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/terra2/chain.json |
| `terra-classic` | RPC `https://terra-classic-rpc.publicnode.com:443` REST `https://terra-classic-lcd.publicnode.com` | Confirmed | https://raw.githubusercontent.com/cosmos/chain-registry/master/terra/chain.json |
| `tron-solidity` | Solidity HTTP API via `https://api.trongrid.io` (`/walletsolidity/*`) | Official TronGrid reference for Solidity calls | https://developers.tron.network/reference/getnowblock |

## PublicNode protocol-confirmed endpoints inferred from the documented naming rule

These follow the existing NewServer fallback rule `https://<coin>-rpc.publicnode.com` from `PUBLICNODE_SUPPORTED_COINS.md`. The current PublicNode homepage also shows the protocol surfaces for these chains.

| Coin | Candidate endpoint | PublicNode protocol signal | Source |
| --- | --- | --- | --- |
| `0g` | `https://0g-rpc.publicnode.com` | PublicNode homepage lists `0G` with `EVM RPC`, `EVM WS RPC`, `Beacon RPC` | https://publicnode.com/ |
| `0g-beacon` | `https://0g-beacon-rpc.publicnode.com` | Same `0G` listing shows beacon support; endpoint inferred from the naming rule | https://publicnode.com/ |
| `analog` | `https://analog-rpc.publicnode.com` | PublicNode homepage lists `Analog` with `RPC`, `WS RPC` | https://publicnode.com/ |
| `avail` | `https://avail-rpc.publicnode.com` | PublicNode homepage lists `Avail` with mainnet + `Turing` RPC/WS | https://publicnode.com/ |
| `avail-turing` | `https://avail-turing-rpc.publicnode.com` | Confirmed by PublicNode chain page | https://avail-turing-rpc.publicnode.com/ |
| `avalanche-p-chain` | `https://avalanche-p-chain-rpc.publicnode.com` | PublicNode homepage lists Avalanche `P-Chain RPC` | https://publicnode.com/ |
| `avalanche-x-chain` | `https://avalanche-x-chain-rpc.publicnode.com` | PublicNode homepage lists Avalanche `X-Chain RPC` | https://publicnode.com/ |
| `avalanche-fuji-p-chain` | `https://avalanche-fuji-p-chain-rpc.publicnode.com` | PublicNode homepage lists Avalanche `Fuji P-Chain RPC` | https://publicnode.com/ |
| `avalanche-fuji-x-chain` | `https://avalanche-fuji-x-chain-rpc.publicnode.com` | PublicNode homepage lists Avalanche `Fuji X-Chain RPC` | https://publicnode.com/ |
| `berachain-bepolia-beacon` | `https://berachain-bepolia-beacon-rpc.publicnode.com` | Direct PublicNode beacon page | https://berachain-bepolia-beacon-rpc.publicnode.com/ |
| `celer` | `https://celer-rpc.publicnode.com` | PublicNode homepage lists `Celer Network` with `RPC`, `WS RPC`, `GRPC`, `GRPC-WEB`, `REST` | https://publicnode.com/ |
| `kusama` | `https://kusama-rpc.publicnode.com` | PublicNode homepage lists `Kusama` with `RPC`, `WS RPC` | https://publicnode.com/ |
| `peaq` | `https://peaq-rpc.publicnode.com` | PublicNode homepage lists `Peaq` with `Peaq RPC`, `Peaq WS RPC`, `Agung RPC`, `Agung WS RPC` | https://publicnode.com/ |
| `peaq-agung` | `https://peaq-agung-rpc.publicnode.com` | Same PublicNode `Peaq` listing shows `Agung RPC`, `Agung WS RPC` | https://publicnode.com/ |
| `polkadot` | `https://polkadot-rpc.publicnode.com` | PublicNode homepage lists `Polkadot` with `RPC`, `WS RPC` | https://publicnode.com/ |
| `polygon-heimdall` | `https://polygon-heimdall-rpc.publicnode.com` | PublicNode homepage lists `Heimdall RPC`, `Heimdall WS RPC`, `Heimdall REST` | https://publicnode.com/ |
| `polygon-amoy-heimdall` | `https://polygon-amoy-heimdall-rpc.publicnode.com` | PublicNode homepage lists `Amoy Heimdall RPC`, `Amoy Heimdall WS RPC`, `Amoy Heimdall REST` | https://publicnode.com/ |
| `starknet` | `https://starknet-rpc.publicnode.com` | PublicNode homepage lists `Starknet` with mainnet + Sepolia `RPC`, `WS RPC` | https://publicnode.com/ |
| `starknet-sepolia` | `https://starknet-sepolia-rpc.publicnode.com` | Same PublicNode `Starknet` listing shows Sepolia support | https://publicnode.com/ |

## Notes for the server team

- The current PublicNode homepage strongly suggests several entries in the wallet's `RPC-Only Adapter` bucket could be upgraded into richer adapters because the public provider now exposes more than a single raw RPC method surface.
- Best candidates to revisit first:
  - `Avalanche P/X`
  - `Polygon Heimdall`
  - `Avail`
  - `Peaq`
  - `Polkadot`
  - `Kusama`
  - `Sui`
  - `Starknet`
  - `TRON Solidity`
  - `Berachain beacon`
  - Cosmos-family chains where `GRPC/REST` is already advertised or published
- For `Celer`, `Analog`, `0G`, `Peaq`, `Polkadot`, `Kusama`, `Starknet`, and the Heimdall/P/X chain endpoints, I would still do one quick live probe from the server side before shipping:
  - RPC health
  - websocket handshake
  - any chain-specific read call
  - broadcast method availability if the goal is to move beyond read-only bridge RPC
