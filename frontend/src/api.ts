// Typed client for the three backend endpoints. All power values are MW, energy MWh.

export type Hour = { time: string; forecast: number; p10: number | null; p90: number | null; actual: number | null }

export type Decision = {
  date: string
  gate: string
  publishTime: string
  lead_hours: { min: number; max: number }
  hours: Hour[]
  totals_mwh: { forecast: number; p10: number | null; p90: number | null; actual: number | null; shortfall: number | null }
  history: { n: number; bias: number | null; mae: number | null; p90_abs: number | null; over_share: number | null; first_day: string; last_day: string }
}

export type Vintage = { publishTime: string; hours: { time: string; forecast: number }[] }

export type Stats = {
  n: number; mae: number; rmse: number; bias: number; nmae: number
  p50_abs: number; p90_abs: number; p99_abs: number; max_abs: number; over_share: number; mean_actual: number
}

export type Accuracy = {
  decision: Stats & {
    gate: string; n_days: number
    by_day: { date: string; bias: number; mae: number; forecast_mwh: number; actual_mwh: number }[]
  }
  selected: Stats & {
    horizon_min: number; horizon_max: number
    by_hour: { hour: number; n: number; mae: number; bias: number }[]
    histogram: { from: number; to: number; count: number }[]
  }
  by_horizon: { from: number; to: number; n: number; mae: number; rmse: number; bias: number; p90_abs: number }[]
}

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  const r = await fetch(`${path}?${qs}`)
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.detail ?? `${r.status} ${r.statusText}`)
  return r.json()
}

export const api = {
  decision: (date: string, gate: string) => get<Decision>('/api/decision', { date, gate }),
  vintages: (date: string) => get<Vintage[]>('/api/vintages', { date }),
  accuracy: (horizon_min: number, horizon_max: number) => get<Accuracy>('/api/accuracy', { horizon_min, horizon_max }),
}

export const FIRST_DAY = '2026-01-02'
export const LAST_DAY = '2026-02-01'

// Formatting helpers used by both views.
export const gw = (mw: number | null | undefined, d = 1) => (mw == null ? '—' : (mw / 1000).toFixed(d))
export const gwh = (mwh: number | null | undefined) => (mwh == null ? '—' : Math.round(mwh / 1000).toLocaleString())
export const pct = (x: number | null | undefined) => (x == null ? '—' : `${Math.round(x * 100)} %`)
export const hhmm = (iso: string) => iso.slice(11, 16)
export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const stamp = (iso: string) => `${dayLabel(iso)} ${hhmm(iso)} UTC`
