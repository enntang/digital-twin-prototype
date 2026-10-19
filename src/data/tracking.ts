// P06 決策成效追蹤：執行進度與實際成果皆為示範資料（PRD §4.6）
// 由 P05 確認的決策紀錄推導，確保與前面畫面的數字一致
import type { Decision } from '../store/scenario'
import { riskDetail, type Plan, type PlanKind } from './riskIntel'
import { riskById, siteById } from './scenario'
import { describeParams } from './simulation'

// 示範情境將時間推進到決策執行後的第 4 天
export const TRACK_NOW = '10/18 09:00'
export const TRACK_DAYS = ['10/14', '10/15', '10/16', '10/17', '10/18', '10/19', '10/20']
// 10/14–10/17 已有實際值
export const ACTUAL_UNTIL = 3

export const ownerByKind: Record<PlanKind, string> = {
  transfer: '營運管理部',
  labor: '人力資源部',
  maintenance: '設備維護部',
  schedule: '營運管理部',
}

export type StepState = 'done' | 'current' | 'todo'

export interface Step {
  label: string
  time: string
  state: StepState
}

export type TaskStatus = 'done' | 'running' | 'pending'

export interface Task {
  name: string
  owner: string
  status: TaskStatus
  progress: number
  due: string
}

export interface LogEntry {
  time: string
  text: string
}

const round1 = (v: number) => Math.round(v * 10) / 10

function tasksFor(plan: Plan, d: Decision): Task[] {
  const site = siteById[riskById[d.riskId].siteId]
  const owner = ownerByKind[plan.kind]
  switch (plan.kind) {
    case 'transfer': {
      const target = d.params.target ? siteById[d.params.target] : site
      return [
        { name: `訂單分流調度（${d.params.value}%）`, owner, status: 'running', progress: 80, due: '10/19' },
        { name: `${target.name.split(' ')[0]}倉儲接收準備`, owner: target.fullName, status: 'done', progress: 100, due: '10/15' },
        { name: '運輸路線增加', owner: '運輸管理部', status: 'running', progress: 70, due: '10/17' },
        { name: '客戶出貨通知更新', owner: '客服中心', status: 'pending', progress: 0, due: '10/19' },
      ]
    }
    case 'labor':
      return [
        { name: `臨時人力招募（${d.params.value} 人）`, owner, status: 'done', progress: 100, due: '10/15' },
        { name: `${site.name.split(' ')[0]}${d.params.bothShifts ? '晚班與夜班' : '夜班'}排班調整`, owner: site.fullName, status: 'done', progress: 100, due: '10/15' },
        { name: '新進人員作業訓練', owner, status: 'running', progress: 60, due: '10/17' },
        { name: '人力成本結算', owner: '財務部', status: 'pending', progress: 0, due: '10/21' },
      ]
    case 'maintenance':
      return [
        { name: '保養排程調整', owner, status: 'done', progress: 100, due: '10/15' },
        { name: '備品與工具準備', owner, status: 'done', progress: 100, due: '10/16' },
        { name: '設備保養作業', owner, status: 'running', progress: 65, due: '10/18' },
        ...(d.params.backup ? [{ name: '替代設備啟用', owner: site.fullName, status: 'running' as const, progress: 90, due: '10/17' }] : []),
        { name: '保養後產能驗證', owner, status: 'pending', progress: 0, due: '10/19' },
      ]
    case 'schedule':
      return [
        { name: '排程規則設定', owner, status: 'done', progress: 100, due: '10/15' },
        { name: '通知承運商與客戶', owner: '客服中心', status: 'done', progress: 100, due: '10/16' },
        { name: `錯峰作業執行（${d.params.value}%）`, owner: site.fullName, status: 'running', progress: 55, due: '10/19' },
      ]
  }
}

export function buildTracking(d: Decision) {
  const risk = riskById[d.riskId]
  const detail = riskDetail[risk.id]
  const plan = detail.plans.find((p) => p.id === d.planId)!
  const site = siteById[risk.siteId]
  const r = d.result
  const execStart = TRACK_DAYS[Math.min(plan.prepDays, 3)]

  const steps: Step[] = [
    { label: '提出方案', time: '10/14 14:32', state: 'done' },
    { label: '核准決策', time: '10/14 16:10', state: 'done' },
    { label: '執行準備', time: '10/15 09:00', state: 'done' },
    { label: '執行中', time: `${execStart} 起`, state: 'current' },
    { label: '成效觀察', time: '預計 10/20', state: 'todo' },
    { label: '結案評估', time: '預計 10/28', state: 'todo' },
  ]

  // 每日風險強度：依預測指標接近門檻的程度
  const { forecast, threshold } = detail.trend
  const peak = Math.max(...forecast)
  const floor = threshold * 0.9
  const severity = forecast.map((v) => Math.min(1, Math.max(0, (v - floor) / (peak - floor))))
  const startIdx = TRACK_DAYS.indexOf(execStart)

  const baseline = severity.map((s) => round1(site.onTimeRate - (site.onTimeRate - r.onTimeBefore) * s))
  const predicted = baseline.map((b, i) => (i >= startIdx ? round1(b + (r.onTimeAfter - r.onTimeBefore) * severity[i]) : b))
  // 實際值略優於預測，示範「方案達到預期」
  const lift = [0.1, 0.2, 0.4, 0.7]
  const actual = predicted.map((p, i) => (i <= ACTUAL_UNTIL ? round1(p + lift[i]) : null))

  const latestActual = actual[ACTUAL_UNTIL] as number
  const latestPredicted = predicted[ACTUAL_UNTIL]
  const actualDelayed = Math.round((r.delayedAfter * 0.92) / 10) * 10
  const actualCost = Math.round((r.cost * 0.96) / 100) * 100

  const logs: LogEntry[] = [
    { time: '10/17 18:00', text: `${site.name} 當日出貨準時率 ${latestActual}%，高於預測 ${round1(latestActual - latestPredicted)} pp` },
    { time: `${execStart} 08:00`, text: `方案 ${plan.id} 開始執行：${describeParams(plan, d.params)}` },
    { time: '10/15 09:00', text: `${ownerByKind[plan.kind]}完成執行準備會議` },
    { time: '10/14 16:10', text: '營運長核准決策，指派負責單位' },
    { time: '10/14 14:32', text: `由策略模擬建立決策紀錄（方案 ${plan.id}）` },
  ]

  return {
    risk,
    plan,
    site,
    steps,
    tasks: tasksFor(plan, d),
    logs,
    owner: ownerByKind[plan.kind],
    period: `${execStart} – 10/21`,
    chart: { baseline, predicted, actual },
    kpis: {
      onTime: { before: r.onTimeBefore, predicted: r.onTimeAfter, actual: round1(r.onTimeAfter + (latestActual - latestPredicted)) },
      delayed: { before: r.delayedBefore, predicted: r.delayedAfter, actual: actualDelayed },
      cost: { before: 0, predicted: r.cost, actual: actualCost },
    },
    latest: { actual: latestActual, predicted: latestPredicted },
  }
}

export type Tracking = ReturnType<typeof buildTracking>
