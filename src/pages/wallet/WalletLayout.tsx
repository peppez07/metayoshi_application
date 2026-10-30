import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { IoArrowUpOutline, IoClose, IoLayersOutline } from 'react-icons/io5'
import { WalletFrame } from '../../components/WalletFrame'
import { Tabs } from '../../components/Tabs'
import { PageTransition } from '../../components/PageTransition'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import rtmLogo from '../../assets/raptoreum.png'
import { isValidAddress } from '../../lib/rtm/address'
import { activeAccountOf, formatRtm, RTM_SYMBOL, useWalletStore } from '../../store/walletStore'

const TABS = [
  { id: 'assets', label: 'Assets' },
  { id: 'activity', label: 'Activity' }
]

function displayAmount(value: string): string {
  const [whole, fraction] = value.split('.')
  const grouped = BigInt(whole.replace('-', '') || '0').toLocaleString()
  return `${whole.startsWith('-') ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`
}

const WalletLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const state = useWalletStore()
  const { balances, connection, connect } = state
  const account = activeAccountOf(state)
  const balance = account ? balances[account.id] : undefined

  const [showSendSheet, setShowSendSheet] = useState(false)
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [sendMax, setSendMax] = useState(false)
  const [sendError, setSendError] = useState('')

  useEffect(() => {
    if (connection === 'disconnected') void connect()
  }, [connection, connect])

  useEffect(() => {
    if (!showSendSheet) {
      setToAddress('')
      setAmount('')
      setSendMax(false)
      setSendError('')
    }
  }, [showSendSheet])

  const confirmed = formatRtm(balance?.confirmed ?? '0')
  const pending = BigInt(balance?.unconfirmed ?? '0')
  const activeTab = location.pathname.includes('/activity') ? 'activity' : 'assets'

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    setSendError('')
    if (!isValidAddress(toAddress)) {
      setSendError('Enter a valid Raptoreum address')
      return
    }
    if (!sendMax && !/^\d+(\.\d{1,8})?$/.test(amount.trim())) {
      setSendError('Enter an amount with at most 8 decimals')
      return
    }
    setShowSendSheet(false)
    navigate('/tx/confirm', { state: { kind: 'rtm', to: toAddress.trim(), amount: amount.trim(), sendMax } })
  }

  return (
    <WalletFrame>
      <div className="flex flex-col items-center pt-3 pb-4 shrink-0">
        <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/35 flex items-center justify-center overflow-hidden mb-3">
          <img src={rtmLogo} alt="Raptoreum" className="w-10 h-10 object-contain" />
        </div>

        <div className="mb-3 w-full px-4 text-center">
          <p className="text-[clamp(1.3rem,7.1vw,1.95rem)] font-bold leading-tight tracking-tight break-words">
            {displayAmount(confirmed)}
          </p>
          <p className="text-base font-semibold uppercase tracking-wide text-gray-300 mt-0.5">{RTM_SYMBOL}</p>
          {pending !== 0n && (
            <p className="text-[11px] text-yellow-300 mt-1">
              {pending > 0n ? '+' : ''}{formatRtm(pending)} {RTM_SYMBOL} pending
            </p>
          )}
        </div>

        <div className="flex justify-center gap-6 w-full px-6 mb-3">
          <QuickAction icon={<IoLayersOutline className="w-5 h-5" />} label="Assets" onClick={() => navigate('/assets')} />
          <QuickAction
            icon={<IoArrowUpOutline className="w-5 h-5" />}
            label="Send"
            onClick={() => setShowSendSheet(true)}
            disabled={connection !== 'connected'}
          />
        </div>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={(id) => navigate(`/wallet/${id}`)} />

      <div className="flex-1 min-h-0 overflow-hidden">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>

      {showSendSheet && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end"
          onClick={() => setShowSendSheet(false)}
        >
          <div
            className="w-full max-w-[380px] bg-dark-800 rounded-t-3xl border-t border-dark-600 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-dark-600">
              <h2 className="text-sm font-black uppercase tracking-widest">Send {RTM_SYMBOL}</h2>
              <button onClick={() => setShowSendSheet(false)}>
                <IoClose className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSend} className="p-6 space-y-4">
              <div className="p-3 rounded-xl border border-dark-600 bg-dark-700/30 flex items-center justify-between">
                <span className="text-xs font-bold">{account?.name}</span>
                <span className="text-[10px] font-bold text-gray-300">{confirmed} {RTM_SYMBOL} available</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Recipient Address</label>
                <Input
                  placeholder="R…"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  className="bg-dark-700/50 border-dark-600 font-mono text-xs"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Amount</label>
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={sendMax ? 'All confirmed funds' : amount}
                    disabled={sendMax}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-dark-700/50 border-dark-600 pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">{RTM_SYMBOL}</span>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer select-none ml-1">
                  <input type="checkbox" checked={sendMax} onChange={(e) => setSendMax(e.target.checked)} className="w-4 h-4 accent-primary" />
                  Send maximum (fee deducted from amount)
                </label>
              </div>

              {sendError && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-xs font-bold text-red-300 text-center">{sendError}</p>
                </div>
              )}

              <Button type="submit" className="w-full btn-primary" disabled={!toAddress.trim() || (!sendMax && !amount.trim())}>
                Review
              </Button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </WalletFrame>
  )
}

interface QuickActionProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onClick, disabled = false }) => (
  <button
    className="flex flex-col items-center gap-1.5 group disabled:opacity-50 disabled:cursor-not-allowed"
    onClick={onClick}
    disabled={disabled}
  >
    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center transition-transform group-active:scale-90 shadow-lg shadow-primary/20">
      {icon}
    </div>
    <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{label}</span>
  </button>
)

export default WalletLayout
