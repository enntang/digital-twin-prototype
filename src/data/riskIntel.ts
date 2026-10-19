// P02 風險預測 / P03 風險分析 的示範資料，數字與 scenario.ts 的風險事件一致
import type { PlanId } from '../store/scenario'
import type { EquipmentId } from './equipment'
import type { SiteId } from './scenario'

// 預測區間：10/11–10/13 實際、10/14 為現在、10/15–10/20 預測
export const TREND_DAYS = ['10/11', '10/12', '10/13', '10/14', '10/15', '10/16', '10/17', '10/18', '10/19', '10/20']
export const NOW_INDEX = 3

export interface RiskTrend {
  metric: string
  unit: string
  threshold: number
  thresholdLabel: string
  // 長度 = NOW_INDEX + 1
  actual: number[]
  // 由 NOW_INDEX 起算，長度 = TREND_DAYS.length - NOW_INDEX
  forecast: number[]
  note: string
}

export interface Plan {
  id: PlanId
  title: string
  desc: string
  recommended?: boolean
  // 預估延遲訂單降幅 %
  reduction: number
  costLabel: string
  cost: number
  prepDays: number
  // 策略類型決定 P04 的參數；param 為主要參數預設值（分流 %、人數、提前天數、錯峰 %）
  kind: PlanKind
  param: number
  target?: SiteId
}

export type PlanKind = 'transfer' | 'labor' | 'maintenance' | 'schedule'

export type EdgeKind = 'direct' | 'indirect' | 'possible'

export interface GraphNode {
  label: string
  sub?: string
  kind: EdgeKind
  // 成因指向特定設備時，可進入 P07 設備深入檢視
  equipment?: EquipmentId
}

export type EvidenceSource = 'device' | 'wms' | 'power' | 'record'

export const evidenceSourceLabel: Record<EvidenceSource, string> = {
  device: '設備',
  wms: 'WMS',
  power: '電力',
  record: '記錄',
}

export interface Evidence {
  time: string
  source: EvidenceSource
  title: string
  detail: string
  // 相關設備：P07 事件時間軸依此彙整，與 P03 使用同一份資料
  equipment?: EquipmentId[]
}

export interface RiskAnalysis {
  core: { label: string; sub: string }
  causes: GraphNode[]
  impacts: GraphNode[]
  evidence: Evidence[]
  impactSummary: string[]
}

export interface RiskDetail {
  // 不採取措施時，風險期間該據點的預測出貨準時率
  onTimeForecast: number
  trend: RiskTrend
  plans: Plan[]
  analysis: RiskAnalysis
}

