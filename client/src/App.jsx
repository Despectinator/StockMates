import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import socket, { connectSocket, disconnectSocket } from './api/socket'
import { useAuth } from './context/AuthContext'

import RequireAuth from './components/RequireAuth'
import RequireHousehold from './components/RequireHousehold'
import AppShell from './components/AppShell'

import Login from './pages/Login'
import Register from './pages/Register'
import HouseholdSetup from './pages/HouseholdSetup'
import Dashboard from './pages/Dashboard'

function App() {
  const { token } = useAuth()

  useEffect(() => {
    const handleConnect = () => {
      console.log('Socket connected:', socket.id)
    }

    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [])

  useEffect(() => {
    if (token) {
      connectSocket(token)
    } else {
      disconnectSocket()
    }
  }, [token])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<RequireAuth />}>
        <Route
          path="/household-setup"
          element={<HouseholdSetup />}
        />

        <Route element={<AppShell />}>
          <Route element={<RequireHousehold />}>
            <Route path="/" element={<Dashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
