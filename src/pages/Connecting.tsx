import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IoWarningOutline } from 'react-icons/io5'
import rtmLogo from '../assets/raptoreum.png'
import { useWalletStore } from '../store/walletStore'

const Connecting: React.FC = () => {
  const navigate = useNavigate()
  const { connect, activeServer } = useWalletStore()
  const [warning, setWarning] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await connect()
      if (cancelled) return
      const { connection, connectionError } = useWalletStore.getState()
      if (connection !== 'connected') {
        setWarning(connectionError.includes('synchronizing')
          ? connectionError
          : `Could not reach an ElectrumX server.\n${connectionError}\nYou can retry or change servers in Settings.`)
        await new Promise((resolve) => setTimeout(resolve, 3500))
        if (cancelled) return
      }
      navigate('/wallet/assets', { replace: true })
    }
    void run()
    return () => { cancelled = true }
  }, [connect, navigate])

  return (
    <div className="flex flex-col items-center justify-center h-full bg-dark-800 p-8">
      <div className="relative flex items-center justify-center w-full max-w-[280px] h-40">
        <motion.div
          className="absolute w-24 h-24 rounded-full border border-primary/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
        <div className="z-10 w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/35 flex items-center justify-center overflow-hidden animate-breathe">
          <img src={rtmLogo} alt="Raptoreum" className="w-11 h-11 object-contain" />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[120px] h-[2px] bg-dark-600">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0, x: -60 }}
            animate={{ width: ['0%', '100%', '0%'], x: ['-50%', '0%', '50%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="z-10 w-20 h-20 rounded-full bg-gradient-to-b from-primary/35 to-primary/10 border-2 border-primary flex items-center justify-center overflow-hidden shadow-lg shadow-primary/25 ml-auto">
          <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="w-full h-full object-contain object-center scale-[1.12] translate-y-[2px]" />
        </div>
      </div>

      <p className="mt-8 text-[11px] font-black uppercase tracking-[0.28em] text-primary">METAYOSHI</p>
      <p className="mt-1.5 text-sm font-medium text-gray-400 text-center">Connecting to ElectrumX…</p>
      <p className="mt-1 text-[10px] font-mono text-gray-600 break-all text-center">{activeServer}</p>

      <AnimatePresence>
        {warning && (
          <motion.div
            className="mt-6 w-full flex gap-3 items-start bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <IoWarningOutline className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-300 whitespace-pre-line leading-relaxed break-all">{warning}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Connecting
