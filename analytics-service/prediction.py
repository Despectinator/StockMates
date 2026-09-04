from datetime import datetime, timezone
from math import ceil
from statistics import mean


def _timestamp(value):
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


def _recent_segment(history):
    points = sorted(history, key=lambda point: _timestamp(point["date"]))
    if not points:
        return []

    segments = [[]]
    for point in points:
        if segments[-1] and point["quantity"] > segments[-1][-1]["quantity"]:
            segments.append([])
        segments[-1].append(point)
    return segments[-1]


def _confidence(point_count, r_squared):
    if point_count >= 4 and r_squared >= 0.75:
        return "high"
    if point_count >= 3 and r_squared >= 0.4:
        return "medium"
    return "low"


def predict_item(item):
    history = _recent_segment(item.get("history", []))
    current_quantity = max(0.0, float(item["currentQuantity"]))
    threshold = max(0.0, float(item.get("lowStockThreshold", 0)))
    base = {
        "itemId": item["itemId"],
        "dailyConsumptionRate": 0.0,
        "predictedDaysUntilEmpty": None,
        "predictedEmptyDate": None,
        "suggestedRestockQuantity": max(1, ceil(threshold * 2)),
    }

    if len(history) < 2:
        return {**base, "trend": "insufficient_data", "confidence": None}

    x = [_timestamp(point["date"]) / 86400 for point in history]
    y = [float(point["quantity"]) for point in history]
    x_mean = mean(x)
    y_mean = mean(y)
    denominator = sum((value - x_mean) ** 2 for value in x)
    if denominator == 0:
        return {**base, "trend": "insufficient_data", "confidence": None}

    slope = sum((x_value - x_mean) * (y_value - y_mean) for x_value, y_value in zip(x, y)) / denominator
    intercept = y_mean - slope * x_mean
    predictions = [intercept + slope * value for value in x]
    residual_sum = sum((actual - predicted) ** 2 for actual, predicted in zip(y, predictions))
    total_sum = sum((value - y_mean) ** 2 for value in y)
    r_squared = 1.0 if total_sum == 0 else max(0.0, 1 - residual_sum / total_sum)

    if slope >= -0.01:
        return {**base, "trend": "stable", "confidence": _confidence(len(history), r_squared)}

    daily_rate = -slope
    days_until_empty = current_quantity / daily_rate if daily_rate else None
    empty_date = datetime.now(timezone.utc).timestamp() + days_until_empty * 86400
    suggested_quantity = max(1, ceil(current_quantity + daily_rate * 7))
    return {
        **base,
        "trend": "declining",
        "dailyConsumptionRate": round(daily_rate, 3),
        "predictedDaysUntilEmpty": round(days_until_empty, 3),
        "predictedEmptyDate": datetime.fromtimestamp(empty_date, timezone.utc).isoformat().replace("+00:00", "Z"),
        "confidence": _confidence(len(history), r_squared),
        "suggestedRestockQuantity": suggested_quantity,
    }
