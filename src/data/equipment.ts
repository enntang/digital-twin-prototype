// P07 設備深入檢視的示範資料：數字與 scenario.ts 樓層狀態、riskIntel.ts 證據一致（PRD §4.7.6）
import { riskDetail, type Evidence } from './riskIntel'
import { SCENARIO_NOW, type SiteId } from './scenario'

export type EquipmentId = 'tpe-a1' | 'tpe-a2' | 'tpe-a3' | 'txg-a1' | 'txg-a2' | 'txg-a3'
export type EquipStatus = 'normal' | 'watch' | 'alert' | 'down'

export const equipStatusLabel: Record<EquipStatus, string> = {
  normal: '正常',
  watch: '注意',
  alert: '警示',
  down: '停機',
}

export type ComponentKind = 'inlet' | 'scanner' | 'belt' | 'divert' | 'chute' | 'motor'

export interface Reading {
  label: string
  value: string
}

export interface EquipComponent {
  id: string
  kind: ComponentKind
  // 主線分段序號 0–3；入口與掃描門架為 0
  index: number
  name: string
  status: EquipStatus
  note?: string
  readings: Reading[]
}

export type MetricKey = 'throughput' | 'speed' | 'motorTemp' | 'vibration' | 'voltage' | 'errorRate'

export interface Metric {
  key: MetricKey
  label: string
  unit: string
  value: number
  // 迷你趨勢線的起點，用來呈現持續上升／下降
  from: number
  decimals: number
  jitter: number
  normalMin?: number
  normalMax?: number
  rangeLabel: string
}

export interface Equipment {
  id: EquipmentId
  siteId: SiteId
  zone: 'a1' | 'a2' | 'a3'
  name: string
  alias?: string
  code: string
  status: EquipStatus
  statusSince?: string
  headline: string
  riskId?: string
  // 3D 包裹流動：入口與主線 4 段的速度倍率（0 = 停止），以及 4 個分流模組是否動作
  flow: { inlet: number; belts: number[]; diverts: boolean[] }
  metrics: Metric[]
  components: EquipComponent[]
  // 浮動標籤，最多 3 個
  labels: { component: string; text: string }[]
  maintenance: { last: string; next: string; overdueDays: number; downtimes30d: number }
  impact?: { capacityLoss: number; orders: number; queueHours?: number; note: string }
}

const RATED_THROUGHPUT = 6000
const RATED_SPEED = 2

const metric = (key: MetricKey, value: number, from = value): Metric => {
  const base = {
    throughput: { label: '處理量', unit: '件/時', decimals: 0, jitter: 60, normalMin: 3600, rangeLabel: `額定 ${RATED_THROUGHPUT.toLocaleString()}` },
    speed: { label: '輸送帶速度', unit: 'm/s', decimals: 2, jitter: 0.02, normalMin: 1.6, rangeLabel: `額定 ${RATED_SPEED.toFixed(1)}` },
    motorTemp: { label: '馬達溫度', unit: '°C', decimals: 1, jitter: 0.4, normalMax: 70, rangeLabel: '正常 0–70' },
    vibration: { label: '振動值', unit: 'mm/s', decimals: 1, jitter: 0.08, normalMax: 4.5, rangeLabel: '警戒 7.1' },
    voltage: { label: '供電電壓', unit: 'V', decimals: 0, jitter: 1.2, normalMin: 200, normalMax: 230, rangeLabel: '正常 200–230' },
    errorRate: { label: '分揀錯誤率', unit: '%', decimals: 2, jitter: 0.02, normalMax: 0.8, rangeLabel: '正常 < 0.8' },
  }[key]
  return { key, value, from, ...base }
}

type Override = Partial<Pick<EquipComponent, 'status' | 'note' | 'readings'>>

