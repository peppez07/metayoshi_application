import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useWalletStore } from '../store/walletStore'

const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? '0.1.0-beta'

const Unlock: React.FC = () => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const navigate = useNavigate()
  const { unlock, isInitialized } = useWalletStore()

  if (!isInitialized) {
    navigate('/register')
    return null
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const success = await unlock(password)
      setIsLoading(false)
      if (success) {
        setIsTransitioning(true)
        await new Promise((resolve) => setTimeout(resolve, 900))
        navigate('/connecting')
      } else {
        setError('Incorrect password')
      }
    } catch (e: any) {
      setIsLoading(false)
      setError(String(e?.message ?? 'Unlock failed'))
    }
  }

  if (isTransitioning) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-dark-800 p-8">
        <div className="relative flex items-center justify-center w-full max-w-[280px] h-40">
          <motion.div
            className="absolute w-24 h-24 rounded-full border border-primary/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />

          <div className="z-10 w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/35 flex items-center justify-center overflow-hidden shadow-[0_0_14px_rgba(245,132,31,0.2)] animate-breathe">
            <div className="w-8 h-8 rounded-full bg-primary/30" />
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[120px] h-[2px] bg-dark-600">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0, x: -60 }}
              animate={{
                width: ['0%', '100%', '0%'],
                x: ['-50%', '0%', '50%']
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <motion.div
            className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full shadow-[0_0_15px_rgba(245,132,31,0.8)]"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          <div className="z-10 w-20 h-20 rounded-full bg-gradient-to-b from-primary/35 to-primary/10 border-2 border-primary flex items-center justify-center overflow-hidden shadow-lg shadow-primary/25 ml-auto">
            <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="w-full h-full object-contain object-center scale-[1.12] translate-y-[2px]" />
          </div>
        </div>

        <p className="mt-8 text-[11px] font-black uppercase tracking-[0.28em] text-primary">METAYOSHI</p>
        <p className="mt-1.5 text-sm font-medium text-gray-400 text-center">Unlock successful, preparing wallet…</p>
        <div className="mt-2 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/80"
              animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full px-6 pb-6 text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-primary/80 bg-gradient-to-b from-primary/35 to-primary/10 shadow-glow">
          <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="w-full h-full object-contain scale-[1.15] translate-y-[2px]" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-gray-400">Unlock your Raptoreum wallet</p>
        </div>
        <form onSubmit={handleUnlock} className="w-full space-y-3 pt-2">
          <Input
            type="password"
            aria-label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            autoComplete="current-password"
            autoFocus
            className="text-center"
          />
          <Button type="submit" size="lg" className="w-full" isLoading={isLoading} disabled={!password}>
            Unlock
          </Button>
        </form>
        <button type="button" className="text-xs text-gray-400 hover:text-primary-300" onClick={() => navigate('/settings/restore')}>
          Forgot password? <span className="font-semibold text-primary-300">Restore wallet</span>
        </button>
      </div>
      <span className="mx-auto px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-semibold tracking-wider text-gray-500">
        v{APP_VERSION}
      </span>
    </div>
  )
}

export default Unlock