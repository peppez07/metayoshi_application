import React from 'react'
import { IoArrowDown, IoArrowUp, IoOpenOutline, IoTimeOutline } from 'react-icons/io5'
import { activeAccountOf, assetLabel, EXPLORER_URL, formatAsset, formatRtm, RTM_SYMBOL, useWalletStore } from '../../store/walletStore'

function when(timestamp: number | null, height: number): string {
  if (height <= 0) return 'Pending'
  if (!timestamp) return `Block ${height}`
  return new Date(timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const Activity: React.FC = () => {
  const state = useWalletStore()
  const { activity, sent, assetInfo, tipHeight } = state
  const account = activeAccountOf(state)
  const items = account ? activity[account.id] ?? [] : []
  const known = new Set(items.map((i) => i.txid))
  const localPending = sent.filter((s) => s.accountId === account?.id && !known.has(s.txid))

  if (items.length === 0 && localPending.length === 0) {
    return <p className="text-xs text-gray-500 text-center py-8">No transactions yet</p>
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-1.5">
      {localPending.map((s) => (
        <Row
          key={s.txid}
          txid={s.txid}
          outgoing
          title={`Sent ${s.assetId ? assetLabel(s.assetId, assetInfo[s.assetId]) : RTM_SYMBOL}`}
          subtitle="Broadcast · waiting for server"
          amounts={[`-${s.amount} ${s.assetId ? '' : RTM_SYMBOL}`.trim()]}
          pending
        />
      ))}
      {items.map((item) => {
        const assetEntries = Object.entries(item.assetDeltas)
        const rtm = BigInt(item.rtmDelta)
        const outgoing = assetEntries.length > 0 ? assetEntries.some(([, d]) => BigInt(d) < 0n) : rtm < 0n
        const amounts = [
          ...assetEntries.map(([id, d]) => `${BigInt(d) > 0n ? '+' : ''}${formatAsset(d, assetInfo[id])} ${assetLabel(id, assetInfo[id])}`),
          ...(rtm !== 0n ? [`${rtm > 0n ? '+' : ''}${formatRtm(rtm)} ${RTM_SYMBOL}`] : [])
        ]
        const confirmations = item.height > 0 && tipHeight >= item.height ? tipHeight - item.height + 1 : 0
        return (
          <Row
            key={item.txid}
            txid={item.txid}
            outgoing={outgoing}
            title={outgoing ? 'Sent' : 'Received'}
            subtitle={`${when(item.timestamp, item.height)}${confirmations > 0 && confirmations < 6 ? ` · ${confirmations} conf` : ''}`}
            amounts={amounts.length > 0 ? amounts : ['Self transfer']}
            pending={item.height <= 0}
          />
        )
      })}
    </div>
  )
}

const Row: React.FC<{ txid: string; outgoing: boolean; title: string; subtitle: string; amounts: string[]; pending?: boolean }> = ({
  txid, outgoing, title, subtitle, amounts, pending
}) => (
  <a
    href={`${EXPLORER_URL}/tx/${txid}`}
    target="_blank"
    rel="noreferrer"
    className="flex items-center justify-between p-3 rounded-xl border border-dark-600 bg-dark-700/40 hover:bg-dark-700 transition-colors"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${outgoing ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
        {pending
          ? <IoTimeOutline className="w-4 h-4 text-yellow-300" />
          : outgoing ? <IoArrowUp className="w-4 h-4 text-red-300" /> : <IoArrowDown className="w-4 h-4 text-green-300" />}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-bold flex items-center gap-1">{title} <IoOpenOutline className="w-3 h-3 text-gray-600" /></span>
        <span className="text-[10px] text-gray-500 truncate">{subtitle}</span>
      </div>
    </div>
    <div className="flex flex-col items-end shrink-0 max-w-[55%]">
      {amounts.map((a) => (
        <span key={a} className={`text-xs font-bold truncate max-w-full ${a.startsWith('-') ? 'text-red-300' : a.startsWith('+') ? 'text-green-300' : 'text-gray-300'}`}>{a}</span>
      ))}
    </div>
  </a>
)

export default Activity
