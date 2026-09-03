const CONFIDENCE_LABEL = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

function urgencyBadge(prediction) {
  if (prediction.trend === 'declining' && prediction.predictedDaysUntilEmpty <= 2) {
    return { className: 'badge-out', label: 'Critical' }
  }
  if (prediction.trend === 'declining' && prediction.predictedDaysUntilEmpty <= 7) {
    return { className: 'badge-low', label: 'Restock soon' }
  }
  if (prediction.trend === 'declining') {
    return { className: 'badge-manual', label: 'Declining' }
  }
  if (prediction.trend === 'stable') {
    return { className: 'badge-instock', label: 'Stable' }
  }
  return { className: 'badge-manual', label: 'New item' }
}

function formatDaysUntilEmpty(days) {
  if (days <= 0) return 'Out any moment'
  if (days < 1) return 'Less than a day left'
  if (days < 2) return '~1 day left'
  return `~${Math.round(days)} days left`
}

// Predictions come from the analytics service keyed by itemId; join them
// with the inventory list (already loaded elsewhere in the dashboard) to
// get display fields like name and unit without duplicating that data
// over the wire.
function joinWithItems(items, predictions) {
  const predictionByItemId = new Map(predictions.map((p) => [p.itemId, p]))

  return items
    .map((item) => ({ item, prediction: predictionByItemId.get(item._id) }))
    .filter((row) => row.prediction)
    .sort((a, b) => {
      const aDeclining = a.prediction.trend === 'declining'
      const bDeclining = b.prediction.trend === 'declining'
      if (aDeclining && bDeclining) {
        return a.prediction.predictedDaysUntilEmpty - b.prediction.predictedDaysUntilEmpty
      }
      if (aDeclining !== bDeclining) return aDeclining ? -1 : 1
      return a.item.name.localeCompare(b.item.name)
    })
}

export default function AnalyticsPanel({ items, predictions, loading, error, onRefresh, refreshing }) {
  if (loading) {
    return <div className="loading-state">Crunching consumption trends…</div>
  }

  if (error) {
    return (
      <div className="panel">
        <div className="empty-state">
          <h3>Analytics service unavailable</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      </div>
    )
  }

  const rows = joinWithItems(items || [], predictions || [])

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh predictions'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <h3>Not enough data yet</h3>
            <p>Once items have a bit of quantity history, predictions will show up here.</p>
          </div>
        </div>
      ) : (
        <div className="panel">
          {rows.map(({ item, prediction }) => {
            const urgency = urgencyBadge(prediction)
            return (
              <div className="list-row" key={item._id}>
                <div>
                  <div className="member-name">{item.name}</div>
                  <div className="member-email">
                    {item.quantity} {item.unit} on hand
                    {prediction.trend === 'declining' &&
                      ` · using ~${prediction.dailyConsumptionRate}/day`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {prediction.trend === 'declining' && (
                    <span className="role-pill">
                      {formatDaysUntilEmpty(prediction.predictedDaysUntilEmpty)}
                    </span>
                  )}
                  {prediction.confidence && prediction.trend !== 'insufficient_data' && (
                    <span className="role-pill" title="How well recent usage fits a straight-line trend">
                      {CONFIDENCE_LABEL[prediction.confidence]}
                    </span>
                  )}
                  <span className={`badge ${urgency.className}`}>{urgency.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
