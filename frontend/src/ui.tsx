// Presentational pieces shared by both views. Class lists mirror the reint.ai "Live surface" panel markup.
import type { ReactNode } from 'react'

export const BRAND = '#148937'
export const INK = '#2b2a2a'
export const GRID = '#e8e7e3'
export const AXIS = '#d8d6cf'
export const TICK = '#7a776e'
export const DOT_FILL = '#fcfcfc'

// Chart chrome: 8px ticks, recessive grid, axis lines like their SVGs.
export const tick = { fontSize: 8, fill: TICK, fontFamily: 'Inter, sans-serif' }
export const axisLine = { stroke: AXIS, strokeWidth: 1 }
export const legendProps = {
  verticalAlign: 'top' as const,
  align: 'right' as const,
  iconType: 'plainline' as const,
  iconSize: 14,
  height: 24,
  wrapperStyle: { fontSize: 8, fontFamily: 'Inter, sans-serif', color: TICK },
}
export const tooltipStyle = {
  contentStyle: { border: `0.8px solid ${INK}1a`, background: '#fff', fontSize: 11, fontFamily: 'Inter, sans-serif', padding: '8px 10px', boxShadow: '0 10px 15px -3px rgba(43,42,42,0.06)' },
  labelStyle: { color: INK, fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#5a5856', padding: 0 },
  cursor: { stroke: BRAND, strokeOpacity: 0.5, strokeDasharray: '4 4' },
}

// Hollow dot on every 4th point, as on their charts.
export const sparseDot = (color: string) => (p: { cx?: number; cy?: number; index?: number; value?: unknown }) =>
  p.index! % 4 === 0 && p.value != null ? (
    <circle key={p.index} cx={p.cx} cy={p.cy} r={2.5} fill={DOT_FILL} stroke={color} strokeWidth={1.6} />
  ) : (
    <g key={p.index} />
  )

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] text-brand ${className}`}>{children}</div>
}

export function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/8 bg-[#fbfbf9] px-2 py-2 md:px-4 md:py-3">
      <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-subtext md:text-[10px]">{label}</div>
      <div className="text-sm font-semibold text-ink md:text-lg">{value}</div>
    </div>
  )
}

export function Card({ eyebrow, title, children, className = '' }: { eyebrow: string; title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`border border-ink/8 bg-[#fbfbf9] p-4 ${className}`}>
      <div className="mb-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext">{eyebrow}</div>
        <div className="text-lg font-semibold text-ink">{title}</div>
      </div>
      {children}
    </div>
  )
}

// Small square chips from the panel's top row: neutral, or brand when active.
export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  const cls = `border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
    active ? 'border-brand/20 bg-brand/[0.05] text-brand' : 'border-ink/8 bg-[#fbfbf9] text-subtext'
  }`
  return onClick ? <button type="button" onClick={onClick} className={`${cls} ${active ? '' : 'hover:border-ink/20'}`}>{children}</button> : <span className={cls}>{children}</span>
}

export function Signal({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <div className="border border-brand/20 bg-brand/[0.05] px-4 py-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">{label}</div>
      <div className="mb-2 text-base font-semibold text-ink">{title}</div>
      <div className="space-y-2 text-sm leading-relaxed text-subtext">{children}</div>
    </div>
  )
}

export function WatchList({ items }: { items: ReactNode[] }) {
  return (
    <div className="border border-ink/8 bg-ink px-4 py-4 text-white">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">Watch list</div>
      <div className="grid gap-3">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-1.5 h-2 w-2 shrink-0 bg-brand" />
            <p className="text-sm leading-relaxed text-white/78">{it}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Status({ error, loading }: { error?: string; loading?: boolean }) {
  if (error) return <div className="border border-red-800/20 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
  if (loading) return <div className="px-1 py-3 text-sm font-light text-subtext">Loading…</div>
  return null
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext">{label}</div>
      {children}
    </label>
  )
}
