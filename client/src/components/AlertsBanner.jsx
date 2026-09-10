function formatDaysLeft(days) {
  if (days <= 0) return 'out any moment'
  if (days < 1) return 'less than a day left'
  if (days < 2) return '~1 day left'
  return `~${Math.round(days)} days left`
}

export default function AlertsBanner({ items, predictions, dismissedIds, onDismiss }) {
  if (!items || !predictions || predictions.length === 0) return null

  const itemById = new Map(items.map((item) => [item._id, item]))

  const critical = predictions
    .filter(
      (p) =>
        p.trend === 'declining' &&
        p.predictedDaysUntilEmpty !== null &&
        p.predictedDaysUntilEmpty <= 2 &&
        itemById.has(p.itemId) &&
        !dismissedIds.has(`empty:${p.itemId}`)
    )
    .map((p) => ({ ...p, item: itemById.get(p.itemId) }))

  const unusual = predictions
    .filter(
      (p) =>
        p.unusualConsumption &&
        itemById.has(p.itemId) &&
        !dismissedIds.has(`unusual:${p.itemId}`)
    )
    .map((p) => ({ ...p, item: itemById.get(p.itemId) }))

  if (critical.length === 0 && unusual.length === 0) return null

  return (
    <div className="alerts-banner">
      {critical.map((p) => (
        <div className="alert-row alert-critical" key={`empty:${p.itemId}`}>
          <span className="badge badge-out">Running out</span>
          <span className="alert-text">
            <strong>{p.item.name}</strong> is {formatDaysLeft(p.predictedDaysUntilEmpty)} at the current usage
            rate.
          </span>
          <button
            type="button"
            className="alert-dismiss"
            onClick={() => onDismiss(`empty:${p.itemId}`)}
            aria-label={`Dismiss alert for ${p.item.name}`}
          >
            ×
          </button>
        </div>
      ))}

      {unusual.map((p) => (
        <div className="alert-row alert-warn" key={`unusual:${p.itemId}`}>
          <span className="badge badge-low">Unusual usage</span>
          <span className="alert-text">
            <strong>{p.item.name}</strong> dropped much faster than usual
            {p.recentDailyRate ? ` (~${p.recentDailyRate}/day vs. its normal ~${p.dailyConsumptionRate}/day)` : ''}.
          </span>
          <button
            type="button"
            className="alert-dismiss"
            onClick={() => onDismiss(`unusual:${p.itemId}`)}
            aria-label={`Dismiss alert for ${p.item.name}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
