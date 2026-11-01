import React, { useCallback, useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { IoArrowDownOutline, IoArrowUpOutline, IoLayersOutline } from 'react-icons/io5'
import { WalletFrame, useWalletFrame } from '../../components/WalletFrame'
import { Tabs } from '../../components/Tabs'
import { PageTransition } from '../../components/PageTransition'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Notice, Sheet } from '../../components/ui'
import { isValidAddress } from '../../lib/rtm/address'
import { NetworkIcon } from '../../components/NetworkIcon'
import { activeAccountOf, formatCoin, networkParams, useWalletStore, walletKey } from '../../store/walletStore'

const ASSET_TABS = [
  { id: 'assets', label: 'Assets' },
  { id: 'activity', label: 'Activity' }
]
const COIN_TABS = [{ id: 'activity', label: 'Activity' }]

function groupedAmount(value: string): { whole: string; fraction: string } {
  const [whole, fraction = ''] = value.split('.')
  const negative = whole.startsWith('-')
  return { whole: `${negative ? '-' : ''}${BigInt(whole.replace('-', '') || '0').toLocaleString('en-US')}`, fraction }
}

const WalletLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const state = useWalletStore()
  const { balances, connection, connect, lastRefreshAt } = state
  const network = networkParams(state)
  const symbol = network.symbol
  const account = activeAccountOf(state)
  const balance = account ? balances[walletKey(network.id, account.id)] : undefined

  const [showSend, setShowSend] = useState(false)
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [sendMax, setSendMax] = useState(false)
  const [sendError, setSendError] = useState('')
  const closeSend = useCallback(() => {
    setShowSend(false)
    setToAddress('')
    setAmount('')
    setSendMax(false)
    setSendError('')
  }, [])

  useEffect(() => {
    if (connection === 'disconnected') void connect()
  }, [connection, connect])

  const confirmed = formatCoin(balance?.confirmed ?? '0', network.id)
  const { whole, fraction } = groupedAmount(confirmed)
  const pending = BigInt(balance?.unconfirmed ?? '0')
  const activeTab = location.pathname.includes('/activity') || !network.hasAssets ? 'activity' : 'assets'
  const loading = !balance && connection !== 'error'
  const canSend = connection === 'connected'

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    setSendError('')
    if (!isValidAddress(toAddress, network)) {
      setSendError(`Enter a valid ${network.name} address (starts with ${network.addressPrefix}).`)
      return
    }
    if (!sendMax && !/^\d+(\.\d{1,8})?$/.test(amount.trim())) {
      setSendError('Enter an amount with at most 8 decimals.')
      return
    }
    const request = { kind: 'coin', network: network.id, to: toAddress.trim(), amount: amount.trim(), sendMax }
    closeSend()
    navigate('/tx/confirm', { state: request })
  }

  return (
    <WalletFrame>
      <section className="px-4 pt-1 pb-4 shrink-0">
        <div className="card relative overflow-hidden px-5 pt-5 pb-4">
          <div className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <NetworkIcon network={network} size={20} />
            {network.name} balance
          </div>
          {loading ? (
            <div className="mt-3 h-10 w-40 loading-shimmer rounded-xl" />
          ) : (
            <p className="mt-2 flex items-baseline gap-1.5 tracking-tight" aria-label={`${confirmed} ${symbol}`}>
              <span className="text-[34px] font-bold leading-none">{whole}</span>
              {fraction && <span className="text-xl font-semibold text-gray-400 leading-none">.{fraction}</span>}
              <span className="text-sm font-semibold text-gray-400 ml-1">{symbol}</span>
            </p>
          )}
          <div className="mt-2 min-h-[18px] text-[11px]">
            {pending !== 0n
              ? <span className="text-warning">{pending > 0n ? '+' : ''}{formatCoin(pending, network.id)} {symbol} pending confirmation</span>
              : connection === 'error' && lastRefreshAt
                ? <span className="text-gray-500">Last updated {new Date(lastRefreshAt).toLocaleTimeString()}</span>
                : null}
          </div>
          <div className={`mt-3 grid gap-2 ${network.hasAssets ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <ReceiveAction />
            <QuickAction icon={<IoArrowUpOutline />} label="Send" onClick={() => setShowSend(true)} disabled={!canSend} primary />
            {network.hasAssets && <QuickAction icon={<IoLayersOutline />} label="Assets" onClick={() => navigate('/assets')} />}
          </div>
        </div>
      </section>

      <Tabs tabs={network.hasAssets ? ASSET_TABS : COIN_TABS} activeTab={activeTab} onChange={(id) => navigate(`/wallet/${id}`)} />

      <div className="flex-1 min-h-0 overflow-hidden mt-2">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>

      <Sheet open={showSend} onClose={closeSend} title={`Send ${symbol}`}>
        <form onSubmit={handleSend} className="space-y-4" noValidate>
          <div className="card-flat flex items-center justify-between px-4 py-3">
            <span className="text-xs text-gray-400">{account?.name}</span>
            <span className="text-xs font-semibold">{confirmed} {symbol} available</span>
          </div>
          <Input
            label="Recipient address"
            placeholder={`${network.addressPrefix}…`}
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            className="font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <div>
            <Input
              label="Amount"
              inputMode="decimal"
              placeholder="0.00"
              value={sendMax ? '' : amount}
              disabled={sendMax}
              onChange={(e) => setAmount(e.target.value)}
              trailing={
                <button
                  type="button"
                  onClick={() => setSendMax(!sendMax)}
                  className={sendMax ? 'text-[11px] font-bold px-2 py-1 rounded-lg bg-primary text-white' : 'text-[11px] font-bold px-2 py-1 rounded-lg bg-primary/15 text-primary-300 hover:bg-primary/25'}
                >
                  MAX
                </button>
              }
            />
            <p className="text-[11px] text-gray-500 mt-1.5 ml-1">
              {sendMax ? `Sends all confirmed ${symbol}; the network fee is deducted from the amount.` : 'The network fee is shown on the next screen.'}
            </p>
          </div>
          {sendError && <Notice tone="error">{sendError}</Notice>}
          <Button type="submit" className="w-full" disabled={!toAddress.trim() || (!sendMax && !amount.trim())}>
            Review
          </Button>
        </form>
      </Sheet>
    </WalletFrame>
  )
}

const ReceiveAction: React.FC = () => {
  const { openReceive } = useWalletFrame()
  return <QuickAction icon={<IoArrowDownOutline />} label="Receive" onClick={openReceive} />
}

const QuickAction: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; primary?: boolean }> = ({
  icon, label, onClick, disabled = false, primary = false
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center gap-1 h-[60px] rounded-2xl text-xs font-semibold transition-all active:scale-[0.97]
      disabled:cursor-not-allowed ${primary
        ? 'bg-primary text-white shadow-glow hover:bg-primary-400 disabled:bg-white/[0.05] disabled:text-gray-500 disabled:shadow-none disabled:border disabled:border-white/[0.06]'
        : 'bg-white/[0.05] text-gray-200 border border-white/[0.06] hover:bg-white/[0.08]'}`}
  >
    <span className="text-lg">{icon}</span>
    {label}
  </button>
)

export default WalletLayout
