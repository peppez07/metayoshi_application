import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ActivityRow } from '../../components/ListItems'
import { useWalletStore, type Activity as WalletActivity } from '../../store/walletStore'
import { IoClose, IoCopyOutline, IoOpenOutline, IoCheckmark } from 'react-icons/io5'

const Activity: React.FC = () => {
  const { activity, activeNetworkId, networks, accounts, activeAccountId } = useWalletStore()
  const [selectedTx, setSelectedTx] = useState<WalletActivity | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]

  const activeAccountAddressSet = useMemo(() => {
    const set = new Set<string>()
    if (!activeAccount) return set

    const push = (value: unknown) => {
      const raw = String(value || '').trim()
      if (!raw) return
      set.add(raw)
      set.add(raw.toLowerCase())
    }

    Object.values(activeAccount.networkAddresses || {}).forEach(push)
    push(activeAccount.addresses?.EVM)
    push(activeAccount.addresses?.UTXO)
    push(activeAccount.addresses?.BTC)
    push(activeAccount.addresses?.SOL)
    return set
  }, [activeAccount])

  const filteredActivity = activity
    .filter((a) => {
      if (a.networkId !== activeNetworkId) return false
      if (a.accountId) return a.accountId === activeAccount?.id

      // Legacy fallback for entries saved before accountId tagging.
      const from = String(a.from || '').trim()
      const to = String(a.to || '').trim()
      if (!from && !to) return false
      return (
        activeAccountAddressSet.has(from)
        || activeAccountAddressSet.has(from.toLowerCase())
        || activeAccountAddressSet.has(to)
        || activeAccountAddressSet.has(to.toLowerCase())
      )
    })
    .sort((a, b) => b.timestamp - a.timestamp)

  const fallbackFromAddress = activeAccount?.networkAddresses?.[activeNetworkId]
    || (activeNetwork.coinType === 'EVM' ? activeAccount?.addresses?.EVM : '')
    || ''

  const copyValue = async (key: string, value: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(key)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      // ignore clipboard errors
    }
  }

  const selectedNetwork = selectedTx
    ? (networks.find((n) => n.id === selectedTx.networkId) || activeNetwork)
    : activeNetwork

  const txExplorerUrl = (() => {
    if (!selectedTx?.id) return ''
    const base = String(selectedNetwork?.explorerUrl || '').replace(/\/+$/, '')
    if (!base) return ''
    return `${base}/tx/${selectedTx.id}`
  })()

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredActivity.length > 0 ? (
          filteredActivity.map((item) => (
            <ActivityRow
              key={item.id}
              type={item.type}
              amount={item.amount}
              asset={item.asset}
              address={item.to || item.from}
              status={item.status}
              onClick={() => setSelectedTx(item)}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-50">
            <p className="text-sm font-medium">You have no transactions</p>
          </div>
        )}
      </div>

      {selectedTx && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="w-full max-w-[380px] max-h-[92vh] bg-dark-800 rounded-t-3xl border-t border-dark-600 animate-in slide-in-from-bottom duration-200 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-3 border-b border-dark-600 bg-dark-800">
              <div className="flex flex-col">
                <h2 className="text-sm font-black uppercase tracking-widest">Transaction Details</h2>
                <span className="text-[10px] text-gray-500">
                  {new Date(selectedTx.timestamp).toLocaleString()}
                </span>
              </div>
              <button onClick={() => setSelectedTx(null)}>
                <IoClose className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-sm overflow-y-auto custom-scrollbar">
              <DetailRow label="Status" value={selectedTx.status} />
              <DetailRow label="Type" value={selectedTx.type} />
              <DetailRow label="Network" value={`${selectedNetwork.name} (${selectedNetwork.symbol})`} />
              <DetailRow label="Asset" value={selectedTx.asset} />
              <DetailRow label="Amount" value={selectedTx.amount} />
              <DetailRow label="From" value={selectedTx.from || fallbackFromAddress || '-'} isMono />
              <DetailRow label="To" value={selectedTx.to || '-'} isMono />

              <div className="rounded-xl border border-dark-600 bg-dark-700/30 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Transaction ID</span>
                  <button
                    onClick={() => void copyValue('txid', selectedTx.id)}
                    className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
                    title="Copy transaction id"
                  >
                    {copiedField === 'txid'
                      ? <IoCheckmark className="w-4 h-4 text-green-400" />
                      : <IoCopyOutline className="w-4 h-4 text-gray-400 hover:text-white" />
                    }
                  </button>
                </div>
                <p className="text-[11px] font-mono break-all text-gray-300">{selectedTx.id}</p>
              </div>

              {txExplorerUrl && (
                <a
                  href={txExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dark-600 bg-dark-700/30 py-2.5 hover:bg-dark-700 transition-colors"
                >
                  <span className="text-xs font-bold uppercase tracking-widest">Open Explorer</span>
                  <IoOpenOutline className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: string
  isMono?: boolean
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, isMono = false }) => (
  <div className="flex items-start justify-between gap-3 rounded-xl border border-dark-600 bg-dark-700/20 px-3 py-2.5">
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
    <span className={`text-right ${isMono ? 'font-mono text-[11px] break-all' : 'font-bold text-xs capitalize'}`}>
      {value}
    </span>
  </div>
)

export default Activity