// 依示意圖的分揀線結構產生元件：入口 → 掃描門架 → 主線 4 段（各接分流模組與出口滑道）
function buildComponents(flow: Equipment['flow'], overrides: Record<string, Override> = {}): EquipComponent[] {
  const list: EquipComponent[] = [
    { id: 'inlet', kind: 'inlet', index: 0, name: '入口輸送段', status: 'normal', readings: [{ label: '速度', value: `${(RATED_SPEED * flow.inlet).toFixed(1)} m/s` }] },
    { id: 'scanner', kind: 'scanner', index: 0, name: '掃描門架', status: 'normal', readings: [{ label: '讀取率', value: '99.6%' }] },
  ]
  for (let i = 0; i < 4; i++) {
    const v = RATED_SPEED * flow.belts[i]
    list.push(
      { id: `belt-${i + 1}`, kind: 'belt', index: i, name: `主線皮帶段 ${i + 1}`, status: 'normal', readings: [{ label: '速度', value: `${v.toFixed(1)} m/s` }] },
      { id: `divert-${i + 1}`, kind: 'divert', index: i, name: `分流模組 ${i + 1}`, status: 'normal', readings: [{ label: '動作', value: flow.diverts[i] ? `${Math.round(22 * flow.belts[i])} 次/分` : '停擺' }] },
      { id: `chute-${i + 1}`, kind: 'chute', index: i, name: `出口滑道 ${i + 1}`, status: 'normal', readings: [{ label: '道口', value: `D${i + 1}` }] },
      { id: `motor-${i + 1}`, kind: 'motor', index: i, name: `驅動馬達／軸承 ${i + 1}`, status: 'normal', readings: [{ label: '溫度', value: '58°C' }, { label: '振動', value: '2.1 mm/s' }] },
    )
  }
  return list.map((c) => ({ ...c, ...overrides[c.id] }))
}

function normalSorter(id: EquipmentId, siteId: SiteId, zone: Equipment['zone'], last: string, next: string, load = 0.8): Equipment {
  const flow = { inlet: 1, belts: [1, 1, 1, 1], diverts: [true, true, true, true] }
  return {
    id,
    siteId,
    zone,
    name: `分揀機 ${zone.toUpperCase()}`,
    code: `${siteId.toUpperCase()}-${zone.toUpperCase()}`,
    status: 'normal',
    headline: '運轉正常',
    flow,
    metrics: [
      metric('throughput', Math.round(RATED_THROUGHPUT * load)),
      metric('speed', 2),
      metric('motorTemp', 58),
      metric('vibration', 2.1),
      metric('voltage', 212),
      metric('errorRate', 0.3),
    ],
    components: buildComponents(flow),
    labels: [],
    maintenance: { last, next, overdueDays: 0, downtimes30d: 0 },
  }
}

const tpeA3Flow = { inlet: 1, belts: [1, 1, 0, 0], diverts: [true, true, false, false] }
const tpeA1Flow = { inlet: 0.4, belts: [0.4, 0.4, 0.4, 0.4], diverts: [true, true, true, true] }
const txgA2Flow = { inlet: 0.9, belts: [0.9, 0.9, 0.9, 0.9], diverts: [true, true, true, true] }

