import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoArrowForward,
  IoChevronForward,
  IoLayersOutline,
  IoSparklesOutline,
} from 'react-icons/io5'
import { isNftAssetKey, resolveSolanaAssetTypeLabel } from '../../lib/assetTypes'
import { coinModelFamilyToRouteKey, resolveCoinModelFamily } from '../../lib/coinModel'
import { formatFiatValue } from '../../store/walletStore'
import { formatAssetAmount, useAssetListModel } from './useAssetListModel'

const Assets: React.FC = () => {
  const navigate = useNavigate()
  const {
    activeNetwork,
    caps,
    sorted,
    isEvmEcosystem,
    isSolanaEcosystem,
    canOpenAssetSend,
    assetLogos,
    fiatByAsset,
    resolveAssetDisplayName
  } = useAssetListModel()
  const [assetTab, setAssetTab] = useState<'tokens' | 'nfts'>('tokens')
  const buyRouteKey = activeNetwork ? coinModelFamilyToRouteKey(resolveCoinModelFamily(activeNetwork)) : 'generic'

  const tokenRows = useMemo(
    () => sorted.filter(([name]) => !isNftAssetKey(name)),
    [sorted]
  )
  const nftRows = useMemo(
    () => sorted.filter(([name]) => isNftAssetKey(name)),
    [sorted]
  )
  const currentRows = assetTab === 'tokens' ? tokenRows : nftRows
  const previewRows = useMemo(() => currentRows.slice(0, 4), [currentRows])

  const openAsset = (name: string) => {
    if (canOpenAssetSend) {
      navigate('/wallet/send', {
        state: {
          assetId: name,
          returnTo: '/wallet/assets',
          returnLabel: 'Assets'
        }
      })
      return
    }
    navigate('/assets')
  }

  if (!activeNetwork) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-14 gap-3 text-center px-6 opacity-60">
        <IoLayersOutline className="w-7 h-7 text-gray-500" />
        <p className="text-sm font-medium text-gray-300">No active network available</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 pb-6 pt-4">
      <div className="space-y-4">
        <section className="wallet-surface overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-dark-600/50 px-5 pt-4">
            <div className="flex items-center gap-6">
              {[
                { id: 'tokens', label: `Tokens${tokenRows.length > 0 ? ` (${tokenRows.length})` : ''}` },
                { id: 'nfts', label: `NFTs${nftRows.length > 0 ? ` (${nftRows.length})` : ''}` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAssetTab(tab.id as 'tokens' | 'nfts')}
                  className={`border-b-2 pb-3 text-xs font-bold transition-colors ${
                    assetTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/assets')}
              className="mb-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/8 px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary/14"
            >
              <span>All Assets</span>
              <IoChevronForward className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-4">
            {!caps.features.assetLayer ? (
              <EmptyAssetsCard
                title={`Assets are not supported on ${activeNetwork.name}`}
                description="Switch to another network or use the model view for chain details."
                ctaLabel="Open Model View"
                onClick={() => navigate(`/wallet/model/${buyRouteKey}`)}
              />
            ) : previewRows.length === 0 ? (
              <EmptyAssetsCard
                title={assetTab === 'tokens' ? 'No assets yet' : 'No NFTs yet'}
                description={assetTab === 'tokens'
                  ? `Add your first ${activeNetwork.symbol} token or receive funds to start tracking balances on ${activeNetwork.name}.`
                  : 'NFT collectibles linked to this address will appear here once they are discovered.'}
                ctaLabel={assetTab === 'tokens' ? 'Add Your First Token' : 'View Asset Explorer'}
                onClick={() => navigate(assetTab === 'tokens' ? '/assets' : `/wallet/model/${buyRouteKey}`)}
              />
            ) : (
              <div className="space-y-3">
                {previewRows.map(([name, rawAmount]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => openAsset(name)}
                    className="wallet-soft-surface flex w-full items-center justify-between gap-3 rounded-[22px] px-4 py-3 text-left transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/70 shadow-[0_10px_20px_rgba(15,23,42,0.08)]">
                        {assetLogos[name] ? (
                          <img src={assetLogos[name]} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-black uppercase text-primary">{String(resolveAssetDisplayName(name) || name).slice(0, 2)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-100">{resolveAssetDisplayName(name)}</p>
                        <p className="truncate text-xs text-gray-500">
                          {isNftAssetKey(name)
                            ? 'NFT asset'
                            : isSolanaEcosystem
                              ? (resolveSolanaAssetTypeLabel(name) || activeNetwork.symbol)
                              : isEvmEcosystem
                                ? activeNetwork.name
                                : activeNetwork.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-100">{formatAssetAmount(rawAmount)}</p>
                        <p className="text-xs text-gray-500">{formatFiatValue(fiatByAsset[name]?.usd) || '$0.00 USD'}</p>
                      </div>
                      <IoArrowForward className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                ))}

                {currentRows.length > previewRows.length ? (
                  <button
                    type="button"
                    onClick={() => navigate('/assets')}
                    className="flex w-full items-center justify-between rounded-[22px] border border-dashed border-primary/35 bg-primary/5 px-4 py-3 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <span>View all {currentRows.length} {assetTab}</span>
                    <IoChevronForward className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

interface EmptyAssetsCardProps {
  title: string
  description: string
  ctaLabel: string
  onClick: () => void
}

const EmptyAssetsCard: React.FC<EmptyAssetsCardProps> = ({ title, description, ctaLabel, onClick }) => (
  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[26px] bg-white/[0.62] px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:bg-white/[0.03]">
    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#fff1e6] text-primary shadow-[0_12px_24px_rgba(255,132,31,0.12)] dark:bg-primary/10">
      <IoSparklesOutline className="h-7 w-7" />
    </div>
    <p className="mt-5 text-xl font-bold text-gray-100">{title}</p>
    <p className="mt-2 max-w-[240px] text-sm leading-6 text-gray-500">{description}</p>
    <button
      type="button"
      onClick={onClick}
      className="btn-primary mt-6 px-6 py-3 text-sm"
    >
      {ctaLabel}
    </button>
  </div>
)

export default Assets