export const riskDetail: Record<string, RiskDetail> = {
  r1: {
    onTimeForecast: 91.2,
    trend: {
      metric: '產能利用率',
      unit: '%',
      threshold: 100,
      thresholdLabel: '產能上限',
      actual: [80, 84, 89, 95],
      forecast: [95, 97, 99, 108, 112, 104, 96],
      note: '預測 10/17 開始超過可用產能',
    },
    plans: [
      { id: 'A', title: '跨據點訂單分流', desc: '將 15% 訂單轉移至桃園物流中心，以降低北部作業負載。', recommended: true, reduction: 62, costLabel: '額外運輸成本', cost: 24000, prepDays: 2, kind: 'transfer', param: 15, target: 'tyn' },
      { id: 'B', title: '增加夜班人力', desc: '增加 10 名夜班作業人員，提升分揀與包裝處理能力。', reduction: 28, costLabel: '額外人力成本', cost: 32000, prepDays: 1, kind: 'labor', param: 10 },
      { id: 'C', title: '提前設備保養', desc: '將分揀機 A1、A3 保養時間提前，恢復分揀產能。', reduction: 40, costLabel: '保養成本', cost: 18000, prepDays: 3, kind: 'maintenance', param: 2 },
    ],
    analysis: {
      core: { label: '分揀產能下降', sub: 'A3 停機 · A1 降速' },
      causes: [
        { label: '訂單量成長 12%', sub: '近 7 天', kind: 'direct' },
        { label: '分揀機 A3 異常停機', sub: 'Error Code E21', kind: 'direct', equipment: 'tpe-a3' },
        { label: '分揀機 A1 降速 60%', sub: '馬達溫度 85°C', kind: 'direct', equipment: 'tpe-a1' },
        { label: '電力波動', sub: '210V → 185V', kind: 'indirect' },
      ],
      impacts: [
        { label: '出貨處理量 ↓ 60%', kind: 'direct' },
        { label: '隊列等候 ↑ 3.2 小時', kind: 'direct' },
        { label: '影響訂單 2,103 件', kind: 'direct' },
        { label: '波及桃園 B、台中 C', kind: 'possible' },
      ],
      evidence: [
        { time: '14:32', source: 'wms', title: '訂單處理速度下降 60%', detail: '目前隊列 3,892 件', equipment: ['tpe-a1', 'tpe-a3'] },
        { time: '14:28', source: 'device', title: '分揀機 A3 自動停機', detail: 'Error Code: E21', equipment: ['tpe-a3'] },
        { time: '14:25', source: 'device', title: '馬達溫度達 85°C', detail: '正常範圍 0–70°C', equipment: ['tpe-a1'] },
        { time: '14:20', source: 'device', title: '馬達溫度開始上升', detail: '由 65°C 升至 75°C', equipment: ['tpe-a1'] },
        { time: '14:18', source: 'power', title: '電力系統短暫波動', detail: '電壓 210V → 185V（3 分鐘）', equipment: ['tpe-a1', 'tpe-a3'] },
        { time: '14:15', source: 'wms', title: '訂單處理延遲', detail: '隊列量開始增加', equipment: ['tpe-a1', 'tpe-a3'] },
        { time: '14:10', source: 'record', title: '維護紀錄', detail: '上次保養：2026/09/15', equipment: ['tpe-a1', 'tpe-a3'] },
      ],
      impactSummary: [
        '10/17–10/19 預測產能利用率最高 112%，約 2,103 件訂單可能延遲出貨。',
        '台北 A 出貨準時率可能由 94.2% 降至 91.2%。',
        '轉運至桃園 B、台中 C 的訂單將同步延誤，影響跨區配送時程。',
      ],
    },
  },
  r2: {
    onTimeForecast: 92.8,
    trend: {
      metric: 'Sorter B 振動值',
      unit: 'mm/s',
      threshold: 7.1,
      thresholdLabel: '停機警戒值',
      actual: [3.2, 3.6, 4.1, 4.9],
      forecast: [4.9, 5.8, 7.4, 7.9, 6.2, 4.6, 4.3],
      note: '預測 10/16 振動超過警戒值',
    },
    plans: [
      { id: 'A', title: '跨據點訂單分流', desc: '將 20% 訂單轉移至台南物流中心，降低 Sorter B 負載。', reduction: 30, costLabel: '額外運輸成本', cost: 21000, prepDays: 1, kind: 'transfer', param: 20, target: 'tnn' },
      { id: 'B', title: '增加人工分揀', desc: '調派 8 名人員以人工分揀支援 Sorter B 區段。', reduction: 22, costLabel: '額外人力成本', cost: 26000, prepDays: 1, kind: 'labor', param: 8 },
      { id: 'C', title: '提前設備保養', desc: '將 Sorter B 保養時間提前，降低未來故障風險。', recommended: true, reduction: 55, costLabel: '保養成本', cost: 18000, prepDays: 2, kind: 'maintenance', param: 2 },
    ],
    analysis: {
      core: { label: 'Sorter B 故障風險', sub: '振動 · 溫度持續上升' },
      causes: [
        { label: '軸承磨耗', sub: '振動 4.9 mm/s', kind: 'direct', equipment: 'txg-a2' },
        { label: '連續高負載運轉', sub: '利用率 88%', kind: 'direct', equipment: 'txg-a2' },
        { label: '保養週期延後', sub: '逾期 12 天', kind: 'indirect' },
      ],
      impacts: [
        { label: '分揀產能 ↓ 35%', kind: 'direct' },
        { label: '影響訂單 1,520 件', kind: 'direct' },
        { label: '波及台南 D 配送', kind: 'possible' },
      ],
      evidence: [
        { time: '13:50', source: 'device', title: 'Sorter B 振動值 4.9 mm/s', detail: '較上週上升 53%', equipment: ['txg-a2'] },
        { time: '13:42', source: 'device', title: '軸承溫度 68°C', detail: '正常範圍 0–60°C', equipment: ['txg-a2'] },
        { time: '12:30', source: 'wms', title: 'B 區段分揀錯誤率上升', detail: '0.4% → 1.1%', equipment: ['txg-a2'] },
        { time: '09:10', source: 'record', title: '保養排程逾期', detail: '原定 2026/10/02', equipment: ['txg-a2'] },
      ],
      impactSummary: [
        '10/16–10/17 Sorter B 可能異常停機，分揀產能下降約 35%。',
        '約 1,520 件訂單可能延遲，並影響台南 D 的轉運時程。',
      ],
    },
  },
  r3: {
    onTimeForecast: 93.5,
    trend: {
      metric: '夜班人力需求',
      unit: '%',
      threshold: 100,
      thresholdLabel: '現有排班',
      actual: [92, 94, 95, 97],
      forecast: [97, 98, 99, 99, 113, 115, 112],
      note: '預測 10/18 起人力需求超過排班',
    },
    plans: [
      { id: 'A', title: '跨據點訂單分流', desc: '將 10% 夜間訂單轉移至台南物流中心處理。', reduction: 35, costLabel: '額外運輸成本', cost: 15000, prepDays: 1, kind: 'transfer', param: 10, target: 'tnn' },
      { id: 'B', title: '增加夜班人力', desc: '增加 6 名夜班臨時人員，補足出貨高峰缺口。', recommended: true, reduction: 60, costLabel: '額外人力成本', cost: 19000, prepDays: 2, kind: 'labor', param: 6 },
      { id: 'C', title: '調整出貨批次', desc: '將部分夜間批次提前至晚班，分散作業高峰。', reduction: 25, costLabel: '調度成本', cost: 6000, prepDays: 1, kind: 'schedule', param: 20 },
    ],
    analysis: {
      core: { label: '夜班人力缺口', sub: '需求 +15%' },
      causes: [
        { label: '促銷檔期訂單', sub: '夜間訂單 +18%', kind: 'direct' },
        { label: '人員請假', sub: '4 人', kind: 'direct' },
        { label: '臨時人力招募延遲', kind: 'indirect' },
      ],
      impacts: [
        { label: '包裝區積壓', kind: 'direct' },
        { label: '影響訂單 980 件', kind: 'direct' },
        { label: '隔日截單延遲', kind: 'possible' },
      ],
      evidence: [
        { time: '11:20', source: 'wms', title: '夜間訂單預測 +18%', detail: '10/18–10/20 促銷檔期' },
        { time: '10:05', source: 'record', title: '夜班請假申請 4 人', detail: '10/18–10/19' },
        { time: '09:40', source: 'record', title: '臨時人力派遣未確認', detail: '派遣商回覆延遲' },
      ],
      impactSummary: [
        '10/18–10/20 夜班人力需求最高達排班的 115%。',
        '約 980 件訂單可能錯過隔日配送截單時間。',
      ],
    },
  },
  r4: {
    onTimeForecast: 95.0,
    trend: {
      metric: '月台平均等候',
      unit: '分鐘',
      threshold: 45,
      thresholdLabel: '服務水準上限',
      actual: [28, 30, 33, 36],
      forecast: [36, 39, 43, 52, 55, 41, 35],
      note: '預測 10/17 等候時間超過服務水準',
    },
    plans: [
      { id: 'A', title: '跨據點訂單分流', desc: '將 15% 進貨車次改至台中物流中心月台。', reduction: 20, costLabel: '額外運輸成本', cost: 12000, prepDays: 1, kind: 'transfer', param: 15, target: 'txg' },
      { id: 'B', title: '增加月台人力', desc: '增派 4 名裝卸人員，縮短每車次作業時間。', reduction: 30, costLabel: '額外人力成本', cost: 14000, prepDays: 1, kind: 'labor', param: 4 },
      { id: 'C', title: '預約制錯峰進場', desc: '以預約時段分散進出車輛，降低尖峰排隊。', recommended: true, reduction: 45, costLabel: '系統調整成本', cost: 8000, prepDays: 2, kind: 'schedule', param: 30 },
    ],
    analysis: {
      core: { label: '月台壅塞', sub: '車輛 +20%' },
      causes: [
        { label: '進貨車次增加', sub: '+20%', kind: 'direct' },
        { label: '尖峰時段集中', sub: '09:00–11:00', kind: 'direct' },
        { label: '冷鏈區溫控檢查', sub: '每車 +6 分鐘', kind: 'indirect' },
      ],
      impacts: [
        { label: '等候時間 ↑ 55 分鐘', kind: 'direct' },
        { label: '影響訂單 760 件', kind: 'direct' },
        { label: '入庫作業延後', kind: 'possible' },
      ],
      evidence: [
        { time: '10:30', source: 'wms', title: '10/17 預約車次 +20%', detail: '共 186 車次' },
        { time: '08:15', source: 'device', title: '冷鏈區溫度短暫超標', detail: '已恢復正常' },
        { time: '08:00', source: 'record', title: '月台使用率 92%', detail: '尖峰 09:00–11:00' },
      ],
      impactSummary: [
        '10/17–10/18 月台平均等候最高約 55 分鐘。',
        '約 760 件訂單入庫延後，連帶影響出貨排程。',
      ],
    },
  },
}
