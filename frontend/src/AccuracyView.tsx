import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, gw, pct, dayLabel, type Accuracy } from './api'
import { AXIS, BRAND, Card, Chip, GRID, INK, Signal, Status, Tile, axisLine, tick, tooltipStyle } from './ui'

const RANGES: { label: string; min: number; max: number }[] = [
  { label: 'All horizons', min: 0, max: 66 },
  { label: 'Intraday · 0–12 h', min: 0, max: 12 },
  { label: 'Day-ahead · 12–38 h', min: 12, max: 38 },
  { label: 'Two days out · 38–66 h', min: 38, max: 66 },
]

const legendStyle = { fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.12em' }
const fmtGW = (v: unknown) => `${(Number(v) / 1000).toFixed(2)} GW`

export default function AccuracyView() {
  const [range, setRange] = useState(0)
  const [acc, setAcc] = useState<Accuracy>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const r = RANGES[range]
    api.accuracy(r.min, r.max).then((a) => { setAcc(a); setError(undefined) }).catch((e) => setError(String(e.message ?? e)))
  }, [range])

  const soWhat = useMemo(() => {
    if (!acc) return null
    const h = acc.by_horizon
    const first = h[0], last = h[h.length - 1]
    const byHour = [...acc.selected.by_hour].sort((a, b) => b.mae - a.mae)
    const overDays = acc.decision.by_day.filter((d) => d.bias > 0).length
    const worstDay = acc.decision.by_day.reduce((a, b) => (Math.abs(b.bias) > Math.abs(a.bias) ? b : a))
    return {
      horizon: `Error grows with lead time: ${gw(first.mae)} GW MAE at ${first.from}–${first.to} h ahead vs ${gw(last.mae)} GW at ${last.from}–${last.to} h. The day-ahead decision sits at 14–38 h, so waiting for a later publish would help only if the buy could be delayed.`,
      hour: `Within the selected horizons, misses are largest around ${String(byHour[0].hour).padStart(2, '0')}:00 UTC (${gw(byHour[0].mae)} GW) and smallest around ${String(byHour.at(-1)!.hour).padStart(2, '0')}:00 (${gw(byHour.at(-1)!.mae)} GW). ${acc.selected.by_hour.every((h) => h.bias > 0) ? 'The bias is positive in every hour, so this is a level problem, not a timing one.' : 'The bias changes sign through the day, so timing matters as well as level.'}`,
      hist: `${pct(acc.selected.over_share)} of forecasts were above the metered outcome. The median miss was ${gw(acc.selected.p50_abs)} GW; one hour in ten missed by more than ${gw(acc.selected.p90_abs)} GW.`,
      day: `The gate-time forecast was too high on ${overDays} of ${acc.decision.n_days} delivery days. Worst day: ${dayLabel(worstDay.date)} at ${worstDay.bias > 0 ? '+' : ''}${gw(worstDay.bias)} GW average, a shortfall of ${Math.round((worstDay.forecast_mwh - worstDay.actual_mwh) / 1000)} GWh.`,
    }
  }, [acc])

  const sel = RANGES[range]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext">Multi-horizon view</span>
        {RANGES.map((r, i) => (
          <Chip key={r.label} active={i === range} onClick={() => setRange(i)}>{r.label}</Chip>
        ))}
        {acc && <span className="ml-auto text-[11px] font-light text-subtext">{acc.selected.n.toLocaleString()} forecast-hours selected · errors are forecast − metered</span>}
      </div>

      <Status error={error} loading={!acc && !error} />

      {acc && soWhat && (
        <>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext">
              Gate-time forecasts only · {acc.decision.n_days} delivery days · {acc.decision.n} hours · gate {acc.decision.gate} UTC
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <Tile label="MAE" value={gw(acc.decision.mae, 2)} unit="GW" sub="mean absolute error" />
              <Tile label="RMSE" value={gw(acc.decision.rmse, 2)} unit="GW" sub="penalises big misses" />
              <Tile label="Bias" value={`${acc.decision.bias > 0 ? '+' : ''}${gw(acc.decision.bias, 2)}`} unit="GW" sub={acc.decision.bias > 0 ? 'forecast too high' : 'forecast too low'} />
              <Tile label="nMAE" value={pct(acc.decision.nmae)} sub={`of ${gw(acc.decision.mean_actual)} GW mean output`} />
              <Tile label="P90 abs error" value={gw(acc.decision.p90_abs, 2)} unit="GW" sub={`max ${gw(acc.decision.max_abs)} GW`} />
              <Tile label="Over-forecast" value={pct(acc.decision.over_share)} sub="share of hours too high" />
            </div>
          </div>

          <Signal title="Forecast signal · what to do with this">
            <p>
              The gate-time forecast over-stated metered wind by <span className="font-mono">+{gw(acc.decision.bias, 2)} GW</span> on average and in {pct(acc.decision.over_share)} of hours. A plausible cause is curtailment: FUELHH is metered output after constraint actions, while the forecast is closer to what the fleet could have produced. Treat this as a hypothesis to verify, not a fact.
            </p>
            <p className="font-semibold">
              Rule of thumb for January: buy against forecast − {gw(acc.decision.bias)} GW, and hold about {gw(acc.decision.p90_abs)} GW of firm cover to stay inside the 1-in-10 miss.
            </p>
          </Signal>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Error vs. lead time · all publishes" note={soWhat.horizon}>
              <div className="h-[240px]">
                <ResponsiveContainer>
                  <BarChart data={acc.by_horizon} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2}>
                    <CartesianGrid stroke={GRID} strokeWidth={0.8} vertical={false} />
                    <XAxis dataKey="from" tickFormatter={(v: number) => `${v}h`} tick={tick} axisLine={axisLine} tickLine={false} />
                    <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v / 1000).toFixed(1)} label={{ value: 'GW', position: 'insideTopLeft', offset: -2, ...tick }} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: INK, fillOpacity: 0.04 }} labelFormatter={(l) => `${l}–${Number(l) + 6} h ahead`} formatter={(v, n) => [fmtGW(v), n]} />
                    <Legend wrapperStyle={legendStyle} iconSize={8} />
                    <Bar dataKey="mae" name="MAE" fill={BRAND} isAnimationActive={false}>
                      {acc.by_horizon.map((b) => <Cell key={b.from} fillOpacity={b.from >= sel.min && b.from < sel.max ? 1 : 0.3} />)}
                    </Bar>
                    <Bar dataKey="bias" name="Bias" fill={INK} isAnimationActive={false}>
                      {acc.by_horizon.map((b) => <Cell key={b.from} fillOpacity={b.from >= sel.min && b.from < sel.max ? 0.7 : 0.2} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={`Error by hour of day · ${sel.label.toLowerCase()}`} note={soWhat.hour}>
              <div className="h-[240px]">
                <ResponsiveContainer>
                  <ComposedChart data={acc.selected.by_hour} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke={GRID} strokeWidth={0.8} vertical={false} />
                    <XAxis dataKey="hour" tickFormatter={(v: number) => String(v).padStart(2, '0')} tick={tick} axisLine={axisLine} tickLine={false} interval={2} />
                    <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v / 1000).toFixed(1)} label={{ value: 'GW', position: 'insideTopLeft', offset: -2, ...tick }} />
                    <Tooltip {...tooltipStyle} labelFormatter={(l) => `${String(l).padStart(2, '0')}:00 UTC`} formatter={(v, n) => [fmtGW(v), n]} />
                    <Legend wrapperStyle={legendStyle} iconSize={8} />
                    <Bar dataKey="mae" name="MAE" fill={BRAND} fillOpacity={0.85} isAnimationActive={false} />
                    <Line type="monotone" dataKey="bias" name="Bias" stroke={INK} strokeWidth={2.2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={`Error distribution · ${sel.label.toLowerCase()}`} note={soWhat.hist}>
              <div className="h-[240px]">
                <ResponsiveContainer>
                  <BarChart data={acc.selected.histogram} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap={2}>
                    <CartesianGrid stroke={GRID} strokeWidth={0.8} vertical={false} />
                    <XAxis dataKey="from" tickFormatter={(v: number) => `${v / 1000}`} tick={tick} axisLine={axisLine} tickLine={false} interval={3} />
                    <YAxis tick={tick} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: INK, fillOpacity: 0.04 }} labelFormatter={(l) => `${Number(l) / 1000} to ${(Number(l) + 500) / 1000} GW`} formatter={(v) => [`${v} hours`, 'count']} />
                    <ReferenceLine x={0} stroke={AXIS} />
                    <Bar dataKey="count" name="hours" isAnimationActive={false}>
                      {acc.selected.histogram.map((b) => <Cell key={b.from} fill={b.from >= 0 ? INK : BRAND} fillOpacity={b.from >= 0 ? 0.7 : 0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex gap-4 text-[10px] uppercase tracking-[0.12em] text-subtext">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-brand" /> under-forecast</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-ink/70" /> over-forecast</span>
                <span className="ml-auto normal-case tracking-normal">x axis: forecast − metered, GW</span>
              </div>
            </Card>

            <Card title="Daily bias of the gate-time forecast" note={soWhat.day}>
              <div className="h-[240px]">
                <ResponsiveContainer>
                  <BarChart data={acc.decision.by_day} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap={2}>
                    <CartesianGrid stroke={GRID} strokeWidth={0.8} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(8)} tick={tick} axisLine={axisLine} tickLine={false} interval={2} />
                    <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v / 1000).toFixed(0)} label={{ value: 'GW', position: 'insideTopLeft', offset: -2, ...tick }} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: INK, fillOpacity: 0.04 }} labelFormatter={(l) => dayLabel(String(l))} formatter={(v, n) => [fmtGW(v), n]} />
                    <ReferenceLine y={0} stroke={AXIS} />
                    <Bar dataKey="bias" name="bias" isAnimationActive={false}>
                      {acc.decision.by_day.map((d) => <Cell key={d.date} fill={d.bias >= 0 ? INK : BRAND} fillOpacity={d.bias >= 0 ? 0.7 : 0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
