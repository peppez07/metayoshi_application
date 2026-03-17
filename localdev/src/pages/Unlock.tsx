import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { IoArrowForward, IoShieldCheckmarkOutline } from 'react-icons/io5'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { WALLET_VERSION_NAME } from '../lib/legalMetadata'
import { useWalletStore } from '../store/walletStore'

const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? WALLET_VERSION_NAME

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

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault()
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
    } catch (caughtError: any) {
      setIsLoading(false)
      setError(String(caughtError?.message ?? 'Unlock failed'))
    }
  }

  if (isTransitioning) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-8 text-center">
        <div className="ambient-glow top-10 h-40 w-40 bg-primary/14" />
        <div className="wallet-surface flex w-full max-w-[290px] flex-col items-center gap-6 px-6 py-8">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full border border-primary/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_18px_rgba(245,132,31,0.22)]">
              <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="h-10 w-10 object-contain" />
            </div>
          </div>

          <div>
            <p className="wallet-eyebrow">MetaYoshi</p>
            <p className="mt-2 text-base font-bold text-gray-100">Unlock successful, preparing wallet...</p>
          </div>

          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="h-1.5 w-1.5 rounded-full bg-primary/80"
                animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.12 }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden px-5 pb-6 pt-6">
      <div className="ambient-glow -left-12 top-16 h-40 w-40 bg-primary/16" />
      <div className="ambient-glow -right-16 bottom-16 h-44 w-44 bg-yellow-500/10" />

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.04] shadow-[0_14px_32px_rgba(0,0,0,0.24)]">
            <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="wallet-eyebrow">MetaYoshi</p>
            <p className="text-sm text-gray-400">Multi-chain wallet</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-6">
        <div>
          <p className="wallet-eyebrow">Secure Access</p>
          <h1 className="mt-3 text-[34px] font-black uppercase leading-[0.95] tracking-tight text-gray-100">
            Unlock your wallet session.
          </h1>
          <p className="mt-3 max-w-[260px] text-[12px] leading-relaxed text-gray-400">
            Your password unlocks this device only. Recovery phrase control stays with you.
          </p>
        </div>

        <div className="wallet-surface px-5 py-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-primary/20 bg-primary/10">
              <IoShieldCheckmarkOutline className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-100">Welcome back</p>
              <p className="text-[11px] text-gray-500">Enter your local unlock password</p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={error}
              className="h-12 bg-black/20 border-white/10 text-center"
            />

            <div className="wallet-soft-surface flex items-center gap-2 px-3 py-2.5">
              <IoShieldCheckmarkOutline className="h-4 w-4 text-primary" />
              <span className="text-[11px] text-gray-400">Password never leaves this device.</span>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Unlock Wallet
              {!isLoading && <IoArrowForward className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3">
        <button
          type="button"
          className="text-primary font-black text-[11px] uppercase tracking-[0.18em] hover:text-orange-300"
          onClick={() => navigate('/settings/restore')}
        >
          Forgot password?
        </button>
        <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-[0.18em]">
          <span className="text-red-500">beta</span>
          <span className="wallet-chip">v{APP_VERSION}</span>
        </div>
      </div>
    </div>
  )
}

export default Unlock
