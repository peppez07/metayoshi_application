import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Notice } from '../../components/ui'
import { useWalletStore } from '../../store/walletStore'

const PasswordSettings: React.FC = () => {
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const navigate = useNavigate()
  const { changePassword } = useWalletStore()

  const [busy, setBusy] = useState(false)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPass.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPass !== confirmPass) {
      setError('Passwords do not match')
      return
    }

    setBusy(true)
    try {
      await changePassword(currentPass, newPass)
      setSuccess('Password updated successfully')
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
      setTimeout(() => navigate('/settings'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleUpdate} className="px-4 py-4 space-y-4" noValidate>
      <p className="text-xs text-gray-400 leading-relaxed px-1">
        The password encrypts your recovery phrase on this device. Changing it re-encrypts the vault; your addresses stay the same.
      </p>
      <Input type="password" label="Current password" autoComplete="current-password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} />
      <Input type="password" label="New password" autoComplete="new-password" placeholder="At least 8 characters" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
      <Input type="password" label="Confirm new password" autoComplete="new-password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
      {error && <Notice tone="error">{error}</Notice>}
      {success && <Notice tone="success">{success}</Notice>}
      <Button type="submit" size="lg" className="w-full" isLoading={busy} disabled={!currentPass || !newPass || !confirmPass}>
        Update password
      </Button>
    </form>
  )
}

export default PasswordSettings