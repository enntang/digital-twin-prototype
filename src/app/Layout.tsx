import { NavLink, Outlet } from 'react-router-dom'
import { Copilot } from '../components/copilot/Copilot'
import { DemoTag } from '../components/ui'
import { SCENARIO_NOW } from '../data/scenario'

const steps = [
  { to: '/overview', no: '01', label: '營運總覽' },
  { to: '/risk', no: '02', label: '風險預測' },
  { to: '/simulation', no: '03', label: '策略模擬' },
  { to: '/tracking', no: '04', label: '成效追蹤' },
]

export function Layout() {
  return (
    <div className="flex h-full min-w-[1280px] flex-col">
      <header className="relative z-20 flex h-16 shrink-0 items-center gap-8 border-b border-line bg-bg/80 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-accent">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan shadow-[0_0_10px_#22d3ee]" />
          </span>
          <div className="leading-tight">
            <div className="font-semibold tracking-wide">物流數位雙生平台</div>
            <div className="text-[11px] tracking-widest text-mute">OPERATIONAL DIGITAL TWIN</div>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s.to} className="flex items-center">
              <NavLink
                to={s.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive ? 'bg-accent/15 text-ink ring-1 ring-accent/60' : 'text-mute hover:text-ink-2'
                  }`
                }
              >
                <span className="font-mono text-xs text-cyan">{s.no}</span>
                {s.label}
              </NavLink>
              {i < steps.length - 1 && <span className="mx-1 text-line-strong">›</span>}
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-xs text-mute">
          <span>
            資料更新：<span className="font-mono text-ink-2">{SCENARIO_NOW}</span>
          </span>
          <DemoTag />
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
      <Copilot />
    </div>
  )
}
