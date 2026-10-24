"""Load the committed Elexon snapshot and answer time-alignment questions.

Alignment rule: forecast hour T is compared with the FUELHH half-hour that
*starts* at T (the first of the two half-hours). The notebook compares this
against averaging both half-hours; the difference is small.
"""
import json
import pathlib
from datetime import date, datetime, time, timedelta, timezone

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"
# Decision days 1-31 Jan 2026 -> delivery days 2 Jan - 1 Feb 2026.
FIRST_DELIVERY = date(2026, 1, 2)
LAST_DELIVERY = date(2026, 2, 1)
DEFAULT_GATE = time(9, 50)  # N2EX day-ahead auction gate closure, UK time (= UTC in January)


def parse(ts):
    return datetime.fromisoformat(ts).astimezone(timezone.utc)


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _load():
    windfor = json.loads((DATA / "windfor.json").read_text())
    fuelhh = json.loads((DATA / "fuelhh.json").read_text())
    forecasts = {parse(p): {parse(s): mw for s, mw in pts.items()} for p, pts in windfor.items()}
    actuals = {parse(s): mw for s, mw in fuelhh.items()}
    return forecasts, actuals


FORECASTS, ACTUALS = _load()
PUBLISH_TIMES = sorted(FORECASTS)
FIRST_ACTUAL_DAY = min(ACTUALS).date()


def day_hours(d):
    start = datetime.combine(d, time(0), timezone.utc)
    return [start + timedelta(hours=h) for h in range(24)]


def gate_datetime(delivery_day, gate=DEFAULT_GATE):
    return datetime.combine(delivery_day - timedelta(days=1), gate, timezone.utc)


def decision_publish(delivery_day, gate=DEFAULT_GATE):
    """Latest publishTime at or before the gate on D-1, or None."""
    g = gate_datetime(delivery_day, gate)
    candidates = [p for p in PUBLISH_TIMES if p <= g]
    return candidates[-1] if candidates else None


def forecast_curve(publish, delivery_day):
    """[(startTime, mw)] for the delivery day's 24 hours from one publish (missing hours skipped)."""
    pts = FORECASTS[publish]
    return [(t, pts[t]) for t in day_hours(delivery_day) if t in pts]


def vintages(delivery_day):
    """Every publish that covers at least one hour of the delivery day, oldest first."""
    hours = set(day_hours(delivery_day))
    return [p for p in PUBLISH_TIMES if hours & FORECASTS[p].keys()]


def decision_errors(delivery_day, gate=DEFAULT_GATE):
    """[(startTime, forecast, actual, error)] for one day's decision forecast; [] if no data."""
    p = decision_publish(delivery_day, gate)
    if p is None:
        return []
    return [(t, mw, ACTUALS[t], mw - ACTUALS[t]) for t, mw in forecast_curve(p, delivery_day) if t in ACTUALS]


def history_errors(before_day, gate=DEFAULT_GATE):
    """Decision-forecast errors for every delivery day strictly before `before_day` (no look-ahead)."""
    errs = []
    d = FIRST_ACTUAL_DAY
    while d < before_day:
        errs += [row[3] for row in decision_errors(d, gate)]
        d += timedelta(days=1)
    return errs


def all_pairs():
    """Every (publish, startTime, horizon_h, forecast, actual) with the start in the decision window."""
    lo = datetime.combine(FIRST_DELIVERY, time(0), timezone.utc)
    hi = datetime.combine(LAST_DELIVERY + timedelta(days=1), time(0), timezone.utc)
    out = []
    for p in PUBLISH_TIMES:
        for t, mw in FORECASTS[p].items():
            if lo <= t < hi and t in ACTUALS:
                out.append((p, t, (t - p).total_seconds() / 3600, mw, ACTUALS[t]))
    return out
