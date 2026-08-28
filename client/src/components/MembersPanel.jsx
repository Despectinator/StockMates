import { useState } from 'react'

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function MembersPanel({ household, currentUserId, onRemoveMember, onLeave }) {
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const isOwner = household.owner?._id === currentUserId || household.owner === currentUserId

  const handleRemove = async (member) => {
    if (!window.confirm(`Remove ${member.user.name} from this household?`)) return
    setBusyId(member.user._id)
    setError('')
    try {
      await onRemoveMember(member.user._id)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove member.')
    } finally {
      setBusyId('')
    }
  }

  const handleLeave = async () => {
    if (!window.confirm('Leave this household? You will need the household ID to join again.')) return
    setError('')
    try {
      await onLeave()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not leave the household.')
    }
  }

  return (
    <div>
      <div className="household-id-chip" style={{ marginBottom: 16 }}>
        Household ID: {household._id}
        <button type="button" onClick={() => navigator.clipboard?.writeText(household._id)}>
          Copy
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="panel">
        {household.members.map((member) => (
          <div className="list-row" key={member.user._id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar">{initials(member.user.name)}</div>
              <div>
                <div className="member-name">{member.user.name}</div>
                <div className="member-email">{member.user.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="role-pill">{member.role}</span>
              {isOwner && member.role !== 'owner' && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRemove(member)}
                  disabled={busyId === member.user._id}
                >
                  {busyId === member.user._id ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isOwner && (
        <button type="button" className="btn btn-danger btn-sm" style={{ marginTop: 16 }} onClick={handleLeave}>
          Leave household
        </button>
      )}
    </div>
  )
}
