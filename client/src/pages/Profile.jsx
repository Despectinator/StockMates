import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [detailsError, setDetailsError] = useState('')
  const [detailsSuccess, setDetailsSuccess] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const handleDetailsSubmit = async (event) => {
    event.preventDefault()
    setDetailsError('')
    setDetailsSuccess('')
    setSavingDetails(true)
    try {
      const { data } = await api.patch('/auth/profile', { name, email })
      updateUser({ name: data.user.name, email: data.user.email })
      setDetailsSuccess('Profile updated.')
    } catch (err) {
      setDetailsError(err.response?.data?.message || 'Could not update your profile.')
    } finally {
      setSavingDetails(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      await api.patch('/auth/profile', { currentPassword, newPassword })
      setPasswordSuccess('Password changed.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Could not change your password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Your profile</h1>
        </div>
        <Link to="/" className="btn btn-outline btn-sm">
          Back to dashboard
        </Link>
      </div>

      <div className="panel panel-form">
        <h3>Basic info</h3>
        <div className="panel-form-sub">Your name and email are visible to your household members.</div>

        {detailsError && <div className="alert alert-danger">{detailsError}</div>}
        {detailsSuccess && <div className="alert alert-info">{detailsSuccess}</div>}

        <form onSubmit={handleDetailsSubmit}>
          <div className="field">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingDetails}>
            {savingDetails ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="panel panel-form">
        <h3>Change password</h3>
        <div className="panel-form-sub">You'll need your current password to set a new one.</div>

        {passwordError && <div className="alert alert-danger">{passwordError}</div>}
        {passwordSuccess && <div className="alert alert-info">{passwordSuccess}</div>}

        <form onSubmit={handlePasswordSubmit}>
          <div className="field">
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPassword}>
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
