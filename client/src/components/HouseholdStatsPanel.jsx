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

function buildLinePath(values, width, height, padding = 18) {
  if (!values.length) return ''

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1)
      const y = height - padding - ((value - min) / range) * (height - padding * 2)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

function SparkMetricCard({ label, value, change, tone = 'primary' }) {
  const series = Array.from({ length: 9 }, (_, index) => {
    const base = 28 + ((index * 11) % 25)
    return Math.max(8, base + (index % 3) * 6 - (index > 5 ? 10 : 0))
  })

  return (
    <div className={`spark-card spark-${tone}`}>
      <div className="spark-header">
        <span>{label}</span>
        <span className="spark-toggle">◌</span>
      </div>
      <div className="spark-body">
        <div className="spark-number">{value}</div>
        <div className="spark-change">{change}</div>
      </div>
      <svg viewBox="0 0 110 30" className="spark-line" preserveAspectRatio="none" aria-hidden="true">
        <path d={buildLinePath(series, 110, 30, 6)} />
      </svg>
    </div>
  )
}

function UsageChart({ usageOverTime }) {
  const chartValues = usageOverTime.map((day) => day.quantity || 0)
  const max = Math.max(1, ...chartValues)
  const width = 520
  const height = 220
  const padding = 26
  const linePath = buildLinePath(chartValues, width, height, padding)

  return (
    <div className="stats-section">
      <div className="visual-card visual-card-large">
        <div className="visual-header">
          <span>Household usage</span>
          <span className="spark-toggle">◌</span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="visual-chart" preserveAspectRatio="none" aria-label="Household usage chart">
          {[0, 1, 2, 3].map((step) => {
            const y = padding + (step * (height - padding * 2)) / 3
            return <line key={`grid-${step}`} x1={padding} y1={y} x2={width - padding} y2={y} className="chart-grid-line" />
          })}
          <path d={linePath} className="chart-line" />
          {chartValues.map((value, index) => {
            const x = padding + (index * (width - padding * 2)) / Math.max(chartValues.length - 1, 1)
            const min = Math.min(...chartValues)
            const range = max - min || 1
            const y = height - padding - ((value - min) / range) * (height - padding * 2)
            return <circle key={`${value}-${index}`} cx={x} cy={y} r="3" className="chart-point" />
          })}
        </svg>
        <div className="chart-labels">
          {usageOverTime.map((day) => (
            <span key={day.date}>{formatDate(day.date)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConsumptionBars({ title, rows, emptyText }) {
  const max = Math.max(1, ...rows.map((row) => row.totalConsumed || 0))

  return (
    <div className="stats-section compact-section">
      <div className="stats-section-title">{title}</div>
      <div className="panel compact-panel">
        {rows.length === 0 ? (
          <div className="empty-state">
            <p>{emptyText}</p>
          </div>
        ) : (
          <div className="mini-bars">
            {rows.map((row) => (
              <div className="mini-bar-item" key={row.itemId}>
                <div className="mini-bar-label">{row.name}</div>
                <div className="mini-bar-track">
                  <div className="mini-bar-fill" style={{ height: `${Math.max(12, (row.totalConsumed / max) * 100)}%` }} />
                </div>
                <div className="mini-bar-value">{row.totalConsumed}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ContributionDonut({ contributions }) {
  const total = contributions.reduce((sum, item) => sum + (item.quantityRestocked || 0), 0)

  const slices = contributions.reduce((acc, item, index) => {
    const value = total === 0 ? 0 : (item.quantityRestocked / total) * 100
    const start = acc.last || 0
    const end = start + value
    acc.items.push({ ...item, start, end })
    acc.last = end
    return acc
  }, { items: [], last: 0 }).items

  const gradient = slices.length
    ? `conic-gradient(${slices
        .map((slice, index) => {
          const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']
          return `${colors[index % colors.length]} ${slice.start}% ${slice.end}%`
        })
        .join(', ')})`
    : 'conic-gradient(#e5e7eb 0 100%)'

  return (
    <div className="stats-section compact-section">
      <div className="visual-card donut-card">
        <div className="visual-header">
          <span>Contribution</span>
          <span className="spark-toggle">◌</span>
        </div>
        <div className="donut-wrap">
          <div className="donut-chart" style={{ background: gradient }}>
            <div className="donut-center">
              <strong>{total || 0}</strong>
            </div>
          </div>
        </div>
        <div className="donut-legend">
          {contributions.slice(0, 3).map((item, index) => (
            <div className="legend-row" key={item.userId || `${item.name}-${index}`}>
              <span className="legend-swatch" style={{ background: ['#8b5cf6', '#a78bfa', '#c4b5fd'][index % 3] }} />
              <span>{item.name}</span>
              <strong>{item.quantityRestocked}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContributionsPanel({ contributions }) {
  const max = Math.max(1, ...contributions.map((c) => c.quantityRestocked || 0))

  return (
    <div className="stats-section compact-section">
      <div className="stats-section-title">Members</div>
      <div className="panel compact-panel">
        {contributions.length === 0 ? (
          <div className="empty-state">
            <p>No restocking activity yet.</p>
          </div>
        ) : (
          contributions.map((c) => (
            <div className="member-row" key={c.userId}>
              <div className="member-meta">
                <span className="member-dot" />
                <div>
                  <div className="member-name">{c.name}</div>
                  <div className="member-email">{c.itemsAdded} items · {c.purchases} purchases</div>
                </div>
              </div>
              <div className="member-value">{c.quantityRestocked}</div>
              <div className="member-bar-track">
                <div className="member-bar-fill" style={{ width: `${Math.max(8, (c.quantityRestocked / max) * 100)}%` }} />
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
    <div className="stats-section compact-section replenishment-section">
      <div className="stats-section-title">Recent replenishments</div>
      <div className="panel compact-panel">
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

      <div className="stats-visual-grid">
        <div className="stats-graph-column stats-graph-column-wide">
          <UsageChart usageOverTime={usageOverTime || []} />
        </div>

        <div className="stats-graph-column">
          <SparkMetricCard
            label="Items tracked"
            value={String(totals.totalItems)}
            change="+12%"
            tone="primary"
          />
          <SparkMetricCard
            label="Low stock"
            value={String(totals.lowStock + totals.outOfStock)}
            change="-8%"
            tone="secondary"
          />
          <SparkMetricCard
            label="Replenishments"
            value={String(totals.totalReplenishments)}
            change="+5%"
            tone="tertiary"
          />
        </div>

        <div className="stats-graph-column">
          <ContributionDonut contributions={contributions || []} />
        </div>
      </div>

      <div className="stats-visual-grid lower-grid">
        <div className="stats-graph-column">
          <ConsumptionBars
            title="Most consumed items"
            rows={mostConsumed || []}
            emptyText="No consumption recorded yet — usage will show up here once quantities start dropping."
          />
        </div>

        <div className="stats-graph-column">
          <ContributionsPanel contributions={contributions || []} />
        </div>

        <div className="stats-graph-column stats-graph-column-full">
          <ReplenishmentHistory history={replenishmentHistory || []} />
        </div>
      </div>

      <div className="stats-summary-row">
        <div className="summary-pill">
          <span>Consumption events</span>
          <strong>{totals.totalConsumptionEvents}</strong>
        </div>
        <div className="summary-pill">
          <span>Avg. interval</span>
          <strong>{avgReplenishmentIntervalDays !== null ? `${avgReplenishmentIntervalDays}d` : '—'}</strong>
        </div>
      </div>
    </>
  )
}
