import { useEffect, useState } from 'react'
import { RiskBadge } from '../../components/ui'
import { evidenceSourceLabel, type EdgeKind, type EvidenceSource, type GraphNode, type RiskAnalysis } from '../../data/riskIntel'
import { siteById, type Risk } from '../../data/scenario'
import { color } from '../../theme/tokens'

const edgeColor: Record<EdgeKind, string> = {
  direct: color.cyan,
  indirect: color.ink2,
  possible: color.mid,
}

const edgeLabel: Record<EdgeKind, string> = {
  direct: '直接影響',
  indirect: '間接影響',
  possible: '可能影響',
}

const sourceColor: Record<EvidenceSource, string> = {
  device: color.high,
  wms: color.low,
  power: color.accent,
  record: color.violet,
}

// Dependency Graph：左側成因 → 中央核心事件 → 右側影響項目
function DependencyGraph({ analysis }: { analysis: RiskAnalysis }) {
  const W = 520
  const H = 260
  const boxW = 150
  const boxH = 44
  const cx = W / 2
  const cy = H / 2
  const ys = (n: number) => Array.from({ length: n }, (_, i) => (H / n) * (i + 0.5))

  const node = (n: GraphNode, x: number, y: number, key: string, tone: string) => (
    <g key={key}>
      <rect x={x} y={y - boxH / 2} width={boxW} height={boxH} rx={6} fill={color.bg} stroke={tone} strokeOpacity={0.6} />
      <text x={x + 10} y={n.sub ? y - 3 : y + 4} fill={color.ink} fontSize={12}>
        {n.label}
      </text>
      {n.sub && (
        <text x={x + 10} y={y + 13} fill={color.mute} fontSize={10.5}>
          {n.sub}
        </text>
      )}
    </g>
  )

  const edge = (x1: number, y1: number, x2: number, y2: number, kind: EdgeKind, key: string) => {
    const mx = (x1 + x2) / 2
    return (
      <path
        key={key}
        d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
        fill="none"
        stroke={edgeColor[kind]}
        strokeWidth={1.5}
        strokeDasharray={kind === 'direct' ? undefined : kind === 'indirect' ? '2 4' : '6 4'}
        markerEnd={`url(#arrow-${kind})`}
      />
    )
  }

  const causeYs = ys(analysis.causes.length)
  const impactYs = ys(analysis.impacts.length)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <defs>
        {(Object.keys(edgeColor) as EdgeKind[]).map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={edgeColor[k]} />
          </marker>
        ))}
        <radialGradient id="core-glow">
          <stop offset="0%" stopColor={color.high} stopOpacity={0.55} />
          <stop offset="100%" stopColor={color.high} stopOpacity={0} />
        </radialGradient>
      </defs>

      {analysis.causes.map((n, i) => edge(boxW, causeYs[i], cx - 46, cy, n.kind, `ce${i}`))}
      {analysis.impacts.map((n, i) => edge(cx + 46, cy, W - boxW - 2, impactYs[i], n.kind, `ie${i}`))}

      {analysis.causes.map((n, i) => node(n, 0, causeYs[i], `c${i}`, color.lineStrong))}
      {analysis.impacts.map((n, i) => node(n, W - boxW, impactYs[i], `i${i}`, edgeColor[n.kind]))}

      <circle cx={cx} cy={cy} r={64} fill="url(#core-glow)" />
      <circle cx={cx} cy={cy} r={44} fill={color.bg} stroke={color.high} strokeWidth={2} />
      <text x={cx} y={cy - 2} textAnchor="middle" fill={color.ink} fontSize={12.5} fontWeight={600}>
        {analysis.core.label}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill={color.high} fontSize={10}>
        {analysis.core.sub}
      </text>
    </svg>
  )
}

type EvidenceFilter = 'all' | EvidenceSource

export function RiskAnalysisPanel({ risk, analysis, open, onClose }: {
  risk: Risk
  analysis: RiskAnalysis
  open: boolean
  onClose: () => void
}) {
  const [filter, setFilter] = useState<EvidenceFilter>('all')
  useEffect(() => setFilter('all'), [risk.id])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const sources = [...new Set(analysis.evidence.map((e) => e.source))]
  const evidence = filter === 'all' ? analysis.evidence : analysis.evidence.filter((e) => e.source === filter)
  const site = siteById[risk.siteId]

  return (
    <>
      {/* 半透明遮罩：保留 P02 上下文可見，點擊即關閉 */}
      <div
        onClick={onClose}
        className={`fixed inset-0 top-16 z-30 bg-bg/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        aria-hidden={!open}
        className={`fixed top-16 right-0 bottom-0 z-30 flex w-[600px] flex-col border-l border-line-strong bg-panel/97 shadow-[-20px_0_50px_rgba(0,0,0,0.45)] backdrop-blur-md transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <div className="text-xs tracking-wider text-cyan">風險分析 RISK ANALYSIS</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
              {risk.title}
              <RiskBadge level={risk.level} />
            </div>
            <div className="mt-0.5 text-xs text-mute">
              {site.name} · {site.fullName}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md border border-line px-3 py-1 text-[13px] text-ink-2 hover:border-cyan hover:text-ink">
            返回 ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold">風險摘要</h3>
            <p className="text-[13px] leading-relaxed text-ink-2">{risk.summary}</p>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                ['影響訂單', `${risk.affectedOrders.toLocaleString()} 件`],
                ['發生可能性', `${risk.probability}%`],
                ['預計開始', risk.startDate],
                ['持續時間', risk.duration],
              ].map(([k, v]) => (
                <div key={k} className="rounded bg-panel-2 py-2">
                  <dt className="text-[11px] text-mute">{k}</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">原因分析 · 依賴關係圖</h3>
              <div className="flex gap-3 text-[11px] text-mute">
                {(Object.keys(edgeLabel) as EdgeKind[]).map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4" style={{ background: edgeColor[k] }} />
                    {edgeLabel[k]}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-between px-1 pb-1 text-[11px] text-mute">
              <span>可能原因</span>
              <span>影響項目</span>
            </div>
            <div className="rounded-md border border-line bg-bg/40 p-3">
              <DependencyGraph analysis={analysis} />
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">相關證據</h3>
              <div className="flex gap-1">
                {(['all', ...sources] as EvidenceFilter[]).map((f) => {
                  const n = f === 'all' ? analysis.evidence.length : analysis.evidence.filter((e) => e.source === f).length
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded px-2 py-0.5 text-xs transition ${f === filter ? 'bg-accent text-white' : 'text-ink-2 hover:bg-panel-2'}`}
                    >
                      {f === 'all' ? '全部' : evidenceSourceLabel[f]} ({n})
                    </button>
                  )
                })}
              </div>
            </div>
            <ul className="divide-y divide-line/60 rounded-md border border-line">
              {evidence.map((e) => (
                <li key={e.time + e.title} className="grid grid-cols-[44px_56px_1fr_auto] items-center gap-2 px-3 py-2 text-xs">
                  <span className="font-mono text-mute">{e.time}</span>
                  <span className="flex items-center gap-1.5 text-ink-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: sourceColor[e.source] }} />
                    {evidenceSourceLabel[e.source]}
                  </span>
                  <span className="text-ink">{e.title}</span>
                  <span className="text-mute">{e.detail}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">營運影響摘要</h3>
            <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-2">
              {analysis.impactSummary.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-risk-high">▸</span>
                  {s}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </>
  )
}
