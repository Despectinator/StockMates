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

## Deploy on Render

The API is a Node web service. Render does not host MongoDB for you, so use a MongoDB Atlas cluster (or another hosted Mongo URI) first.

### Dashboard (recommended)

1. Push this repo to GitHub (the `server/` folder plus the repo-root `render.yaml`).
2. In [Render](https://dashboard.render.com), click **New +** → **Web Service** and connect `Despectinator/StockMates`.
3. Use these settings:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free (or a paid plan if you need no sleep)
4. Add environment variables (do **not** set `PORT`; Render injects it):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Atlas connection string, e.g. `mongodb+srv://USER:PASS@cluster/stockmates` |
| `JWT_SECRET` | long random string (not the local placeholder) |
| `JWT_EXPIRES_IN` | `30m` (or longer if you prefer) |
| `CLIENT_ORIGIN` | frontend origin, e.g. `https://your-app.vercel.app` (comma-separated if you also keep `http://localhost:5173`) |
| `ANALYTICS_SERVICE_URL` | analytics URL if that service is deployed; otherwise leave unset |

5. Deploy. When it is live, open `https://<your-service>.onrender.com/health` — you should see `{"status":"ok"}`.
6. Point the client at the API: `VITE_API_URL=https://<your-service>.onrender.com/api` and `VITE_SOCKET_URL=https://<your-service>.onrender.com`.

Atlas must allow Render’s outbound IPs. The simplest student setup is **Network Access → Allow access from anywhere (`0.0.0.0/0`)**. Restrict later if you need to.

### Blueprint

You can also use **New + → Blueprint** and select this repo. `render.yaml` defines the `stockmates-api` service. Render will still prompt you for `MONGO_URI`, `CLIENT_ORIGIN`, and `ANALYTICS_SERVICE_URL` because those are not stored in git.

## Notes

- The server requires MongoDB (local for development, Atlas or similar for Render).
- The app expects the analytics service to be started before using predictions or smart restock cards.
- If port 5000 is already occupied locally, stop the stale process and restart the project-root script.
- Free Render web services sleep after idle time; the first request after sleep can take ~30–60 seconds.
