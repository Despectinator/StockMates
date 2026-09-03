# StockMates Analytics Service

A small stateless FastAPI service that predicts when an inventory item will
run out, based on its quantity history.

It has no database of its own and does no auth — the Node API gathers each
item's quantity history from MongoDB, POSTs it here in one batch request,
and this service does the math. It's only meant to be reachable from the
Node backend, not exposed publicly.

## How the prediction works

An item's quantity history is a sawtooth: it drops as it's consumed and
jumps back up on restock. Fitting one straight line across the whole
history would blend "how fast we use it" with "how much we buy at once",
so instead the history is split into segments at each restock (each
segment is a maximal run of non-increasing quantity), and a line is fit
to the most recent segment — recent behavior predicts near-term behavior
best. See `prediction.py` for the full logic and reasoning.

## Running it

```bash
cd analytics-service
python3 -m venv venv
source venv/bin/activate   # venv\Scripts\activate on Windows
pip install -r requirements.txt

cp .env.example .env       # defaults are fine for local dev

uvicorn app:app --reload --port 8001
```

Then point the Node server at it via `server/.env`:

```
ANALYTICS_SERVICE_URL=http://127.0.0.1:8001
```

## API

### `GET /health`

Liveness check.

### `POST /predict/batch`

Request:

```json
{
  "items": [
    {
      "itemId": "abc123",
      "history": [{ "date": "2026-08-20T10:00:00Z", "quantity": 12 }],
      "currentQuantity": 4,
      "lowStockThreshold": 2
    }
  ]
}
```

Response:

```json
{
  "results": [
    {
      "itemId": "abc123",
      "trend": "declining",
      "dailyConsumptionRate": 1.0,
      "predictedDaysUntilEmpty": 4.0,
      "predictedEmptyDate": "2026-09-06T10:00:00Z",
      "confidence": "high",
      "suggestedRestockQuantity": 14
    }
  ]
}
```

`trend` is one of `"declining"`, `"stable"`, or `"insufficient_data"` (fewer
than 2 history points). `confidence` is `"low"` / `"medium"` / `"high"`,
based on how well the most recent segment fits a straight line and how
many points it has.
