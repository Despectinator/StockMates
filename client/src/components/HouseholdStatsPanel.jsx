function formatDate(iso) {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDateTime(iso) {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ConsumptionBars({ title, rows, emptyText }) {
  const max = Math.max(1, ...rows.map((row) => row.totalConsumed))

  return (
    <div className="stats-section">
      <div className="stats-section-title">{title}</div>
      <div className="panel">
        {rows.length === 0 ? (
          <div className="empty-state">
            <p>{emptyText}</p>
          </div>
        ) : (
          rows.map((row) => (
            <div className="bar-row" key={row.itemId}>
              <div className="bar-row-label" title={row.name}>
                {row.name}
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.max(2, (row.totalConsumed / max) * 100)}%` }}
                />
              </div>
              <div className="bar-row-value">
                {row.totalConsumed} {row.unit}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function UsageChart({ usageOverTime }) {
  const max = Math.max(1, ...usageOverTime.map((day) => day.quantity))

  return (
    <div className="stats-section">
      <div className="stats-section-title">Consumption, last 14 days</div>
      <div className="panel">
        <div className="usage-chart">
          {usageOverTime.map((day) => (
            <div className="usage-chart-col" key={day.date}>
              <div
                className="usage-chart-bar"
                style={{ height: `${Math.max(2, (day.quantity / max) * 100)}%` }}
                title={`${formatDate(day.date)}: ${day.quantity} units across ${day.events} event(s)`}
              />
              <div className="usage-chart-day">{formatDate(day.date)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContributionsPanel({ contributions }) {
  const max = Math.max(1, ...contributions.map((c) => c.quantityRestocked))

  return (
    <div className="stats-section">
      <div className="stats-section-title">Contribution &amp; replenishment by member</div>
      <div className="panel">
        {contributions.length === 0 ? (
          <div className="empty-state">
            <p>No restocking activity yet.</p>
          </div>
        ) : (
          contributions.map((c) => (
            <div className="list-row" key={c.userId}>
              <div>
                <div className="member-name">{c.name}</div>
                <div className="member-email">
                  {c.itemsAdded} item{c.itemsAdded === 1 ? '' : 's'} added · {c.purchases} purchase
                  {c.purchases === 1 ? '' : 's'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="bar-track" style={{ width: 100 }}>
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(2, (c.quantityRestocked / max) * 100)}%` }}
                  />
                </div>
                <span className="role-pill">{c.quantityRestocked} restocked</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ReplenishmentHistory({ history }) {
  return (
    <div className="stats-section">
      <div className="stats-section-title">Recent replenishments</div>
      <div className="panel">
        {history.length === 0 ? (
          <div className="empty-state">
            <p>Nothing restocked yet.</p>
          </div>
        ) : (
          history.map((entry, index) => (
            <div className="list-row" key={`${entry.itemId}-${entry.date}-${index}`}>
              <div>
                <div className="member-name">{entry.itemName}</div>
                <div className="member-email">
                  {entry.userName} · +{entry.quantity} {entry.unit}
                </div>
              </div>
              <span className="role-pill">{formatDateTime(entry.date)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function HouseholdStatsPanel({ stats, loading, error, onRefresh, refreshing }) {
  if (loading) {
    return <div className="loading-state">Adding up the household's stock history…</div>
  }

  if (error) {
    return (
      <div className="panel">
        <div className="empty-state">
          <h3>Couldn't load household stats</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const { totals, mostConsumed, leastConsumed, contributions, replenishmentHistory, avgReplenishmentIntervalDays, usageOverTime } = stats

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh stats'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totals.totalItems}</div>
          <div className="stat-label">Items tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totals.lowStock + totals.outOfStock}</div>
          <div className="stat-label">Low / out of stock</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totals.totalConsumptionEvents}</div>
          <div className="stat-label">Consumption events</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totals.totalReplenishments}</div>
          <div className="stat-label">Replenishments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {avgReplenishmentIntervalDays !== null ? `${avgReplenishmentIntervalDays}d` : '—'}
          </div>
          <div className="stat-label">Avg. replenishment interval</div>
        </div>
      </div>

      <UsageChart usageOverTime={usageOverTime} />

      <ConsumptionBars
        title="Most consumed items"
        rows={mostConsumed}
        emptyText="No consumption recorded yet — usage will show up here once quantities start dropping."
      />

      <ConsumptionBars
        title="Least consumed items"
        rows={leastConsumed}
        emptyText="No items yet."
      />

      <ContributionsPanel contributions={contributions} />

      <ReplenishmentHistory history={replenishmentHistory} />
    </>
  )
}
