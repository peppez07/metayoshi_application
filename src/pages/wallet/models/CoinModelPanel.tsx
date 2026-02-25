import React from 'react'
import type { CoinModelFamily } from '../../../lib/coinModel'

interface CoinModelPanelProps {
  model: CoinModelFamily
}

export const MODEL_COPY: Record<CoinModelFamily, { title: string; blurb: string; badge: string; cards: string[] }> = {
  'utxo-assets': {
    title: 'UTXO + Asset Layer',
    blurb: 'Raptoreum-style model with native coin flow and asset-aware views.',
    badge: 'Live model',
    cards: ['Coin UTXOs', 'Asset Balances', 'Unified Activity']
  },
  'utxo-classic': {
    title: 'Classic UTXO',
    blurb: 'Bitcoin-like account shell focused on transparent inputs, outputs, and fee weight.',
    badge: 'Live model',
    cards: ['Inputs/Outputs', 'Fee Weight', 'Address Rotation']
  },
  'xrp-ledger': {
    title: 'XRP Ledger',
    blurb: 'Account-sequence model with reserve-aware sending and destination tag support.',
    badge: 'Live model',
    cards: ['Sequence + Reserve', 'Destination Tag', 'Ledger Finality']
  },
  evm: {
    title: 'Ethereum Concept Lab',
    blurb: 'Design mode for experimental ETH UX. Runtime remains intentionally disabled.',
    badge: 'Runtime disabled',
    cards: ['Gas Orbit', 'Token Field', 'Intent Deck']
  },
  cardano: {
    title: 'Cardano Native',
    blurb: 'Extended UTXO wallet model with staged support for protocol-specific operations.',
    badge: 'In rollout',
    cards: ['EUTXO View', 'Stake-aware UX', 'Policy Assets']
  },
  monero: {
    title: 'Monero Native',
    blurb: 'Privacy-first account model with chain-specific synchronization and transfer flow.',
    badge: 'In rollout',
    cards: ['Subaddress Flow', 'Scan Height', 'Private Transfers']
  },
  generic: {
    title: 'Generic Chain Model',
    blurb: 'Compatibility layer for networks without a dedicated model page yet.',
    badge: 'Fallback',
    cards: ['Basic Balance', 'Send/Receive', 'Activity']
  }
}

export const CoinModelCard: React.FC<CoinModelPanelProps> = ({ model }) => {
  const meta = MODEL_COPY[model]
  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-dark-700/80 via-dark-800 to-dark-900 p-4 space-y-3 shadow-[0_0_24px_rgba(245,132,31,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{meta.title}</p>
        <span className="text-[9px] px-2 py-0.5 rounded-full border border-yellow-500/40 text-yellow-300 bg-yellow-900/20">{meta.badge}</span>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">{meta.blurb}</p>
      <div className="grid grid-cols-3 gap-2">
        {meta.cards.map(card => (
          <div key={card} className="rounded-lg border border-dark-600 bg-dark-800/70 p-2">
            <p className="text-[9px] text-gray-500 uppercase font-bold">{card}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export const CoinModelPanel: React.FC<CoinModelPanelProps> = ({ model }) => {
  return (
    <div className="w-full px-5 mb-3">
      <CoinModelCard model={model} />
    </div>
  )
}
