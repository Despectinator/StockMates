import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import api from '../api/axios'
import { useAuth } from './AuthContext'

const HouseholdContext = createContext(null)

const HOUSEHOLD_KEY = 'stockmates_household_id'

export function HouseholdProvider({ children }) {
  const { token } = useAuth()

  const [household, setHousehold] = useState(undefined)
  const [households, setHouseholds] = useState([])
  const checking = household === undefined
  const verificationRun = useRef(0)

  const verifyStoredHousehold = useCallback(async (currentToken, runId) => {
    const isCurrentRun = () => runId === verificationRun.current

    if (!currentToken) {
      if (isCurrentRun()) {
        setHouseholds([])
        setHousehold(null)
      }
      return
    }

    const storedId = localStorage.getItem(HOUSEHOLD_KEY)

    try {
      const { data } = await api.get('/households/my-households')

      if (!isCurrentRun()) return

      const availableHouseholds = data.households || []
      const selectedHousehold = availableHouseholds.find((entry) => entry._id === storedId)
        || availableHouseholds[0]

      setHouseholds(availableHouseholds)

      if (selectedHousehold) {
        localStorage.setItem(HOUSEHOLD_KEY, selectedHousehold._id)
        setHousehold(selectedHousehold)
      } else {
        localStorage.removeItem(HOUSEHOLD_KEY)
        setHousehold(null)
      }
    } catch (error) {
      // A 404 here means the user genuinely has no household.
      if (error.response?.status === 404) {
        if (isCurrentRun()) {
          localStorage.removeItem(HOUSEHOLD_KEY)
          setHouseholds([])
          setHousehold(null)
        }
        return
      }

      console.error('Household verification error:', error)
      if (isCurrentRun()) {
        setHouseholds([])
        setHousehold(null)
      }
    }
  }, [])

  useEffect(() => {
    const runId = ++verificationRun.current
    verifyStoredHousehold(token, runId)
  }, [token, verifyStoredHousehold])

  const setActiveHousehold = (householdData) => {
    localStorage.setItem(HOUSEHOLD_KEY, householdData._id)
    setHouseholds((current) => [
      ...current.filter((entry) => entry._id !== householdData._id),
      householdData,
    ])
    setHousehold(householdData)
  }

  const householdId = household?._id

  const refreshHousehold = useCallback(async () => {
    if (!householdId) return
    const { data } = await api.get(`/households/${householdId}`)
    setHousehold(data.household)
  }, [householdId])

  const activateAndPopulate = async (rawHousehold) => {
    const { data } = await api.get(`/households/${rawHousehold._id}`)
    setActiveHousehold(data.household)
    return data.household
  }

  const createHousehold = async (name) => {
    const { data } = await api.post('/households', { name })
    return activateAndPopulate(data.household)
  }

  const joinHousehold = async (targetHouseholdId) => {
    const { data } = await api.post(`/households/${targetHouseholdId}/join`)
    return activateAndPopulate(data.household)
  }

  const clearHousehold = () => {
    localStorage.removeItem(HOUSEHOLD_KEY)
    setHousehold(null)
  }

  const leaveHousehold = async () => {
    await api.delete(`/households/${household._id}/leave`)
    setHouseholds((current) => current.filter((entry) => entry._id !== household._id))
    clearHousehold()
  }

  const deleteHousehold = async (householdIdToDelete) => {
    await api.delete(`/households/${householdIdToDelete}`)

    setHouseholds((current) => current.filter((entry) => entry._id !== householdIdToDelete))

    if (household?._id === householdIdToDelete) {
      localStorage.removeItem(HOUSEHOLD_KEY)
      setHousehold(null)
    }
  }

  return (
    <HouseholdContext.Provider
      value={{
        household,
        households,
        checking,
        setActiveHousehold,
        createHousehold,
        joinHousehold,
        leaveHousehold,
        deleteHousehold,
        clearHousehold,
        refreshHousehold,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook live together on purpose
export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used inside a HouseholdProvider')
  return ctx
}
