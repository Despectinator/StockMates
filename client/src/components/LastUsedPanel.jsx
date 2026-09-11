function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function LastUsedPanel({ log, loading, error, onRetry }) {
  return (
    <div className="stats-section">
      <div className="stats-section-title">Who used the last of it</div>

      {loading ? (
        <div className="loading-state">Checking who used what…</div>
      ) : error ? (
        <div className="panel">
          <div className="empty-state">
            <p>{error}</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      ) : log.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <p>No consumption recorded yet — this fills in once quantities start dropping.</p>
          </div>
        </div>
      ) : (
        <div className="panel">
          {log.map((entry) => (
            <div className="list-row" key={entry.itemId}>
              <div>
                <div className="member-name">{entry.itemName}</div>
                <div className="member-email">
                  {entry.userName} used {entry.quantityUsed} {entry.unit}
                  {entry.ranOut ? ' — finished it off' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {entry.ranOut && <span className="badge badge-out">Ran out</span>}
                <span className="role-pill">{timeAgo(entry.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
