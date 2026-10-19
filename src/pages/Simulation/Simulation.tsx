import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { TaiwanMap, type MapView } from '../../components/charts/TaiwanMap'
import { Panel, RiskBadge } from '../../components/ui'
import { riskDetail, type Plan } from '../../data/riskIntel'
import { riskById, risks, SCENARIO_NOW, siteById, type Risk, type RiskLevel, type SiteId } from '../../data/scenario'
import { defaultParams, describeParams, paramKey, simulate, type SimParams, type SimResult } from '../../data/simulation'
import { useScenario, type PlanId } from '../../store/scenario'
import { color } from '../../theme/tokens'
import { StrategyPanel } from './StrategyPanel'

const routeColor = color.low

// 地圖範圍框住風險據點、受影響據點與所有可分流的據點；P04 與 P05 Before/After 共用同一範圍
function viewFor(risk: Risk, plans: Plan[]): MapView {
  const ids = [risk.siteId, ...risk.impactSites, ...plans.flatMap((p) => (p.target ? [p.target] : []))]
  const lons = ids.map((id) => siteById[id].coord[0])
  const lats = ids.map((id) => siteById[id].coord[1])
  const span = Math.max(Math.max(...lons) - Math.min(...lons), (Math.max(...lats) - Math.min(...lats)) * 1.1)
  return {
    center: [(Math.max(...lons) + Math.min(...lons)) / 2, (Math.max(...lats) + Math.min(...lats)) / 2],
    zoom: Math.min(3, Math.max(1, 2.4 / (span + 0.6))),
  }
}

// 各策略在地圖上的呈現：分流畫調度路線，其他策略在風險據點標註參數
function mapOverlay(risk: Risk, plan: Plan, params: SimParams) {
  const routes = plan.kind === 'transfer' && params.target && params.value > 0 ? [{ from: risk.siteId, to: params.target, color: routeColor }] : []
  const notes: Partial<Record<SiteId, string>> = { [risk.siteId]: describeParams(plan, params) }
  if (plan.kind === 'transfer' && params.target) notes[params.target] = `承接 ${params.value}% 訂單`
  return { routes, notes }
}

