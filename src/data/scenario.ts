// 示範情境的唯一資料來源：各畫面引用同一份資料，確保同一事件數字一致（PRD §6）

export type RiskLevel = 'high' | 'mid' | 'low'
export type RegionId = 'north' | 'central' | 'south'
export type SiteId = 'tpe' | 'tyn' | 'txg' | 'tnn' | 'khh'

export const SCENARIO_NOW = '2026/10/14 14:32'

export interface Region {
  id: RegionId
  name: string
  center: [number, number]
  zoom: number
}

export const regions: Region[] = [
  { id: 'north', name: '北區', center: [121.25, 24.85], zoom: 2.6 },
  { id: 'central', name: '中區', center: [120.75, 24.05], zoom: 2.4 },
  { id: 'south', name: '南區', center: [120.4, 22.85], zoom: 2.4 },
]

export const NATION_VIEW = { center: [120.95, 23.65] as [number, number], zoom: 1 }

export interface Site {
  id: SiteId
  code: string
  name: string
  fullName: string
  region: RegionId
  coord: [number, number]
  orders: number
  onTimeRate: number
  utilization: number
  risk: RiskLevel
}

export const sites: Site[] = [
  { id: 'tpe', code: 'A', name: '台北 A', fullName: '北部物流中心', region: 'north', coord: [121.52, 25.04], orders: 128421, onTimeRate: 94.2, utilization: 95, risk: 'high' },
  { id: 'tyn', code: 'B', name: '桃園 B', fullName: '桃園物流中心', region: 'north', coord: [121.22, 24.95], orders: 96320, onTimeRate: 98.1, utilization: 72, risk: 'mid' },
  { id: 'txg', code: 'C', name: '台中 C', fullName: '台中物流中心', region: 'central', coord: [120.66, 24.16], orders: 72115, onTimeRate: 95.6, utilization: 88, risk: 'high' },
  { id: 'tnn', code: 'D', name: '台南 D', fullName: '台南物流中心', region: 'south', coord: [120.22, 23.0], orders: 58441, onTimeRate: 97.8, utilization: 66, risk: 'low' },
  { id: 'khh', code: 'E', name: '高雄 E', fullName: '南部物流中心', region: 'south', coord: [120.32, 22.63], orders: 51920, onTimeRate: 96.3, utilization: 78, risk: 'mid' },
]

export const siteById = Object.fromEntries(sites.map((s) => [s.id, s])) as Record<SiteId, Site>

// 據點間日常物流流向（件/日）
export interface Flow {
  from: SiteId
  to: SiteId
  volume: number
}

export const flows: Flow[] = [
  { from: 'tpe', to: 'tyn', volume: 22000 },
  { from: 'tpe', to: 'txg', volume: 16000 },
  { from: 'tyn', to: 'txg', volume: 9000 },
  { from: 'txg', to: 'tnn', volume: 12000 },
  { from: 'txg', to: 'khh', volume: 7000 },
  { from: 'tnn', to: 'khh', volume: 4000 },
]

export type RiskCategory = 'equipment' | 'capacity' | 'labor' | 'transport'

export const riskCategoryLabel: Record<RiskCategory, string> = {
  equipment: '設備',
  capacity: '產能',
  labor: '人力',
  transport: '運輸',
}

export interface Risk {
  id: string
  siteId: SiteId
  title: string
  level: RiskLevel
  category: RiskCategory
  summary: string
  affectedOrders: number
  probability: number
  startDate: string
  duration: string
  impactSites: SiteId[]
}

// 未來 7 天預測風險，依嚴重度排序。r1 是本次 Prototype 的主情境
export const risks: Risk[] = [
  {
    id: 'r1',
    siteId: 'tpe',
    title: '北部物流中心產能瓶頸',
    level: 'high',
    category: 'capacity',
    summary: '訂單成長且分揀設備負載偏高，預測 10/17 起分揀作業超過可用產能，可能出現出貨延遲。',
    affectedOrders: 2103,
    probability: 75,
    startDate: '10/17',
    duration: '2–3 天',
    impactSites: ['tyn', 'txg'],
  },
  {
    id: 'r2',
    siteId: 'txg',
    title: '台中物流中心設備故障風險',
    level: 'high',
    category: 'equipment',
    summary: 'Sorter B 振動與溫度持續上升，可能在未來 3 天出現異常停機。',
    affectedOrders: 1520,
    probability: 62,
    startDate: '10/16',
    duration: '1–2 天',
    impactSites: ['tnn'],
  },
  {
    id: 'r3',
    siteId: 'khh',
    title: '南部物流中心人力缺口',
    level: 'mid',
    category: 'labor',
    summary: '夜班人力需求增加 15%，現有排班不足以支應出貨高峰。',
    affectedOrders: 980,
    probability: 48,
    startDate: '10/18',
    duration: '3 天',
    impactSites: [],
  },
  {
    id: 'r4',
    siteId: 'tyn',
    title: '桃園物流中心月台壅塞',
    level: 'mid',
    category: 'transport',
    summary: '進出車輛預計增加 20%，月台排隊時間可能拉長。',
    affectedOrders: 760,
    probability: 55,
    startDate: '10/17',
    duration: '2 天',
    impactSites: [],
  },
]

