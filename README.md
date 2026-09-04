# StockMates

A collaborative MERN-based household inventory and shopping management platform with real-time collaboration, analytics, and intelligent inventory prediction.

StockMates lets roommates and families create or join a shared household, track inventory together, get low/out-of-stock visibility, and (in later modules) coordinate shopping and see consumption analytics.

Built as part of the Zynvex Solutions Internship Program, Batch 3.

## Status

| Module | Area | Status |
|---|---|---|
| 1 — Foundation & MVP | User registration & JWT login/logout | ✅ Done |
| 1 | Profile management | ⚠️ Read-only (`GET /auth/profile`); update endpoint not yet built |
| 1 | Create or join a household | ✅ Done |
| 1 | Household member management | ✅ Done |
| 1 | Add, edit, remove inventory items | ✅ Done |
| 1 | Update quantities; low-stock thresholds | ✅ Done |
| 1 | Mark items low / out of stock | ✅ Done (computed automatically) |
| 1 | Basic inventory activity history | ✅ Done |
| 1 | React dashboard, MongoDB integration, REST API | ✅ Done |
| 2 — Real-Time Collaboration | Socket.IO live inventory updates | ✅ Done |
| 2 | Live activity feed | ✅ Done |
| 2 | Online/offline member presence | ✅ Done |
| 3 — Shopping & Responsibility | Auto-generated shopping list (items go low/out-of-stock) | ✅ Done |
| 3 | Manual shopping list entries | ✅ Done |
| 3 | Claim / release shopping list items | ✅ Done |
| 3 | Purchase flow (restocks inventory) | ✅ Done |
| 4 — Analytics & Intelligent Inventory | Consumption trend & time-to-empty predictions (FastAPI service) | ✅ Done |
| 4 | Analytics dashboard panel | ✅ Done |

Everything above is wired end-to-end: backend routes, sockets, and the corresponding React UI. The only known gap from the original module plan is the profile-update endpoint noted above.

## Tech Stack

- **Frontend:** React, React Router, Axios, Socket.IO client
- **Backend:** Node.js, Express, REST APIs, Socket.IO
- **Database:** MongoDB, Mongoose
- **Analytics:** Python, FastAPI (standalone `analytics-service`, called internally by the Node API)
- **Auth & Security:** JWT, bcrypt, household-level role checks

## Project Structure

```
StockMates/
├── client/               # React frontend (Vite)
│   └── src/
│       ├── api/              # Axios instance + Socket.IO client
│       ├── context/          # Auth + Household context providers
│       ├── components/       # Shared UI components (items, shopping list, analytics, members...)
│       └── pages/            # Login, Register, Household setup, Dashboard
├── server/               # Express backend
│   └── src/
│       ├── config/           # MongoDB connection
│       ├── models/           # User, Household, Item, Activity, ShoppingListItem
│       ├── controllers/      # Route handlers
│       ├── middleware/       # Auth + household authorization
│       ├── socket/           # Socket.IO auth + household presence/rooms
│       ├── utils/            # Activity logging, shopping-list auto-sync
│       └── routes/           # Express routers
└── analytics-service/    # Standalone FastAPI service (consumption/prediction)
```

## Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Clone and install

```bash
git clone https://github.com/Despectinator/StockMates.git
cd StockMates

cd server && npm install
cd ../client && npm install
cd ../analytics-service && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
```

### 2. Configure the backend

Create `server/.env`:

```
MONGO_URI=mongodb://127.0.0.1:27017/stockmates
PORT=5000
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=30m
ANALYTICS_SERVICE_URL=http://127.0.0.1:8001
```

Create `analytics-service/.env` from `analytics-service/.env.example` (defaults are fine for local dev).

### 3. Run all three apps

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev

# terminal 3
cd analytics-service && source venv/bin/activate && uvicorn app:app --reload --port 8001
```

The frontend runs at `http://localhost:5173` and talks to the API at `http://localhost:5000/api` by default. The Analytics tab in the dashboard needs the analytics-service running to return predictions.

## API Overview

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile` |
| Households | `POST /api/households`, `GET /api/households/my-households`, `GET/DELETE /api/households/:id`, `POST /api/households/:id/join`, `DELETE /api/households/:id/leave`, `GET/DELETE /api/households/:id/members/:userId` |
| Inventory Items | `GET/POST /api/households/:id/items`, `GET/PATCH/DELETE /api/households/:id/items/:itemId`, `PATCH /api/households/:id/items/:itemId/quantity` |
| Shopping List | `GET/POST /api/households/:id/shopping-list`, `DELETE /api/households/:id/shopping-list/:itemId`, `PATCH /api/households/:id/shopping-list/:itemId/claim`, `PATCH /api/households/:id/shopping-list/:itemId/unclaim`, `POST /api/households/:id/shopping-list/:itemId/purchase` |
| Analytics | `GET /api/households/:id/analytics/predictions` |
| Activity | `GET /api/households/:id/activity` |

All routes except registration and login require a `Bearer` JWT. Household-scoped routes additionally require membership (or ownership, for owner-only actions like removing a member or deleting the household).

Real-time events (Socket.IO, namespaced by `household:<id>` rooms): `inventory:item_added`, `inventory:item_updated`, `inventory:quantity_updated`, `inventory:item_removed`, `activity:new`, `shopping:item_added`, `shopping:item_claimed`, `shopping:item_unclaimed`, `shopping:item_removed`, `presence:list`, `presence:online`, `presence:offline`.

## Known Gaps

- **Profile editing:** `GET /auth/profile` is read-only; there's no update endpoint yet.
- **Root `package.json`:** currently a stray copy of `client/package.json` rather than a real workspace root — safe to remove or replace with an orchestration script.

## License

MIT — see [LICENSE](./LICENSE).
