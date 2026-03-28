import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { IoArrowBack, IoGridOutline, IoPulseOutline, IoSettingsOutline } from 'react-icons/io5'
import { PageTransition } from '../../components/PageTransition'
import logo from '../../MetayoshiLogo.png'

const SettingsLayout: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-3">
        <header className="wallet-soft-surface flex items-center justify-between rounded-[26px] px-3 py-3">
          <button
            type="button"
            onClick={() => navigate('/wallet/assets')}
            className="wallet-icon-btn h-10 w-10 rounded-[16px]"
            aria-label="Back to wallet home"
          >
            <IoArrowBack className="h-4.5 w-4.5" />
          </button>

          <div className="flex items-center gap-2 text-center">
            <IoSettingsOutline className="h-4.5 w-4.5 text-gray-400" />
            <span className="text-[12px] font-black uppercase tracking-[0.22em] text-gray-300">Settings</span>
            <img src={logo} alt="MetaYoshi" className="h-6 w-6 rounded-full object-cover" />
          </div>

          <div className="h-10 w-10" aria-hidden="true" />
        </header>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-2 pt-3">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2">
        <nav className="rounded-[30px] border border-white/8 bg-[#191a22]/94 px-2 py-2 shadow-[0_24px_40px_rgba(15,23,42,0.24)] backdrop-blur-xl">
          <div className="flex items-center gap-1">
            {[
              {
                id: 'assets',
                label: 'Assets',
                icon: <IoGridOutline className="h-4.5 w-4.5" />,
                active: false,
                onClick: () => navigate('/wallet/assets')
              },
              {
                id: 'activity',
                label: 'Activity',
                icon: <IoPulseOutline className="h-4.5 w-4.5" />,
                active: false,
                onClick: () => navigate('/wallet/activity')
              },
              {
                id: 'settings',
                label: 'Settings',
                icon: <IoSettingsOutline className="h-4.5 w-4.5" />,
                active: true,
                onClick: () => navigate('/settings')
              }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[22px] px-2 py-2.5 text-[10px] font-bold tracking-[0.12em] transition-all ${
                  item.active
                    ? 'bg-gradient-to-br from-[#ff9d55] via-[#ff7f2a] to-[#ff6800] text-white shadow-[0_12px_24px_rgba(255,104,0,0.32)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
                {item.active ? <span className="h-1.5 w-1.5 rounded-full bg-white/90" /> : null}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}

export default SettingsLayout
