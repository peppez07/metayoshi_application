import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, type ReactElement } from 'react'
import { useWalletStore } from './store/walletStore'

import Register from './pages/Register'
import Unlock from './pages/Unlock'
import Connecting from './pages/Connecting'
import TermsAndRules from './pages/TermsAndRules'
import WalletLayout from './pages/wallet/WalletLayout'
import Assets from './pages/wallet/Assets'
import AssetsPage from './pages/wallet/AssetsPage'
import AssetPreviewPage from './pages/wallet/AssetPreviewPage'
import AssetSendPage from './pages/wallet/AssetSendPage'
import Activity from './pages/wallet/Activity'
import DappConnectStep1 from './pages/dapp/DappConnectStep1'
import DappConnectStep2 from './pages/dapp/DappConnectStep2'
import DappRequestConfirm from './pages/dapp/DappRequestConfirm'
import TxConfirm from './pages/tx/TxConfirm'
import SettingsLayout from './pages/settings/SettingsLayout'
import MainSettings from './pages/settings/MainSettings'
import PasswordSettings from './pages/settings/PasswordSettings'
import AutolockSettings from './pages/settings/AutolockSettings'
import SecuritySettings from './pages/settings/SecuritySettings'
import BackupSettings from './pages/settings/BackupSettings'
import RestoreSettings from './pages/settings/RestoreSettings'
import ShowSecrets from './pages/settings/ShowSecrets'
import DownloadKeys from './pages/settings/DownloadKeys'
import AccountManager from './pages/settings/AccountManager'
import AuthorizedSites from './pages/settings/AuthorizedSites'
import ServerSettings from './pages/settings/ServerSettings'

const Unlocked = ({ element }: { element: ReactElement }) => {
  const isLocked = useWalletStore((s) => s.isLocked)
  return isLocked ? <Navigate to="/unlock" replace /> : element
}

function App() {
  const { isLocked, isInitialized, hasVault, checkAutolock, sessionMnemonic, lock, updateLastActive } = useWalletStore()

  // sessionMnemonic is never persisted, so a reopened popup must unlock again.
  useEffect(() => {
    if (isInitialized && !isLocked && !sessionMnemonic) lock()
  }, [])

  useEffect(() => {
    const interval = setInterval(checkAutolock, 30_000)
    const onActivity = () => updateLastActive()
    window.addEventListener('pointerdown', onActivity)
    window.addEventListener('keydown', onActivity)
    return () => {
      clearInterval(interval)
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
    }
  }, [checkAutolock, updateLastActive])

  return (
    <div className="w-full h-full bg-dark-900 overflow-hidden">
      <div className="wallet-container">
        <Routes>
          <Route path="/register" element={hasVault ? <Navigate to="/unlock" replace /> : <Register />} />
          <Route path="/terms" element={<TermsAndRules />} />
          <Route path="/unlock" element={<Unlock />} />
          <Route path="/connecting" element={<Unlocked element={<Connecting />} />} />

          <Route path="/wallet" element={<Unlocked element={<WalletLayout />} />}>
            <Route index element={<Navigate to="/wallet/assets" replace />} />
            <Route path="assets" element={<Assets />} />
            <Route path="activity" element={<Activity />} />
          </Route>

          <Route path="/assets" element={<Unlocked element={<AssetsPage />} />} />
          <Route path="/assets/send" element={<Unlocked element={<AssetSendPage />} />} />
          <Route path="/assets/preview" element={<Unlocked element={<AssetPreviewPage />} />} />

          <Route path="/dapp/connect/1" element={<DappConnectStep1 />} />
          <Route path="/dapp/connect/2" element={<DappConnectStep2 />} />
          <Route path="/dapp/request/confirm" element={<DappRequestConfirm />} />

          <Route path="/tx/confirm" element={<Unlocked element={<TxConfirm />} />} />

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
            <Route path="authorized-sites" element={<AuthorizedSites />} />
            <Route path="servers" element={<ServerSettings />} />
          </Route>

          <Route path="*" element={
            !hasVault || !isInitialized ? <Navigate to="/register" replace />
              : isLocked ? <Navigate to="/unlock" replace />
              : <Navigate to="/wallet/assets" replace />
          } />
        </Routes>
      </div>
    </div>
  )
}

export default App