export const equipment: Record<EquipmentId, Equipment> = {
  'tpe-a1': {
    id: 'tpe-a1',
    siteId: 'tpe',
    zone: 'a1',
    name: '分揀機 A1',
    code: 'TPE-A1',
    status: 'alert',
    statusSince: '14:20',
    headline: '降速 60% · 馬達溫度 85°C',
    riskId: 'r1',
    flow: tpeA1Flow,
    metrics: [
      metric('throughput', 2400, 5600),
      metric('speed', 0.8, 2),
      metric('motorTemp', 85, 65),
      metric('vibration', 3.8, 2.4),
      metric('voltage', 206, 210),
      metric('errorRate', 0.6, 0.3),
    ],
    components: buildComponents(tpeA1Flow, {
      'belt-2': { status: 'alert', note: '降速運轉 60%' },
      'motor-2': { status: 'alert', note: '馬達溫度 85°C，超出正常範圍', readings: [{ label: '溫度', value: '85°C' }, { label: '振動', value: '3.8 mm/s' }] },
      'motor-1': { status: 'watch', note: '溫度偏高', readings: [{ label: '溫度', value: '74°C' }, { label: '振動', value: '2.9 mm/s' }] },
      'motor-3': { status: 'watch', note: '溫度偏高', readings: [{ label: '溫度', value: '72°C' }, { label: '振動', value: '2.7 mm/s' }] },
    }),
    labels: [
      { component: 'motor-2', text: '馬達 85°C' },
      { component: 'belt-2', text: '降速 60%' },
    ],
    maintenance: { last: '2026/09/15', next: '2026/10/22', overdueDays: 0, downtimes30d: 1 },
    impact: { capacityLoss: 20, orders: 2103, queueHours: 3.2, note: '與 A3 停機疊加，台北 A 出貨處理量 ↓ 60%' },
  },
  'tpe-a2': normalSorter('tpe-a2', 'tpe', 'a2', '2026/10/01', '2026/11/01', 0.94),
  'tpe-a3': {
    id: 'tpe-a3',
    siteId: 'tpe',
    zone: 'a3',
    name: '分揀機 A3',
    code: 'TPE-A3',
    status: 'down',
    statusSince: '14:28',
    headline: 'Error Code E21 · 自動停機',
    riskId: 'r1',
    flow: tpeA3Flow,
    metrics: [
      metric('throughput', 1450, 5400),
      metric('speed', 0, 2),
      metric('motorTemp', 72, 66),
      metric('vibration', 0.4, 2.3),
      metric('voltage', 205, 210),
      metric('errorRate', 0.5, 0.3),
    ],
    components: buildComponents(tpeA3Flow, {
      'divert-3': { status: 'down', note: 'Error Code E21，14:28 自動停機', readings: [{ label: '動作', value: '停擺' }, { label: '錯誤碼', value: 'E21' }] },
      'belt-3': { status: 'down', note: '主線中斷，停止運轉', readings: [{ label: '速度', value: '0 m/s' }] },
      'belt-4': { status: 'watch', note: '上游中斷，無來料' },
      'motor-3': { status: 'alert', note: '過載保護跳脫', readings: [{ label: '溫度', value: '72°C' }, { label: '振動', value: '0.4 mm/s' }] },
      'belt-2': { status: 'watch', note: '包裹堆積' },
    }),
    labels: [
      { component: 'divert-3', text: 'E21 停機' },
      { component: 'belt-2', text: '包裹堆積' },
    ],
    maintenance: { last: '2026/09/15', next: '2026/10/22', overdueDays: 0, downtimes30d: 3 },
    impact: { capacityLoss: 33, orders: 2103, queueHours: 3.2, note: '與 A1 降速疊加，台北 A 出貨處理量 ↓ 60%' },
  },
  'txg-a1': normalSorter('txg-a1', 'txg', 'a1', '2026/09/20', '2026/10/25'),
  'txg-a2': {
    id: 'txg-a2',
    siteId: 'txg',
    zone: 'a2',
    name: '分揀機 A2',
    alias: 'Sorter B',
    code: 'TXG-A2',
    status: 'alert',
    statusSince: '13:50',
    headline: '振動 4.9 mm/s · 保養逾期 12 天',
    riskId: 'r2',
    flow: txgA2Flow,
    metrics: [
      metric('throughput', 5280, 5350),
      metric('speed', 1.8, 1.9),
      metric('motorTemp', 64, 58),
      metric('vibration', 4.9, 3.2),
      metric('voltage', 211),
      metric('errorRate', 1.1, 0.4),
    ],
    components: buildComponents(txgA2Flow, {
      'motor-2': { status: 'alert', note: '軸承磨耗：振動 4.9 mm/s、軸承 68°C', readings: [{ label: '軸承溫度', value: '68°C' }, { label: '振動', value: '4.9 mm/s' }] },
      'divert-2': { status: 'watch', note: '分揀錯誤率 0.4% → 1.1%', readings: [{ label: '動作', value: '20 次/分' }, { label: '錯誤率', value: '1.1%' }] },
      'belt-2': { status: 'watch', note: '連續高負載運轉' },
    }),
    labels: [
      { component: 'motor-2', text: '振動 4.9 mm/s' },
      { component: 'divert-2', text: '錯誤率 1.1%' },
    ],
    maintenance: { last: '2026/08/02', next: '2026/10/02', overdueDays: 12, downtimes30d: 2 },
    impact: { capacityLoss: 35, orders: 1520, note: '10/16–10/17 可能異常停機，影響台南 D 轉運' },
  },
  'txg-a3': normalSorter('txg-a3', 'txg', 'a3', '2026/09/20', '2026/10/25'),
}

export const equipmentBySite: Partial<Record<SiteId, EquipmentId[]>> = {
  tpe: ['tpe-a1', 'tpe-a2', 'tpe-a3'],
  txg: ['txg-a1', 'txg-a2', 'txg-a3'],
}

export const isEquipmentId = (v: string | null): v is EquipmentId => !!v && v in equipment

export const equipmentLabel = (e: Equipment) => (e.alias ? `${e.name}（${e.alias}）` : e.name)

// 事件時間軸直接取自 P03 Evidence，確保兩處資料一致
export function equipmentEvents(id: EquipmentId): Evidence[] {
  return Object.values(riskDetail)
    .flatMap((d) => d.analysis.evidence)
    .filter((e) => e.equipment?.includes(id))
    .sort((a, b) => b.time.localeCompare(a.time))
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function statusDuration(since: string) {
  const mins = toMinutes(SCENARIO_NOW.slice(-5)) - toMinutes(since)
  return mins >= 60 ? `${Math.floor(mins / 60)} 小時 ${mins % 60} 分` : `${mins} 分鐘`
}

export function isOutOfRange(m: Metric, v = m.value) {
  return (m.normalMin !== undefined && v < m.normalMin) || (m.normalMax !== undefined && v > m.normalMax)
}
