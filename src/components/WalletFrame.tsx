import React from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import clsx from 'clsx'
import { IoChevronDown, IoCopyOutline, IoCheckmark, IoQrCodeOutline, IoCreateOutline, IoAdd, IoLockClosedOutline, IoSettingsOutline, IoRefresh } from 'react-icons/io5'
import { Button } from './Button'
import { IconButton, Notice, Sheet, shortAddress, useCopy } from './ui'
import { SESSION_GRADIENT } from '../lib/sessionColor'
import { activeAccountOf, useWalletStore } from '../store/walletStore'

interface WalletFrameProps {
  children: React.ReactNode
  hideHeader?: boolean
}

const FrameContext = React.createContext<{ openReceive: () => void }>({ openReceive: () => undefined })

/** Lets content inside the frame open the frame's receive sheet. */
export function useWalletFrame() {
  return React.useContext(FrameContext)
}

const ConnectionChip: React.FC = () => {
  const { connection, tipHeight, refreshing, connect, activeServer } = useWalletStore()
  const label = connection === 'connected'
    ? `#${tipHeight.toLocaleString('en-US')}`
    : connection === 'connecting' ? 'Connecting' : 'Offline'
  const dot = connection === 'connected' ? (refreshing ? 'status-dot-yellow' : 'status-dot-green')
    : connection === 'connecting' ? 'status-dot-yellow' : 'status-dot-red'
  return (
    <button
      type="button"
      onClick={() => { if (connection === 'error') void connect() }}
      title={connection === 'connected' ? `Connected to ${activeServer}` : connection === 'error' ? 'Retry connection' : activeServer}
      className="flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-semibold text-gray-300 hover:bg-white/[0.07]"
    >
      <span className={clsx('status-dot', dot, (connection !== 'connected' || refreshing) && 'animate-pulse-sync')} />
      {label}
    </button>
  )
}

