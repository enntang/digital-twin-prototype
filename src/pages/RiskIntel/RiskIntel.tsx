import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RiskMatrix } from '../../components/charts/RiskMatrix'
import { RiskTrend } from '../../components/charts/RiskTrend'
import { Panel, RiskBadge } from '../../components/ui'
import { riskDetail } from '../../data/riskIntel'
import { riskById, riskCategoryLabel, risks, siteById, type RiskCategory } from '../../data/scenario'
import { useScenario, type PlanId } from '../../store/scenario'
import { categoryColor, color, riskColor } from '../../theme/tokens'
import { RiskAnalysisPanel } from './RiskAnalysisPanel'

export function RiskIntel() {
  const navigate = useNavigate()
  const { selectedRiskId, selectedPlanId, selectRisk, selectPlan } = useScenario()
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const closeAnalysis = useCallback(() => setAnalysisOpen(false), [])
  const location = useLocation()

  // 由 P07 設備檢視跳回選方案時，收合分析 Panel 讓方案卡片可見
  useEffect(() => {
    if (location.state && 'focusPlan' in location.state) setAnalysisOpen(false)
  }, [location.key, location.state])

  const risk = riskById[selectedRiskId] ?? risks[0]
  const detail = riskDetail[risk.id]
  const site = siteById[risk.siteId]

  const goSimulation = (id: PlanId) => {
    selectPlan(id)
    navigate('/simulation')
  }

  const kpis = [
    { label: '預測受影響訂單', value: risk.affectedOrders.toLocaleString(), unit: '件' },
    { label: '發生可能性', value: `${risk.probability}`, unit: '%', tone: risk.probability >= 60 ? color.high : color.mid },
    { label: '預計開始時間', value: risk.startDate },
    { label: '預計持續時間', value: risk.duration },
  ]

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* 風險選擇 */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="mr-1 text-xs text-mute">未來 7 天預測風險</span>
        {risks.map((r) => (
          <button
            key={r.id}
            onClick={() => selectRisk(r.id)}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] transition ${
              r.id === risk.id ? 'border-accent bg-accent/15 text-ink shadow-[0_0_14px_rgba(47,123,255,0.3)]' : 'border-line bg-bg/60 text-ink-2 hover:border-accent/60'
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: riskColor[r.level] }} />
            {r.title}
          </button>
        ))}
      </div>

      {/* 上：風險摘要 KPI */}
      <div className="grid shrink-0 grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] gap-3">
        <Panel bodyClassName="flex h-full flex-col justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{risk.title}</span>
            <RiskBadge level={risk.level} />
            <span className="rounded border border-line px-1.5 text-[11px] text-mute">{riskCategoryLabel[risk.category]}</span>
            <span className="ml-auto text-xs text-mute">{site.name}</span>
          </div>
          <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-2">{risk.summary}</p>
          <button
            onClick={() => setAnalysisOpen(true)}
            className="self-start rounded-md border border-cyan/60 bg-cyan/10 px-3 py-1 text-[13px] text-cyan transition hover:bg-cyan/20"
          >
            查看風險分析 ›
          </button>
        </Panel>
        {kpis.map((k) => (
          <Panel key={k.label} bodyClassName="flex h-full flex-col justify-center px-4 py-3">
            <div className="text-[13px] text-mute">{k.label}</div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="font-mono text-[28px] leading-none font-semibold" style={{ color: k.tone }}>
                {k.value}
              </span>
              {k.unit && <span className="text-xs text-mute">{k.unit}</span>}
            </div>
          </Panel>
        ))}
      </div>

      {/* 中：預測圖表 + Risk Matrix */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <Panel
          title={`風險時間趨勢 · ${detail.trend.metric}`}
          extra={
            <div className="flex gap-4 text-xs text-mute">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent" />實際值</span>
              <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-cyan" />預測值</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-risk-high" />{detail.trend.thresholdLabel}</span>
            </div>
          }
          bodyClassName="relative"
        >
          <RiskTrend trend={detail.trend} className="absolute inset-0" />
        </Panel>

        <Panel
          title="營運風險矩陣"
          extra={
            <div className="flex gap-3 text-xs text-mute">
              {(Object.keys(categoryColor) as RiskCategory[]).map((c) => (
                <span key={c} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: categoryColor[c] }} />
                  {riskCategoryLabel[c]}
                </span>
              ))}
            </div>
          }
          bodyClassName="relative"
        >
          <RiskMatrix risks={risks} selectedId={risk.id} onSelect={selectRisk} className="absolute inset-0" />
        </Panel>
      </div>

      {/* 下：AI 建議方案（同一風險的三種處理方案） */}
      <Panel
        className="shrink-0"
        title={
          <span className="flex items-center gap-2">
            <span className="text-cyan">✦</span> AI 建議行動方案
            <span className="text-xs font-normal text-mute">針對「{risk.title}」</span>
          </span>
        }
        bodyClassName="grid grid-cols-3 gap-3 px-4 pb-4"
      >
        {detail.plans.map((p) => {
          // 取整到十位，與 Copilot 口徑「約 800 件」一致
          const remaining = Math.round((risk.affectedOrders * (1 - p.reduction / 100)) / 10) * 10
          const active = p.id === selectedPlanId
          return (
            <article
              key={p.id}
              className={`flex flex-col rounded-lg border p-4 transition ${
                p.recommended ? 'border-accent/80 bg-accent/[0.07] shadow-[0_0_20px_rgba(47,123,255,0.18)]' : 'border-line bg-bg/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  方案 {p.id}｜{p.title}
                </span>
                {p.recommended && <span className="rounded bg-risk-low/20 px-1.5 py-0.5 text-[11px] text-risk-low">推薦</span>}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{p.desc}</p>
              <dl className="mt-3 space-y-1.5 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-mute">預估延遲訂單</dt>
                  <dd>
                    <span className="font-mono text-risk-low">↓ {p.reduction}%</span>
                    <span className="ml-2 font-mono text-xs text-mute">
                      {risk.affectedOrders.toLocaleString()} → 約 {remaining.toLocaleString()}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute">{p.costLabel}</dt>
                  <dd className="font-mono">+ NT$ {p.cost.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute">執行準備時間</dt>
                  <dd className="font-mono">{p.prepDays} 天</dd>
                </div>
              </dl>
              <button
                onClick={() => goSimulation(p.id)}
                className={`mt-4 rounded-md py-2 text-sm transition ${
                  p.recommended || active
                    ? 'bg-accent text-white shadow-[0_0_14px_rgba(47,123,255,0.4)] hover:bg-accent/85'
                    : 'border border-line-strong text-ink-2 hover:border-cyan hover:text-ink'
                }`}
              >
                {active ? '已選取 · 進入策略模擬 →' : '加入模擬 →'}
              </button>
            </article>
          )
        })}
      </Panel>

      <RiskAnalysisPanel risk={risk} analysis={detail.analysis} open={analysisOpen} onClose={closeAnalysis} />
    </div>
  )
}
