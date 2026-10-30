import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { IoChevronDown, IoClose, IoCopyOutline, IoCheckmark, IoQrCodeOutline, IoCreateOutline, IoAdd, IoRefresh } from 'react-icons/io5'
import { Button } from './Button'
import { SESSION_GRADIENT } from '../lib/sessionColor'
import rtmLogo from '../assets/raptoreum.png'
import { activeAccountOf, useWalletStore } from '../store/walletStore'

interface WalletFrameProps {
  children: React.ReactNode
  hideHeader?: boolean
}

function shortAddress(address: string, head = 4, tail = 6): string {
  return address ? `${address.slice(0, head)}…${address.slice(-tail)}` : ''
}

export const WalletFrame: React.FC<WalletFrameProps> = ({ children, hideHeader = false }) => {
  const state = useWalletStore()
  const { connection, connectionError, tipHeight, refreshing, accounts, activeAccountId, setActiveAccount, renameAccount, addAccount, lock, connect } = state
  const navigate = useNavigate()

  const [showAccountMenu, setShowAccountMenu] = React.useState(false)
  const [showReceiveQr, setShowReceiveQr] = React.useState(false)
  const [copied, setCopied] = React.useState('')
  const [qrDataUrl, setQrDataUrl] = React.useState('')

  const activeAccount = activeAccountOf(state)
  const address = activeAccount?.address ?? ''

  React.useEffect(() => {
    if (!showReceiveQr || !address) {
      setQrDataUrl('')
      return
    }
    let mounted = true
    void QRCode.toDataURL(address, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#111316', light: '#ffffff' }
    }).then((url) => { if (mounted) setQrDataUrl(url) }).catch(() => undefined)
    return () => { mounted = false }
  }, [showReceiveQr, address])

  const copy = async (value: string, key: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  const editAccountName = (accountId: string) => {
    const target = accounts.find((a) => a.id === accountId)
    if (!target) return
    const next = window.prompt('Rename account', target.name)
    if (next === null || !next.trim() || next.trim() === target.name) return
    renameAccount(accountId, next.trim())
  }

  const statusColor = connection === 'connected'
    ? (refreshing ? 'status-dot-yellow' : 'status-dot-green')
    : connection === 'connecting' ? 'status-dot-yellow' : 'status-dot-red'
  const statusLabel = connection === 'connected'
    ? `Block ${tipHeight.toLocaleString()}`
    : connection === 'connecting' ? 'Connecting…' : 'Not connected'

  return (
    <div className="flex flex-col h-full bg-dark-800 relative overflow-hidden">
      {!hideHeader && (
        <>
          <header className="p-3 flex items-center justify-between border-b border-dark-600">
            <Link to="/wallet/assets" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-primary bg-gradient-to-b from-primary/30 to-primary/10 shadow-sm shadow-primary/25">
                <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="w-full h-full object-contain object-center scale-[1.1] translate-y-px" />
              </div>
              <span className="text-[9px] leading-tight text-gray-500 max-w-[90px]">
                Your keys, your coins.
                <br />
                Use at your own risk.
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-700/50 rounded-full border border-dark-600">
                <img src={rtmLogo} alt="Raptoreum" className="w-4 h-4 rounded-full object-cover" />
                <span className="text-[11px] font-bold text-gray-200 uppercase tracking-tight">Raptoreum</span>
              </div>
              <button
                className="w-8 h-8 rounded-full border-2 border-dark-600 flex items-center justify-center cursor-pointer hover:border-primary overflow-hidden transition-all focus:outline-none"
                onClick={() => navigate('/settings')}
                title="Settings"
                style={{ background: SESSION_GRADIENT }}
              />
            </div>
          </header>

          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`status-dot ${statusColor} ${connection !== 'connected' || refreshing ? 'animate-pulse-sync' : ''}`} />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[11px] font-medium text-gray-400">{statusLabel}</span>
                {connection === 'error' && (
                  <button
                    className="flex items-center gap-1 text-[9px] text-red-400 hover:text-red-300"
                    onClick={() => void connect()}
                    title={connectionError}
                  >
                    <IoRefresh className="w-3 h-3" /> Retry
                  </button>
                )}
              </div>
            </div>

            <div
              className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowAccountMenu(true)}
            >
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold">{activeAccount?.name ?? 'Account 1'}</span>
                <IoChevronDown className="text-gray-500 w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 font-mono">{shortAddress(address)}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowReceiveQr(true)}
                disabled={!address}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-dark-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Receive (QR)"
              >
                <IoQrCodeOutline className="w-4.5 h-4.5 text-gray-400 hover:text-white" />
              </button>
              <button
                onClick={() => void copy(address, 'header')}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-dark-700 transition-colors"
                title="Copy address"
              >
                {copied === 'header'
                  ? <IoCheckmark className="w-4 h-4 text-green-400" />
                  : <IoCopyOutline className="w-4 h-4 text-gray-400 hover:text-white" />}
              </button>
            </div>
          </div>
        </>
      )}

      {showAccountMenu && (
        <div
          className="absolute inset-0 z-50 bg-black/45 backdrop-blur-sm p-3 pt-[86px] flex flex-col"
          onClick={() => setShowAccountMenu(false)}
        >
          <div
            className="w-full h-full min-h-0 bg-dark-800 rounded-2xl border border-dark-600 p-4 space-y-3 animate-in slide-in-from-top duration-200 flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Accounts</h3>
              <button onClick={() => setShowAccountMenu(false)}><IoClose className="w-6 h-6" /></button>
            </div>
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    activeAccountId === acc.id ? 'border-primary bg-primary/5' : 'border-dark-600 bg-dark-700/50 hover:bg-dark-700'
                  }`}
                  onClick={() => { setActiveAccount(acc.id); setShowAccountMenu(false) }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full shrink-0" style={{ background: SESSION_GRADIENT }} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold truncate">{acc.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{shortAddress(acc.address, 10, 6) || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
                      onClick={(e) => { e.stopPropagation(); editAccountName(acc.id) }}
                      title="Edit account name"
                    >
                      <IoCreateOutline className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                    <button
                      className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
                      onClick={(e) => { e.stopPropagation(); void copy(acc.address, acc.id) }}
                      title="Copy full address"
                    >
                      {copied === acc.id
                        ? <IoCheckmark className="w-4 h-4 text-green-400" />
                        : <IoCopyOutline className="w-4 h-4 text-gray-400 hover:text-white" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { void addAccount().then((acc) => setActiveAccount(acc.id)) }}
              >
                <IoAdd className="w-4 h-4" /> Add
              </Button>
              <Button variant="outline" className="flex-1" onClick={lock}>Lock</Button>
            </div>
          </div>
        </div>
      )}

      {showReceiveQr && (
        <div
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end"
          onClick={() => setShowReceiveQr(false)}
        >
          <div
            className="w-full bg-dark-800 rounded-t-3xl border-t border-dark-600 p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Receive</h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-primary text-[10px] font-bold uppercase tracking-wide">
                  RTM & assets
                </span>
              </div>
              <button
                onClick={() => setShowReceiveQr(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-dark-700 transition-colors"
              >
                <IoClose className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-dark-900 p-4 flex items-center justify-center shadow-[0_0_24px_rgba(245,132,31,0.10)]">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Receive address QR" className="w-[200px] h-[200px] rounded-xl" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div className="w-[200px] h-[200px] rounded-xl bg-dark-700 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin-smooth" />
                  <span className="text-[10px] text-gray-500">Generating…</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-dark-600 bg-dark-700/40 p-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">{activeAccount?.name}</p>
              <p className="text-[11px] font-mono break-all text-gray-200 leading-relaxed">{address || 'No address available'}</p>
            </div>

            <Button className="w-full" onClick={() => void copy(address, 'qr')} disabled={!address}>
              {copied === 'qr'
                ? <><IoCheckmark className="w-4 h-4" /> Copied!</>
                : <><IoCopyOutline className="w-4 h-4" /> Copy Address</>}
            </Button>
          </div>
        </div>
      )}

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  )
}
