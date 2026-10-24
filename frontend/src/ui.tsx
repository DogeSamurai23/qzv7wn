// Small presentational pieces shared by both views, styled after the reint.ai "Live surface" cards.
import type { ReactNode } from 'react'

export const BRAND = '#148937'
export const INK = '#2b2a2a'
export const GRID = '#e8e7e3'
export const AXIS = '#d8d6cf'
export const TICK = '#7a776e'

export const tick = { fontSize: 10, fill: TICK, fontFamily: 'JetBrains Mono, monospace' }
export const axisLine = { stroke: AXIS }
export const tooltipStyle = {
  contentStyle: { border: `1px solid ${INK}1a`, background: '#fff', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', padding: '8px 10px' },
  labelStyle: { color: INK, fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#5a5856', padding: 0 },
  cursor: { stroke: INK, strokeOpacity: 0.25, strokeDasharray: '3 3' },
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`text-[11px] font-semibold uppercase tracking-[0.24em] text-brand ${className}`}>{children}</div>
}

export function Tile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="border border-ink/10 bg-card px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext">{label}</div>
      <div className="mt-1 font-mono text-[22px] font-medium leading-none tracking-tight text-ink">
        {value}
        {unit && <span className="ml-1 text-[12px] font-normal text-subtext">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-[11px] font-light text-subtext">{sub}</div>}
    </div>
  )
}

export function Card({ title, note, children, className = '' }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`border border-ink/10 bg-surface p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[13px] font-semibold tracking-tight text-ink">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
      {note && <p className="mt-3 border-t border-ink/10 pt-3 text-[12px] font-light leading-relaxed text-subtext">{note}</p>}
    </section>
  )
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
        active ? 'border-brand text-brand' : 'border-ink/10 text-subtext hover:border-ink/30'
      }`}
    >
      {children}
    </button>
  )
}

export function Signal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-brand/20 bg-brand/[0.05] p-4">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-ink">{children}</div>
    </section>
  )
}

export function WatchList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <section className="bg-ink p-4 text-white">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Watch list</div>
      <ul className="mt-3 space-y-2.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-start gap-3 text-[12px]">
            <span className="mt-1.5 block h-2 w-2 shrink-0 bg-brand" />
            <span className="font-light text-white/80">{it.label}</span>
            <span className="ml-auto whitespace-nowrap font-mono text-white">{it.value}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Status({ error, loading }: { error?: string; loading?: boolean }) {
  if (error) return <div className="border border-red-800/20 bg-red-50 px-4 py-3 text-[12px] text-red-900">{error}</div>
  if (loading) return <div className="px-1 py-3 text-[12px] font-light text-subtext">Loading…</div>
  return null
}
