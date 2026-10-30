import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoChevronForward } from 'react-icons/io5'

const MainSettings: React.FC = () => {
  const navigate = useNavigate()

  const SECTIONS = [
    {
      title: 'ACCOUNT SETTINGS',
      items: [
        { label: 'Manage accounts', path: '/settings/accounts' },
        { label: 'Change wallet password', path: '/settings/password' },
        { label: 'Change wallet Autolock', path: '/settings/autolock' },
      ]
    },
    {
      title: 'NETWORK',
      items: [
        { label: 'ElectrumX servers', path: '/settings/servers' },
      ]
    },
    {
      title: 'BACKUP / RESTORE',
      items: [
        { label: 'Backup wallet', path: '/settings/backup' },
        { label: 'Restore wallet', path: '/settings/restore' },
      ]
    },
    {
      title: 'SHOW / DOWNLOAD KEYS',
      items: [
        { label: 'Download private and public key', path: '/settings/download-keys' },
        { label: 'Show private key', path: '/settings/show-secrets' },
      ]
    },
    {
      title: 'DAPP AUTH CONNECTOR MANAGER',
      items: [
        { label: 'Show authorized websites', path: '/settings/authorized-sites' },
      ]
    }
  ]

  return (
    <div className="flex flex-col">
      <header className="px-4 py-3 text-center border-b border-dark-600">
        <h1 className="text-sm font-black uppercase tracking-widest text-gray-200">Settings</h1>
      </header>

      <div className="flex-1">
        {SECTIONS.map((section, idx) => (
          <div key={idx} className="mb-4">
             <div className="px-4 py-2 mt-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">{section.title}</p>
             </div>
             <div className="space-y-0.5 border-t border-b border-dark-600/50">
               {section.items.map((item, iidx) => (
                 <div 
                   key={iidx}
                   className="flex items-center justify-between p-4 hover:bg-dark-700 cursor-pointer transition-colors"
                   onClick={() => navigate(item.path)}
                 >
                   <span className="text-xs font-bold text-gray-300">{item.label}</span>
                   <IoChevronForward className="text-gray-600 w-4 h-4" />
                 </div>
               ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MainSettings
