import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import socket from '../api/socket'
import { useAuth } from '../context/AuthContext'
import { useHousehold } from '../context/HouseholdContext'
import ItemCard from '../components/ItemCard'
import AddItemBar from '../components/AddItemBar'
import MembersPanel from '../components/MembersPanel'
import ActivityPanel from '../components/ActivityPanel'
import ShoppingListPanel from '../components/ShoppingListPanel'
import AnalyticsPanel from '../components/AnalyticsPanel'

const TABS = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'shopping', label: 'Shopping List' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'activity', label: 'Activity' },
  { key: 'members', label: 'Members' },
]

const removeById = (list, id) => (list || []).filter((entry) => entry._id !== id)

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
  const [shoppingList, setShoppingList] = useState(null)
  const [shoppingListError, setShoppingListError] = useState('')
  const [predictions, setPredictions] = useState(null)
  const [analyticsError, setAnalyticsError] = useState('')
  const [analyticsRefreshing, setAnalyticsRefreshing] = useState(false)
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set())
  const householdRequestVersion = useRef(0)
  const itemsLoading = items === null
  const activityLoading = activity === null
  const shoppingListLoading = shoppingList === null
  const analyticsLoading = predictions === null && !analyticsError

  const householdId = household?._id

  const loadItems = useCallback(async () => {
    const { data } = await api.get(`/households/${householdId}/items`)
    setItems(data.items)
  }, [householdId])

  const loadActivity = useCallback(async () => {
    const { data } = await api.get(`/households/${householdId}/activity?limit=50`)
    setActivity(data.activity)
  }, [householdId])

  const loadShoppingList = useCallback(async () => {
    const requestVersion = householdRequestVersion.current
    setShoppingListError('')
    try {
      const { data } = await api.get(`/households/${householdId}/shopping-list`)
      if (requestVersion !== householdRequestVersion.current) return
      setShoppingList(data.shoppingList)
    } catch (err) {
      if (requestVersion !== householdRequestVersion.current) return
      setShoppingListError(err.response?.data?.message || 'Could not load the shopping list.')
    }
  }, [householdId])

  const loadPredictions = useCallback(async () => {
    const requestVersion = householdRequestVersion.current
    setAnalyticsRefreshing(true)
    setAnalyticsError('')
    try {
      const { data } = await api.get(`/households/${householdId}/analytics/predictions`)
      if (requestVersion !== householdRequestVersion.current) return
      setPredictions(data.predictions)
    } catch (err) {
      if (requestVersion !== householdRequestVersion.current) return
      setAnalyticsError(err.response?.data?.message || 'Could not reach the analytics service.')
    } finally {
      if (requestVersion === householdRequestVersion.current) setAnalyticsRefreshing(false)
    }
  }, [householdId])

  useEffect(() => {
    householdRequestVersion.current += 1
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShoppingList(null)
    setShoppingListError('')
    setPredictions(null)
    setAnalyticsError('')
    setAnalyticsRefreshing(false)
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (householdId && tab === 'shopping') loadShoppingList()
  }, [householdId, tab, loadShoppingList])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (householdId && tab === 'analytics' && predictions === null) loadPredictions()
  }, [householdId, tab, predictions, loadPredictions])

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

    const handleShoppingItemAdded = ({ item }) => {
      setShoppingList((prev) => upsertItem(prev, item))
    }

    const handleShoppingItemClaimed = ({ item }) => {
      setShoppingList((prev) => upsertItem(prev, item))
    }

    const handleShoppingItemUnclaimed = ({ item }) => {
      setShoppingList((prev) => upsertItem(prev, item))
    }

    const handleShoppingItemRemoved = ({ itemId }) => {
      setShoppingList((prev) => removeById(prev, itemId))
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
    socket.on('shopping:item_added', handleShoppingItemAdded)
    socket.on('shopping:item_claimed', handleShoppingItemClaimed)
    socket.on('shopping:item_unclaimed', handleShoppingItemUnclaimed)
    socket.on('shopping:item_removed', handleShoppingItemRemoved)
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
      socket.off('shopping:item_added', handleShoppingItemAdded)
      socket.off('shopping:item_claimed', handleShoppingItemClaimed)
      socket.off('shopping:item_unclaimed', handleShoppingItemUnclaimed)
      socket.off('shopping:item_removed', handleShoppingItemRemoved)
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

  const handleAddShoppingItem = async (payload) => {
    const { data } = await api.post(`/households/${household._id}/shopping-list`, payload)
    setShoppingList((prev) => upsertItem(prev, data.item))
  }

  const handleClaimShoppingItem = async (itemId) => {
    const { data } = await api.patch(`/households/${household._id}/shopping-list/${itemId}/claim`)
    setShoppingList((prev) => upsertItem(prev, data.item))
  }

  const handleUnclaimShoppingItem = async (itemId) => {
    const { data } = await api.patch(`/households/${household._id}/shopping-list/${itemId}/unclaim`)
    setShoppingList((prev) => upsertItem(prev, data.item))
  }

  const handlePurchaseShoppingItem = async (itemId, quantity) => {
    await api.post(`/households/${household._id}/shopping-list/${itemId}/purchase`, quantity ? { quantity } : {})
    setShoppingList((prev) => removeById(prev, itemId))
  }

  const handleDeleteShoppingItem = async (itemId) => {
    await api.delete(`/households/${household._id}/shopping-list/${itemId}`)
    setShoppingList((prev) => removeById(prev, itemId))
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

      {tab === 'shopping' && (
        <ShoppingListPanel
          shoppingList={shoppingList || []}
          loading={shoppingListLoading}
          error={shoppingListError}
          onRetry={loadShoppingList}
          currentUserId={user?.id}
          onAdd={handleAddShoppingItem}
          onClaim={handleClaimShoppingItem}
          onUnclaim={handleUnclaimShoppingItem}
          onPurchase={handlePurchaseShoppingItem}
          onDelete={handleDeleteShoppingItem}
        />
      )}

      {tab === 'analytics' && (
        <AnalyticsPanel
          items={items || []}
          predictions={predictions || []}
          loading={analyticsLoading}
          error={analyticsError}
          onRefresh={loadPredictions}
          refreshing={analyticsRefreshing}
        />
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
