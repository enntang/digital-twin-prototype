import type { ReactNode } from 'react'
import type { Plan } from '../../data/riskIntel'
import { sites, type Risk } from '../../data/scenario'
import { primaryParam, type SimParams } from '../../data/simulation'
import type { PlanId } from '../../store/scenario'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-3 text-[13px]">
      <span className="text-ink-2">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

const inputClass = 'rounded-md border border-line bg-bg/70 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent'

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-accent' : 'bg-line-strong'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

function Params({ plan, risk, params, onChange }: { plan: Plan; risk: Risk; params: SimParams; onChange: (p: SimParams) => void }) {
  const spec = primaryParam[plan.kind]
  const set = (patch: Partial<SimParams>) => onChange({ ...params, ...patch })
  const clamp = (v: number) => Math.min(spec.max, Math.max(spec.min, v))

  const slider = (
    <>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={params.value}
        onChange={(e) => set({ value: Number(e.target.value) })}
        className="flex-1 accent-accent"
      />
      <span className="w-14 rounded-md border border-line bg-bg/70 py-1 text-center font-mono text-[13px]">
        {params.value} {spec.unit}
      </span>
    </>
  )

  const stepper = (
    <div className="flex items-center overflow-hidden rounded-md border border-line">
      <button onClick={() => set({ value: clamp(params.value - spec.step) })} className="h-8 w-8 text-ink-2 hover:bg-panel-2" aria-label="減少">
        −
      </button>
      <span className="w-16 border-x border-line text-center font-mono leading-8">
        {params.value} {spec.unit}
      </span>
      <button onClick={() => set({ value: clamp(params.value + spec.step) })} className="h-8 w-8 text-ink-2 hover:bg-panel-2" aria-label="增加">
        +
      </button>
    </div>
  )

  switch (plan.kind) {
    case 'transfer':
      return (
        <>
          <Field label={spec.label}>{slider}</Field>
          <Field label="轉移目標據點">
            <select value={params.target} onChange={(e) => set({ target: e.target.value as SimParams['target'] })} className={`${inputClass} flex-1`}>
              {sites
                .filter((s) => s.id !== risk.siteId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.fullName}（產能 {s.utilization}%）
                  </option>
                ))}
            </select>
          </Field>
        </>
      )
    case 'labor':
      return (
        <>
          <Field label={spec.label}>{stepper}</Field>
          <Field label="晚班同步加派">
            <Switch checked={!!params.bothShifts} onChange={(v) => set({ bothShifts: v })} />
            <span className="text-xs text-mute">{params.bothShifts ? '晚班＋夜班' : '僅夜班'}</span>
          </Field>
        </>
      )
    case 'maintenance':
      return (
        <>
          <Field label="保養時間">
            <select value={params.value} onChange={(e) => set({ value: Number(e.target.value) })} className={`${inputClass} flex-1`}>
              {[0, 1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {d ? `提前 ${d} 天` : '維持原計畫'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="替代設備啟用">
            <Switch checked={!!params.backup} onChange={(v) => set({ backup: v })} />
            <span className="text-xs text-mute">保養期間啟用備援設備</span>
          </Field>
        </>
      )
    case 'schedule':
      return <Field label={spec.label}>{slider}</Field>
  }
}

export function StrategyPanel({ risk, plans, planId, params, onPlanChange, onParamsChange, onReset, onRun, runLabel }: {
  risk: Risk
  plans: Plan[]
  planId: PlanId
  params: SimParams
  onPlanChange: (id: PlanId) => void
  onParamsChange: (p: SimParams) => void
  onReset: () => void
  onRun: () => void
  runLabel: string
}) {
  const plan = plans.find((p) => p.id === planId)!

  return (
    <div className="flex h-full flex-col gap-5 px-4 pb-4">
      <div>
        <div className="mb-2 text-xs text-mute">選擇方案</div>
        <div className="grid grid-cols-3 gap-1 rounded-md border border-line bg-bg/60 p-1">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => onPlanChange(p.id)}
              className={`rounded px-2 py-1.5 text-center leading-tight transition ${
                p.id === planId ? 'bg-accent text-white shadow-[0_0_12px_rgba(47,123,255,0.5)]' : 'text-ink-2 hover:bg-panel-2'
              }`}
            >
              <div className="text-[13px] font-medium">方案 {p.id}</div>
              <div className={`mt-0.5 truncate text-[11px] ${p.id === planId ? 'text-white/80' : 'text-mute'}`}>{p.title}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{plan.desc}</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-mute">策略參數</span>
          <button onClick={onReset} className="text-xs text-cyan hover:underline">
            ↺ 重設為建議值
          </button>
        </div>
        <Params plan={plan} risk={risk} params={params} onChange={onParamsChange} />
      </div>

      <div className="mt-auto space-y-2">
        <button
          onClick={onRun}
          className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-white shadow-[0_0_18px_rgba(47,123,255,0.45)] transition hover:bg-accent/85"
        >
          ▶ {runLabel}
        </button>
        <p className="text-[11px] text-mute">模擬結果為預先設定的示範情境，僅供概念展示。</p>
      </div>
    </div>
  )
}
