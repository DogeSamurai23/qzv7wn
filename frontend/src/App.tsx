import { useState } from 'react'
import { Wind } from 'lucide-react'
import DecisionView from './DecisionView'
import AccuracyView from './AccuracyView'
import { Eyebrow } from './ui'

const TABS = [
  { id: 'decision', label: 'Decision view' },
  { id: 'accuracy', label: 'Accuracy view' },
] as const
type Tab = (typeof TABS)[number]['id']

const CHIPS = ['Gate-time Forecast', 'Probabilistic Ranges', 'Forecast Drift Analysis', 'Multi-horizon Views', 'No Look-ahead']
const primaryBtn = 'inline-flex items-center justify-center gap-2 text-sm font-semibold transition-all bg-brand text-white border border-brand hover:opacity-92 shadow-lg shadow-brand/10'
const secondaryBtn = 'inline-flex items-center justify-center gap-2 text-sm font-semibold transition-all bg-surface text-ink border border-ink/10 hover:border-ink/25 hover:bg-ink/[0.03]'

export default function App() {
  const [tab, setTabState] = useState<Tab>(() => (location.hash === '#accuracy' ? 'accuracy' : 'decision'))
  const setTab = (t: Tab, scroll = false) => {
    setTabState(t)
    history.replaceState(null, '', `#${t}`)
    if (scroll) document.getElementById('surface')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="fixed top-0 right-0 left-0 z-50 bg-bg/70 py-5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6">
          <a className="flex shrink-0 items-center gap-3" href="#">
            <Wind className="h-8 w-8 text-brand" strokeWidth={2} />
            <span className="text-2xl font-bold tracking-tight text-brand">windesk</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id, true)} className={`text-sm font-medium transition-colors hover:text-brand ${tab === t.id ? 'text-ink' : 'text-subtext'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a className="hidden text-sm font-medium text-subtext transition-colors hover:text-ink md:inline" href="https://bmrs.elexon.co.uk/" target="_blank" rel="noreferrer">
              Elexon data
            </a>
            <button onClick={() => setTab('decision', true)} className={`${primaryBtn} px-4 py-2.5`}>See the decision</button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-border bg-white pt-32 pb-10 md:pt-40 md:pb-12">
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="max-w-5xl">
            <Eyebrow className="mb-4">GB wind · day-ahead · January 2026</Eyebrow>
            <h1 className="text-5xl leading-[1.02] font-bold tracking-tight text-ink md:text-7xl">Wind forecasts that drive day‑ahead decisions.</h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-subtext md:text-lg">
              The exact national wind forecast a GB buyer had when the day-ahead auction closed, how far to trust it, and how much firm power to line up
              behind it. Built on Elexon WINDFOR forecasts and FUELHH metered output.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setTab('decision', true)} className={`${primaryBtn} px-6 py-3.5`}>Open the decision view</button>
              <button onClick={() => setTab('accuracy', true)} className={`${secondaryBtn} px-6 py-3.5`}>See forecast accuracy</button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-2">
              {CHIPS.map((c) => (
                <div key={c} className="border border-ink/10 bg-[#fbfbf9] px-3.5 py-2 text-sm font-medium text-ink">{c}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="surface" className="scroll-mt-20 border-b border-border bg-white pt-8 pb-14 md:pt-10 md:pb-18">
        <div className="mx-auto max-w-7xl px-6">
          <div className="border border-ink/10 bg-white p-4 shadow-[0_24px_80px_rgba(43,42,42,0.08)] md:p-5">
            <div className="mb-4 border border-ink/8 bg-[#f7f6f2] px-4 py-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Live surface</div>
              <p className="text-sm font-medium text-ink md:text-base">
                {tab === 'decision'
                  ? 'Pick a delivery day: see the forecast available at gate closure, its likely range, and what actually happened.'
                  : 'How wrong the forecast was across January, by lead time, hour of day and delivery day.'}
              </p>
            </div>

            <div className="overflow-hidden border border-ink/10 bg-surface shadow-xl shadow-ink/[0.06]">
              <div className="border-b border-ink/10 bg-[#f8f8f6] px-4 py-3">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:items-end">
                  {TABS.map((t) => (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)} className="flex flex-col justify-end text-left">
                      <div className={`mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${tab === t.id ? 'text-brand' : 'text-subtext/40 hover:text-subtext'}`}>
                        {t.label}
                      </div>
                      <div className="h-[3px] overflow-hidden rounded-full bg-ink/8">
                        {tab === t.id && <div className="h-full w-full rounded-full bg-brand" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 p-3 md:gap-4 md:p-5">
                {tab === 'decision' ? <DecisionView /> : <AccuracyView />}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-bg">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-6 py-8 text-sm font-light text-subtext">
          <span>Prototype for the REint Full Stack SWE challenge. Not an official REint product.</span>
          <span>Elexon BMRS snapshot taken 25 Oct 2026 · times in UTC (= UK time in January)</span>
        </div>
      </footer>
    </div>
  )
}
