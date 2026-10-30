import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { IoArrowBack, IoCheckmark, IoClose, IoCopyOutline, IoAlertCircle, IoInformationCircle, IoWarning } from 'react-icons/io5'

/** Back button + title + optional trailing action; the single header used by every sub-page. */
/** `back`: a route, a handler, false for none; omitted means browser history back. */
export const PageHeader: React.FC<{ title: string; back?: string | (() => void) | false; action?: React.ReactNode; subtitle?: string }> = ({
  title, back, action, subtitle
}) => {
  const navigate = useNavigate()
  const onBack = typeof back === 'function' ? back : () => (typeof back === 'string' ? navigate(back) : navigate(-1))
  return (
    <header className="flex items-center gap-2 px-3 h-14 shrink-0 border-b border-white/[0.05] bg-dark-900/80 backdrop-blur">
      {back !== false ? (
        <IconButton label="Back" onClick={onBack}><IoArrowBack className="w-5 h-5" /></IconButton>
      ) : <span className="w-9" />}
      <div className="flex-1 min-w-0 text-center">
        <h1 className="text-[15px] font-semibold truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>}
      </div>
      <div className="w-9 flex justify-end">{action}</div>
    </header>
  )
}

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'primary' }> = ({
  label, tone = 'default', className, children, ...props
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className={clsx(
      'w-9 h-9 inline-flex items-center justify-center rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
      tone === 'primary' ? 'text-primary hover:bg-primary/10' : 'text-gray-400 hover:text-white hover:bg-white/[0.06]',
      className
    )}
    {...props}
  >
    {children}
  </button>
)

/** Accessible bottom sheet: portal, Escape/backdrop to close, focus moves inside. */
export const Sheet: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }> = ({
  open, onClose, title, children, footer
}) => {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const focusable = panel.current?.querySelector<HTMLElement>('input, button:not([data-sheet-close]), textarea, select, a[href]')
    ;(focusable ?? panel.current)?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center animate-fade-in" role="presentation">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative mt-auto w-full max-w-[380px] max-h-[88%] flex flex-col bg-dark-800 rounded-t-3xl border-t border-white/[0.08] shadow-sheet animate-sheet-in focus:outline-none"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/15" />
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose} data-sheet-close><IoClose className="w-5 h-5" /></IconButton>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 pb-5">{children}</div>
        {footer && <div className="px-5 pb-5 pt-1">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

export const Notice: React.FC<{ tone?: 'info' | 'warning' | 'error' | 'success'; title?: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }> = ({
  tone = 'info', title, children, action, className
}) => {
  const styles = {
    info: ['bg-sky-400/[0.08] border-sky-400/20 text-sky-200', IoInformationCircle],
    warning: ['bg-warning/[0.08] border-warning/25 text-amber-100', IoWarning],
    error: ['bg-danger/[0.08] border-danger/25 text-red-100', IoAlertCircle],
    success: ['bg-success/[0.08] border-success/25 text-emerald-100', IoCheckmark]
  } as const
  const [classes, Icon] = styles[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={clsx('flex gap-2.5 items-start rounded-2xl border px-3.5 py-3', classes, className)}>
      <Icon className="w-[18px] h-[18px] mt-px shrink-0 opacity-90" />
      <div className="flex-1 min-w-0 text-xs leading-relaxed">
        {title && <p className="font-semibold text-[13px] mb-0.5">{title}</p>}
        {children && <div className="opacity-85 break-words whitespace-pre-line">{children}</div>}
      </div>
      {action}
    </div>
  )
}

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }> = ({ icon, title, children, action }) => (
  <div className="flex flex-col items-center text-center px-8 py-10 gap-3">
    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400">{icon}</div>
    <div className="space-y-1">
      <p className="text-sm font-semibold text-gray-200">{title}</p>
      {children && <p className="text-xs text-gray-500 leading-relaxed">{children}</p>}
    </div>
    {action}
  </div>
)

export const Badge: React.FC<{ children: React.ReactNode; tone?: 'neutral' | 'primary' | 'success' | 'warning' }> = ({ children, tone = 'neutral' }) => (
  <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide', {
    'bg-white/[0.06] text-gray-300': tone === 'neutral',
    'bg-primary/15 text-primary-300': tone === 'primary',
    'bg-success/15 text-success': tone === 'success',
    'bg-warning/15 text-warning': tone === 'warning'
  })}>{children}</span>
)

const AVATAR_COLORS = ['#f5841f', '#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#facc15', '#fb7185', '#2dd4bf']

/** Deterministic colored initials for an asset (no remote images are fetched). */
export const AssetAvatar: React.FC<{ id: string; name: string; size?: number; unique?: boolean }> = ({ id, name, size = 40, unique }) => {
  const hue = AVATAR_COLORS[parseInt(id.slice(0, 6) || '0', 16) % AVATAR_COLORS.length]
  const label = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?'
  return (
    <div
      className={clsx('shrink-0 flex items-center justify-center font-bold text-dark-900', unique ? 'rounded-xl' : 'rounded-full')}
      style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(140deg, ${hue}, ${hue}99)` }}
      aria-hidden
    >
      {label}
    </div>
  )
}

export function useCopy(timeoutMs = 1600): [string, (value: string, key?: string) => Promise<void>] {
  const [copied, setCopied] = useState('')
  const copy = async (value: string, key = 'default') => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(''), timeoutMs)
    } catch {
      // clipboard unavailable
    }
  }
  return [copied, copy]
}

export const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label = 'Copy' }) => {
  const [copied, copy] = useCopy()
  return (
    <IconButton label={copied ? 'Copied' : label} onClick={() => void copy(value)} className="w-8 h-8">
      {copied ? <IoCheckmark className="w-4 h-4 text-success" /> : <IoCopyOutline className="w-4 h-4" />}
    </IconButton>
  )
}

/** Label/value row for summaries; long values wrap in monospace. */
export const DetailRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean; copy?: string; emphasis?: boolean }> = ({
  label, value, mono, copy, emphasis
}) => (
  <div className="flex items-start justify-between gap-4 py-2.5">
    <span className="text-xs text-gray-500 pt-0.5 shrink-0">{label}</span>
    <div className="flex items-start gap-1 min-w-0">
      <span className={clsx('text-right break-all', mono ? 'font-mono text-[11px] text-gray-300 leading-relaxed' : 'text-[13px]', emphasis ? 'font-semibold text-white' : 'text-gray-200')}>
        {value}
      </span>
      {copy && <span className="-mt-1.5 -mr-1.5"><CopyButton value={copy} /></span>}
    </div>
  </div>
)

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => <div className={clsx('loading-shimmer rounded-xl', className)} />

export function shortAddress(address: string, head = 6, tail = 6): string {
  return address && address.length > head + tail + 1 ? `${address.slice(0, head)}…${address.slice(-tail)}` : address
}
