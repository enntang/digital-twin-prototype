import type { ReactNode } from 'react'
import type { RiskLevel } from '../../data/scenario'
import { riskLabel } from '../../theme/tokens'

export function Panel({ title, extra, children, className = '', bodyClassName = '' }: {
  title?: ReactNode
  extra?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={`relative flex min-h-0 flex-col rounded-lg border border-line bg-panel/85 shadow-[inset_0_1px_0_rgba(120,180,255,0.08),0_0_24px_rgba(20,80,200,0.08)] backdrop-blur-sm ${className}`}
    >
      {/* 左上角的霓虹角標 */}
      <span className="pointer-events-none absolute -top-px -left-px h-3 w-3 rounded-tl-lg border-t-2 border-l-2 border-cyan/70" />
      {title && (
        <header className="flex shrink-0 items-center justify-between px-4 pt-3.5 pb-2">
          <h2 className="text-[15px] font-semibold tracking-wide text-ink">{title}</h2>
          {extra}
        </header>
      )}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  )
}

const riskBadgeClass: Record<RiskLevel, string> = {
  high: 'border-risk-high/60 bg-risk-high/15 text-risk-high',
  mid: 'border-risk-mid/60 bg-risk-mid/15 text-risk-mid',
  low: 'border-risk-low/60 bg-risk-low/15 text-risk-low',
}

export function RiskBadge({ level, className = '' }: { level: RiskLevel; className?: string }) {
  return (
    <span className={`inline-flex h-5 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-medium ${riskBadgeClass[level]} ${className}`}>
      {riskLabel[level]}
    </span>
  )
}

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-line bg-bg/70 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-[13px] transition-colors ${
            o.value === value ? 'bg-accent text-white shadow-[0_0_12px_rgba(47,123,255,0.5)]' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function DemoTag() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-risk-watch/40 bg-risk-watch/10 px-2 py-0.5 text-xs text-risk-watch">
      <span className="h-1.5 w-1.5 rounded-full bg-risk-watch" />
      示範情境 · 模擬資料
    </span>
  )
}
