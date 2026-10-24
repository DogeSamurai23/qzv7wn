# windesk: GB wind forecasts at day-ahead decision time

A small web app for a UK utility that buys power on the GB day-ahead market. For any delivery day in the January 2026 decision window it shows:

1. **The forecast the buyer actually had** when the day-ahead auction closed, with a probabilistic range built only from earlier days.
2. **How accurate that forecast has been**, so the buyer knows how much firm (e.g. thermal) power to hold behind it.

**Live app:** https://qzv7wn.vercel.app
**Video walkthrough:** _link added on submission_

## Key findings (January 2026, gate-time forecasts vs metered output)

| Metric | Value |
|---|---|
| Hours compared | 744 (31 delivery days, 2 Jan to 1 Feb) |
| Mean absolute error | 2.00 GW (17.7 % of mean output) |
| RMSE | 2.50 GW |
| Bias | **+1.73 GW**, forecast too high |
| Hours over-forecast | 84 % |
| P90 absolute error | 4.18 GW |
| Worst single hour | 6.86 GW |

Error grows with lead time, from 1.7 GW MAE at 0 to 6 h ahead to 2.4 GW at 60 to 66 h. The day-ahead decision sits at 14.5 to 37.5 h.

**Recommendation:** buy against *forecast minus the recent bias* (about 1.7 GW in January) and hold roughly the P90 error (about 4 GW) as firm cover.

**Hypothesis, not a fact:** the systematic over-forecast may be curtailment. FUELHH is metered output after constraint actions, while WINDFOR is closer to what the fleet could have produced. Checking this needs BOAL/constraint data, which is out of scope for an Elexon-wind-only brief.

## Running it

### With Docker

```
docker compose up --build
```

Open http://localhost:8080. The `web` container serves the built React app with nginx and proxies `/api` to the `api` container.

### Without Docker

Backend (Python 3.12+):

```
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows; use source .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt
python -m pytest -q
uvicorn app.main:app --reload --port 8000
```

Frontend (Node 22+), in a second terminal:

```
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to port 8000. Interactive API docs are at http://localhost:8000/docs.

### Refreshing the data

The app reads a committed snapshot, so it starts instantly and never hits Elexon rate limits. To re-download it:

```
python backend/ingest.py
```

## What each file and directory is

```
api/index.py                  Vercel Python entry point; imports the FastAPI app from backend/
backend/
  app/data.py                 Loads the snapshot; gate selection, delivery-day curves, vintages, error history
  app/metrics.py              Pure maths: MAE, RMSE, bias, percentiles, histogram, uncertainty band
  app/main.py                 FastAPI endpoints: /api/decision, /api/vintages, /api/accuracy, /api/health
  data/windfor.json           WINDFOR forecasts, keyed publishTime -> startTime -> MW
  data/fuelhh.json            FUELHH WIND metered output, keyed startTime -> MW
  data/SNAPSHOT.txt           When the snapshot was taken
  ingest.py                   Downloads the snapshot from the Elexon BMRS API (stdlib only)
  tests/                      pytest: metrics, gate selection, no look-ahead, API contract, headline numbers
  requirements.txt            Runtime deps (FastAPI, uvicorn)
  requirements-dev.txt        Adds pytest and httpx for tests
  Dockerfile                  API image
frontend/
  src/App.tsx                 Page shell: nav, hero, live-surface panel and tab strip
  src/DecisionView.tsx        Purpose 1: forecast at gate closure, range, drift, hindsight
  src/AccuracyView.tsx        Purpose 2: accuracy by horizon, hour of day, distribution and day
  src/ui.tsx                  Shared cards, chips, chart styling
  src/api.ts                  Typed API client and number formatting
  src/index.css               Design tokens (Tailwind v4)
  nginx.conf, Dockerfile      Static build served by nginx, /api proxied to the backend
docker-compose.yml            Runs api + web locally
vercel.json                   Vercel build: static frontend plus Python function for /api/*
requirements.txt              Python deps for the Vercel function
.github/workflows/ci.yml      CI: backend tests, frontend lint and build, Docker build
```

## Method and assumptions

- **Data:** Elexon BMRS `WINDFOR` (national wind forecast, hourly, about 8 publishes a day) and `FUELHH` with `fuelType=WIND` (metered half-hourly output). Snapshot taken 25 Oct 2026, covering delivery days 25 Dec 2025 to 1 Feb 2026.
- **Decision time:** N2EX day-ahead gate closure, 09:50 UK time on D-1. January is GMT, so UK time equals UTC. The gate is a parameter in the UI and API.
- **Which forecast:** the latest WINDFOR publish at or before the gate. For a 09:50 gate this is the 09:30 UTC publish, giving lead times of 14.5 to 37.5 h across the delivery day.
- **Decision window:** decisions on 1 to 31 Jan, so delivery days 2 Jan to 1 Feb.
- **Alignment:** forecast hour T is compared with the FUELHH half-hour that starts at T.
- **Uncertainty band:** forecast minus the P10 to P90 (and P5 to P95) of past gate-time errors, using **only delivery days before the one shown**. No look-ahead; a test checks this.
- **Errors** are forecast minus metered, so positive means the forecast was too high.
- **Daily range totals** sum hourly percentiles. This is conservative because errors within a day are correlated.

## Architecture

```
Elexon BMRS --(ingest.py, once)--> backend/data/*.json
                                         |
                       FastAPI (loads into dicts at startup, stdlib maths)
                                         |
                     /api/decision  /api/vintages  /api/accuracy
                                         |
                  React + Recharts (Vite, Tailwind v4) -- two views
```

Deployed on Vercel: the React build is served as static files and `/api/*` is rewritten to one Python serverless function. Locally, Docker Compose runs the same split with nginx in front.

**Trade-offs:** a committed snapshot instead of live calls (the WINDFOR query takes about 9 s); no pandas in the API to keep the serverless bundle small; national wind only, as the brief asks.

**Next steps:** live mode for other months, solar, price data to turn GW errors into £, and alerts when the forecast drifts between publishes.

## AI tools used

This project was built with **Claude Code** (Anthropic), using the Claude Fable 5.1 and Claude Opus 5.5 models, working from a plan I wrote. Claude wrote most of the code, tests, Docker/CI/Vercel config and this README under my direction. I set the scope, checked each block before moving on, verified the headline numbers against the raw Elexon API, and made the product and design decisions. The UI styling follows the public reint.ai site; it uses its own wordmark and is not an official REint product.
