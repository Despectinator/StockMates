import { useState } from 'react'

const EMPTY = { name: '', category: '', quantity: '', unit: 'pcs', lowStockThreshold: '2' }

const COMMON_ITEMS = [
  { name: 'Milk', category: 'Dairy', unit: 'L', lowStockThreshold: 2 },
  { name: 'Bread', category: 'Bakery', unit: 'loaf', lowStockThreshold: 2 },
  { name: 'Eggs', category: 'Dairy', unit: 'pack', lowStockThreshold: 2 },
  { name: 'Rice', category: 'Pantry', unit: 'kg', lowStockThreshold: 2 },
  { name: 'Pasta', category: 'Pantry', unit: 'pack', lowStockThreshold: 2 },
  { name: 'Tomatoes', category: 'Produce', unit: 'pcs', lowStockThreshold: 6 },
  { name: 'Apples', category: 'Produce', unit: 'pcs', lowStockThreshold: 6 },
  { name: 'Bananas', category: 'Produce', unit: 'pcs', lowStockThreshold: 6 },
  { name: 'Chicken', category: 'Meat', unit: 'pack', lowStockThreshold: 2 },
  { name: 'Salmon', category: 'Seafood', unit: 'pack', lowStockThreshold: 1 },
  { name: 'Toilet Paper', category: 'Household', unit: 'roll', lowStockThreshold: 4 },
  { name: 'Soap', category: 'Household', unit: 'bar', lowStockThreshold: 2 },
  { name: 'Coffee', category: 'Pantry', unit: 'pack', lowStockThreshold: 1 },
  { name: 'Tea', category: 'Pantry', unit: 'box', lowStockThreshold: 2 },
  { name: 'Yogurt', category: 'Dairy', unit: 'cup', lowStockThreshold: 4 },
  { name: 'Cheese', category: 'Dairy', unit: 'pack', lowStockThreshold: 2 },
]

export default function AddItemBar({ onAdd }) {
  const [form, setForm] = useState(EMPTY)
  const [quickAdd, setQuickAdd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value })
  }

  const handleQuickAdd = (event) => {
    const selectedName = event.target.value
    setQuickAdd(selectedName)

    if (!selectedName) {
      return
    }

    const item = COMMON_ITEMS.find((entry) => entry.name === selectedName)
    if (!item) {
      return
    }

    setForm({
      ...form,
      name: item.name,
      category: item.category,
      unit: item.unit,
      lowStockThreshold: String(item.lowStockThreshold),
      quantity: form.quantity,
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return

    setSubmitting(true)
    setError('')
    try {
      await onAdd({
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        quantity: form.quantity === '' ? 0 : Number(form.quantity),
        unit: form.unit.trim() || 'pcs',
        lowStockThreshold: form.lowStockThreshold === '' ? 1 : Number(form.lowStockThreshold),
      })
      setForm(EMPTY)
      setQuickAdd('')
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
        <div className="add-item-grid">
          <div className="field">
            <label htmlFor="quick-add">Quick add</label>
            <select id="quick-add" className="quick-add-select" value={quickAdd} onChange={handleQuickAdd}>
              <option value="">Choose common item…</option>
              {COMMON_ITEMS.map((item) => (
                <option key={item.name} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="add-name">Item</label>
            <input id="add-name" value={form.name} onChange={update('name')} placeholder="e.g. Milk" required />
          </div>
          <div className="field">
            <label htmlFor="add-category">Category</label>
            <input id="add-category" value={form.category} onChange={update('category')} placeholder="Dairy" />
          </div>
          <div className="field">
            <label htmlFor="add-qty">Quantity</label>
            <input id="add-qty" type="number" min="0" value={form.quantity} onChange={update('quantity')} placeholder="0" />
          </div>
          <div className="field">
            <label htmlFor="add-unit">Unit</label>
            <input id="add-unit" value={form.unit} onChange={update('unit')} placeholder="pcs" />
          </div>
          <div className="field">
            <label htmlFor="add-threshold">Low at</label>
            <input
              id="add-threshold"
              type="number"
              min="0"
              value={form.lowStockThreshold}
              onChange={update('lowStockThreshold')}
              placeholder="2"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add item'}
          </button>
        </div>
      </form>
    </div>
  )
}
