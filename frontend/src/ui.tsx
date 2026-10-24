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
export const lineCursor = { stroke: BRAND, strokeOpacity: 0.5, strokeDasharray: '4 4' }

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

// Chart tooltip in the same card language as the tiles: eyebrow title, swatch + label + value rows, optional footer.
export type TipRow = { label: string; value: string; color?: string; dashed?: boolean; area?: boolean; faint?: boolean }

export function TipCard({ title, rows, foot }: { title: string; rows: TipRow[]; foot?: ReactNode }) {
  return (
    <div className="min-w-[220px] border border-ink/10 bg-white px-3.5 py-3 shadow-xl shadow-ink/[0.08]">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext">{title}</div>
      <div className="grid gap-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2.5">
            {r.area ? (
              <span className="h-2.5 w-3.5 shrink-0" style={{ background: r.color, opacity: r.faint ? 0.12 : 0.3 }} />
            ) : (
              <span className="w-3.5 shrink-0 border-t-2" style={{ borderColor: r.color ?? 'transparent', borderStyle: r.dashed ? 'dashed' : 'solid' }} />
            )}
            <span className="text-xs text-subtext">{r.label}</span>
            <span className="ml-auto pl-4 text-sm font-semibold tabular-nums text-ink">{r.value}</span>
          </div>
        ))}
      </div>
      {foot && <div className="mt-2.5 border-t border-ink/8 pt-2 text-[11px] leading-relaxed text-subtext">{foot}</div>}
    </div>
  )
}

type TipProps = { active?: boolean; label?: unknown; payload?: readonly { name?: unknown; value?: unknown; color?: string; payload?: Record<string, unknown> }[] }

// Generic tooltip for simple charts: one row per series, values formatted by `fmt`.
export const simpleTip = (title: (label: unknown) => string, fmt: (v: unknown) => string) => (p: TipProps) =>
  p.active && p.payload?.length ? (
    <TipCard title={title(p.label)} rows={p.payload.map((it) => ({ label: String(it.name), value: fmt(it.value), color: it.color ?? INK }))} />
  ) : null
