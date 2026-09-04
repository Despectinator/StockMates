import { useState } from 'react'
import AddShoppingItemBar from './AddShoppingItemBar'

function Row({ entry, currentUserId, onClaim, onUnclaim, onPurchase, onDelete }) {
  const [qty, setQty] = useState(String(entry.requestedQuantity))
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const isClaimedByMe = entry.status === 'claimed' && entry.claimedBy?._id === currentUserId

  const run = async (action, fn) => {
    setBusy(action)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setBusy('')
    }
  }

  const handlePurchase = () => {
    const quantity = Number(qty)
    run('purchase', () => onPurchase(entry._id, Number.isFinite(quantity) && quantity > 0 ? quantity : undefined))
  }

  const handleDelete = () => {
    if (!window.confirm(`Remove "${entry.name}" from the shopping list?`)) return
    run('delete', () => onDelete(entry._id))
  }

  return (
    <div className="list-row">
      <div>
        <div className="member-name">{entry.name}</div>
        <div className="member-email">
          {entry.requestedQuantity} {entry.unit} · {entry.category}
          {entry.status === 'claimed' && entry.claimedBy && ` · claimed by ${entry.claimedBy.name}`}
        </div>
        {error && <div className="alert alert-danger" style={{ marginTop: 6 }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="role-pill">{entry.source === 'auto' ? 'Auto' : 'Manual'}</span>
        <span className={`badge ${entry.status === 'claimed' ? 'badge-instock' : 'badge-low'}`}>
          {entry.status === 'claimed' ? 'Claimed' : 'Pending'}
        </span>

        {entry.status === 'pending' && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => run('claim', () => onClaim(entry._id))}
            disabled={busy !== ''}
          >
            {busy === 'claim' ? 'Claiming…' : 'Claim'}
          </button>
        )}

        {isClaimedByMe && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => run('unclaim', () => onUnclaim(entry._id))}
            disabled={busy !== ''}
          >
            {busy === 'unclaim' ? 'Releasing…' : 'Release'}
          </button>
        )}

        <input
          type="number"
          min="1"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          style={{ width: 56, padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-strong)' }}
        />
        <button type="button" className="btn btn-primary btn-sm" onClick={handlePurchase} disabled={busy !== ''}>
          {busy === 'purchase' ? 'Buying…' : 'Bought it'}
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={busy !== ''}>
          {busy === 'delete' ? '…' : 'Remove'}
        </button>
      </div>
    </div>
  )
}

export default function ShoppingListPanel({
  shoppingList,
  loading,
  error,
  onRetry,
  currentUserId,
  onAdd,
  onClaim,
  onUnclaim,
  onPurchase,
  onDelete,
}) {
  return (
    <>
      <AddShoppingItemBar onAdd={onAdd} />

      {loading ? (
        <div className="loading-state">Loading shopping list…</div>
      ) : error ? (
        <div className="panel">
          <div className="empty-state">
            <h3>Shopping list unavailable</h3>
            <p>{error}</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      ) : shoppingList.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <h3>Nothing to buy</h3>
            <p>Items you add here, or that auto-appear when inventory runs low, will show up in this list.</p>
          </div>
        </div>
      ) : (
        <div className="panel">
          {shoppingList.map((entry) => (
            <Row
              key={entry._id}
              entry={entry}
              currentUserId={currentUserId}
              onClaim={onClaim}
              onUnclaim={onUnclaim}
              onPurchase={onPurchase}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  )
}
