import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHousehold } from '../context/HouseholdContext'

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const NAV_ITEMS = [
  { key: 'inventory', label: 'Dashboard', icon: '⌂' },
  { key: 'shopping', label: 'Shopping List', icon: '✓' },
  { key: 'analytics', label: 'Analytics', icon: '◒' },
  { key: 'stats', label: 'Household Stats', icon: '▦' },
  { key: 'activity', label: 'Activity', icon: '◷' },
  { key: 'members', label: 'Members', icon: '◉' },
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const { household } = useHousehold()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const dashboardPath = (tab) => `/?tab=${tab}`

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'expanded' : 'collapsed'}`}>
        <div className="sidebar-top-row">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((current) => !current)}
          >
            ☰
          </button>
        </div>

        <div className="sidebar-brand">
          <div className="brand-mark">S</div>
          {sidebarOpen && (
            <div>
              <div className="brand-name">StockMates</div>
              <div className="brand-subtitle">Household intelligence</div>
            </div>
          )}
        </div>

        {sidebarOpen && <div className="sidebar-section-label">Workspace</div>}
        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={dashboardPath(item.key)}
              className={() => {
                const params = new URLSearchParams(location.search)
                const activeTab = params.get('tab') || 'inventory'
                return `sidebar-link ${location.pathname === '/' && activeTab === item.key ? 'active' : ''}`
              }}
              title={item.label}
            >
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              {sidebarOpen && <span className="sidebar-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        {household && (
          <div className="sidebar-household">
            {sidebarOpen && <div className="sidebar-section-label">Household</div>}
            <div className="household-mini">
              <span className="household-mini-dot" />
              {sidebarOpen && <span className="household-mini-name">{household.name}</span>}
            </div>
          </div>
        )}

        <nav className="sidebar-bottom-nav" aria-label="Account navigation">
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Profile">
            <span className="sidebar-icon" aria-hidden="true">⚙</span>
            {sidebarOpen && <span className="sidebar-label">Profile</span>}
          </NavLink>
          <button type="button" className="sidebar-link sidebar-logout" onClick={handleLogout} title="Log out">
            <span className="sidebar-icon" aria-hidden="true">↪</span>
            {sidebarOpen && <span className="sidebar-label">Log out</span>}
          </button>
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="mobile-brand">StockMates</div>
            <div className="topbar-household">{household?.name || 'Household'}</div>
            <div className="topbar-user">
              <div className="user-copy">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">Household member</span>
              </div>
              <NavLink to="/profile" className="avatar" aria-label="Open profile">
                {initials(user?.name)}
              </NavLink>
            </div>
          </div>
        </header>
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
