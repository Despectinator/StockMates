import React from 'react'

const SmartRestockCard = ({
  itemName,
  currentQuantity,
  unit = '',
  dailyConsumption,
  daysUntilEmpty,
  recommendedQuantity,
}) => {
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

      <div className="restock-recommendation">
        <div>
          <span>Recommended Purchase</span>
          <strong>
            {recommendedQuantity} {unit}
          </strong>
        </div>

        <button
          type="button"
          onClick={() => {
            console.log(`Add ${recommendedQuantity} ${unit} of ${itemName} to shopping list`)
          }}
        >
          Add to Shopping List
        </button>
      </div>
    </div>
  )
}

export default SmartRestockCard
