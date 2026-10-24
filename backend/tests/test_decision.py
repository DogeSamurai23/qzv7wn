from datetime import date, datetime, time, timedelta, timezone

from app import data, metrics


def utc(*a):
    return datetime(*a, tzinfo=timezone.utc)


def test_gate_picks_0930_publish_for_0950_gate():
    assert data.decision_publish(date(2026, 1, 15)) == utc(2026, 1, 14, 9, 30)


def test_earlier_gate_picks_earlier_publish():
    assert data.decision_publish(date(2026, 1, 15), time(9, 0)) == utc(2026, 1, 14, 7, 30)
    assert data.decision_publish(date(2026, 1, 15), time(9, 30)) == utc(2026, 1, 14, 9, 30)


def test_gate_before_any_publish_returns_none():
    assert data.decision_publish(date(2025, 12, 24), time(0, 0)) is None


def test_decision_curve_covers_delivery_day_only():
    p = data.decision_publish(date(2026, 1, 15))
    curve = data.forecast_curve(p, date(2026, 1, 15))
    assert len(curve) == 24
    assert curve[0][0] == utc(2026, 1, 15, 0) and curve[-1][0] == utc(2026, 1, 15, 23)
    lead_hours = [(t - p).total_seconds() / 3600 for t, _ in curve]
    assert (min(lead_hours), max(lead_hours)) == (14.5, 37.5)


def test_history_has_no_look_ahead():
    day = date(2026, 1, 10)
    hist = data.history_errors(day)
    days_before = [data.FIRST_ACTUAL_DAY + timedelta(days=i) for i in range((day - data.FIRST_ACTUAL_DAY).days)]
    assert len(hist) == sum(len(data.decision_errors(d)) for d in days_before) > 0
    # Moving the cut-off one day later adds exactly that day's errors, so the day itself was excluded.
    assert len(data.history_errors(day + timedelta(days=1))) == len(hist) + len(data.decision_errors(day))


def test_vintages_sorted_and_cover_day():
    vs = data.vintages(date(2026, 1, 15))
    assert vs == sorted(vs)
    assert utc(2026, 1, 14, 9, 30) in vs
    assert all(data.forecast_curve(v, date(2026, 1, 15)) for v in vs)


def test_january_headline_numbers():
    """Hand-checked against the raw API in the plan: MAE ~1996 MW, bias ~+1728 MW over 744 h."""
    rows = []
    d = data.FIRST_DELIVERY
    while d <= data.LAST_DELIVERY:
        rows += data.decision_errors(d)
        d += timedelta(days=1)
    s = metrics.summary([r[3] for r in rows], [r[2] for r in rows])
    assert s["n"] == 744
    assert abs(s["mae"] - 1996) < 5
    assert abs(s["bias"] - 1728) < 5
    assert 0.8 < s["over_share"] < 0.9
