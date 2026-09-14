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


def _daily_snapshots(history):
    """Collapse raw history events down to one point per calendar day (UTC),
    keeping whichever quantity was recorded last that day.

    This is the actual fix for the "56,286 units/day" class of bug, not
    just a threshold check on it. A "daily consumption rate" is only a
    meaningful concept when fitted against genuine day-over-day
    snapshots — fitting it against raw events means two clicks of a
    quantity button a few seconds apart get treated as an entire day's
    worth of independent observation, and a real quantity drop divided
    by a few seconds and projected out to "per day" is always going to
    be nonsense, no matter how far apart the rest of the history is
    spread. Bucketing by day means it no longer matters how many times
    an item was touched in one sitting — it can only ever contribute
    one data point to the trend, exactly like a real day's usage would.
    """
    points = sorted(history, key=lambda point: _timestamp(point["date"]))
    by_day = {}
    for point in points:
        day_key = datetime.fromtimestamp(
            _timestamp(point["date"]), timezone.utc
        ).date()
        by_day[day_key] = point  # last write per day wins, since points are sorted ascending
    return [by_day[day] for day in sorted(by_day)]


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
    history = _recent_segment(_daily_snapshots(item.get("history", [])))
    current_quantity = max(0.0, float(item["currentQuantity"]))
    threshold = max(0.0, float(item.get("lowStockThreshold", 0)))
    base = {
        "itemId": item["itemId"],
        "dailyConsumptionRate": 0.0,
        "predictedDaysUntilEmpty": None,
        "predictedEmptyDate": None,
        "suggestedRestockQuantity": 0,
        "unusualConsumption": False,
        "recentDailyRate": None,
    }

    if len(history) < 2:
        return {**base, "trend": "insufficient_data", "confidence": None}

    x = [_timestamp(point["date"]) / 86400 for point in history]
    y = [float(point["quantity"]) for point in history]

    # Belt-and-braces: with day-bucketed data this should already be at
    # least ~1 day, but keep a floor in case of clock skew or malformed
    # timestamps rather than trusting the bucketing alone.
    MIN_SPAN_DAYS = 1 / 24  # 1 hour
    if (x[-1] - x[0]) < MIN_SPAN_DAYS:
        return {**base, "trend": "insufficient_data", "confidence": None}

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

    # For low-stock alerts, use a conservative shortfall model instead of a raw
    # linear-regression projection. A single manual quantity reduction or a tiny
    # time window can otherwise create an absurd "units/day" value and a massive
    # restock recommendation.
    if current_quantity > threshold:
        return {
            **base,
            "trend": "stable",
            "confidence": _confidence(len(history), r_squared),
            "dailyConsumptionRate": round(min(daily_rate, max(1.0, threshold * 2)), 3),
            "predictedDaysUntilEmpty": None,
        }

    capped_rate = max(0.1, min(daily_rate, max(1.0, threshold * 2, current_quantity)))
    target_quantity = max(threshold * 2, threshold + 3.0)
    suggested_quantity = max(1, ceil(target_quantity - current_quantity))

    # Flag when the most recent single consumption step is running well
    # above the item's overall trend — e.g. someone had guests over and
    # burned through double the usual amount in one day. Needs at least
    # 3 points so "recent" and "trend" aren't the same two points, and a
    # minimum time gap so a pair of near-simultaneous log entries can't
    # produce a wild, meaningless rate from dividing by almost zero.
    recent_daily_rate = None
    unusual_consumption = False
    if len(history) >= 3:
        recent_dt = x[-1] - x[-2]
        if recent_dt > (1 / 1440):  # more than ~1 minute apart
            step_rate = (y[-2] - y[-1]) / recent_dt
            if step_rate > 0:
                recent_daily_rate = round(step_rate, 3)
                if step_rate >= daily_rate * 1.75 and (step_rate - daily_rate) >= 0.1:
                    unusual_consumption = True

    return {
        **base,
        "trend": "declining",
        "dailyConsumptionRate": round(capped_rate, 3),
        "predictedDaysUntilEmpty": round(min(current_quantity / max(capped_rate, 0.1), days_until_empty) if days_until_empty is not None else None, 3),
        "predictedEmptyDate": datetime.fromtimestamp(empty_date, timezone.utc).isoformat().replace("+00:00", "Z"),
        "confidence": _confidence(len(history), r_squared),
        "suggestedRestockQuantity": max(1, suggested_quantity),
        "unusualConsumption": unusual_consumption,
        "recentDailyRate": recent_daily_rate,
    }
