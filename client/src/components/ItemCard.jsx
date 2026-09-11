import { useEffect, useState } from 'react'
import socket from '../api/socket'

const STATUS_LABEL = {
  'in-stock': 'In stock',
  'low-stock': 'Low stock',
  'out-of-stock': 'Out of stock',
}

const STATUS_CLASS = {
  'in-stock': 'instock',
  'low-stock': 'low',
  'out-of-stock': 'out',
}

function gaugePercent(quantity, threshold) {
  const ceiling = Math.max(threshold * 2, 1)
  return Math.min(100, Math.round((quantity / ceiling) * 100))
}

export default function ItemCard({ item, onChangeQuantity, onSave, onDelete, editingUser }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: item.name,
    category: item.category || '',
    unit: item.unit || 'pcs',
    lowStockThreshold: item.lowStockThreshold,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const statusKey = STATUS_CLASS[item.status] || 'instock'

  // Let the rest of the household know this item's edit form is open, and
  // clear that the moment it closes — whether by Save, Cancel, or just
  // navigating away while it's still open.
  useEffect(() => {
    if (!editing) return
    socket.emit('item:editing_start', { itemId: item._id })
    return () => {
      socket.emit('item:editing_stop', { itemId: item._id })
    }
  }, [editing, item._id])

  const handleQuantityStep = async (delta) => {
    const next = Math.max(0, item.quantity + delta)
    if (next === item.quantity) return
    setError('')
    try {
      await onChangeQuantity(item._id, next)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update quantity.')
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(item._id, {
        name: form.name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        lowStockThreshold: Number(form.lowStockThreshold),
      })
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${item.name}" from inventory?`)) return
    setDeleting(true)
    setError('')
    try {
      await onDelete(item._id)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove item.')
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="item-card">
        <form className="item-edit-form" onSubmit={handleSave}>
          {error && <div className="alert alert-danger">{error}</div>}
          {editingUser && (
            <div className="editing-indicator">{editingUser.userName} is also editing this item</div>
          )}
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Item name"
            required
          />
          <div className="row">
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Category"
            />
            <input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="Unit"
            />
          </div>
          <input
            type="number"
            min="0"
            value={form.lowStockThreshold}
            onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
            placeholder="Low-stock threshold"
          />
          <div className="item-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="item-card">
      <div className="item-card-top">
        <div>
          <div className="item-name">{item.name}</div>
          {item.category && <div className="item-category">{item.category}</div>}
        </div>
        <span className={`badge badge-${statusKey}`}>{STATUS_LABEL[item.status]}</span>
      </div>

      {editingUser && <div className="editing-indicator">{editingUser.userName} is editing…</div>}

      <div className="gauge">
        <div
          className={`gauge-fill ${statusKey}`}
          style={{ width: `${gaugePercent(item.quantity, item.lowStockThreshold)}%` }}
        />
      </div>

      <div className="item-qty-row">
        <div className="item-qty">
          {item.quantity}
          <span className="unit">{item.unit}</span>
        </div>
        <div className="item-threshold">low at {item.lowStockThreshold}</div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="qty-controls">
        <button type="button" className="qty-btn" onClick={() => handleQuantityStep(-1)} aria-label="Decrease quantity">
          −
        </button>
        <button type="button" className="qty-btn" onClick={() => handleQuantityStep(1)} aria-label="Increase quantity">
          +
        </button>
      </div>

      <div className="item-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </div>
  )
}
