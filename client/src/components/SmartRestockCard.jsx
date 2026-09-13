import { useState } from 'react'

const SmartRestockCard = ({
  itemName,
  category,
  currentQuantity,
  unit = '',
  dailyConsumption,
  daysUntilEmpty,
  recommendedQuantity,
  onAddToShoppingList,
}) => {
  const [status, setStatus] = useState('idle') // idle | submitting | added | error
  const [error, setError] = useState('')

  const getPriority = () => {
    if (daysUntilEmpty <= 1) return 'HIGH'
    if (daysUntilEmpty <= 3) return 'MEDIUM'
    return 'LOW'
  }

  const priority = getPriority()

  const priorityClass = {
    HIGH: 'restock-high',
    MEDIUM: 'restock-medium',
    LOW: 'restock-low',
  }[priority]

  const getMessage = () => {
    if (daysUntilEmpty <= 1) {
      return `${itemName} is expected to run out very soon.`
    }

    if (daysUntilEmpty <= 3) {
      return `${itemName} may run out within the next few days.`
    }

    return `${itemName} has enough stock for now.`
  }

  const handleAdd = async () => {
    setStatus('submitting')
    setError('')
    try {
      await onAddToShoppingList({
        name: itemName,
        category,
        unit,
        requestedQuantity: recommendedQuantity,
      })
      setStatus('added')
    } catch (err) {
      // A 409 here just means it's already on the list — not really an
      // error from the person's point of view, so treat it the same as
      // a successful add rather than showing a scary red alert.
      if (err.response?.status === 409) {
        setStatus('added')
        return
      }
      setStatus('error')
      setError(err.response?.data?.message || 'Could not add this to the shopping list.')
    }
  }

  return (
    <div className="smart-restock-card">
      <div className="smart-restock-header">
        <div>
          <h3>🧠 Smart Restock Recommendation</h3>
          <h2>{itemName}</h2>
        </div>

        <span className={`restock-priority ${priorityClass}`}>
          {priority}
        </span>
      </div>

      <p className="restock-message">{getMessage()}</p>

      <div className="restock-stats">
        <div className="restock-stat">
          <span>Current Stock</span>
          <strong>
            {currentQuantity} {unit}
          </strong>
        </div>

        <div className="restock-stat">
          <span>Daily Usage</span>
          <strong>
            {dailyConsumption} {unit}/day
          </strong>
        </div>

        <div className="restock-stat">
          <span>Runs Out In</span>
          <strong>
            {daysUntilEmpty.toFixed(1)} days
          </strong>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginTop: 12 }}>{error}</div>}

      <div className="restock-recommendation">
        <div>
          <span>Recommended Purchase</span>
          <strong>
            {recommendedQuantity} {unit}
          </strong>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={status === 'submitting' || status === 'added'}
        >
          {status === 'submitting' && 'Adding…'}
          {status === 'added' && '✓ On shopping list'}
          {(status === 'idle' || status === 'error') && 'Add to Shopping List'}
        </button>
      </div>
    </div>
  )
}

export default SmartRestockCard
