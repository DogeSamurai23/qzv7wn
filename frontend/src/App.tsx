import { useState } from 'react'
import { Wind } from 'lucide-react'
import DecisionView from './DecisionView'
import AccuracyView from './AccuracyView'
import { Eyebrow } from './ui'

const TABS = [
  { id: 'decision', label: 'Decision view', hint: 'Latest forecast at the gate' },
  { id: 'accuracy', label: 'Accuracy view', hint: 'How wrong, how often, by how much' },
] as const
type Tab = (typeof TABS)[number]['id']

export default function App() {
  const [tab, setTabState] = useState<Tab>(() => (location.hash === '#accuracy' ? 'accuracy' : 'decision'))
  const setTab = (t: Tab) => { setTabState(t); history.replaceState(null, '', `#${t}`) }
  const [updated, setUpdated] = useState<string>('')

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-brand" strokeWidth={2.2} />
            <span className="text-[15px] font-bold tracking-tight">windesk</span>
            <span className="ml-3 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-subtext sm:inline">GB wind · day-ahead</span>
          </div>
          <nav className="flex gap-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${tab === t.id ? 'text-ink' : 'text-subtext hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-subtext md:block">
            {updated ? `Updated ${updated}` : 'Elexon · Jan 2026'}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6">
        <Eyebrow>National wind · Elexon data · decisions made in January 2026</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-[-1.5px] sm:text-[40px] sm:leading-[1.05]">
          Wind forecasts that drive day-ahead decisions.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] font-light leading-relaxed text-subtext">
          See exactly the wind forecast a GB power buyer had when the day-ahead auction closed, how much to trust it, and
          how much extra firm power to line up.
        </p>
      </section>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="border border-ink/10 bg-surface shadow-xl shadow-ink/[0.06]">
          <div className="grid grid-cols-2 border-b border-ink/10">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className="group px-4 pt-4 text-left sm:px-6">
                <div className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${tab === t.id ? 'text-ink' : 'text-subtext group-hover:text-ink'}`}>
                  {t.label}
                </div>
                <div className="mt-1 text-[12px] font-light text-subtext">{t.hint}</div>
                <div className={`mt-3 h-[3px] w-full ${tab === t.id ? 'bg-brand' : 'bg-ink/8'}`} />
              </button>
            ))}
          </div>
          <div className="p-4 sm:p-6">
            {tab === 'decision' ? <DecisionView onUpdated={setUpdated} /> : <AccuracyView />}
          </div>
        </div>
      </main>

      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-[11px] font-light text-subtext sm:px-6">
          <span>Prototype for the REint Full Stack SWE challenge. Not an official REint product.</span>
          <span>Data: Elexon BMRS WINDFOR (forecast) and FUELHH WIND (metered output), snapshot taken 25 Oct 2026.</span>
        </div>
      </footer>
    </div>
  )
}
