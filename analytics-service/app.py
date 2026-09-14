import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel, Field

from prediction import predict_item

app = FastAPI(title="StockMates Analytics Service")


class HistoryPoint(BaseModel):
    date: str
    quantity: float


class PredictionItem(BaseModel):
    itemId: str
    history: list[HistoryPoint] = Field(default_factory=list)
    currentQuantity: float = Field(ge=0)
    lowStockThreshold: float = Field(default=0, ge=0)


class BatchRequest(BaseModel):
    items: list[PredictionItem] = Field(default_factory=list)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict/batch")
def predict_batch(request: BatchRequest):
    results = [
        predict_item(item.model_dump())
        for item in request.items
    ]
    return {"results": results}


if __name__ == "__main__":
    try:
        uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=False)
    except OSError as exc:
        if "Address already in use" in str(exc):
            print("Analytics service could not start because port 8001 is already in use.")
            raise SystemExit(1)
        raise
