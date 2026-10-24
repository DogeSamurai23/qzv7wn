from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)


def test_decision_uses_last_publish_before_gate():
    r = c.get("/api/decision", params={"date": "2026-01-15"})
    assert r.status_code == 200
    body = r.json()
    assert body["publishTime"] == "2026-01-14T09:30:00Z"
    assert body["lead_hours"] == {"min": 14.5, "max": 37.5}
    assert len(body["hours"]) == 24
    h = body["hours"][0]
    assert h["p10"] < h["forecast"] and h["p90"] > h["p10"]
    assert h["p5"] <= h["p10"] and h["p95"] >= h["p90"]
    assert body["totals_mwh"]["shortfall"] == body["totals_mwh"]["forecast"] - body["totals_mwh"]["actual"]
    assert body["history"]["last_day"] == "2026-01-14"


def test_decision_gate_parameter_changes_publish():
    r = c.get("/api/decision", params={"date": "2026-01-15", "gate": "09:00"})
    assert r.json()["publishTime"] == "2026-01-14T07:30:00Z"


def test_decision_rejects_bad_input():
    assert c.get("/api/decision", params={"date": "2026-03-01"}).status_code == 400
    assert c.get("/api/decision", params={"date": "nope"}).status_code == 400
    assert c.get("/api/decision", params={"date": "2026-01-15", "gate": "25:99"}).status_code == 400


def test_vintages_include_decision_publish():
    vs = c.get("/api/vintages", params={"date": "2026-01-15"}).json()
    assert [v["publishTime"] for v in vs] == sorted(v["publishTime"] for v in vs)
    assert "2026-01-14T09:30:00Z" in {v["publishTime"] for v in vs}
    assert all(v["hours"] for v in vs)


def test_accuracy_headline_and_filters():
    body = c.get("/api/accuracy").json()
    dec = body["decision"]
    assert dec["n"] == 744 and dec["n_days"] == 31
    assert abs(dec["mae"] - 1996) < 5 and abs(dec["bias"] - 1728) < 5
    assert len(dec["by_day"]) == 31
    assert len(body["selected"]["by_hour"]) == 24
    assert sum(b["count"] for b in body["selected"]["histogram"]) == body["selected"]["n"]
    assert [b["from"] for b in body["by_horizon"]] == list(range(0, 66, 6))

    narrow = c.get("/api/accuracy", params={"horizon_min": 12, "horizon_max": 24}).json()["selected"]
    assert 0 < narrow["n"] < body["selected"]["n"]
