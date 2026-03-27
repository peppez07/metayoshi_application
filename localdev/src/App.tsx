import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, type ReactElement } from 'react'
import { useWalletStore } from './store/walletStore'
import { resolveNetworkCapabilities } from './lib/networkCapabilities'
import { resolveCoinModelFamily, coinModelFamilyToRouteKey } from './lib/coinModel'
import { getEnabledNetworks } from './lib/networkVisibility'
import {
  EXTENSION_SURFACE_ROUTE_STORAGE_KEY,
  clearExtensionSurfaceRoute,
  getExtensionSurfaceRoute,
  parseExtensionSurfaceRouteEntry
} from './lib/extensionSurfaceRoute'

// Pages (to be created)
import Register from './pages/Register'
import Unlock from './pages/Unlock'
import Connecting from './pages/Connecting'
import WelcomeGuide from './pages/WelcomeGuide'
import WalletLayout from './pages/wallet/WalletLayout'
import Assets from './pages/wallet/Assets'
import AssetsPage from './pages/wallet/AssetsPage'
import AssetPreviewPage from './pages/wallet/AssetPreviewPage'
import Activity from './pages/wallet/Activity'
import Send from './pages/wallet/Send'
import Swap from './pages/wallet/Swap'
import Sync from './pages/wallet/Sync'
import Disconnected from './pages/wallet/Disconnected'
import EvmModelPage from './pages/wallet/models/EvmModelPage'
import CardanoModelPage from './pages/wallet/models/CardanoModelPage'
import CosmosModelPage from './pages/wallet/models/CosmosModelPage'
import MoneroModelPage from './pages/wallet/models/MoneroModelPage'
import UtxoAssetsModelPage from './pages/wallet/models/UtxoAssetsModelPage'
import UtxoClassicModelPage from './pages/wallet/models/UtxoClassicModelPage'
import XrpModelPage from './pages/wallet/models/XrpModelPage'
import GenericModelPage from './pages/wallet/models/GenericModelPage'
import DappConnectStep1 from './pages/dapp/DappConnectStep1'
import DappConnectStep2 from './pages/dapp/DappConnectStep2'
import DappRequestConfirm from './pages/dapp/DappRequestConfirm'
import TxConfirm from './pages/tx/TxConfirm'
import TxReject from './pages/tx/TxReject'
import TxResult from './pages/tx/TxResult'
import SettingsLayout from './pages/settings/SettingsLayout'
import MainSettings from './pages/settings/MainSettings'
import PasswordSettings from './pages/settings/PasswordSettings'
import AutolockSettings from './pages/settings/AutolockSettings'
import SecuritySettings from './pages/settings/SecuritySettings'
import BackupSettings from './pages/settings/BackupSettings'
import RestoreSettings from './pages/settings/RestoreSettings'
import ShowSecrets from './pages/settings/ShowSecrets'
import AccountManager from './pages/settings/AccountManager'
import MultisigSettings from './pages/settings/MultisigSettings'
import AuthorizedSites from './pages/settings/AuthorizedSites'
import BlockchainVisibilitySettings from './pages/settings/BlockchainVisibilitySettings'
import TermsAndRules from './pages/TermsAndRules'
import { WALLET_TERMS_VERSION } from './lib/legalMetadata'
import type { Network } from './coins'

function resolveActiveEnabledNetwork(
  networks: Network[],
  activeNetworkId: string,
  disabledNetworkIds: string[]
): Network | null {
  const enabledNetworks = getEnabledNetworks(networks, disabledNetworkIds)
  return enabledNetworks.find((network) => network.id === activeNetworkId) || enabledNetworks[0] || null
}

const WalletIndexRedirect = () => {
  const { networks, activeNetworkId, disabledNetworkIds } = useWalletStore()
  const activeNetwork = resolveActiveEnabledNetwork(networks, activeNetworkId, disabledNetworkIds)
  if (!activeNetwork) return <Navigate to="/settings/blockchains" replace />
  const caps = resolveNetworkCapabilities(activeNetwork)
  return <Navigate to={caps.ui.showAssetsTab ? '/wallet/assets' : '/wallet/activity'} replace />
}