export const WalletFrame: React.FC<WalletFrameProps> = ({ children, hideHeader = false }) => {
  const state = useWalletStore()
  const { connection, connectionError, accounts, activeAccountId, setActiveAccount, renameAccount, addAccount, lock, connect } = state
  const navigate = useNavigate()
  const [sheet, setSheet] = React.useState<'accounts' | 'receive' | null>(null)
  const [qrDataUrl, setQrDataUrl] = React.useState('')
  const [copied, copy] = useCopy()

  const activeAccount = activeAccountOf(state)
  const address = activeAccount?.address ?? ''
  const closeSheet = React.useCallback(() => setSheet(null), [])
  const frameContext = React.useMemo(() => ({ openReceive: () => setSheet('receive') }), [])

  React.useEffect(() => {
    if (sheet !== 'receive' || !address) return
    let mounted = true
    void QRCode.toDataURL(address, { width: 440, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b0c0e', light: '#ffffff' } })
      .then((url) => { if (mounted) setQrDataUrl(url) })
      .catch(() => undefined)
    return () => { mounted = false }
  }, [sheet, address])

  const editAccountName = (accountId: string) => {
    const target = accounts.find((a) => a.id === accountId)
    if (!target) return
    const next = window.prompt('Rename account', target.name)
    if (next === null || !next.trim() || next.trim() === target.name) return
    renameAccount(accountId, next.trim())
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {!hideHeader && (
        <header className="flex items-center gap-2 px-3 h-14 shrink-0">
          <button
            type="button"
            onClick={() => setSheet('accounts')}
            className="flex items-center gap-2.5 min-w-0 rounded-2xl pl-1 pr-2 py-1 hover:bg-white/[0.04] transition-colors"
          >
            <span className="w-8 h-8 rounded-full shrink-0 ring-2 ring-white/10" style={{ background: SESSION_GRADIENT }} />
            <span className="flex flex-col items-start min-w-0 leading-tight">
              <span className="flex items-center gap-1 text-sm font-semibold truncate max-w-[130px]">
                {activeAccount?.name ?? 'Account 1'}
                <IoChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              </span>
              <span className="text-[10px] text-gray-500 font-mono">{shortAddress(address, 5, 5)}</span>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <ConnectionChip />
            <IconButton label="Receive" onClick={() => setSheet('receive')} disabled={!address}>
              <IoQrCodeOutline className="w-[18px] h-[18px]" />
            </IconButton>
            <IconButton label="Settings" onClick={() => navigate('/settings')}>
              <IoSettingsOutline className="w-[18px] h-[18px]" />
            </IconButton>
          </div>
        </header>
      )}

      {!hideHeader && connection === 'error' && (
        <div className="px-4 pb-2">
          <Notice
            tone="warning"
            title="Offline: showing last known data"
            action={<IconButton label="Retry" onClick={() => void connect()} className="w-7 h-7 -my-1"><IoRefresh className="w-4 h-4" /></IconButton>}
          >
            {(connectionError.split('\n')[0] || 'The ElectrumX server cannot be reached').replace(/\.?$/, '.')} Sending is disabled until the wallet reconnects.
          </Notice>
        </div>
      )}

      <Sheet open={sheet === 'accounts'} onClose={closeSheet} title="Accounts" footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => { void addAccount().then((acc) => setActiveAccount(acc.id)) }}>
            <IoAdd className="w-4 h-4" /> Add account
          </Button>
          <Button variant="secondary" className="flex-1" onClick={lock}>
            <IoLockClosedOutline className="w-4 h-4" /> Lock
          </Button>
        </div>
      }>
        <div className="space-y-1.5">
          {accounts.map((acc) => {
            const active = activeAccountId === acc.id
            return (
              <div
                key={acc.id}
                className={clsx('flex items-center gap-1 rounded-2xl border transition-colors',
                  active ? 'border-primary/50 bg-primary/[0.07]' : 'border-white/[0.06] bg-dark-750 hover:bg-dark-700')}
              >
                <button type="button" className="flex items-center gap-3 flex-1 min-w-0 px-3 py-3 text-left"
                  onClick={() => { setActiveAccount(acc.id); closeSheet() }}>
                  <span className="w-9 h-9 rounded-full shrink-0" style={{ background: SESSION_GRADIENT }} />
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate">{acc.name}</span>
                    <span className="text-[11px] text-gray-500 font-mono">{shortAddress(acc.address, 8, 6) || '—'}</span>
                  </span>
                  {active && <IoCheckmark className="w-4 h-4 text-primary ml-auto shrink-0" />}
                </button>
                <IconButton label="Rename" onClick={() => editAccountName(acc.id)}><IoCreateOutline className="w-4 h-4" /></IconButton>
                <IconButton label="Copy address" onClick={() => void copy(acc.address, acc.id)} className="mr-1.5">
                  {copied === acc.id ? <IoCheckmark className="w-4 h-4 text-success" /> : <IoCopyOutline className="w-4 h-4" />}
                </IconButton>
              </div>
            )
          })}
        </div>
      </Sheet>

      <Sheet open={sheet === 'receive'} onClose={closeSheet} title="Receive RTM & assets" footer={
        <Button className="w-full" onClick={() => void copy(address, 'qr')} disabled={!address}>
          {copied === 'qr' ? <><IoCheckmark className="w-4 h-4" /> Copied</> : <><IoCopyOutline className="w-4 h-4" /> Copy Address</>}
        </Button>
      }>
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 rounded-3xl bg-white shadow-glow">
            {qrDataUrl
              ? <img src={qrDataUrl} alt="Receive address QR code" className="w-[200px] h-[200px]" style={{ imageRendering: 'pixelated' }} />
              : <div className="w-[200px] h-[200px] flex items-center justify-center"><span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin-smooth" /></div>}
          </div>
          <div className="w-full card-flat px-4 py-3 text-center">
            <p className="text-[11px] text-gray-500 mb-1">{activeAccount?.name}</p>
            <p className="font-mono text-xs break-all text-gray-200 leading-relaxed select-all">{address || 'No address available'}</p>
          </div>
          <p className="text-[11px] text-gray-500 text-center leading-relaxed">
            Send only Raptoreum (RTM) and Raptoreum assets to this address.
          </p>
        </div>
      </Sheet>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <FrameContext.Provider value={frameContext}>{children}</FrameContext.Provider>
      </main>
    </div>
  )
}