export function Simulation() {
  const navigate = useNavigate()
  const { selectedRiskId, selectedPlanId, simParams, selectPlan, setParams, confirmDecision } = useScenario()
  const risk = riskById[selectedRiskId] ?? risks[0]
  const detail = riskDetail[risk.id]
  const plans = detail.plans
  const view = useMemo(() => viewFor(risk, plans), [risk, plans])

  // 預設帶入 P02 所選方案；未選時用推薦方案
  const planId: PlanId = selectedPlanId ?? plans.find((p) => p.recommended)?.id ?? 'A'
  const plan = plans.find((p) => p.id === planId)!
  const key = paramKey(risk.id, planId)
  const params = simParams[key] ?? defaultParams(plan)

  // 「執行情境模擬」後才套用的參數快照
  const [applied, setApplied] = useState<{ planId: PlanId; params: SimParams } | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const run = () => {
    setApplied({ planId, params })
    setPanelOpen(false)
  }

  const shared = {
    risk,
    plans,
    planId,
    params,
    onPlanChange: selectPlan,
    onParamsChange: (p: SimParams) => setParams(key, p),
    onReset: () => setParams(key, defaultParams(plan)),
    onRun: run,
  }

  if (!applied) {
    const overlay = mapOverlay(risk, plan, params)
    return (
      <div className="grid h-full grid-cols-[minmax(0,1fr)_420px] gap-4 p-4">
        <Panel className="overflow-hidden" bodyClassName="relative">
          <div className="absolute top-3 left-4 z-10">
            <div className="text-[15px] font-semibold">全國物流網路調度模擬</div>
            <div className="mt-0.5 text-xs text-mute">
              模擬期間 10/14 – 10/20（未來 7 天）· 目標：最小化出貨延遲
            </div>
          </div>
          <MapLegend showRoute={overlay.routes.length > 0} />
          <TaiwanMap
            view={view}
            selectedSiteId={risk.siteId}
            impact={risk.impactSites.length ? { from: risk.siteId, to: risk.impactSites } : null}
            routes={overlay.routes}
            notes={overlay.notes}
            className="absolute inset-0"
          />
        </Panel>

        <Panel
          title="策略設定"
          extra={<RiskBadge level={risk.level} />}
          bodyClassName="flex flex-col"
        >
          <div className="mx-4 mb-4 rounded-md border border-line bg-bg/40 px-3 py-2 text-[13px]">
            <div className="text-xs text-mute">模擬目標風險</div>
            <div className="mt-0.5 font-medium">{risk.title}</div>
            <div className="mt-1 text-xs text-ink-2">
              預測影響 {risk.affectedOrders.toLocaleString()} 件訂單 · {risk.startDate} 起 {risk.duration}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <StrategyPanel {...shared} runLabel="執行情境模擬" />
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <Results
      risk={risk}
      plan={plans.find((p) => p.id === applied.planId)!}
      params={applied.params}
      panelOpen={panelOpen}
      onTogglePanel={() => setPanelOpen((v) => !v)}
      view={view}
      onBack={() => setApplied(null)}
      onConfirm={(result) => {
        confirmDecision({ riskId: risk.id, planId: applied.planId, params: applied.params, result, confirmedAt: SCENARIO_NOW })
        navigate('/tracking')
      }}
      panel={<StrategyPanel {...shared} runLabel="重新模擬" />}
    />
  )
}

function MapLegend({ showRoute }: { showRoute: boolean }) {
  return (
    <div className="absolute top-3 right-4 z-10 space-y-2 rounded-md border border-line bg-bg/80 p-3 text-xs text-ink-2">
      {([['high', '高風險'], ['mid', '中風險'], ['low', '正常']] as const).map(([lv, label]) => (
        <div key={lv} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: { high: color.high, mid: color.mid, low: color.low }[lv] }} />
          {label}
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-line pt-2">
        <span className="h-0.5 w-4" style={{ background: color.high }} />
        風險影響範圍
      </div>
      {showRoute && (
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-4" style={{ background: routeColor }} />
          策略調度路線
        </div>
      )}
    </div>
  )
}

const levelText: Record<RiskLevel, string> = { high: '高', mid: '中', low: '低' }

function Results({ risk, plan, params, view, panelOpen, onTogglePanel, onBack, onConfirm, panel }: {
  risk: Risk
  plan: Plan
  params: SimParams
  view: MapView
  panelOpen: boolean
  onTogglePanel: () => void
  onBack: () => void
  onConfirm: (r: SimResult) => void
  panel: ReactNode
}) {
  const detail = riskDetail[risk.id]
  const result = useMemo(() => simulate(risk, plan, params), [risk, plan, params])
  const { unit, metric } = detail.trend

  const before = useMemo(() => {
    const notes: Partial<Record<SiteId, string>> = { [risk.siteId]: `尖峰${metric} ${result.peakBefore}${unit}` }
    if (result.target) notes[result.target.siteId] = `產能利用率 ${result.target.before}%`
    return { notes, impact: risk.impactSites.length ? { from: risk.siteId, to: risk.impactSites } : null }
  }, [risk, result, metric, unit])

  const after = useMemo(() => {
    const notes: Partial<Record<SiteId, string>> = { [risk.siteId]: `尖峰${metric} ${result.peakAfter}${unit}` }
    const levels: Partial<Record<SiteId, RiskLevel>> = { [risk.siteId]: result.levelAfter }
    if (result.target) {
      notes[result.target.siteId] = `產能利用率 ${result.target.before}% → ${result.target.after}%`
      levels[result.target.siteId] = result.target.level
    }
    const routes = result.target && params.value > 0 ? [{ from: risk.siteId, to: result.target.siteId, color: routeColor }] : []
    // 風險降至高以下時，不再波及其他據點
    const impact = result.levelAfter === 'high' && risk.impactSites.length ? { from: risk.siteId, to: risk.impactSites } : null
    return { notes, levels, routes, impact }
  }, [risk, result, params, metric, unit])

  const metrics: { label: string; before: string; after: string; delta: string; good: boolean }[] = [
    {
      label: '出貨準時率',
      before: `${result.onTimeBefore}%`,
      after: `${result.onTimeAfter}%`,
      delta: `↑ ${(result.onTimeAfter - result.onTimeBefore).toFixed(1)} pp`,
      good: true,
    },
    {
      label: '預測延遲訂單',
      before: `${result.delayedBefore.toLocaleString()} 件`,
      after: `${result.delayedAfter.toLocaleString()} 件`,
      delta: `↓ ${result.reduction}%`,
      good: true,
    },
    {
      label: `${siteById[risk.siteId].name} 尖峰${metric}`,
      before: `${result.peakBefore}${unit}`,
      after: `${result.peakAfter}${unit}`,
      delta: `↓ ${(result.peakBefore - result.peakAfter).toFixed(1)}${unit === '%' ? ' pp' : ` ${unit}`}`,
      good: true,
    },
    ...(result.target
      ? [{
          label: `${siteById[result.target.siteId].name} 產能利用率`,
          before: `${result.target.before}%`,
          after: `${result.target.after}%`,
          delta: `↑ ${result.target.after - result.target.before} pp`,
          good: false,
        }]
      : []),
    { label: plan.costLabel, before: '-', after: `NT$ ${result.cost.toLocaleString()}`, delta: `準備 ${result.prepDays} 天`, good: false },
  ]

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* 結果標題列：收合的策略設定摘要 + 操作 */}
        <Panel bodyClassName="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs tracking-wider text-cyan">模擬結果 SIMULATION RESULTS</div>
            <div className="mt-0.5 flex items-center gap-2 font-semibold">
              方案 {plan.id}｜{plan.title}
              <span className="rounded border border-line px-1.5 text-xs font-normal text-ink-2">{describeParams(plan, params)}</span>
            </div>
            <div className="mt-0.5 truncate text-xs text-mute">針對「{risk.title}」· 模擬期間 10/14 – 10/20</div>
          </div>
          <div className="ml-auto flex shrink-0 gap-2">
            <button onClick={onBack} className="rounded-md border border-line-strong px-4 py-2 text-[13px] text-ink-2 hover:border-cyan hover:text-ink">
              ← 返回策略設定
            </button>
            <button
              onClick={() => onConfirm(result)}
              className="rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-white shadow-[0_0_16px_rgba(47,123,255,0.45)] hover:bg-accent/85"
            >
              確認採用方案 {plan.id} →
            </button>
          </div>
        </Panel>

        {/* Before / After：同一地圖範圍與比例 */}
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
          {(
            [
              ['BEFORE', '不採取措施', result.levelBefore, <TaiwanMap key="b" view={view} selectedSiteId={risk.siteId} showFlows={false} impact={before.impact} notes={before.notes} className="absolute inset-0" />],
              ['AFTER', `採用方案 ${plan.id}`, result.levelAfter, <TaiwanMap key="a" view={view} selectedSiteId={risk.siteId} showFlows={false} impact={after.impact} routes={after.routes} levels={after.levels} notes={after.notes} className="absolute inset-0" />],
            ] as const
          ).map(([tag, label, level, map]) => (
            <Panel key={tag} className={`overflow-hidden ${tag === 'AFTER' ? 'border-risk-low/40' : ''}`} bodyClassName="relative">
              <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${tag === 'AFTER' ? 'bg-risk-low/20 text-risk-low' : 'bg-risk-high/20 text-risk-high'}`}>{tag}</span>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <div className="absolute top-3 right-4 z-10 flex items-center gap-2 text-xs text-ink-2">
                營運風險等級 <RiskBadge level={level} />
              </div>
              {map}
            </Panel>
          ))}
        </div>

        {/* 關鍵指標 */}
        <div className="grid shrink-0 gap-3" style={{ gridTemplateColumns: `repeat(${metrics.length + 1}, minmax(0, 1fr))` }}>
          {metrics.map((m) => (
            <Panel key={m.label} bodyClassName="px-4 py-3">
              <div className="truncate text-[13px] text-mute">{m.label}</div>
              <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                <span className="text-sm text-mute line-through decoration-mute/50">{m.before}</span>
                <span className="text-mute">→</span>
                <span className="text-xl font-semibold">{m.after}</span>
              </div>
              <div className="mt-1 text-xs" style={{ color: m.good ? color.low : color.mid }}>
                {m.delta}
              </div>
            </Panel>
          ))}
          <Panel bodyClassName="px-4 py-3">
            <div className="text-[13px] text-mute">營運風險等級</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <RiskBadge level={result.levelBefore} />
              <span className="text-mute">→</span>
              <RiskBadge level={result.levelAfter} />
            </div>
            <div className="mt-1.5 text-xs text-mute">
              {levelText[result.levelBefore]} → {levelText[result.levelAfter]}風險
            </div>
          </Panel>
        </div>
      </div>

      {/* 策略設定 Panel：結果狀態預設收合 */}
      {panelOpen ? (
        <Panel
          className="w-[400px] shrink-0"
          title="策略設定"
          extra={
            <button onClick={onTogglePanel} className="text-sm text-mute hover:text-ink" aria-label="收合策略設定">
              收合 ›
            </button>
          }
        >
          {panel}
        </Panel>
      ) : (
        <button
          onClick={onTogglePanel}
          className="flex w-11 shrink-0 flex-col items-center gap-2 rounded-lg border border-line bg-panel/85 py-4 text-[13px] text-ink-2 transition hover:border-cyan hover:text-ink"
          aria-label="展開策略設定"
        >
          <span>‹</span>
          <span className="[writing-mode:vertical-rl]">策略設定</span>
        </button>
      )}
    </div>
  )
}
