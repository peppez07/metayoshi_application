import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PageTransition } from '../../components/PageTransition'
import { PageHeader } from '../../components/ui'

const TITLES: Record<string, string> = {
  '': 'Settings',
  accounts: 'Accounts',
  password: 'Change password',
  autolock: 'Auto-lock',
  servers: 'ElectrumX servers',
  backup: 'Back up wallet',
  restore: 'Restore wallet',
  'show-secrets': 'Recovery phrase & key',
  'download-keys': 'Export keys',
  'authorized-sites': 'Connected sites'
}

const SettingsLayout: React.FC = () => {
  const { pathname } = useLocation()
  const section = pathname.replace(/^\/settings\/?/, '').split('/')[0]
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title={TITLES[section] ?? 'Settings'} back={section ? '/settings' : '/wallet/assets'} />
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </div>
  )
}

export default SettingsLayout
