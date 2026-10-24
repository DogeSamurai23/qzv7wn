import { useEffect, useMemo, useState } from 'react'
import { Area, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { api, FIRST_DAY, LAST_DAY, gw, gwh, pct, hhmm, stamp, dayLabel, type Decision, type Vintage } from './api'
import { BRAND, Card, Chip, GRID, INK, Signal, Status, Tile, WatchList, axisLine, tick, tooltipStyle } from './ui'

export default function DecisionView({ onUpdated }: { onUpdated: (s: string) => void }) {
  const [date, setDate] = useState('2026-01-15')
  const [gate, setGate] = useState('09:50')
  const [showVintages, setShowVintages] = useState(true)
  const [showActual, setShowActual] = useState(true)
  const [dec, setDec] = useState<Decision>()
  const [vints, setVints] = useState<Vintage[]>([])
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!date || !gate) return
    let live = true
    setLoading(true)
    Promise.all([api.decision(date, gate), api.vintages(date)])
      .then(([d, v]) => {
        if (!live) return
        setDec(d); setVints(v); setError(undefined); onUpdated(stamp(d.publishTime))
      })
      .catch((e) => live && setError(String(e.message ?? e)))
      .finally(() => live && setLoading(false))
    return () => { live = false }
  }, [date, gate, onUpdated])

  // Older vintages = publishes before the decision one; later ones are hindsight and stay hidden.
  const older = useMemo(() => (dec ? vints.filter((v) => v.publishTime < dec.publishTime) : []), [dec, vints])

  const rows = useMemo(() => {
    if (!dec) return []
    return dec.hours.map((h) => {
      const row: Record<string, number | string | null | [number, number]> = {
        time: h.time,
        forecast: h.forecast / 1000,
        actual: h.actual == null ? null : h.actual / 1000,
        band: h.p10 == null || h.p90 == null ? null : [h.p10 / 1000, h.p90 / 1000],
      }
      for (const v of older) {
        const pt = v.hours.find((x) => x.time === h.time)
        row[v.publishTime] = pt ? pt.forecast / 1000 : null
      }
      return row
    })
  }, [dec, older])

  const watch = useMemo(() => {
    if (!dec) return []
    const hs = dec.hours
    const low = hs.reduce((a, b) => (b.forecast < a.forecast ? b : a))
    const ramp = hs.slice(1).map((h, i) => ({ h, d: h.forecast - hs[i].forecast })).reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) ? b : a))
    const prev = older.at(-1)
    const drift = prev ? hs.reduce((s, h) => s + (h.forecast - (prev.hours.find((x) => x.time === h.time)?.forecast ?? h.forecast)), 0) / hs.length : null
    const worst = hs.filter((h) => h.actual != null).map((h) => ({ h, e: h.forecast - (h.actual as number) })).reduce((a, b) => (Math.abs(b.e) > Math.abs(a.e) ? b : a), { h: hs[0], e: 0 })
    return [
      { label: 'Lowest forecast hour', value: `${hhmm(low.time)} · ${gw(low.forecast)} GW` },
      { label: 'Largest hourly ramp', value: `${hhmm(ramp.h.time)} · ${ramp.d > 0 ? '+' : ''}${gw(ramp.d)} GW` },
      { label: prev ? `Drift since ${hhmm(prev.publishTime)} UTC vintage` : 'Drift since previous vintage', value: drift == null ? '—' : `${drift > 0 ? '+' : ''}${gw(drift, 2)} GW avg` },
      { label: 'Hindsight · worst hour miss', value: `${hhmm(worst.h.time)} · ${worst.e > 0 ? '+' : ''}${gw(worst.e)} GW` },
    ]
  }, [dec, older])

  const bias = dec?.history.bias ?? 0
  const over = bias > 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <label className="block">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext">Delivery day</div>
          <input type="date" value={date} min={FIRST_DAY} max={LAST_DAY} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext">Gate closure (UTC, D-1)</div>
          <input type="time" value={gate} step={600} onChange={(e) => setGate(e.target.value)} />
        </label>
        <div className="flex gap-2 pb-0.5">
          <Chip active={showVintages} onClick={() => setShowVintages(!showVintages)}>Forecast drift</Chip>
          <Chip active={showActual} onClick={() => setShowActual(!showActual)}>Hindsight actual</Chip>
        </div>
        {dec && (
          <div className="ml-auto text-right text-[11px] font-light text-subtext">
            Forecast used: <span className="font-mono text-ink">{stamp(dec.publishTime)}</span>
            <br />
            Lead time {dec.lead_hours.min}–{dec.lead_hours.max} h · {older.length} earlier vintage{older.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      <Status error={error} loading={loading && !dec} />

      {dec && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Day-ahead forecast" value={gwh(dec.totals_mwh.forecast)} unit="GWh" sub={`24 h for ${dayLabel(dec.date)}, published ${hhmm(dec.publishTime)} UTC`} />
            <Tile label="Probabilistic range · P10–P90" value={`${gwh(dec.totals_mwh.p10)}–${gwh(dec.totals_mwh.p90)}`} unit="GWh" sub={`from ${dec.history.n} earlier decision hours`} />
            <Tile label="Plan for" value={`${gw(Math.abs(bias))} GW ${over ? 'less' : 'more'}`} sub={`average ${over ? 'over' : 'under'}-forecast, ${dayLabel(dec.history.first_day)} to ${dayLabel(dec.history.last_day)}`} />
            <Tile
              label="Hindsight · metered"
              value={gwh(dec.totals_mwh.actual)}
              unit="GWh"
              sub={dec.totals_mwh.shortfall == null ? 'actuals not yet available' : `${dec.totals_mwh.shortfall > 0 ? 'shortfall' : 'surplus'} ${gwh(Math.abs(dec.totals_mwh.shortfall))} GWh (${Math.round((100 * Math.abs(dec.totals_mwh.shortfall)) / dec.totals_mwh.forecast)} %)`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card
              title={`Forecast at the ${dec.gate} gate vs. metered wind · ${dayLabel(dec.date)}`}
              className="lg:col-span-2"
              note={`Green line: the WINDFOR publish available at gate closure. Shaded band: where the metered outcome is likely to land, built only from decision-forecast errors on earlier days (P10–P90). ${showActual ? 'Dashed line: what actually happened.' : ''} ${showVintages && older.length ? 'Faint lines: earlier publishes for the same day, showing forecast drift.' : ''}`}
            >
              <div className="h-[320px]">
                <ResponsiveContainer>
                  <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke={GRID} strokeWidth={0.8} vertical={false} />
                    <XAxis dataKey="time" tickFormatter={hhmm} tick={tick} axisLine={axisLine} tickLine={false} interval={2} />
                    <YAxis tick={tick} axisLine={false} tickLine={false} unit="" domain={[0, 'auto']} tickFormatter={(v: number) => v.toFixed(0)} label={{ value: 'GW', position: 'insideTopLeft', offset: -2, ...tick }} />
                    <Tooltip {...tooltipStyle} labelFormatter={(l) => `${hhmm(String(l))} UTC`} formatter={(v, name) => [Array.isArray(v) ? `${v[0].toFixed(1)}–${v[1].toFixed(1)} GW` : `${Number(v).toFixed(2)} GW`, name]} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.12em' }} iconSize={8} />
                    <Area type="monotone" dataKey="band" name="P10–P90 range" stroke="none" fill={BRAND} fillOpacity={0.15} connectNulls isAnimationActive={false} />
                    {showVintages &&
                      older.map((v) => (
                        <Line key={v.publishTime} type="monotone" dataKey={v.publishTime} name={`${hhmm(v.publishTime)} vintage`} stroke={INK} strokeOpacity={0.18} strokeWidth={1} dot={false} legendType="none" isAnimationActive={false} />
                      ))}
                    <Line type="monotone" dataKey="forecast" name="Forecast at gate" stroke={BRAND} strokeWidth={2.8} dot={{ r: 3, fill: '#fff', stroke: BRAND, strokeWidth: 1.5 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                    {showActual && <Line type="monotone" dataKey="actual" name="Metered actual" stroke={INK} strokeWidth={2.2} strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={false} />}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="space-y-4">
              <Signal title="Forecast signal">
                <p>
                  Published <span className="font-mono">{stamp(dec.publishTime)}</span>, the last update before the {dec.gate} gate. It covers {dayLabel(dec.date)} at {dec.lead_hours.min}–{dec.lead_hours.max} h ahead.
                </p>
                <p>
                  Over the {dec.history.n} earlier decision hours this forecast ran <span className="font-mono">{over ? '+' : ''}{gw(bias, 2)} GW</span> on average and was {over ? 'too high' : 'too low'} in {pct(over ? dec.history.over_share : 1 - (dec.history.over_share ?? 0))} of hours.
                </p>
                <p className="font-semibold">
                  Buy against forecast {over ? '−' : '+'} {gw(Math.abs(bias))} GW, and keep about {gw(dec.history.p90_abs)} GW of firm cover for the 1-in-10 bad hour.
                </p>
              </Signal>
              <WatchList items={watch} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
