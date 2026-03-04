import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, type ReactElement } from 'react'
import { useWalletStore } from './store/walletStore'
import { resolveNetworkCapabilities } from './lib/networkCapabilities'
import { resolveCoinModelFamily, coinModelFamilyToRouteKey } from './lib/coinModel'

// Pages (to be created)
import Register from './pages/Register'
import Unlock from './pages/Unlock'
import Connecting from './pages/Connecting'
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
import SettingsLayout from './pages/settings/SettingsLayout'
import MainSettings from './pages/settings/MainSettings'
import PasswordSettings from './pages/settings/PasswordSettings'
import AutolockSettings from './pages/settings/AutolockSettings'
import DonationSettings from './pages/settings/DonationSettings'
import SecuritySettings from './pages/settings/SecuritySettings'
import BackupSettings from './pages/settings/BackupSettings'
import RestoreSettings from './pages/settings/RestoreSettings'
import ShowSecrets from './pages/settings/ShowSecrets'
import DownloadKeys from './pages/settings/DownloadKeys'
import AccountManager from './pages/settings/AccountManager'
import AuthorizedSites from './pages/settings/AuthorizedSites'
import LocalRpcSettings from './pages/settings/LocalRpcSettings'
import BridgeTxAuthSettings from './pages/settings/BridgeTxAuthSettings'
import TermsAndRules from './pages/TermsAndRules'

const WalletIndexRedirect = () => {
  const { networks, activeNetworkId } = useWalletStore()
  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]
  const caps = resolveNetworkCapabilities(activeNetwork)
  return <Navigate to={caps.ui.showAssetsTab ? '/wallet/assets' : '/wallet/activity'} replace />
}

const SendRouteGate = () => {
  const { networks, activeNetworkId } = useWalletStore()
  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]
  const caps = resolveNetworkCapabilities(activeNetwork)
  return (caps.ui.showSendAction || caps.features.assetSend) ? <Send /> : <Navigate to="/wallet/activity" replace />
}

const AssetsRouteGate = () => {
  const { networks, activeNetworkId } = useWalletStore()
  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]
  const caps = resolveNetworkCapabilities(activeNetwork)
  return caps.ui.showAssetsTab ? <Assets /> : <Navigate to="/wallet/activity" replace />
}

const WalletModelRedirect = () => {
  const { networks, activeNetworkId } = useWalletStore()
  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]
  const modelKey = coinModelFamilyToRouteKey(resolveCoinModelFamily(activeNetwork))
  return <Navigate to={`/wallet/model/${modelKey}`} replace />
}

const LegacyAssetSendRedirect = () => {
  const location = useLocation()
  const routeState = (location.state as { assetId?: string } | null) || null
  const assetId = String(routeState?.assetId || '').trim()
  return <Navigate to="/wallet/send" replace state={assetId ? { assetId } : null} />
}

const TxRouteGate = ({ element }: { element: ReactElement }) => {
  const { isLocked, networks, activeNetworkId } = useWalletStore()
  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]
  const caps = resolveNetworkCapabilities(activeNetwork)
  if (isLocked) return <Navigate to="/unlock" replace />
  if (!caps.features.nativeSend && !caps.features.assetSend) return <Navigate to="/wallet/activity" replace />
  return element
}

function App() {
  const {
    isLocked,
    isInitialized,
    hasVault,
    checkAutolock,
    sessionMnemonic,
    lock,
    syncNetworksFromServer
  } = useWalletStore()
  const location = useLocation()

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
    void syncNetworksFromServer()
  }, [syncNetworksFromServer])

  // Force lock on every popup open when there is no in-memory session.
  // sessionMnemonic is never persisted to localStorage, so it is always null
  // after the extension popup is closed and reopened. isLocked IS persisted,
  // so without this guard the wallet could appear unlocked with no mnemonic.
  useEffect(() => {
    if (isInitialized && !isLocked && !sessionMnemonic) {
      lock()
    }
  }, []) // intentionally only on mount

  useEffect(() => {
    const interval = setInterval(checkAutolock, 60000)
    return () => clearInterval(interval)
  }, [checkAutolock])

  return (
    <div className="w-full h-full bg-dark-900 overflow-hidden">
      <div className="wallet-container">
        <Routes>
          {/* Auth Flow */}
          <Route path="/register" element={hasVault ? <Navigate to="/unlock" replace /> : <Register />} />
          <Route path="/terms" element={<TermsAndRules />} />
          <Route path="/unlock" element={<Unlock />} />
          
          {/* Main Wallet Flow */}
          <Route path="/connecting" element={<Connecting />} />
          
          <Route path="/wallet" element={isLocked ? <Navigate to="/unlock" /> : <WalletLayout />}>
            <Route index element={<WalletIndexRedirect />} />
            <Route path="assets" element={<AssetsRouteGate />} />
            <Route path="activity" element={<Activity />} />
            <Route path="model" element={<WalletModelRedirect />} />
            <Route path="model/utxo-assets" element={<UtxoAssetsModelPage />} />
            <Route path="model/utxo-classic" element={<UtxoClassicModelPage />} />
            <Route path="model/xrp" element={<XrpModelPage />} />
            <Route path="model/evm" element={<EvmModelPage />} />
            <Route path="model/cardano" element={<CardanoModelPage />} />
            <Route path="model/monero" element={<MoneroModelPage />} />
            <Route path="model/generic" element={<GenericModelPage />} />
            <Route path="send" element={<SendRouteGate />} />
            <Route path="swap" element={<Swap />} />
            <Route path="sync" element={<Sync />} />
            <Route path="disconnected" element={<Disconnected />} />
          </Route>

          {/* Full Assets Page */}
          <Route path="/assets" element={isLocked ? <Navigate to="/unlock" /> : <AssetsPage />} />
          <Route path="/assets/send" element={isLocked ? <Navigate to="/unlock" /> : <LegacyAssetSendRedirect />} />
          <Route path="/assets/preview" element={isLocked ? <Navigate to="/unlock" /> : <AssetPreviewPage />} />

          {/* Dapp Flow */}
          <Route path="/dapp/connect/1" element={<DappConnectStep1 />} />
          <Route path="/dapp/connect/2" element={<DappConnectStep2 />} />
          <Route path="/dapp/request/confirm" element={<DappRequestConfirm />} />

          {/* Transaction Flow */}
          <Route path="/tx/confirm" element={<TxRouteGate element={<TxConfirm />} />} />
          <Route path="/tx/reject" element={<TxRouteGate element={<TxReject />} />} />

          {/* Settings Flow */}
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<MainSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="backup" element={<BackupSettings />} />
            <Route path="restore" element={<RestoreSettings />} />
            <Route path="show-secrets" element={<ShowSecrets />} />
            <Route path="download-keys" element={<DownloadKeys />} />
            <Route path="accounts" element={<AccountManager />} />
            <Route path="password" element={<PasswordSettings />} />
            <Route path="autolock" element={<AutolockSettings />} />
            <Route path="donation" element={<DonationSettings />} />
            <Route path="authorized-sites" element={<AuthorizedSites />} />
            <Route path="local-rpc" element={<LocalRpcSettings />} />
            <Route path="bridge-auth" element={<BridgeTxAuthSettings />} />
            <Route path="rpc" element={<Navigate to="/settings" replace />} />
          </Route>

          {/* Default Route */}
          <Route path="*" element={
            !hasVault || !isInitialized ? <Navigate to="/register" /> : 
            isLocked ? <Navigate to="/unlock" /> : 
            <WalletIndexRedirect />
          } />
        </Routes>
      </div>
    </div>
  )
}

export default App
