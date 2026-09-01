import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import socket from '../api/socket'
import { useAuth } from '../context/AuthContext'
import { useHousehold } from '../context/HouseholdContext'
import ItemCard from '../components/ItemCard'
import AddItemBar from '../components/AddItemBar'
import MembersPanel from '../components/MembersPanel'
import ActivityPanel from '../components/ActivityPanel'

const TABS = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'activity', label: 'Activity' },
  { key: 'members', label: 'Members' },
]

const upsertItem = (list, item) => {
  if (!list) return [item]

  const existingIndex = list.findIndex((it) => it._id === item._id)

  if (existingIndex === -1) {
    return [item, ...list]
  }

  const next = [...list]
  next[existingIndex] = item
  return next
}

export default function Dashboard() {
  const { user } = useAuth()
  const { household, refreshHousehold, leaveHousehold, clearHousehold } = useHousehold()
  const navigate = useNavigate()

  const [tab, setTab] = useState('inventory')

  // null = not fetched yet, so loading state is derived rather than
  // tracked as a separate boolean set synchronously inside an effect.
  const [items, setItems] = useState(null)
  const [activity, setActivity] = useState(null)
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set())
  const itemsLoading = items === null
  const activityLoading = activity === null

  const householdId = household?._id

  const loadItems = useCallback(async () => {
    const { data } = await api.get(`/households/${householdId}/items`)
    setItems(data.items)
  }, [householdId])

  const loadActivity = useCallback(async () => {
    const { data } = await api.get(`/households/${householdId}/activity?limit=50`)
    setActivity(data.activity)
  }, [householdId])

  useEffect(() => {
    // See the note in HouseholdContext.jsx — loadItems only sets state
    // after its await resolves, this is a standard fetch-on-mount effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (householdId) loadItems()
  }, [householdId, loadItems])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (householdId && tab === 'activity') loadActivity()
  }, [householdId, tab, loadActivity])

  useEffect(() => {
    if (!householdId) return

    const joinHousehold = () => {
      socket.emit('household:join', { householdId })
    }

    const handleItemAdded = ({ item }) => {
      setItems((prev) => upsertItem(prev, item))
    }

    const handleItemUpdated = ({ item }) => {
      setItems((prev) => upsertItem(prev, item))
    }

    const handleQuantityUpdated = ({ item }) => {
      setItems((prev) => upsertItem(prev, item))
    }

    const handleItemRemoved = ({ itemId }) => {
      setItems((prev) => (prev || []).filter((item) => item._id !== itemId))
    }

    const handleActivityNew = ({ activity: entry }) => {
      setActivity((prev) => {
        if (prev === null || prev.some((activity) => activity._id === entry._id)) return prev
        return [entry, ...prev]
      })
    }

    const handlePresenceList = ({ onlineUserIds: ids }) => {
      setOnlineUserIds(new Set(ids))
    }

    const handlePresenceOnline = ({ userId }) => {
      setOnlineUserIds((previous) => new Set(previous).add(userId))
    }

    const handlePresenceOffline = ({ userId }) => {
      setOnlineUserIds((previous) => {
        const next = new Set(previous)
        next.delete(userId)
        return next
      })
    }

    if (socket.connected) joinHousehold()

    socket.on('connect', joinHousehold)
    socket.on('inventory:item_added', handleItemAdded)
    socket.on('inventory:item_updated', handleItemUpdated)
    socket.on('inventory:quantity_updated', handleQuantityUpdated)
    socket.on('inventory:item_removed', handleItemRemoved)
    socket.on('activity:new', handleActivityNew)
    socket.on('presence:list', handlePresenceList)
    socket.on('presence:online', handlePresenceOnline)
    socket.on('presence:offline', handlePresenceOffline)

    return () => {
      socket.emit('household:leave', { householdId })
      socket.off('connect', joinHousehold)
      socket.off('inventory:item_added', handleItemAdded)
      socket.off('inventory:item_updated', handleItemUpdated)
      socket.off('inventory:quantity_updated', handleQuantityUpdated)
      socket.off('inventory:item_removed', handleItemRemoved)
      socket.off('activity:new', handleActivityNew)
      socket.off('presence:list', handlePresenceList)
      socket.off('presence:online', handlePresenceOnline)
      socket.off('presence:offline', handlePresenceOffline)
    }
  }, [householdId])

  const handleAddItem = async (payload) => {
    const { data } = await api.post(`/households/${household._id}/items`, payload)
    setItems((prev) => upsertItem(prev, data.item))
  }

  const handleChangeQuantity = async (itemId, quantity) => {
    const { data } = await api.patch(`/households/${household._id}/items/${itemId}/quantity`, { quantity })
    setItems((prev) => (prev || []).map((it) => (it._id === itemId ? data.item : it)))
  }

  const handleSaveItem = async (itemId, payload) => {
    const { data } = await api.patch(`/households/${household._id}/items/${itemId}`, payload)
    setItems((prev) => (prev || []).map((it) => (it._id === itemId ? data.item : it)))
  }

  const handleDeleteItem = async (itemId) => {
    await api.delete(`/households/${household._id}/items/${itemId}`)
    setItems((prev) => (prev || []).filter((it) => it._id !== itemId))
  }

  const handleRemoveMember = async (memberId) => {
    await api.delete(`/households/${household._id}/members/${memberId}`)
    await refreshHousehold()
  }

  const handleLeave = async () => {
    await leaveHousehold()
    navigate('/household-setup')
  }

  if (!household) return null

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Household</div>
          <h1>{household.name}</h1>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={clearHousehold}>
          Switch household
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <AddItemBar onAdd={handleAddItem} />
          {itemsLoading ? (
            <div className="loading-state">Loading inventory…</div>
          ) : items.length === 0 ? (
            <div className="panel">
              <div className="empty-state">
                <h3>The shelf is empty</h3>
                <p>Add your first item above to start tracking your household's stock.</p>
              </div>
            </div>
          ) : (
            <div className="item-grid">
              {items.map((item) => (
                <ItemCard
                  key={item._id}
                  item={item}
                  onChangeQuantity={handleChangeQuantity}
                  onSave={handleSaveItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'activity' && <ActivityPanel activity={activity} loading={activityLoading} />}

      {tab === 'members' && (
        <MembersPanel
          household={household}
          currentUserId={user?.id}
          onlineUserIds={onlineUserIds}
          onRemoveMember={handleRemoveMember}
          onLeave={handleLeave}
        />
      )}
    </div>
  )
}
