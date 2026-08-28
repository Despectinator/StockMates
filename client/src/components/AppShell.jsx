import { Outlet, useNavigate } from 'react-router-dom'
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

export default function AppShell() {
  const { user, logout } = useAuth()
  const { household } = useHousehold()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div>
            <span className="mark">StockMates</span>
            {household && <div className="topbar-household">{household.name}</div>}
          </div>
          <div className="topbar-user">
            <span className="muted">{user?.name}</span>
            <div className="avatar">{initials(user?.name)}</div>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