const SendRouteGate = () => {
  const { networks, activeNetworkId, disabledNetworkIds } = useWalletStore()
  const activeNetwork = resolveActiveEnabledNetwork(networks, activeNetworkId, disabledNetworkIds)
  if (!activeNetwork) return <Navigate to="/settings/blockchains" replace />
  const caps = resolveNetworkCapabilities(activeNetwork)
  return (caps.ui.showSendAction || caps.features.assetSend) ? <Send /> : <Navigate to="/wallet/activity" replace />
}

const AssetsRouteGate = () => {
  const { networks, activeNetworkId, disabledNetworkIds } = useWalletStore()
  const activeNetwork = resolveActiveEnabledNetwork(networks, activeNetworkId, disabledNetworkIds)
  if (!activeNetwork) return <Navigate to="/settings/blockchains" replace />
  const caps = resolveNetworkCapabilities(activeNetwork)
  return caps.ui.showAssetsTab ? <Assets /> : <Navigate to="/wallet/activity" replace />
}

const WalletModelRedirect = () => {
  const { networks, activeNetworkId, disabledNetworkIds } = useWalletStore()
  const activeNetwork = resolveActiveEnabledNetwork(networks, activeNetworkId, disabledNetworkIds)
  if (!activeNetwork) return <Navigate to="/settings/blockchains" replace />
  const modelKey = coinModelFamilyToRouteKey(resolveCoinModelFamily(activeNetwork))
  return <Navigate to={`/wallet/model/${modelKey}`} replace />
}

const LegacyAssetSendRedirect = () => {
  const location = useLocation()
  const routeState = (location.state as { assetId?: string } | null) || null
  const assetId = String(routeState?.assetId || '').trim()
  return <Navigate to="/wallet/send" replace state={assetId ? { assetId } : null} />
}

const WelcomeRouteGate = () => {
  const { isLocked, isInitialized, hasVault, onboardingCompleted } = useWalletStore()
  if (!hasVault || !isInitialized) return <Navigate to="/register" replace />
  if (isLocked) return <Navigate to="/unlock" replace />
  if (onboardingCompleted) return <WalletIndexRedirect />
  return <WelcomeGuide />
}

const WalletShellGate = () => {
  const { isLocked, onboardingCompleted } = useWalletStore()
  if (isLocked) return <Navigate to="/unlock" replace />
  if (!onboardingCompleted) return <Navigate to="/welcome" replace />
  return <WalletLayout />
}

const TxRouteGate = ({ element }: { element: ReactElement }) => {
  const location = useLocation()
  const { isLocked, networks, activeNetworkId, disabledNetworkIds } = useWalletStore()
  const isDappTxRoute = new URLSearchParams(location.search).get('dappRequest') === '1'
  if (isDappTxRoute) return element
  if (isLocked) return <Navigate to="/unlock" replace />
  const activeNetwork = resolveActiveEnabledNetwork(networks, activeNetworkId, disabledNetworkIds)
  if (!activeNetwork) return <Navigate to="/settings/blockchains" replace />
  const caps = resolveNetworkCapabilities(activeNetwork)
  if (!caps.features.nativeSend && !caps.features.assetSend) return <Navigate to="/wallet/activity" replace />
  return element
}

