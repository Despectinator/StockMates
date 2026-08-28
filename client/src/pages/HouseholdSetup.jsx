import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHousehold } from '../context/HouseholdContext'

export default function HouseholdSetup() {
  const { user, logout } = useAuth()
  const {
    households,
    setActiveHousehold,
    createHousehold,
    joinHousehold,
    deleteHousehold,
  } = useHousehold()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setBusy('create')
    try {
      await createHousehold(name.trim())
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the household.')
    } finally {
      setBusy('')
    }
  }

  const handleJoin = async (event) => {
    event.preventDefault()
    setError('')
    setBusy('join')
    try {
      await joinHousehold(joinId.trim())
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not join that household. Check the ID and try again.')
    } finally {
      setBusy('')
    }
  }

  const handleSelectHousehold = (household) => {
    setActiveHousehold(household)
    navigate('/')
  }

  const handleDeleteHousehold = async (household) => {
    if (!window.confirm(`Delete "${household.name}" permanently?`)) return

    setError('')
    setBusy(`delete-${household._id}`)

    try {
      await deleteHousehold(household._id)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete the household.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="auth-shell">
      <div style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div className="eyebrow">Hi, {user?.name?.split(' ')[0]}</div>
          <h1 style={{ fontSize: 24 }}>Set up your household</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 13.5 }}>
            Every StockMates account needs a household before you can track inventory.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ maxWidth: 720, margin: '0 auto 16px' }}>
            {error}
          </div>
        )}

        {households.length > 0 && (
          <div className="setup-card" style={{ maxWidth: 720, margin: '0 auto 16px' }}>
            <h2>Your households</h2>
            <p className="sub">Choose a household to continue.</p>
            <div className="household-list">
              {households.map((household) => (
                <div key={household._id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    onClick={() => handleSelectHousehold(household)}
                    disabled={busy !== ''}
                  >
                    {household.name}
                  </button>
                  {(household.owner?._id === user?.id || household.owner === user?.id) && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteHousehold(household)}
                      disabled={busy !== ''}
                    >
                      {busy === `delete-${household._id}` ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="setup-grid">
          <div className="setup-card">
            <h2>Create a household</h2>
            <p className="sub">Start a fresh household and you'll be its owner.</p>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label htmlFor="hh-name">Household name</label>
                <input
                  id="hh-name"
                  type="text"
                  placeholder="e.g. Maple Street Apartment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy !== ''}>
                {busy === 'create' ? 'Creating…' : 'Create household'}
              </button>
            </form>
          </div>

          <div className="setup-card">
            <h2>Join a household</h2>
            <p className="sub">Ask a member for their household ID — it's shown on their dashboard.</p>
            <form onSubmit={handleJoin}>
              <div className="field">
                <label htmlFor="hh-id">Household ID</label>
                <input
                  id="hh-id"
                  type="text"
                  className="mono"
                  placeholder="e.g. 66f1a2b3c4d5e6f7a8b9c0d1"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-outline btn-block" disabled={busy !== ''}>
                {busy === 'join' ? 'Joining…' : 'Join household'}
              </button>
            </form>
          </div>
        </div>

        <div className="auth-switch">
          Not you?{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              logout()
              navigate('/login')
            }}
          >
            Log out
          </a>
        </div>
      </div>
    </div>
  )
}
