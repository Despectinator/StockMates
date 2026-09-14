# StockMates Server

The backend is a Node.js + Express API that handles auth, household membership, inventory items, shopping lists, activity logging, analytics requests, and real-time socket coordination.

## Local setup

```powershell
cd "D:\StockMates\server"
npm install
```

Create a `.env` file in the server folder:

```env
MONGO_URI=mongodb://127.0.0.1:27017/stockmates
PORT=5000
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=30m
ANALYTICS_SERVICE_URL=http://127.0.0.1:8001
CLIENT_ORIGIN=http://localhost:5173
```

Start the server:

```powershell
cd "D:\StockMates\server"
node src/server.js
```

Or start everything together from the root:

```powershell
cd "D:\StockMates"
powershell -ExecutionPolicy Bypass -File .\start-stockmates.ps1
```

## Health checks

- API root: http://localhost:5000
- Health response example: `{"message":"StockMates API is running"}`
- Analytics service: http://127.0.0.1:8001/health

## Notes

- The server requires MongoDB to be running locally.
- The app expects the analytics service to be started before using predictions or smart restock cards.
- If port 5000 is already occupied, stop the stale process and restart the project-root script.
