import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { useWalletStore } from '../../store/walletStore'
import { IoTrashOutline } from 'react-icons/io5'

function normalizeHttpOrigin(value: unknown): string {
  try {
    const parsed = new URL(String(value || ''))
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.origin
  } catch {
    return ''
  }
}

const AuthorizedSites: React.FC = () => {
  const { authorizedSites, addAuthorizedSite, removeAuthorizedSite } = useWalletStore()
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const [currentSiteOrigin, setCurrentSiteOrigin] = useState('')
  const [loadingCurrentSite, setLoadingCurrentSite] = useState(true)
  const [currentSiteError, setCurrentSiteError] = useState('')
  const [isAuthorizingCurrentSite, setIsAuthorizingCurrentSite] = useState(false)

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      setLoadingCurrentSite(false)
      return
    }

    let mounted = true
    void chrome.tabs.query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (!mounted) return
        const currentTab = tabs.find((tab) => typeof tab?.id === 'number') || tabs[0]
        const origin = normalizeHttpOrigin(currentTab?.url)
        setCurrentTabId(typeof currentTab?.id === 'number' ? currentTab.id : null)
        setCurrentSiteOrigin(origin)
        setCurrentSiteError(origin ? '' : 'Open the wallet while viewing an http or https site to authorize provider access.')
        setLoadingCurrentSite(false)
      })
      .catch((error) => {
        if (!mounted) return
        setCurrentSiteError(error instanceof Error ? error.message : 'Could not read the active site.')
        setLoadingCurrentSite(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const currentSiteAuthorized = useMemo(
    () => Boolean(currentSiteOrigin) && authorizedSites.includes(currentSiteOrigin),
    [authorizedSites, currentSiteOrigin]
  )

  const authorizeCurrentSite = async (): Promise<void> => {
    if (!currentSiteOrigin) return
    setIsAuthorizingCurrentSite(true)
    setCurrentSiteError('')
    try {
      addAuthorizedSite(currentSiteOrigin)
      if (typeof chrome !== 'undefined' && chrome.tabs?.reload && currentTabId !== null) {
        await chrome.tabs.reload(currentTabId)
      }
    } catch (error) {
      setCurrentSiteError(error instanceof Error ? error.message : 'Could not authorize the current site.')
    } finally {
      setIsAuthorizingCurrentSite(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 bg-dark-900 border-b border-dark-600 text-center">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-200">Authorized Sites</h2>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="border-b border-dark-600 p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Current Site</p>
            <p className="text-sm font-medium text-gray-200 break-all">
              {loadingCurrentSite ? 'Checking active tab...' : (currentSiteOrigin || 'No eligible site detected')}
            </p>
            <p className="text-xs text-gray-500">
              Provider injection is denied by default. Authorize a site here to enable the MetaYoshi provider for that origin.
            </p>
            {!currentSiteAuthorized ? (
              <p className="text-[11px] text-gray-500">
                The current tab will reload after authorization so the site can detect the wallet on startup.
              </p>
            ) : null}
            {currentSiteError ? <p className="text-xs text-red-400">{currentSiteError}</p> : null}
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => void authorizeCurrentSite()}
              disabled={!currentSiteOrigin || currentSiteAuthorized}
              isLoading={isAuthorizingCurrentSite}
            >
              {currentSiteAuthorized ? 'Current Site Authorized' : 'Authorize Current Site'}
            </Button>
            {currentSiteAuthorized ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => removeAuthorizedSite(currentSiteOrigin)}
              >
                Revoke Current Site
              </Button>
            ) : null}
          </div>
        </div>

        {authorizedSites.length > 0 ? (
          <div className="divide-y divide-dark-600">
            {authorizedSites.map((site) => (
              <div key={site} className="flex items-center justify-between p-4 hover:bg-dark-700 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center flex-shrink-0">
                    <div className="w-4 h-4 bg-blue-500 rounded-full" />
                  </div>
                  <span className="text-xs font-bold text-gray-200 truncate">{site}</span>
                </div>
                <button 
                  onClick={() => removeAuthorizedSite(site)}
                  className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <IoTrashOutline className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3 opacity-60">
            <div className="w-14 h-14 rounded-full bg-dark-700/50 border border-dark-600 flex items-center justify-center">
              <div className="w-6 h-6 bg-dark-600 rounded-full" />
            </div>
            <p className="text-sm font-medium text-gray-400">No authorized sites</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthorizedSites
