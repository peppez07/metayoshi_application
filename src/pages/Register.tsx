import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useWalletStore } from '../store/walletStore'
import { PageTransition } from '../components/PageTransition'
import { generateMnemonic, isValidMnemonic } from '../lib/rtm/address'

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { initialize, hasVault, isInitialized } = useWalletStore()

  const [mode, setMode] = useState<'create' | 'import'>('create')
  const [mnemonic, setMnemonic] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ack, setAck] = useState(false)
  const [betaAck, setBetaAck] = useState(false)
  const [termsAck, setTermsAck] = useState(false)
  const [createStep, setCreateStep] = useState<'form' | 'verify'>('form')
  const [challengeIndex, setChallengeIndex] = useState<number | null>(null)
  const [challengeInput, setChallengeInput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const normalizedMnemonic = useMemo(
    () => mnemonic.trim().toLowerCase().replace(/\s+/g, ' '),
    [mnemonic]
  )

  const openTermsInInternalTab = () => {
    navigate('/terms')
    try {
      if (typeof chrome !== 'undefined' && chrome.windows?.getCurrent) {
        chrome.windows.getCurrent({}, (win) => {
          const id = win?.id
          if (typeof id !== 'number' || !chrome.windows?.update) return
          chrome.windows.update(id, {
            width: 520,
            height: 700,
            focused: true
          })
        })
      }
    } catch {
      // no-op
    }
  }

  useEffect(() => {
    if (hasVault || isInitialized) {
      navigate('/unlock', { replace: true })
    }
  }, [hasVault, isInitialized, navigate])

  useEffect(() => {
    if (mode !== 'create') return
    setCreateStep('form')
    setChallengeIndex(null)
    setChallengeInput('')
    // Generate a new mnemonic once on first open in create mode.
    if (!mnemonic.trim()) {
      setMnemonic(generateMnemonic())
    }
  }, [mode])

  const createVault = async () => {
    setBusy(true)
    try {
      await initialize(password, normalizedMnemonic)
      navigate('/connecting')
    } catch (e: any) {
      setError(String(e?.message ?? 'Failed to create vault'))
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!isValidMnemonic(normalizedMnemonic)) {
      setError('Invalid mnemonic phrase')
      return
    }
    if (!ack) {
      setError('Please confirm you saved your recovery phrase')
      return
    }
    if (!betaAck) {
      setError('Please confirm you understand MetaYoshi is still in beta')
      return
    }
    if (!termsAck) {
      setError('Please accept MetaYoshi Terms of Service')
      return
    }

    if (mode === 'create') {
      const words = normalizedMnemonic.split(' ')
      if (!words.length) {
        setError('Invalid mnemonic phrase')
        return
      }
      setChallengeIndex(Math.floor(Math.random() * words.length))
      setChallengeInput('')
      setCreateStep('verify')
      return
    }

    await createVault()
  }

  const handleVerifyAndCreate = async () => {
    if (challengeIndex === null) {
      setError('Verification is not ready. Please go back and try again.')
      return
    }
    const words = normalizedMnemonic.split(' ')
    const expectedWord = words[challengeIndex]
    const typedWord = challengeInput.trim().toLowerCase()
    if (typedWord !== expectedWord) {
      setError('Incorrect word. Try again or go back to restart.')
      return
    }
    setError('')
    await createVault()
  }

  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-between h-full p-8 text-center bg-dark-800 overflow-y-auto hide-scrollbar">
        <div className="flex flex-col items-center mt-12 gap-6">
          <div className="w-32 h-32 rounded-full flex items-center justify-center overflow-hidden border-2 border-primary bg-gradient-to-b from-primary/35 to-primary/10 shadow-[0_0_28px_rgba(245,132,31,0.28)]">
            <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="w-full h-full object-contain object-center scale-[1.15] translate-y-[2px]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight">MetaYoshi</h1>
            <p className="text-gray-400 text-sm font-medium">Your keys, your coins</p>
          </div>
        </div>

        <div className="w-full space-y-6">
          <div className="grid grid-cols-2 gap-2 bg-dark-700/40 p-1 rounded-xl border border-dark-600">
            <button
              className={mode === 'create' ? 'py-2 rounded-lg bg-primary text-white font-bold text-xs' : 'py-2 rounded-lg text-gray-300 font-bold text-xs'}
              onClick={() => setMode('create')}
              type="button"
            >
              Create
            </button>
            <button
              className={mode === 'import' ? 'py-2 rounded-lg bg-primary text-white font-bold text-xs' : 'py-2 rounded-lg text-gray-300 font-bold text-xs'}
              onClick={() => setMode('import')}
              type="button"
            >
              Import
            </button>
          </div>

          {mode === 'create' && createStep === 'verify' ? (
            <>
              <div className="text-left bg-dark-700/30 border border-dark-600 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Seed Phrase Check</p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Prove you memorized your phrase before the vault is created.
                </p>
              </div>

              <Input
                type="text"
                placeholder={challengeIndex !== null ? `Enter word #${challengeIndex + 1}` : 'Enter requested word'}
                value={challengeInput}
                onChange={(e) => setChallengeInput(e.target.value)}
                className="bg-dark-700/50 border-dark-600 text-center h-12"
                autoComplete="off"
                autoFocus
              />

              {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setError('')
                    setCreateStep('form')
                    setChallengeIndex(null)
                    setChallengeInput('')
                  }}
                  disabled={busy}
                >
                  Restart
                </Button>
                <Button className="flex-1 btn-primary" onClick={handleVerifyAndCreate} isLoading={busy}>
                  Verify & Create
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  Secret Recovery Phrase
                </label>
                <textarea
                  className="input-field min-h-[110px] resize-none text-xs leading-relaxed py-3 font-mono"
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder={mode === 'create' ? 'Generated recovery phrase' : 'Enter 12/24 words separated by spaces'}
                  readOnly={mode === 'create'}
                />
                {mode === 'create' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setMnemonic(generateMnemonic())}
                    >
                      Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigator.clipboard.writeText(normalizedMnemonic)}
                    >
                      Copy
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-dark-700/50 border-dark-600 text-center h-12"
                />
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-dark-700/50 border-dark-600 text-center h-12"
                />
              </div>

              <label className="flex items-center gap-3 text-left cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs font-bold text-gray-300">
                  I saved my recovery phrase securely
                </span>
              </label>

              <label className="flex items-center gap-3 text-left cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={betaAck}
                  onChange={(e) => setBetaAck(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs font-bold text-gray-300">
                  I understand MetaYoshi is still in beta and may contain bugs
                </span>
              </label>

              <div className="text-left bg-dark-700/30 border border-dark-600 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Terms of Service</p>
                  <button
                    type="button"
                    onClick={openTermsInInternalTab}
                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
                  >
                    Show Terms
                  </button>
                </div>
                <ul className="text-[11px] text-gray-300 leading-relaxed list-disc pl-4 space-y-1">
                  <li>MetaYoshi is non-custodial. Only you control your keys and recovery phrase.</li>
                  <li>Lost or exposed recovery data can permanently result in loss of funds.</li>
                  <li>All transactions and signatures are your responsibility and can be irreversible.</li>
                  <li>MetaYoshi is provided as-is and does not provide legal, tax, or investment advice.</li>
                  <li>You are responsible for legal and regulatory compliance in your jurisdiction.</li>
                </ul>
              </div>

              <label className="flex items-center gap-3 text-left cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAck}
                  onChange={(e) => setTermsAck(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs font-bold text-gray-300">
                  I accept MetaYoshi Terms of Service
                </span>
              </label>

              {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}

              <Button className="w-full btn-primary" onClick={handleSubmit} isLoading={busy}>
                {mode === 'create' ? 'Create Vault' : 'Import Vault'}
              </Button>
            </>
          )}
        </div>

        <footer className="text-gray-500 text-xs font-medium mt-auto">
          Raptoreum (RTM) wallet
        </footer>
      </div>
    </PageTransition>
  )
}

export default Register
