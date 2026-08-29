# StockMates

A collaborative MERN-based household inventory and shopping management platform with real-time collaboration, analytics, and intelligent inventory prediction.

StockMates lets roommates and families create or join a shared household, track inventory together, get low/out-of-stock visibility, and (in later modules) coordinate shopping and see consumption analytics.

Built as part of the Zynvex Solutions Internship Program, Batch 3.

## Status: Module 1 — Foundation & MVP

| Area | Status |
|---|---|
| User registration & JWT login/logout | ✅ Done |
| Profile management | ⚠️ Read-only (`GET /auth/profile`); update endpoint not yet built |
| Create or join a household | ✅ Done |
| Household member management | ✅ Done |
| Add, edit, remove inventory items | ✅ Done |
| Update quantities; low-stock thresholds | ✅ Done |
| Mark items low / out of stock | ✅ Done (computed automatically) |
| Basic inventory activity history | ✅ Done |
| React dashboard, MongoDB integration, REST API | ✅ Done |

Modules 2–4 (real-time collaboration, shopping & responsibility, analytics & intelligent inventory) are planned but not yet started — see [Roadmap](#roadmap).

## Tech Stack

- **Frontend:** React, React Router, Axios
- **Backend:** Node.js, Express, REST APIs
- **Database:** MongoDB, Mongoose
- **Auth & Security:** JWT, bcrypt, household-level role checks
- **Planned:** Socket.IO (Module 2), Chart.js/Recharts + Python/Scikit-learn (Module 4)

## Project Structure

```
StockMates/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── api/          # Axios instance
│       ├── context/       # Auth + Household context providers
│       ├── components/    # Shared UI components
│       └── pages/         # Login, Register, Household setup, Dashboard
└── server/          # Express backend
    └── src/
        ├── config/         # MongoDB connection
        ├── models/         # User, Household, Item, Activity
        ├── controllers/    # Route handlers
        ├── middleware/     # Auth + household authorization
        └── routes/         # Express routers
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
```

### 2. Configure the backend

Create `server/.env`:

```
MONGO_URI=mongodb://127.0.0.1:27017/stockmates
PORT=5000
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=30m
```

### 3. Run both apps

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

The frontend runs at `http://localhost:5173` and talks to the API at `http://localhost:5000/api` by default.

## API Overview

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile` |
| Households | `POST /api/households`, `GET /api/households/my-households`, `GET/DELETE /api/households/:id`, `POST /api/households/:id/join`, `DELETE /api/households/:id/leave`, `GET/DELETE /api/households/:id/members/:userId` |
| Inventory Items | `GET/POST /api/households/:id/items`, `GET/PATCH/DELETE /api/households/:id/items/:itemId`, `PATCH /api/households/:id/items/:itemId/quantity` |
| Activity | `GET /api/households/:id/activity` |

All routes except registration and login require a `Bearer` JWT. Household-scoped routes additionally require membership (or ownership, for owner-only actions like removing a member or deleting the household).

## Roadmap

- **Module 2 — Real-Time Collaboration:** Socket.IO live updates, real-time activity feed, online/offline presence
- **Module 3 — Shopping & Responsibility:** auto-generated shopping lists, purchase claiming, replenishment tracking
- **Module 4 — Analytics & Intelligent Inventory:** consumption trends, time-to-empty predictions, restock suggestions

## License

MIT — see [LICENSE](./LICENSE).