export const riskById = Object.fromEntries(risks.map((r) => [r.id, r])) as Record<string, Risk>

// 非風險類的一般通報，只做顯示
export const notices = [
  { id: 'n1', siteId: 'tyn' as SiteId, title: '倉庫溫度異常', detail: '冷鏈區溫度短暫超標，已恢復正常', time: '08:15' },
]

const totalOrders = sites.reduce((sum, s) => sum + s.orders, 0)
const weighted = (key: 'onTimeRate' | 'utilization') =>
  Math.round((sites.reduce((sum, s) => sum + s[key] * s.orders, 0) / totalOrders) * 10) / 10

export interface Kpi {
  id: string
  label: string
  value: string
  unit?: string
  delta: string
  // 對營運而言是否為改善
  good: boolean
  trend: number[]
}

export const overviewKpis: Kpi[] = [
  { id: 'orders', label: '訂單總量', value: totalOrders.toLocaleString(), unit: '件', delta: '↑ 12%', good: true, trend: [61, 63, 60, 66, 68, 71, 74] },
  { id: 'ontime', label: '出貨準時率', value: weighted('onTimeRate').toFixed(1), unit: '%', delta: '↓ 1.8 pp', good: false, trend: [97.6, 97.4, 97.5, 97.1, 96.9, 96.6, 96.4] },
  { id: 'util', label: '產能利用率', value: weighted('utilization').toFixed(1), unit: '%', delta: '↑ 5.2 pp', good: false, trend: [77, 78, 79, 80, 82, 83, 85] },
  { id: 'risks', label: '預測風險事件', value: String(risks.length), unit: '件', delta: '↑ 2', good: false, trend: [1, 1, 2, 2, 3, 3, 4] },
  {
    id: 'impact',
    label: '預估影響訂單',
    value: risks.reduce((sum, r) => sum + r.affectedOrders, 0).toLocaleString(),
    unit: '件',
    delta: '↑ 28%',
    good: false,
    trend: [2.1, 2.6, 2.9, 3.4, 3.9, 4.6, 5.4],
  },
]

export const overviewInsight = {
  title: '北部物流中心 10/17 起可能出貨延遲',
  body: '台北 A 產能利用率已達 95%，預測 10/17 起分揀作業超過可用產能，約 2,103 件訂單可能延遲，並波及桃園 B、台中 C。建議提前評估跨據點分流。',
  riskId: 'r1',
}

// 樓層視圖：各據點分區狀態（示意）
export type ZoneStatus = 'normal' | 'watch' | 'alert' | 'down'

export interface Zone {
  id: string
  name: string
  status: ZoneStatus
  note?: string
  x: number
  y: number
  w: number
  h: number
}

const baseZones = (statuses: Partial<Record<string, [ZoneStatus, string?]>>): Zone[] => {
  const layout: Omit<Zone, 'status' | 'note'>[] = [
    { id: 'inbound', name: '入庫緩衝區', x: 2, y: 2, w: 26, h: 40 },
    { id: 'storage', name: '儲位區', x: 30, y: 2, w: 40, h: 40 },
    { id: 'a1', name: '分揀機 A1', x: 2, y: 46, w: 21, h: 24 },
    { id: 'a2', name: '分揀機 A2', x: 25, y: 46, w: 21, h: 24 },
    { id: 'a3', name: '分揀機 A3', x: 48, y: 46, w: 22, h: 24 },
    { id: 'packing', name: '包裝區', x: 72, y: 2, w: 26, h: 68 },
    { id: 'dock', name: '出貨月台', x: 2, y: 74, w: 96, h: 24 },
  ]
  return layout.map((z) => ({ ...z, status: statuses[z.id]?.[0] ?? 'normal', note: statuses[z.id]?.[1] }))
}

export const floorZones: Record<SiteId, Zone[]> = {
  tpe: baseZones({ inbound: ['watch', '堆積量增加'], a1: ['alert', '處理速度下降 60%'], a3: ['down', '異常停機'], dock: ['watch', '排隊 3.2 小時'] }),
  tyn: baseZones({ dock: ['watch', '進出車輛 +20%'], storage: ['watch', '冷鏈區溫度已恢復'] }),
  txg: baseZones({ a2: ['alert', 'Sorter B 振動偏高'], packing: ['watch'] }),
  tnn: baseZones({}),
  khh: baseZones({ packing: ['watch', '夜班人力不足'], dock: ['watch'] }),
}
