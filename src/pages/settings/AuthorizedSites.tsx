import React from 'react'
import { IoGlobeOutline, IoTrashOutline } from 'react-icons/io5'
import { EmptyState, IconButton } from '../../components/ui'
import { useWalletStore } from '../../store/walletStore'

const AuthorizedSites: React.FC = () => {
  const { authorizedSites, removeAuthorizedSite } = useWalletStore()

  if (authorizedSites.length === 0) {
    return (
      <EmptyState icon={<IoGlobeOutline className="w-6 h-6" />} title="No connected sites">
        Sites you connect MetaYoshi to appear here. You can disconnect them at any time.
      </EmptyState>
    )
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <p className="text-xs text-gray-400 px-1">These sites can see your selected address and request transactions for your approval.</p>
      <div className="card p-1.5">
        {authorizedSites.map((site) => (
          <div key={site} className="flex items-center gap-3 px-3 py-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-gray-300 shrink-0">
              <IoGlobeOutline className="w-[18px] h-[18px]" />
            </span>
            <span className="flex-1 text-sm truncate">{site}</span>
            <IconButton label={`Disconnect ${site}`} onClick={() => removeAuthorizedSite(site)} className="hover:text-danger">
              <IoTrashOutline className="w-4 h-4" />
            </IconButton>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AuthorizedSites
