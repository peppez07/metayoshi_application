import React from 'react'
import clsx from 'clsx'
import { NETWORK_LOGOS } from '../lib/networkLogos'
import type { NetworkParams } from '../lib/networks'

const COLORS = ['#f59e0b', '#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#fb923c', '#60a5fa', '#facc15', '#2dd4bf', '#c084fc']

/** The coin's logo where the wallet has one, otherwise a colored ticker badge. */
export const NetworkIcon: React.FC<{ network: Pick<NetworkParams, 'id' | 'symbol' | 'name'>; size?: number; className?: string }> = ({
  network, size = 24, className
}) => {
  const logo = (NETWORK_LOGOS as Record<string, string | undefined>)[network.id]
  if (logo) {
    return <img src={logo} alt="" className={clsx('rounded-full shrink-0 bg-white p-[1px]', className)} style={{ width: size, height: size }} />
  }
  let hash = 0
  for (const char of network.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const color = COLORS[hash % COLORS.length]
  const label = network.symbol.replace(/[^A-Za-z0-9]/g, '').slice(0, network.symbol.length > 3 ? 2 : 3)
  return (
    <span
      aria-hidden
      className={clsx('rounded-full shrink-0 flex items-center justify-center font-bold text-dark-900', className)}
      style={{ width: size, height: size, fontSize: size * (label.length > 2 ? 0.3 : 0.38), background: `linear-gradient(140deg, ${color}, ${color}aa)` }}
    >
      {label}
    </span>
  )
}
