"""HTTP API over the snapshot. Three read-only endpoints, all JSON, all in MW / MWh."""
from datetime import date, time, timedelta

from fastapi import FastAPI, HTTPException, Query

from app import data, metrics

app = FastAPI(title="GB wind forecast at day-ahead decision time", version="0.1")

PAIRS = data.all_pairs()  # (publish, start, horizon_h, forecast, actual) for every vintage in the window
HORIZON_BUCKETS = [(h, h + 6) for h in range(0, 66, 6)]  # 0-6 ... 60-66 h ahead


def parse_date(s):
    try:
        d = date.fromisoformat(s)
    except ValueError:
        raise HTTPException(400, "date must be YYYY-MM-DD")
    if not data.FIRST_DELIVERY <= d <= data.LAST_DELIVERY:
        raise HTTPException(400, f"date must be a delivery day between {data.FIRST_DELIVERY} and {data.LAST_DELIVERY}")
    return d


def parse_gate(s):
    try:
        return time.fromisoformat(s)
    except ValueError:
        raise HTTPException(400, "gate must be HH:MM (UTC)")


def rnd(x, nd=0):
    return None if x is None else round(x, nd)


def stats(errors, actuals):
    s = metrics.summary(errors, actuals)
    return {k: (rnd(v, 3) if k in ("nmae", "over_share") else rnd(v)) for k, v in s.items()}


@app.get("/api/health")
def health():
    return {"ok": True, "publishes": len(data.PUBLISH_TIMES), "actual_half_hours": len(data.ACTUALS)}


@app.get("/api/decision")
def decision(date: str = Query(...), gate: str = Query("09:50")):
    """What the buyer saw at the gate for one delivery day, plus hindsight and an uncertainty band."""
    d, g = parse_date(date), parse_gate(gate)
    publish = data.decision_publish(d, g)
    if publish is None:
        raise HTTPException(404, "no forecast published before that gate")
    hist = data.history_errors(d, g)
    hist_stats = stats(hist, [1] * len(hist))  # actuals irrelevant here; only error stats are used
    hours = []
    for t, fc in data.forecast_curve(publish, d):
        b = metrics.band(fc, hist) or {"low": None, "high": None}
        w = metrics.band(fc, hist, 5, 95) or {"low": None, "high": None}
        hours.append({"time": data.iso(t), "forecast": fc, "p10": rnd(b["low"]), "p90": rnd(b["high"]),
                      "p5": rnd(w["low"]), "p95": rnd(w["high"]), "actual": data.ACTUALS.get(t)})
    fc_sum = sum(h["forecast"] for h in hours)
    ac = [h["actual"] for h in hours if h["actual"] is not None]
    # ponytail: band totals sum hourly percentiles, which is conservative (errors are correlated within a day).
    return {
        "date": date, "gate": gate, "publishTime": data.iso(publish),
        "lead_hours": {"min": (data.day_hours(d)[0] - publish).total_seconds() / 3600,
                       "max": (data.day_hours(d)[-1] - publish).total_seconds() / 3600},
        "hours": hours,
        "totals_mwh": {
            "forecast": fc_sum,
            "p10": rnd(sum(h["p10"] for h in hours)) if hist else None,
            "p90": rnd(sum(h["p90"] for h in hours)) if hist else None,
            "actual": sum(ac) if len(ac) == len(hours) else None,
            "shortfall": fc_sum - sum(ac) if len(ac) == len(hours) else None,
        },
        "history": {"n": hist_stats["n"], "bias": hist_stats.get("bias"), "mae": hist_stats.get("mae"),
                    "p90_abs": hist_stats.get("p90_abs"), "over_share": hist_stats.get("over_share"),
                    "first_day": str(data.FIRST_ACTUAL_DAY), "last_day": str(d - timedelta(days=1))},
    }


@app.get("/api/vintages")
def vintages(date: str = Query(...)):
    """Every forecast publish that covered the delivery day, oldest first (how the forecast drifted)."""
    d = parse_date(date)
    return [{"publishTime": data.iso(p),
             "hours": [{"time": data.iso(t), "forecast": fc} for t, fc in data.forecast_curve(p, d)]}
            for p in data.vintages(d)]


def group(rows, key):
    out = {}
    for r in rows:
        out.setdefault(key(r), []).append(r)
    return out


@app.get("/api/accuracy")
def accuracy(horizon_min: float = Query(0, ge=0), horizon_max: float = Query(66, le=72), gate: str = Query("09:50")):
    """Accuracy over the January decision window.

    `decision`: the gate-time forecasts only (what the buyer actually used).
    Everything else: every vintage whose lead time is within [horizon_min, horizon_max) hours.
    """
    g = parse_gate(gate)
    dec = []
    d = data.FIRST_DELIVERY
    while d <= data.LAST_DELIVERY:
        dec += [(d, t, fc, ac, e) for t, fc, ac, e in data.decision_errors(d, g)]
        d += timedelta(days=1)
    sel = [r for r in PAIRS if horizon_min <= r[2] < horizon_max]
    err = lambda rows: [r[3] - r[4] for r in rows]
    act = lambda rows: [r[4] for r in rows]
    return {
        "decision": {
            "gate": gate, "n_days": len({r[0] for r in dec}),
            **stats([r[4] for r in dec], [r[3] for r in dec]),
            "by_day": [{"date": str(day), "bias": rnd(sum(r[4] for r in rows) / len(rows)),
                        "mae": rnd(sum(abs(r[4]) for r in rows) / len(rows)),
                        "forecast_mwh": sum(r[2] for r in rows), "actual_mwh": sum(r[3] for r in rows)}
                       for day, rows in sorted(group(dec, lambda r: r[0]).items())],
        },
        "selected": {
            "horizon_min": horizon_min, "horizon_max": horizon_max,
            **stats(err(sel), act(sel)),
            "by_hour": [{"hour": h, **{k: v for k, v in stats(err(rows), act(rows)).items() if k in ("n", "mae", "bias")}}
                        for h, rows in sorted(group(sel, lambda r: r[1].hour).items())],
            "histogram": metrics.histogram(err(sel)),
        },
        "by_horizon": [{"from": lo, "to": hi, **{k: v for k, v in stats(err(rows), act(rows)).items()
                                                 if k in ("n", "mae", "rmse", "bias", "p90_abs")}}
                       for lo, hi in HORIZON_BUCKETS
                       for rows in [[r for r in PAIRS if lo <= r[2] < hi]] if rows],
    }
