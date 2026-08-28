function formatTime(iso) {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ActivityPanel({ activity, loading }) {
  if (loading) {
    return <div className="loading-state">Loading activity…</div>
  }

  if (!activity.length) {
    return (
      <div className="panel">
        <div className="empty-state">
          <h3>No activity yet</h3>
          <p>Item changes made by anyone in this household will show up here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      {activity.map((entry) => (
        <div className="activity-row" key={entry._id}>
          <span className="activity-dot" />
          <div>
            <div className="activity-message">{entry.message}</div>
            <div className="activity-meta">
              {entry.user?.name || 'Someone'} · {formatTime(entry.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
