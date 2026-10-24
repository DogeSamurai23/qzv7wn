import { useEffect, useMemo, useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, FIRST_DAY, LAST_DAY, gw, gwh, pct, hhmm, stamp, dayLabel, type Decision, type Vintage } from './api'
import { BRAND, Card, Chip, Field, GRID, INK, Signal, Status, Tile, WatchList, axisLine, legendProps, sparseDot, tick, tooltipStyle } from './ui'

const sign = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')

export default function DecisionView() {
  const [date, setDate] = useState('2026-01-15')
  const [gate, setGate] = useState('09:50')
  const [showVintages, setShowVintages] = useState(true)
  const [showActual, setShowActual] = useState(true)
  const [dec, setDec] = useState<Decision>()
  const [vints, setVints] = useState<Vintage[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!date || !gate) return
    let live = true
    Promise.all([api.decision(date, gate), api.vintages(date)])
      .then(([d, v]) => live && (setDec(d), setVints(v), setError(undefined)))
      .catch((e) => live && setError(String(e.message ?? e)))
    return () => { live = false }
  }, [date, gate])

  // Earlier vintages = publishes before the decision one; later ones are hindsight and stay hidden.
  const older = useMemo(() => (dec ? vints.filter((v) => v.publishTime < dec.publishTime) : []), [dec, vints])

  const rows = useMemo(() => {
    if (!dec) return []
    const k = (x: number | null) => (x == null ? null : x / 1000)
    return dec.hours.map((h) => {
      const row: Record<string, unknown> = {
        time: h.time,
        forecast: h.forecast / 1000,
        actual: k(h.actual),
        band: h.p10 == null ? null : [k(h.p10), k(h.p90)],
        wide: h.p5 == null ? null : [k(h.p5), k(h.p95)],
      }
      for (const v of older) row[v.publishTime] = k(v.hours.find((x) => x.time === h.time)?.forecast ?? null)
      return row
    })
  }, [dec, older])

  const facts = useMemo(() => {
    if (!dec) return null
    const hs = dec.hours
    const low = hs.reduce((a, b) => (b.forecast < a.forecast ? b : a))
    const ramp = hs.slice(1).map((h, i) => ({ h, d: h.forecast - hs[i].forecast })).reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) ? b : a))
    const prev = older.at(-1)
    const drift = prev ? hs.reduce((s, h) => s + h.forecast - (prev.hours.find((x) => x.time === h.time)?.forecast ?? h.forecast), 0) / hs.length : null
    const known = hs.filter((h) => h.actual != null)
    const worst = known.length ? known.map((h) => ({ h, e: h.forecast - h.actual! })).reduce((a, b) => (Math.abs(b.e) > Math.abs(a.e) ? b : a)) : null
    return { low, ramp, prev, drift, worst }
  }, [dec, older])

  if (error) return <Status error={error} />
  if (!dec || !facts) return <Status loading />

  const bias = dec.history.bias ?? 0
  const t = dec.totals_mwh
  const title =
    t.shortfall == null
      ? `Forecast covers ${dec.lead_hours.min}–${dec.lead_hours.max} h ahead`
      : `Metered wind came in ${gwh(Math.abs(t.shortfall))} GWh ${t.shortfall > 0 ? 'below' : 'above'} the forecast`

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>GB wind</Chip>
          <Chip active>Gate {dec.gate} UTC · D-1</Chip>
          <Chip>Lead {dec.lead_hours.min}–{dec.lead_hours.max} h</Chip>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext/65">Updated {stamp(dec.publishTime)}</div>
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <Field label="Delivery day">
          <input type="date" value={date} min={FIRST_DAY} max={LAST_DAY} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Gate closure (UTC)">
          <input type="time" value={gate} step={600} onChange={(e) => setGate(e.target.value)} />
        </Field>
        <div className="flex gap-2 pb-2">
          <Chip active={showVintages} onClick={() => setShowVintages(!showVintages)}>Forecast drift</Chip>
          <Chip active={showActual} onClick={() => setShowActual(!showActual)}>Hindsight actual</Chip>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.52fr)_280px]">
        <div className="grid content-start gap-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Tile label={`Forecast · ${dayLabel(dec.date)}`} value={`${gwh(t.forecast)} GWh`} />
            <Tile label="P10–P90 range" value={`${gwh(t.p10)}–${gwh(t.p90)} GWh`} />
            <Tile label="Bias to plan for" value={`${sign(-bias)}${gw(Math.abs(bias))} GW`} />
            <Tile label="Hindsight · metered" value={t.actual == null ? '—' : `${gwh(t.actual)} GWh`} />
          </div>

          <Card eyebrow={`Forecast at the ${dec.gate} gate · ${dayLabel(dec.date)}`} title={title}>
            <div className="h-[20rem]">
              <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 14, right: 12, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke={GRID} strokeWidth={0.8} vertical={false} />
                  <XAxis dataKey="time" tickFormatter={(v: string) => v.slice(11, 13)} tick={tick} axisLine={axisLine} tickLine={false} interval={3} />
                  <YAxis tick={tick} axisLine={axisLine} tickLine={false} domain={[0, 'auto']} tickFormatter={(v: number) => v.toFixed(0)} label={{ value: 'GW', angle: -90, position: 'insideLeft', offset: 18, ...tick }} />
                  <Tooltip {...tooltipStyle} labelFormatter={(l) => `${hhmm(String(l))} UTC`} formatter={(v, n) => [Array.isArray(v) ? `${Number(v[0]).toFixed(1)}–${Number(v[1]).toFixed(1)} GW` : `${Number(v).toFixed(2)} GW`, n]} />
                  <Legend {...legendProps} />
                  <Area type="monotone" dataKey="wide" name="P5–P95" legendType="none" stroke="none" fill={BRAND} fillOpacity={0.06} isAnimationActive={false} />
                  <Area type="monotone" dataKey="band" name="P10–P90 range" legendType="rect" stroke="none" fill={BRAND} fillOpacity={0.15} isAnimationActive={false} />
                  {showVintages &&
                    older.map((v) => (
                      <Line key={v.publishTime} type="monotone" dataKey={v.publishTime} name={`${stamp(v.publishTime)} vintage`} stroke={INK} strokeOpacity={0.16} strokeWidth={1} dot={false} legendType="none" isAnimationActive={false} />
                    ))}
                  <ReferenceLine x={facts.low.time} stroke={BRAND} strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Low wind', position: 'top', fontSize: 8, fill: BRAND }} />
                  {showActual && <Line type="monotone" dataKey="actual" name="Metered actual" stroke={INK} strokeWidth={2.2} strokeDasharray="5 4" dot={sparseDot(INK)} activeDot={{ r: 3.5 }} isAnimationActive={false} />}
                  <Line type="monotone" dataKey="forecast" name="Forecast at gate" stroke={BRAND} strokeWidth={2.8} dot={sparseDot(BRAND)} activeDot={{ r: 3.5 }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-3">
          <Signal label="Forecast signal" title={`Buy against forecast ${sign(-bias)} ${gw(Math.abs(bias))} GW`}>
            <p>
              The {hhmm(dec.publishTime)} UTC publish was the last before the {dec.gate} gate. Over the {dec.history.n} earlier decision hours it ran{' '}
              {sign(bias)}{gw(Math.abs(bias), 2)} GW and was too {bias > 0 ? 'high' : 'low'} in {pct(bias > 0 ? dec.history.over_share : 1 - (dec.history.over_share ?? 0))} of them.
            </p>
            <p>Keep about {gw(dec.history.p90_abs)} GW of firm cover for the 1-in-10 bad hour. The shaded range uses only days before the decision.</p>
          </Signal>
          <WatchList
            items={[
              `Lowest wind at ${hhmm(facts.low.time)}: ${gw(facts.low.forecast)} GW forecast`,
              `Steepest ramp into ${hhmm(facts.ramp.h.time)}: ${sign(facts.ramp.d)}${gw(Math.abs(facts.ramp.d))} GW in an hour`,
              facts.prev && facts.drift != null
                ? `Forecast ${facts.drift >= 0 ? 'up' : 'down'} ${gw(Math.abs(facts.drift), 2)} GW on average since the ${hhmm(facts.prev.publishTime)} publish`
                : 'No earlier publish covers this day',
              facts.worst ? `Hindsight: worst miss at ${hhmm(facts.worst.h.time)}, ${sign(facts.worst.e)}${gw(Math.abs(facts.worst.e))} GW` : 'Metered output not yet available',
            ]}
          />
        </div>
      </div>
    </>
  )
}
