import { useState } from 'react'

const EMPTY = { name: '', category: '', unit: 'pcs', requestedQuantity: '1' }

export default function AddShoppingItemBar({ onAdd }) {
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return

    setSubmitting(true)
    setError('')
    try {
      await onAdd({
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        unit: form.unit.trim() || 'pcs',
        requestedQuantity: form.requestedQuantity === '' ? 1 : Number(form.requestedQuantity),
      })
      setForm(EMPTY)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add item.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="add-item-bar">
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="add-item-grid add-shopping-grid">
          <div className="field">
            <label htmlFor="add-shopping-name">Item</label>
            <input
              id="add-shopping-name"
              value={form.name}
              onChange={update('name')}
              placeholder="e.g. Milk"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="add-shopping-category">Category</label>
            <input
              id="add-shopping-category"
              value={form.category}
              onChange={update('category')}
              placeholder="Dairy"
            />
          </div>
          <div className="field">
            <label htmlFor="add-shopping-unit">Unit</label>
            <input id="add-shopping-unit" value={form.unit} onChange={update('unit')} placeholder="pcs" />
          </div>
          <div className="field">
            <label htmlFor="add-shopping-qty">Quantity</label>
            <input
              id="add-shopping-qty"
              type="number"
              min="1"
              value={form.requestedQuantity}
              onChange={update('requestedQuantity')}
              placeholder="1"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add to list'}
          </button>
        </div>
      </form>
    </div>
  )
}
