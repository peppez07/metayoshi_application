import React from 'react'
import clsx from 'clsx'
import { IoArrowDown, IoArrowUp, IoOpenOutline, IoReceiptOutline, IoTimeOutline } from 'react-icons/io5'
import { Badge, EmptyState } from '../../components/ui'
import { activeAccountOf, assetLabel, EXPLORER_URL, formatAsset, formatRtm, RTM_SYMBOL, useWalletStore } from '../../store/walletStore'

interface Row {
  txid: string
  outgoing: boolean
  pending: boolean
  title: string
  time: number | null
  height: number
  confirmations: number
  amounts: string[]
}

function dayLabel(time: number | null, pending: boolean): string {
  if (pending || !time) return pending ? 'Pending' : 'Earlier'
  const date = new Date(time)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86_400_000)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

const Activity: React.FC = () => {
  const state = useWalletStore()
  const { activity, sent, assetInfo, tipHeight } = state
  const account = activeAccountOf(state)
  const items = account ? activity[account.id] ?? [] : []
  const known = new Set(items.map((i) => i.txid))

  const rows: Row[] = [
    ...sent.filter((s) => s.accountId === account?.id && !known.has(s.txid)).map((s) => ({
      txid: s.txid,
      outgoing: true,
      pending: true,
      title: `Sent ${s.assetId ? assetLabel(s.assetId, assetInfo[s.assetId]) : RTM_SYMBOL}`,
      time: s.timestamp,
      height: 0,
      confirmations: 0,
      amounts: [`-${s.amount} ${s.assetId ? assetLabel(s.assetId, assetInfo[s.assetId]) : RTM_SYMBOL}`]
    })),
    ...items.map((item) => {
      const assetEntries = Object.entries(item.assetDeltas)
      const rtm = BigInt(item.rtmDelta)
      const outgoing = assetEntries.length > 0 ? assetEntries.some(([, d]) => BigInt(d) < 0n) : rtm < 0n
      return {
        txid: item.txid,
        outgoing,
        pending: item.height <= 0,
        title: assetEntries.length > 0 ? (outgoing ? 'Sent asset' : 'Received asset') : outgoing ? 'Sent' : 'Received',
        time: item.timestamp,
        height: item.height,
        confirmations: item.height > 0 && tipHeight >= item.height ? tipHeight - item.height + 1 : 0,
        amounts: [
          ...assetEntries.map(([id, d]) => `${BigInt(d) > 0n ? '+' : ''}${formatAsset(d, assetInfo[id])} ${assetLabel(id, assetInfo[id])}`),
          ...(rtm !== 0n ? [`${rtm > 0n ? '+' : ''}${formatRtm(rtm)} ${RTM_SYMBOL}`] : [])
        ]
      }
    })
  ]

  if (rows.length === 0) {
    return (
      <EmptyState icon={<IoReceiptOutline className="w-6 h-6" />} title="No transactions yet">
        Your RTM and asset transfers appear here once they reach the network.
      </EmptyState>
    )
  }

  const groups: Array<[string, Row[]]> = []
  for (const row of rows) {
    const label = dayLabel(row.time, row.pending)
    const last = groups[groups.length - 1]
    if (last && last[0] === label) last[1].push(row)
    else groups.push([label, [row]])
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-2 pb-4">
      {groups.map(([label, group]) => (
        <section key={label} className="mb-2">
          <h3 className="px-3.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</h3>
          <ul className="space-y-0.5">
            {group.map((row) => <ActivityRow key={row.txid} row={row} />)}
          </ul>
        </section>
      ))}
    </div>
  )
}

const ActivityRow: React.FC<{ row: Row }> = ({ row }) => (
  <li>
    <a href={`${EXPLORER_URL}/tx/${row.txid}`} target="_blank" rel="noreferrer" className="list-row group">
      <span className={clsx('w-10 h-10 rounded-full flex items-center justify-center shrink-0',
        row.pending ? 'bg-warning/10 text-warning' : row.outgoing ? 'bg-white/[0.06] text-gray-300' : 'bg-success/10 text-success')}>
        {row.pending ? <IoTimeOutline className="w-[18px] h-[18px]" /> : row.outgoing ? <IoArrowUp className="w-[18px] h-[18px]" /> : <IoArrowDown className="w-[18px] h-[18px]" />}
      </span>
      <span className="flex flex-col min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {row.title}
          <IoOpenOutline className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
          {row.pending
            ? <Badge tone="warning">Pending</Badge>
            : <>
                {row.time ? new Date(row.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : `Block ${row.height.toLocaleString('en-US')}`}
                {row.confirmations > 0 && row.confirmations < 6 && <Badge>{row.confirmations} conf</Badge>}
              </>}
        </span>
      </span>
      <span className="flex flex-col items-end shrink-0 max-w-[50%]">
        {(row.amounts.length > 0 ? row.amounts : ['Self transfer']).map((amount) => (
          <span key={amount} className={clsx('text-[13px] font-semibold tabular-nums truncate max-w-full',
            amount.startsWith('+') ? 'text-success' : amount.startsWith('-') ? 'text-gray-100' : 'text-gray-400')}>
            {amount}
          </span>
        ))}
      </span>
    </a>
  </li>
)

export default Activity