function App() {
  const [hasHydrated, setHasHydrated] = useState(() => useWalletStore.persist.hasHydrated())
  const {
    isLocked,
    isInitialized,
    hasVault,
    onboardingCompleted,
    acceptedTermsVersion,
    checkAutolock,
    hydrateCatalogRepository,
    hydrateActivityFromRepository,
    sessionMnemonic,
    lock,
    syncNetworksFromServer
  } = useWalletStore()
  const location = useLocation()
  const needsTermsAcceptance = hasHydrated
    && isInitialized
    && hasVault
    && !isLocked
    && acceptedTermsVersion !== WALLET_TERMS_VERSION

  useEffect(() => {
    if (useWalletStore.persist.hasHydrated()) {
      setHasHydrated(true)
      return
    }

    const unsubscribe = useWalletStore.persist.onFinishHydration(() => {
      setHasHydrated(true)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const iconHref = '/icons/icon-32.png?v=20260304'
    const iconRels = ['icon', 'shortcut icon', 'apple-touch-icon']

    iconRels.forEach((rel) => {
      let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"][data-metayoshi-brand="1"]`)
        || document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', rel)
        link.setAttribute('type', 'image/png')
        document.head.appendChild(link)
      }
      link.setAttribute('data-metayoshi-brand', '1')
      link.setAttribute('href', iconHref)
    })
  }, [location.pathname])

  useEffect(() => {
    if (!hasHydrated) return
    void hydrateCatalogRepository()
  }, [hasHydrated, hydrateCatalogRepository])

  useEffect(() => {
    if (!hasHydrated) return
    void syncNetworksFromServer()
  }, [hasHydrated, syncNetworksFromServer])

  useEffect(() => {
    if (!hasHydrated) return
    void hydrateActivityFromRepository()
  }, [hasHydrated, hydrateActivityFromRepository])

  // Persisted state hydrates asynchronously from extension storage.
  // Re-check after hydration so the wallet never renders as unlocked without
  // an in-memory mnemonic in a freshly opened extension surface.
  useEffect(() => {
    if (!hasHydrated) return
    if (isInitialized && !isLocked && !sessionMnemonic) {
      lock()
    }
  }, [hasHydrated, isInitialized, isLocked, sessionMnemonic, lock])

  useEffect(() => {
    if (!hasHydrated) return
    checkAutolock()
    const interval = setInterval(checkAutolock, 60000)
    return () => clearInterval(interval)
  }, [hasHydrated, checkAutolock])

  useEffect(() => {
    if (!hasHydrated || typeof window === 'undefined') return

    let lastActivityWrite = 0
    const markActive = () => {
      const state = useWalletStore.getState()
      if (!state.isInitialized || state.isLocked) return

      const now = Date.now()
      if (now - lastActivityWrite < 15000) return
      lastActivityWrite = now
      state.updateLastActive()
    }
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return
      if (document.visibilityState === 'visible') {
        markActive()
      }
    }
    const lockOnPageHide = () => {
      const state = useWalletStore.getState()
      if (!state.isInitialized || state.isLocked) return
      state.lock()
    }

    window.addEventListener('pointerdown', markActive, true)
    window.addEventListener('keydown', markActive, true)
    window.addEventListener('focus', markActive)
    window.addEventListener('pagehide', lockOnPageHide)
    window.addEventListener('beforeunload', lockOnPageHide)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      window.removeEventListener('pointerdown', markActive, true)
      window.removeEventListener('keydown', markActive, true)
      window.removeEventListener('focus', markActive)
      window.removeEventListener('pagehide', lockOnPageHide)
      window.removeEventListener('beforeunload', lockOnPageHide)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [hasHydrated])

  useEffect(() => {
    if (!hasHydrated || typeof chrome === 'undefined' || !chrome.storage?.local) return

    let mounted = true
    const currentRoute = `${location.pathname}${location.search}`

    const applySurfaceRoute = async (rawValue: unknown): Promise<void> => {
      const entry = parseExtensionSurfaceRouteEntry(rawValue)
      if (!mounted || !entry) return
      await clearExtensionSurfaceRoute().catch(() => {
        // Best effort cleanup only.
      })
      if (entry.route === currentRoute) return
      window.location.hash = `#${entry.route}`
    }

    void getExtensionSurfaceRoute()
      .then((entry) => applySurfaceRoute(entry))
      .catch(() => {
        // Ignore storage read failures and keep the current route.
      })

    const onStorageChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ): void => {
      if (areaName !== 'local' || !changes[EXTENSION_SURFACE_ROUTE_STORAGE_KEY]) return
      void applySurfaceRoute(changes[EXTENSION_SURFACE_ROUTE_STORAGE_KEY].newValue)
    }

    chrome.storage.onChanged.addListener(onStorageChanged)
    return () => {
      mounted = false
      chrome.storage.onChanged.removeListener(onStorageChanged)
    }
  }, [hasHydrated, location.pathname, location.search])

  if (
    needsTermsAcceptance
    && location.pathname !== '/terms'
    && location.pathname !== '/register'
    && location.pathname !== '/unlock'
  ) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return (
      <div className="wallet-shell-stage w-full h-full overflow-hidden">
        <div className="ambient-glow left-[-72px] top-[10%] w-44 h-44 bg-primary/16" />
        <div className="ambient-glow right-[-80px] bottom-[6%] w-52 h-52 bg-yellow-500/10" />
        <div className="wallet-container">
          <Navigate to="/terms" replace state={{ returnTo }} />
        </div>
      </div>
    )
  }

  return (
    <div className="wallet-shell-stage w-full h-full overflow-hidden">
      <div className="ambient-glow left-[-72px] top-[10%] w-44 h-44 bg-primary/16" />
      <div className="ambient-glow right-[-80px] bottom-[6%] w-52 h-52 bg-yellow-500/10" />
      <div className="wallet-container">
        <Routes>
          {/* Auth Flow */}
          <Route path="/register" element={hasVault ? <Navigate to="/unlock" replace /> : <Register />} />
          <Route path="/terms" element={<TermsAndRules />} />
          <Route path="/unlock" element={<Unlock />} />
          <Route path="/welcome" element={<WelcomeRouteGate />} />
          
          {/* Main Wallet Flow */}
          <Route path="/connecting" element={<Connecting />} />
          
          <Route path="/wallet" element={<WalletShellGate />}>
            <Route index element={<WalletIndexRedirect />} />
            <Route path="assets" element={<AssetsRouteGate />} />
            <Route path="activity" element={<Activity />} />
            <Route path="model" element={<WalletModelRedirect />} />
            <Route path="model/utxo-assets" element={<UtxoAssetsModelPage />} />
            <Route path="model/utxo-classic" element={<UtxoClassicModelPage />} />
            <Route path="model/xrp" element={<XrpModelPage />} />
            <Route path="model/evm" element={<EvmModelPage />} />
            <Route path="model/cosmos" element={<CosmosModelPage />} />
            <Route path="model/cardano" element={<CardanoModelPage />} />
            <Route path="model/monero" element={<MoneroModelPage />} />
            <Route path="model/generic" element={<GenericModelPage />} />
            <Route path="send" element={<SendRouteGate />} />
            <Route path="swap" element={<Swap />} />
            <Route path="sync" element={<Sync />} />
            <Route path="disconnected" element={<Disconnected />} />
          </Route>

          {/* Full Assets Page */}
          <Route path="/assets" element={isLocked ? <Navigate to="/unlock" /> : (!onboardingCompleted ? <Navigate to="/welcome" replace /> : <AssetsPage />)} />
          <Route path="/assets/send" element={isLocked ? <Navigate to="/unlock" /> : (!onboardingCompleted ? <Navigate to="/welcome" replace /> : <LegacyAssetSendRedirect />)} />
          <Route path="/assets/preview" element={isLocked ? <Navigate to="/unlock" /> : (!onboardingCompleted ? <Navigate to="/welcome" replace /> : <AssetPreviewPage />)} />

          {/* Dapp Flow */}
          <Route path="/dapp/connect/1" element={<DappConnectStep1 />} />
          <Route path="/dapp/connect/2" element={<DappConnectStep2 />} />
          <Route path="/dapp/request/confirm" element={<DappRequestConfirm />} />

          {/* Transaction Flow */}
          <Route path="/tx/confirm" element={<TxRouteGate element={<TxConfirm />} />} />
          <Route path="/tx/reject" element={<TxRouteGate element={<TxReject />} />} />
          <Route path="/tx/result" element={<TxRouteGate element={<TxResult />} />} />

          {/* Settings Flow */}
          <Route path="/settings" element={isLocked ? <Navigate to="/unlock" replace /> : (!onboardingCompleted ? <Navigate to="/welcome" replace /> : <SettingsLayout />)}>
            <Route index element={<MainSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="backup" element={<BackupSettings />} />
            <Route path="restore" element={<RestoreSettings />} />
            <Route path="show-secrets" element={<ShowSecrets />} />
            <Route path="download-keys" element={<Navigate to="/settings/show-secrets" replace />} />
            <Route path="accounts" element={<AccountManager />} />
            <Route path="multisig" element={<MultisigSettings />} />
            <Route path="password" element={<PasswordSettings />} />
            <Route path="autolock" element={<AutolockSettings />} />
            <Route path="authorized-sites" element={<AuthorizedSites />} />
            <Route path="blockchains" element={<BlockchainVisibilitySettings />} />
            <Route path="rpc" element={<Navigate to="/settings" replace />} />
            <Route path="*" element={<Navigate to="/settings" replace />} />
          </Route>

          {/* Default Route */}
          <Route path="*" element={
            !hasVault || !isInitialized ? <Navigate to="/register" /> : 
            isLocked ? <Navigate to="/unlock" /> : 
            !onboardingCompleted ? <Navigate to="/welcome" replace /> :
            <WalletIndexRedirect />
          } />
        </Routes>
      </div>
    </div>
  )
}

export default App
