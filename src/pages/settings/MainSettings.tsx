import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoChevronForward, IoPeopleOutline, IoKeyOutline, IoTimerOutline, IoServerOutline, IoCloudUploadOutline,
  IoCloudDownloadOutline, IoEyeOutline, IoDownloadOutline, IoGlobeOutline, IoLockClosedOutline
} from 'react-icons/io5'
import { useWalletStore } from '../../store/walletStore'

const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? ''

interface Item {
  label: string
  path: string
  icon: React.ReactNode
  detail?: string
  danger?: boolean
}

const MainSettings: React.FC = () => {
  const navigate = useNavigate()
  const { accounts, autolockMinutes, servers, authorizedSites, connection, lock } = useWalletStore()

  const sections: Array<{ title: string; items: Item[] }> = [
    {
      title: 'Wallet',
      items: [
        { label: 'Accounts', path: '/settings/accounts', icon: <IoPeopleOutline />, detail: String(accounts.length) },
        { label: 'Change password', path: '/settings/password', icon: <IoKeyOutline /> },
        { label: 'Auto-lock', path: '/settings/autolock', icon: <IoTimerOutline />, detail: autolockMinutes > 0 ? `${autolockMinutes} min` : 'Off' }
      ]
    },
    {
      title: 'Network',
      items: [
        { label: 'ElectrumX servers', path: '/settings/servers', icon: <IoServerOutline />, detail: connection === 'connected' ? 'Connected' : `${servers.length} configured` },
        { label: 'Connected sites', path: '/settings/authorized-sites', icon: <IoGlobeOutline />, detail: String(authorizedSites.length) }
      ]
    },
    {
      title: 'Backup & security',
      items: [
        { label: 'Back up wallet', path: '/settings/backup', icon: <IoCloudUploadOutline /> },
        { label: 'Restore wallet', path: '/settings/restore', icon: <IoCloudDownloadOutline /> },
        { label: 'Show recovery phrase & key', path: '/settings/show-secrets', icon: <IoEyeOutline />, danger: true },
        { label: 'Export keys', path: '/settings/download-keys', icon: <IoDownloadOutline />, danger: true }
      ]
    }
  ]

  return (
    <div className="px-4 py-4 space-y-5">
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{section.title}</h2>
          <div className="card p-1.5">
            {section.items.map((item) => (
              <button key={item.path} type="button" className="list-row" onClick={() => navigate(item.path)}>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0 ${item.danger ? 'bg-danger/10 text-danger' : 'bg-white/[0.05] text-gray-300'}`}>
                  {item.icon}
                </span>
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {item.detail && <span className="text-xs text-gray-500">{item.detail}</span>}
                <IoChevronForward className="w-4 h-4 text-gray-600" />
              </button>
            ))}
          </div>
        </section>
      ))}

      <button type="button" onClick={() => { lock(); navigate('/unlock', { replace: true }) }} className="btn-secondary w-full h-11 text-sm">
        <IoLockClosedOutline className="w-4 h-4" /> Lock wallet
      </button>
      <p className="text-center text-[11px] text-gray-600 pb-2">MetaYoshi {APP_VERSION} · Raptoreum (RTM)</p>
    </div>
  )
}

export default MainSettings
