import { Navigate, Outlet } from 'react-router-dom'
import { useHousehold } from '../context/HouseholdContext'

export default function RequireHousehold() {
  const { household, checking } = useHousehold()

  if (checking) {
    return <div className="loading-state">Loading your household…</div>
  }

  if (!household) {
    return <Navigate to="/household-setup" replace />
  }

  return <Outlet />
}
