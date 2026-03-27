import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoChevronForward,
  IoCloudUploadOutline,
  IoColorPaletteOutline,
  IoGlobeOutline,
  IoKeyOutline,
  IoLockClosedOutline,
  IoMoonOutline,
  IoPeopleOutline,
  IoShieldCheckmarkOutline,
  IoSunnyOutline,
  IoTimeOutline
} from 'react-icons/io5'
import { getStoredThemeMode, setThemeMode, type ThemeMode } from '../../lib/themeMode'

const MainSettings: React.FC = () => {
  const navigate = useNavigate()
  const [themeMode, setThemeModeState] = React.useState<ThemeMode>(() => getStoredThemeMode())

  const toggleThemeMode = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(next)
    setThemeModeState(next)
  }

  const sections: Array<{
    title: string
    items: Array<{
      label: string
      description: string
      path: string
      icon: React.ReactNode
      iconClass: string
      badge?: string
      tone?: 'danger'
    }>
  }> = [
    {
      title: 'Security',
      items: [
        {
          label: 'Accounts',
          description: 'Add, rename, switch, or inspect account types',
          path: '/settings/accounts',
          icon: <IoPeopleOutline className="h-4.5 w-4.5" />,
          iconClass: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300'
        },
        {
          label: 'Multisig',
          description: 'Enable multisig, pick chains, and manage Safe accounts',
          path: '/settings/multisig',
          icon: <IoShieldCheckmarkOutline className="h-4.5 w-4.5" />,
          iconClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
          badge: 'Beta'
        },
        {
          label: 'Change password',
          description: 'Update your wallet passphrase',
          path: '/settings/password',
          icon: <IoLockClosedOutline className="h-4.5 w-4.5" />,
          iconClass: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300'
        },
        {
          label: 'Auto-lock timer',
          description: 'Set inactivity timeout',
          path: '/settings/autolock',
          icon: <IoTimeOutline className="h-4.5 w-4.5" />,
          iconClass: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300'
        },
        {
          label: 'Authorized websites',
          description: 'Manage dApp permissions',
          path: '/settings/authorized-sites',
          icon: <IoGlobeOutline className="h-4.5 w-4.5" />,
          iconClass: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300'
        }
      ]
    },
    {
      title: 'Backup',
      items: [
        {
          label: 'Backup wallet',
          description: 'Download encrypted vault or phrase',
          path: '/settings/backup',
          icon: <IoCloudUploadOutline className="h-4.5 w-4.5" />,
          iconClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
        },
        {
          label: 'Restore wallet',
          description: 'Import from backup file or phrase',
          path: '/settings/restore',
          icon: <IoCloudUploadOutline className="h-4.5 w-4.5 rotate-180" />,
          iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'
        }
      ]
    },
    {
      title: 'Network',
      items: [
        {
          label: 'Blockchain visibility',
          description: 'Show or hide networks',
          path: '/settings/blockchains',
          icon: <IoGlobeOutline className="h-4.5 w-4.5" />,
          iconClass: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300'
        }
      ]
    },
    {
      title: 'Danger Zone',
      items: [
        {
          label: 'Recovery phrase & private key',
          description: 'View or export secret keys. Keep private.',
          path: '/settings/show-secrets',
          icon: <IoKeyOutline className="h-4.5 w-4.5" />,
          iconClass: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
          tone: 'danger'
        }
      ]
    }
  ]

  return (
    <div className="space-y-4 pb-1">
      <section>
        <p className="px-1 text-[11px] font-black uppercase tracking-[0.24em] text-gray-500">Appearance</p>
        <div className="wallet-surface mt-2 overflow-hidden p-0">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-orange-100 text-orange-600 shadow-[0_10px_22px_rgba(255,132,31,0.12)] dark:bg-orange-500/15 dark:text-orange-300">
              <IoColorPaletteOutline className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-100">Theme</p>
              <p className="text-xs text-gray-500">{themeMode === 'dark' ? 'Dark mode' : 'Light mode'}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={themeMode === 'light'}
              aria-label="Toggle light and dark mode"
              onClick={toggleThemeMode}
              className={`relative inline-flex h-10 w-[76px] items-center rounded-full border px-1 transition-colors ${
                themeMode === 'dark'
                  ? 'border-white/10 bg-dark-700/70'
                  : 'border-[#ffcc9b] bg-[#ffe7d2]'
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 shadow-[0_6px_12px_rgba(15,23,42,0.14)] transition-transform ${
                  themeMode === 'dark' ? 'translate-x-0' : 'translate-x-[34px]'
                }`}
              >
                {themeMode === 'dark' ? <IoMoonOutline className="h-4 w-4" /> : <IoSunnyOutline className="h-4 w-4 text-orange-500" />}
              </span>
            </button>
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.title}>
          <p className={`px-1 text-[11px] font-black uppercase tracking-[0.24em] ${section.title === 'Danger Zone' ? 'text-red-400' : 'text-gray-500'}`}>
            {section.title}
          </p>
          <div className="wallet-surface mt-2 overflow-hidden p-0">
            {section.items.map((item, index) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index !== section.items.length - 1 ? 'border-b border-dark-600/50' : ''
                } ${item.tone === 'danger' ? 'hover:bg-red-500/5' : 'hover:bg-white/5'}`}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${item.iconClass}`}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${item.tone === 'danger' ? 'text-red-500 dark:text-red-300' : 'text-gray-100'}`}>
                      {item.label}
                    </p>
                    {item.badge ? (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <IoChevronForward className={`h-4 w-4 shrink-0 ${item.tone === 'danger' ? 'text-red-300' : 'text-gray-400'}`} />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default MainSettings
