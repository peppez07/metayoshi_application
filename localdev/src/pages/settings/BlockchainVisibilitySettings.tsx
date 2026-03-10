import React, { useMemo } from 'react'
import { IoCheckmarkCircle, IoWarningOutline } from 'react-icons/io5'
import clsx from 'clsx'
import { useWalletStore } from '../../store/walletStore'
import { compareNetworksByModelFamily } from '../../lib/coinModel'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { getEnabledNetworks, normalizeDisabledNetworkIds } from '../../lib/networkVisibility'
import { MAX_ACTIVE_REFRESH_NETWORKS } from '../../store/walletStoreStateUtils'

const BlockchainVisibilitySettings: React.FC = () => {
  const {
    networks,
    activity,
    activeNetworkId,
    disabledNetworkIds,
    setNetworkEnabled
  } = useWalletStore()

  const normalizedDisabled = useMemo(
    () => normalizeDisabledNetworkIds(disabledNetworkIds, networks),
    [disabledNetworkIds, networks]
  )
  const disabledSet = useMemo(() => new Set(normalizedDisabled), [normalizedDisabled])
  const enabledNetworks = useMemo(
    () => getEnabledNetworks(networks, normalizedDisabled),
    [networks, normalizedDisabled]
  )
  const enabledCount = enabledNetworks.length

  const rankedNetworks = useMemo(() => {
    const usageByNetwork = new Map<string, number>()
    for (const row of activity) {
      const networkId = String(row?.networkId || '').trim()
      if (!networkId) continue
      usageByNetwork.set(networkId, (usageByNetwork.get(networkId) || 0) + 1)
    }
    return [...networks].sort((a, b) => {
      const familyDelta = compareNetworksByModelFamily(a, b)
      if (familyDelta !== 0) return familyDelta
      const usageDelta = (usageByNetwork.get(b.id) || 0) - (usageByNetwork.get(a.id) || 0)
      if (usageDelta !== 0) return usageDelta
      return a.name.localeCompare(b.name)
    })
  }, [activity, networks])

  return (
    <div className="flex flex-col">
      <header className="px-4 py-3 text-center border-b border-dark-600">
        <h1 className="text-sm font-black uppercase tracking-widest text-gray-200">Blockchain Visibility</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="flex gap-2.5 p-3 bg-dark-700/20 border border-dark-600/60 rounded-xl">
          <IoWarningOutline className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-300 leading-relaxed">
            Keep only the chains you really use. The wallet allows at most {MAX_ACTIVE_REFRESH_NETWORKS} active blockchains for refresh, and new wallets start with 10 common networks enabled by default.
          </p>
        </div>

        <p className="text-[10px] text-gray-500">
          {enabledCount} / {MAX_ACTIVE_REFRESH_NETWORKS} active for refresh
        </p>

        <div className="space-y-2">
          {rankedNetworks.map((network) => {
            const isEnabled = !disabledSet.has(network.id)
            const canToggle = isEnabled ? enabledCount > 1 : enabledCount < MAX_ACTIVE_REFRESH_NETWORKS
            const capabilities = resolveNetworkCapabilities(network)
            return (
              <label
                key={network.id}
                className={clsx(
                  'flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors',
                  isEnabled
                    ? 'border-dark-600 bg-dark-700/40 hover:bg-dark-700/70'
                    : 'border-dark-600/70 bg-dark-800/60'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {network.logo ? (
                    <img src={network.logo} alt={network.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-dark-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-200 truncate">{network.name}</p>
                      {network.id === activeNetworkId && (
                        <IoCheckmarkCircle className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-gray-500 uppercase font-mono">{network.symbol}</p>
                      {capabilities.features.assetLayer && (
                        <span className="px-1.5 py-0.5 rounded-md border border-dark-600 bg-dark-700/70 text-[9px] font-black tracking-widest uppercase text-gray-200">
                          Assets
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(event) => setNetworkEnabled(network.id, event.target.checked)}
                  disabled={!canToggle}
                  className="w-4 h-4 accent-primary disabled:opacity-50"
                />
              </label>
            )
          })}
        </div>

        {enabledCount <= 1 && (
          <p className="text-[10px] text-yellow-300">
            At least one blockchain must stay enabled.
          </p>
        )}
        {enabledCount >= MAX_ACTIVE_REFRESH_NETWORKS && (
          <p className="text-[10px] text-yellow-300">
            Maximum active blockchains reached. Disable one before enabling another.
          </p>
        )}
      </div>
    </div>
  )
}

export default BlockchainVisibilitySettings
