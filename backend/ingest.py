"""One-off snapshot of Elexon data -> backend/data/*.json (committed).

Forecasts: WINDFOR, hourly, ~8 publishes/day. Actuals: FUELHH WIND, half-hourly.
Range covers delivery days 25 Dec 2025 - 1 Feb 2026 so the first January
decision already has a week of error history for its uncertainty band.
Run: python backend/ingest.py
"""
import json
import pathlib
import urllib.request

BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
OUT = pathlib.Path(__file__).parent / "data"


def get(url):
    with urllib.request.urlopen(url, timeout=120) as r:
        return json.load(r)


def main():
    OUT.mkdir(exist_ok=True)
    rows = get(f"{BASE}/WINDFOR/stream?publishDateTimeFrom=2025-12-24T00:00Z&publishDateTimeTo=2026-02-01T00:00Z")
    windfor = {}
    for r in rows:
        windfor.setdefault(r["publishTime"], {})[r["startTime"]] = r["generation"]
    (OUT / "windfor.json").write_text(json.dumps(windfor, separators=(",", ":")))
    print(f"windfor: {len(rows)} rows, {len(windfor)} publishes")

    rows = get(f"{BASE}/FUELHH/stream?settlementDateFrom=2025-12-25&settlementDateTo=2026-02-02&fuelType=WIND")
    fuelhh = {r["startTime"]: r["generation"] for r in rows}
    (OUT / "fuelhh.json").write_text(json.dumps(fuelhh, separators=(",", ":")))
    print(f"fuelhh: {len(fuelhh)} half-hours")
    (OUT / "SNAPSHOT.txt").write_text("Downloaded 2026-10-25 with backend/ingest.py\n")


if __name__ == "__main__":
    main()
