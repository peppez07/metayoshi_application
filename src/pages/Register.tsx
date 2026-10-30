import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useWalletStore } from '../store/walletStore'
import { PageTransition } from '../components/PageTransition'
import { Notice } from '../components/ui'
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

  const words = normalizedMnemonic ? normalizedMnemonic.split(' ') : []
  const checks: Array<[boolean, (v: boolean) => void, React.ReactNode]> = [
    [ack, setAck, 'I saved my recovery phrase somewhere safe and offline'],
    [betaAck, setBetaAck, 'I understand MetaYoshi is in beta and may contain bugs'],
    [termsAck, setTermsAck, <>I accept the MetaYoshi <button type="button" onClick={openTermsInInternalTab} className="text-primary-300 hover:underline">Terms of Service</button></>]
  ]

  return (
    <PageTransition>
      <div className="flex flex-col h-full overflow-y-auto hide-scrollbar px-5 pb-6">
        <div className="flex flex-col items-center pt-8 pb-5 gap-3 text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/80 bg-gradient-to-b from-primary/35 to-primary/10 shadow-glow">
            <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="w-full h-full object-contain scale-[1.15] translate-y-[2px]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">MetaYoshi</h1>
            <p className="text-xs text-gray-400 mt-0.5">Non-custodial Raptoreum wallet · your keys, your coins</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 rounded-2xl bg-dark-750 border border-white/[0.05] mb-4" role="group" aria-label="Wallet setup mode">
          {(['create', 'import'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={mode === value ? 'tab-item tab-active' : 'tab-item tab-inactive'}
            >
              {value === 'create' ? 'Create' : 'Import'}
            </button>
          ))}
        </div>

        {mode === 'create' && createStep === 'verify' ? (
          <div className="space-y-4">
            <div className="card px-4 py-4 space-y-1">
              <p className="text-sm font-semibold">Confirm your recovery phrase</p>
              <p className="text-xs text-gray-400 leading-relaxed">Type word #{challengeIndex !== null ? challengeIndex + 1 : '?'} from the phrase you just saved.</p>
            </div>
            <Input
              type="text"
              aria-label="Requested word"
              placeholder={challengeIndex !== null ? `Word #${challengeIndex + 1}` : 'Requested word'}
              value={challengeInput}
              onChange={(e) => setChallengeInput(e.target.value)}
              className="text-center"
              autoComplete="off"
              autoFocus
            />
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-2">
              <Button variant="secondary" size="lg" className="flex-1" disabled={busy}
                onClick={() => { setError(''); setCreateStep('form'); setChallengeIndex(null); setChallengeInput('') }}>
                Back
              </Button>
              <Button size="lg" className="flex-1" onClick={handleVerifyAndCreate} isLoading={busy}>Verify & create</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="field-label">Secret recovery phrase</span>
              {mode === 'create' ? (
                <div className="card px-3 py-3">
                  <ol className="grid grid-cols-3 gap-1.5">
                    {words.map((word, i) => (
                      <li key={`${i}-${word}`} className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-2 py-1.5 font-mono text-xs">
                        <span className="text-[10px] text-gray-500 w-4 text-right">{i + 1}</span>
                        <span className="truncate">{word}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex gap-2 mt-3">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setMnemonic(generateMnemonic())}>Regenerate</Button>
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => void navigator.clipboard.writeText(normalizedMnemonic)}>Copy</Button>
                  </div>
                  <p className="text-[11px] text-warning mt-3 leading-relaxed">Write these words down in order. Anyone with them controls your funds; MetaYoshi cannot recover them.</p>
                </div>
              ) : (
                <textarea
                  aria-label="Secret recovery phrase"
                  className="input-field min-h-[104px] resize-none font-mono text-xs leading-relaxed"
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Enter your 12 or 24 words separated by spaces"
                  spellCheck={false}
                  autoComplete="off"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input type="password" aria-label="Password" placeholder="Password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Input type="password" aria-label="Confirm password" placeholder="Confirm Password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <p className="text-[11px] text-gray-500 -mt-2 ml-1">At least 8 characters. Encrypts the phrase on this device.</p>

            <div className="card p-1.5">
              {checks.map(([checked, set, label], i) => (
                <label key={i} className="list-row cursor-pointer items-start">
                  <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary shrink-0" />
                  <span className="text-xs text-gray-300 leading-relaxed">{label}</span>
                </label>
              ))}
            </div>

            <details className="card-flat px-4 py-3 group">
              <summary className="text-xs text-gray-400 cursor-pointer select-none list-none flex justify-between">
                Terms summary <span className="text-gray-600 group-open:rotate-90 transition-transform">›</span>
              </summary>
              <ul className="mt-2 text-[11px] text-gray-400 leading-relaxed list-disc pl-4 space-y-1">
                <li>MetaYoshi is non-custodial. Only you control your keys and recovery phrase.</li>
                <li>Lost or exposed recovery data can permanently result in loss of funds.</li>
                <li>Transactions you sign are your responsibility and cannot be reversed.</li>
                <li>MetaYoshi is provided as-is and gives no legal, tax or investment advice.</li>
                <li>You are responsible for compliance in your jurisdiction.</li>
              </ul>
            </details>

            {error && <Notice tone="error">{error}</Notice>}

            <Button size="lg" className="w-full" onClick={handleSubmit} isLoading={busy}>
              {mode === 'create' ? 'Create wallet' : 'Import wallet'}
            </Button>
          </div>
        )}
      </div>
    </PageTransition>
  )
}

export default Register