import { memo, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, gw, pct, dayLabel, type Accuracy } from './api'
import { AXIS, BRAND, Card, Chip, GRID, INK, Signal, Status, TipCard, Tile, WatchList, axisLine, legendProps, lineCursor, simpleTip, tick } from './ui'

const RANGES = [
  { label: 'All horizons', min: 0, max: 66 },
  { label: 'Intraday · 0–12 h', min: 0, max: 12 },
  { label: 'Day-ahead · 12–38 h', min: 12, max: 38 },
  { label: 'Two days out · 38–66 h', min: 38, max: 66 },
]

const fmtGW = (v: unknown) => `${(Number(v) / 1000).toFixed(2)} GW`
const yGW = (d = 1) => ({ tick, axisLine, tickLine: false, tickFormatter: (v: number) => (v / 1000).toFixed(d), label: { value: 'GW', angle: -90, position: 'insideLeft' as const, offset: 18, ...tick } })
const barLegend = { ...legendProps, iconType: 'square' as const, iconSize: 8 }
const barCursor = { fill: INK, fillOpacity: 0.04 }
const hh = (h: number) => String(h).padStart(2, '0')

export default memo(function AccuracyView() {
  const [range, setRange] = useState(0)
  const [acc, setAcc] = useState<Accuracy>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const r = RANGES[range]
    api.accuracy(r.min, r.max).then((a) => (setAcc(a), setError(undefined))).catch((e) => setError(String(e.message ?? e)))
  }, [range])

  const facts = useMemo(() => {
    if (!acc) return null
    const h = acc.by_horizon
    const byHour = [...acc.selected.by_hour].sort((a, b) => b.mae - a.mae)
    const days = acc.decision.by_day
    const dayAhead = h.filter((b) => b.from >= 12 && b.to <= 42)
    return {
      first: h[0], last: h[h.length - 1], peakHour: byHour[0], calmHour: byHour.at(-1)!,
      allHoursHigh: acc.selected.by_hour.every((x) => x.bias > 0),
      overDays: days.filter((d) => d.bias > 0).length,
      worstDay: days.reduce((a, b) => (Math.abs(b.bias) > Math.abs(a.bias) ? b : a)),
      dayAheadMae: dayAhead.reduce((s, b) => s + b.mae * b.n, 0) / dayAhead.reduce((s, b) => s + b.n, 0),
    }
  }, [acc])

  const sel = RANGES[range]
  if (error) return <Status error={error} />
  if (!acc || !facts) return <Status loading />
  const d = acc.decision

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r, i) => (
            <Chip key={r.label} active={i === range} onClick={() => setRange(i)}>{r.label}</Chip>
          ))}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext/65">{acc.selected.n.toLocaleString()} forecast-hours · forecast − metered</div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.52fr)_280px]">
        <div className="grid content-start gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Tile label="MAE · gate-time" value={`${gw(d.mae, 2)} GW`} />
            <Tile label="Bias" value={`${d.bias > 0 ? '+' : ''}${gw(d.bias, 2)} GW`} />
            <Tile label="Over-forecast hours" value={pct(d.over_share)} />
            <Tile label="RMSE" value={`${gw(d.rmse, 2)} GW`} />
            <Tile label="nMAE" value={pct(d.nmae)} />
            <Tile label="P90 abs error" value={`${gw(d.p90_abs, 2)} GW`} />
          </div>

          <Card eyebrow="Error vs. lead time · all publishes" title={`MAE grows from ${gw(facts.first.mae)} to ${gw(facts.last.mae)} GW with lead time`}>
            <div className="h-[16rem]">
              <ResponsiveContainer>
                <BarChart data={acc.by_horizon} margin={{ top: 4, right: 12, bottom: 0, left: -8 }} barGap={2}>
                  <CartesianGrid stroke={GRID} strokeWidth={0.8} vertical={false} />
                  <XAxis dataKey="from" tickFormatter={(v: number) => `${v}h`} tick={tick} axisLine={axisLine} tickLine={false} />
                  <YAxis {...yGW()} />
                  <Tooltip cursor={barCursor} content={simpleTip((l) => `${l}–${Number(l) + 6} h ahead`, fmtGW)} />
                  <Legend {...barLegend} />
                  <Bar dataKey="mae" name="MAE" fill={BRAND} isAnimationActive={false}>
                    {acc.by_horizon.map((b) => <Cell key={b.from} fillOpacity={b.from >= sel.min && b.from < sel.max ? 1 : 0.3} />)}
                  </Bar>
                  <Bar dataKey="bias" name="Bias" fill={INK} isAnimationActive={false}>
                    {acc.by_horizon.map((b) => <Cell key={b.from} fillOpacity={b.from >= sel.min && b.from < sel.max ? 0.75 : 0.2} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card eyebrow={`Error by hour of day · ${sel.label}`} title={`Misses peak around ${hh(facts.peakHour.hour)}:00 UTC at ${gw(facts.peakHour.mae)} GW`}>
            <div className="h-[16rem]">
              <ResponsiveContainer>
                <ComposedChart data={acc.selected.by_hour} margin={{ top: 4, right: 12, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke={GRID} strokeWidth={0.8} vertical={false} />
                  <XAxis dataKey="hour" tickFormatter={hh} tick={tick} axisLine={axisLine} tickLine={false} interval={3} />
                  <YAxis {...yGW()} />
                  <Tooltip cursor={lineCursor} content={simpleTip((l) => `${hh(Number(l))}:00 UTC`, fmtGW)} />
                  <Legend {...legendProps} />
                  <Bar dataKey="mae" name="MAE" fill={BRAND} fillOpacity={0.85} legendType="square" isAnimationActive={false} />
                  <Line type="monotone" dataKey="bias" name="Bias" stroke={INK} strokeWidth={2.2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-3">
          <Signal label="Forecast signal" title={`Buy against forecast − ${gw(d.bias)} GW`}>
            <p>
              At gate time the forecast over-stated metered wind by {gw(d.bias, 2)} GW on average, in {pct(d.over_share)} of the {d.n} January decision hours.
            </p>
            <p>
              A plausible cause is curtailment: FUELHH is metered output after constraint actions, while the forecast is closer to what the fleet could
              produce. Treat this as a hypothesis to verify.
            </p>
            <p>Hold about {gw(d.p90_abs)} GW of firm cover to stay inside the 1-in-10 miss.</p>
          </Signal>
          <WatchList
            items={[
              `Worst day ${dayLabel(facts.worstDay.date)}: ${facts.worstDay.bias > 0 ? '+' : ''}${gw(facts.worstDay.bias)} GW average, ${Math.round((facts.worstDay.forecast_mwh - facts.worstDay.actual_mwh) / 1000)} GWh short`,
              `Too high on ${facts.overDays} of ${d.n_days} delivery days`,
              `Day-ahead lead times (12–42 h) carry ~${gw(facts.dayAheadMae)} GW MAE across all publishes`,
              facts.allHoursHigh ? 'Bias is positive in every hour: a level problem, not timing' : 'Bias changes sign through the day: timing matters too',
            ]}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card eyebrow={`Error distribution · ${sel.label}`} title={`${pct(acc.selected.over_share)} of forecasts landed above metered output`}>
          <div className="h-[16rem]">
            <ResponsiveContainer>
              <BarChart data={acc.selected.histogram} margin={{ top: 4, right: 12, bottom: 0, left: -8 }} barCategoryGap={1}>
                <CartesianGrid stroke={GRID} strokeWidth={0.8} vertical={false} />
                <XAxis dataKey="from" tickFormatter={(v: number) => `${v / 1000}`} tick={tick} axisLine={axisLine} tickLine={false} interval={3} />
                <YAxis tick={tick} axisLine={axisLine} tickLine={false} label={{ value: 'hours', angle: -90, position: 'insideLeft', offset: 18, ...tick }} />
                <Tooltip cursor={barCursor} content={simpleTip((l) => `Miss ${Number(l) / 1000} to ${(Number(l) + 500) / 1000} GW`, (v) => `${v} h`)} />
                <ReferenceLine x={0} stroke={AXIS} />
                <Bar dataKey="count" name="Hours" isAnimationActive={false}>
                  {acc.selected.histogram.map((b) => <Cell key={b.from} fill={b.from >= 0 ? INK : BRAND} fillOpacity={b.from >= 0 ? 0.75 : 0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[8px] text-[#7a776e]">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-brand" /> Under-forecast</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-ink/75" /> Over-forecast</span>
            <span className="ml-auto">x: forecast − metered, GW · median miss {gw(acc.selected.p50_abs)} GW · P90 {gw(acc.selected.p90_abs)} GW</span>
          </div>
        </Card>

        <Card eyebrow="Daily bias · gate-time forecast" title={`Too high on ${facts.overDays} of ${d.n_days} delivery days`}>
          <div className="h-[16rem]">
            <ResponsiveContainer>
              <BarChart data={d.by_day} margin={{ top: 4, right: 12, bottom: 0, left: -8 }} barCategoryGap={2}>
                <CartesianGrid stroke={GRID} strokeWidth={0.8} vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(8)} tick={tick} axisLine={axisLine} tickLine={false} interval={3} />
                <YAxis {...yGW(0)} />
                <Tooltip
                  cursor={barCursor}
                  content={(p) => {
                    const r = p.active ? (p.payload?.[0]?.payload as (typeof d.by_day)[number] | undefined) : undefined
                    return r ? (
                      <TipCard
                        title={`Delivery ${dayLabel(r.date)}`}
                        rows={[
                          { label: 'Average bias', value: `${r.bias > 0 ? '+' : ''}${gw(r.bias, 2)} GW`, color: r.bias >= 0 ? INK : BRAND },
                          { label: 'MAE', value: `${gw(r.mae, 2)} GW` },
                          { label: 'Forecast', value: `${Math.round(r.forecast_mwh / 1000)} GWh`, color: BRAND },
                          { label: 'Metered', value: `${Math.round(r.actual_mwh / 1000)} GWh`, color: INK, dashed: true },
                        ]}
                        foot={`${r.forecast_mwh > r.actual_mwh ? 'Short' : 'Long'} ${Math.abs(Math.round((r.forecast_mwh - r.actual_mwh) / 1000))} GWh against the gate-time forecast`}
                      />
                    ) : null
                  }}
                />
                <ReferenceLine y={0} stroke={AXIS} />
                <Bar dataKey="bias" name="bias" isAnimationActive={false}>
                  {d.by_day.map((x) => <Cell key={x.date} fill={x.bias >= 0 ? INK : BRAND} fillOpacity={x.bias >= 0 ? 0.75 : 0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  )
})
