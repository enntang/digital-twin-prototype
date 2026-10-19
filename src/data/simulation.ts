// P04/P05 情境模擬：預先定義的示範模型（PRD §4.4：不需真正的最佳化演算法）
// 參數為方案預設值時，結果與 P02 方案卡片的數字一致
import type { PlanId } from '../store/scenario'
import { riskDetail, type Plan } from './riskIntel'
import { siteById, type Risk, type RiskLevel, type SiteId } from './scenario'

export interface SimParams {
  // 主要參數：分流 %、增加人數、提前天數、錯峰 %
  value: number
  target?: SiteId
  // 人力：是否晚班也加派
  bothShifts?: boolean
  // 保養：是否啟用替代設備
  backup?: boolean
}

export const defaultParams = (plan: Plan): SimParams => ({
  value: plan.param,
  target: plan.target,
  bothShifts: false,
  backup: false,
})

interface ParamSpec {
  label: string
  unit: string
  min: number
  max: number
  step: number
}

export const primaryParam: Record<Plan['kind'], ParamSpec> = {
  transfer: { label: '訂單分流比例', unit: '%', min: 0, max: 30, step: 5 },
  labor: { label: '增加人力', unit: '人', min: 0, max: 20, step: 1 },
  maintenance: { label: '保養提前天數', unit: '天', min: 0, max: 3, step: 1 },
  schedule: { label: '錯峰比例', unit: '%', min: 0, max: 50, step: 5 },
}

export interface SimResult {
  reduction: number
  delayedBefore: number
  delayedAfter: number
  cost: number
  prepDays: number
  onTimeBefore: number
  onTimeAfter: number
  peakBefore: number
  peakAfter: number
  levelBefore: RiskLevel
  levelAfter: RiskLevel
  // 分流策略：承接據點的產能利用率變化
  target?: { siteId: SiteId; before: number; after: number; level: RiskLevel }
}

const ON_TIME_CEIL = 99.6
const round1 = (v: number) => Math.round(v * 10) / 10

export const levelByDelayed = (n: number): RiskLevel => (n >= 1600 ? 'high' : n >= 600 ? 'mid' : 'low')
const levelByUtil = (u: number): RiskLevel => (u >= 85 ? 'high' : u >= 75 ? 'mid' : 'low')

export function simulate(risk: Risk, plan: Plan | null, p?: SimParams): SimResult {
  const detail = riskDetail[risk.id]
  const peakBefore = Math.max(...detail.trend.forecast)
  const base = {
    delayedBefore: risk.affectedOrders,
    onTimeBefore: detail.onTimeForecast,
    peakBefore,
    levelBefore: risk.level,
  }
  if (!plan || !p) {
    return { ...base, reduction: 0, delayedAfter: risk.affectedOrders, cost: 0, prepDays: 0, onTimeAfter: detail.onTimeForecast, peakAfter: peakBefore, levelAfter: risk.level }
  }

  const ratio = plan.param ? p.value / plan.param : 0
  let effect = Math.pow(ratio, 0.8)
  let cost = plan.cost * ratio
  let target: SimResult['target']

  if (plan.kind === 'transfer' && p.target) {
    // 承接據點餘裕越大，分流效果越好
    const t = siteById[p.target]
    const ref = siteById[plan.target ?? p.target]
    effect *= (100 - t.utilization) / (100 - ref.utilization)
    const after = Math.round(t.utilization + p.value * 0.8)
    target = { siteId: t.id, before: t.utilization, after, level: levelByUtil(after) }
  }
  if (plan.kind === 'labor' && p.bothShifts) {
    effect *= 1.15
    cost *= 1.4
  }
  if (plan.kind === 'maintenance' && p.backup) {
    effect = effect * 1.15 + 0.1
    cost += 6000
  }

  const reduction = Math.round(Math.min(90, Math.max(0, plan.reduction * effect)))
  // 取整到十位，與 P02 方案卡片口徑一致
  const delayedAfter = Math.round((risk.affectedOrders * (1 - reduction / 100)) / 10) * 10

  return {
    ...base,
    reduction,
    delayedAfter,
    cost: Math.round(cost / 1000) * 1000,
    prepDays: plan.prepDays,
    onTimeAfter: round1(detail.onTimeForecast + (ON_TIME_CEIL - detail.onTimeForecast) * (reduction / 100)),
    peakAfter: round1(peakBefore * (1 - 0.35 * (reduction / 100))),
    levelAfter: reduction === 0 ? risk.level : levelByDelayed(delayedAfter),
    target,
  }
}

export const paramKey = (riskId: string, planId: PlanId) => `${riskId}-${planId}`

// 參數摘要文字，用於 P05 收合的策略設定列與 P06
export function describeParams(plan: Plan, p: SimParams): string {
  switch (plan.kind) {
    case 'transfer':
      return `分流 ${p.value}% → ${p.target ? siteById[p.target].name : '-'}`
    case 'labor':
      return `增加 ${p.value} 人 · ${p.bothShifts ? '晚班＋夜班' : '夜班'}`
    case 'maintenance':
      return `${p.value ? `提前 ${p.value} 天保養` : '維持原計畫'}${p.backup ? ' · 啟用替代設備' : ''}`
    case 'schedule':
      return `錯峰 ${p.value}%`
  }
}
