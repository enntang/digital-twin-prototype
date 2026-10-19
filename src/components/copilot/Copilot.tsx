import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { copilotByRoute, equipmentCopilot, trackingCopilot, type CopilotQA } from '../../data/copilot'
import { isEquipmentId } from '../../data/equipment'
import { buildTracking } from '../../data/tracking'
import { useScenario } from '../../store/scenario'

function useTypewriter(text: string, active: boolean) {
  const [n, setN] = useState(active ? 0 : text.length)
  useEffect(() => {
    if (!active) return
    setN(0)
    const t = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(t), v) : v + 2)), 18)
    return () => clearInterval(t)
  }, [text, active])
  return text.slice(0, n)
}

function Answer({ text, typing }: { text: string; typing: boolean }) {
  const shown = useTypewriter(text, typing)
  return <p className="text-[13px] leading-relaxed text-ink-2">{shown}</p>
}

export function Copilot() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  // P07 設備深入檢視開啟時，改用該設備的預設問答
  const eqParam = params.get('equipment')
  const equipmentId = isEquipmentId(eqParam) ? eqParam : null
  const decision = useScenario((s) => s.decision)
  const ctx = useMemo(() => {
    if (equipmentId) return equipmentCopilot(equipmentId)
    return pathname === '/tracking' && decision ? trackingCopilot(buildTracking(decision)) : copilotByRoute[pathname] ?? copilotByRoute['/overview']
  }, [pathname, decision, equipmentId])
  const [open, setOpen] = useState(false)
  const [asked, setAsked] = useState<CopilotQA[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  // 換畫面就換一組情境問答
  useEffect(() => setAsked([]), [pathname, equipmentId])
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [asked])

  const remaining = ctx.qa.filter((qa) => !asked.includes(qa))

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full border border-cyan/50 bg-panel-2/95 px-4 py-2.5 text-sm font-medium text-ink shadow-[0_0_24px_rgba(34,211,238,0.35)] transition hover:border-cyan"
      >
        <span className="text-cyan">✦</span> AI Copilot
      </button>

      <aside
        className={`fixed top-16 right-0 bottom-0 z-40 flex w-[380px] flex-col border-l border-line bg-panel/95 backdrop-blur-md transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <span className="text-cyan">✦</span> AI Copilot
            </div>
            <div className="mt-0.5 text-xs text-mute">情境：{ctx.label} · 預設回覆</div>
          </div>
          <button onClick={() => setOpen(false)} className="text-xl leading-none text-mute hover:text-ink" aria-label="關閉">
            ×
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-lg border border-line bg-panel-2 p-3 text-[13px] leading-relaxed text-ink-2">{ctx.greeting}</div>
          {asked.map((qa, i) => (
            <div key={qa.q} className="space-y-2">
              <div className="ml-8 rounded-lg bg-accent/90 px-3 py-2 text-[13px] text-white">{qa.q}</div>
              <div className="rounded-lg border border-cyan/25 bg-cyan/5 p-3">
                <Answer text={qa.a} typing={i === asked.length - 1} />
              </div>
            </div>
          ))}
        </div>

        <footer className="space-y-2 border-t border-line px-5 py-4">
          <div className="text-xs text-mute">{remaining.length ? '建議提問' : '此畫面的示範問題已全部回答'}</div>
          {remaining.map((qa) => (
            <button
              key={qa.q}
              onClick={() => setAsked((v) => [...v, qa])}
              className="block w-full rounded-md border border-line bg-bg/60 px-3 py-2 text-left text-[13px] text-ink-2 transition hover:border-cyan/60 hover:text-ink"
            >
              {qa.q}
            </button>
          ))}
        </footer>
      </aside>
    </>
  )
}
