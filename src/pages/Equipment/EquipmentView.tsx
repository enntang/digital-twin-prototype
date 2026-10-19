import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import camFloor from '../../assets/cctv/cam-sorting-floor.jpg'
import camLine from '../../assets/cctv/cam-sorter-line.jpg'
import { Sparkline } from '../../components/charts/Sparkline'
import {
  equipment as equipmentData,
  equipmentBySite,
  equipmentEvents,
  equipmentLabel,
  equipStatusLabel,
  isOutOfRange,
  statusDuration,
  type EquipComponent,
  type EquipStatus,
  type Equipment,
  type EquipmentId,
  type Metric,
} from '../../data/equipment'
import { evidenceSourceLabel, riskDetail } from '../../data/riskIntel'
import { riskById, SCENARIO_NOW, siteById } from '../../data/scenario'
import { useScenario } from '../../store/scenario'
import { color, equipStatusColor as statusTone } from '../../theme/tokens'
import { useEquipmentRoute, type EquipmentFrom } from './useEquipmentRoute'

// three.js 體積較大，只在進入 P07 時才載入
const SorterScene = lazy(() => import('./SorterScene'))

const backLabel: Record<EquipmentFrom, string> = {
  analysis: '返回風險分析',
  floor: '返回樓層平面圖',
}

// 即時影像以示意圖代替（PRD §4.7.5），不串接 CCTV
interface Camera {
  id: string
  name: string
  src: string
}

const camerasFor = (eq: Equipment): Camera[] => [
  { id: `CAM-${eq.code}-01`, name: '主線近景', src: camLine },
  { id: `CAM-${eq.siteId.toUpperCase()}-SRT`, name: '分揀區全景', src: camFloor },
]

function CameraFrame({ cam, time, large = false }: { cam: Camera; time: string; large?: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <img src={cam.src} alt={`${cam.name}（示意影像）`} className="h-full w-full object-cover" draggable={false} />
      {/* 監視器畫面疊加資訊 */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.12)_0px,rgba(0,0,0,0.12)_1px,transparent_1px,transparent_3px)]" />
      <div className={`absolute top-0 inset-x-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent font-mono ${large ? 'px-4 py-3 text-sm' : 'px-2 py-1.5 text-[10px]'}`}>
        <span className="flex items-center gap-1.5 text-white">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-risk-high" />
          LIVE · {cam.id}
        </span>
        <span className="text-white/80">{time}</span>
      </div>
      <div className={`absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent ${large ? 'px-4 py-3 text-sm' : 'px-2 py-1.5 text-[11px]'}`}>
        <span className="text-white">{cam.name}</span>
        <span className="rounded border border-risk-watch/50 bg-black/40 px-1.5 text-[10px] text-risk-watch">示意影像</span>
      </div>
    </div>
  )
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function StatusTag({ status, className = '' }: { status: EquipStatus; className?: string }) {
  const tone = statusTone[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${className}`}
      style={{ color: tone, borderColor: tone + '99', background: tone + '1f' }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'down' ? 'animate-pulse-dot' : ''}`} style={{ background: tone }} />
      {equipStatusLabel[status]}
    </span>
  )
}

// 模擬即時資料：每 2.5 秒在設定值附近小幅跳動，並保留最近 24 筆供趨勢線使用
function seeded(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function useLiveMetrics(eq: Equipment) {
  const init = useMemo(
    () =>
      eq.metrics.map((m, mi) =>
        Array.from({ length: 24 }, (_, i) => {
          const base = m.from + ((m.value - m.from) * i) / 23
          return i === 23 ? m.value : base + (seeded(mi * 31 + i) - 0.5) * 2 * m.jitter
        }),
      ),
    [eq],
  )
  const [history, setHistory] = useState(init)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setHistory(init)
    setTick(0)
    const t = setInterval(() => {
      setTick((v) => v + 1)
      setHistory((h) =>
        h.map((series, mi) => {
          const m = eq.metrics[mi]
          const v = m.value === 0 ? 0 : Math.max(0, m.value + (Math.random() - 0.5) * 2 * m.jitter)
          return [...series.slice(1), v]
        }),
      )
    }, 2500)
    return () => clearInterval(t)
  }, [eq, init])

  // 示範時間以情境「現在」為起點往後推進
  const [hh, mm] = SCENARIO_NOW.slice(-5).split(':').map(Number)
  const secs = hh * 3600 + mm * 60 + tick * 2.5
  const updatedAt = [Math.floor(secs / 3600), Math.floor((secs % 3600) / 60), Math.floor(secs % 60)].map((n) => String(n).padStart(2, '0')).join(':')
  return { history, updatedAt }
}

function MetricTile({ m, series }: { m: Metric; series: number[] }) {
  const v = series[series.length - 1]
  const bad = isOutOfRange(m, v)
  const tone = bad ? color.high : color.cyan
  return (
    <div className="rounded-md border border-line bg-bg/50 px-3 pt-2 pb-1">
      <div className="flex items-baseline justify-between text-[11px] text-mute">
        <span>{m.label}</span>
        <span>{m.rangeLabel}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="font-mono text-lg font-semibold" style={{ color: bad ? color.high : color.ink }}>
          {v.toLocaleString(undefined, { minimumFractionDigits: m.decimals, maximumFractionDigits: m.decimals })}
        </span>
        <span className="text-[11px] text-mute">{m.unit}</span>
      </div>
      <Sparkline data={series} color={tone} className="h-7" />
    </div>
  )
}

function ComponentRow({ c, selected, onClick }: { c: EquipComponent; selected: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`grid w-full grid-cols-[10px_118px_1fr] items-center gap-2 px-3 py-1.5 text-left text-xs transition ${
          selected ? 'bg-cyan/12 ring-1 ring-cyan/60 ring-inset' : 'hover:bg-panel-2'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${c.status === 'down' ? 'animate-pulse-dot' : ''}`} style={{ background: statusTone[c.status] }} />
        <span className="text-ink">{c.name}</span>
        <span className="truncate text-mute" style={c.status !== 'normal' ? { color: statusTone[c.status] } : undefined}>
          {c.note ?? equipStatusLabel[c.status]}
        </span>
      </button>
    </li>
  )
}

// WebGL 無法使用時的 2D 示意（PRD §6）
function Fallback2D({ eq, selected, onSelect }: { eq: Equipment; selected: string | null; onSelect: (id: string) => void }) {
  const get = (id: string) => eq.components.find((c) => c.id === id)!
  const box = (id: string, x: number, y: number, w: number, h: number) => {
    const c = get(id)
    const tone = c.status === 'normal' ? color.lineStrong : statusTone[c.status]
    return (
      <g key={id} onClick={() => onSelect(id)} className="cursor-pointer">
        <rect x={x} y={y} width={w} height={h} rx={1} fill={tone + '33'} stroke={selected === id ? color.cyan : tone} strokeWidth={selected === id ? 0.6 : 0.3} />
      </g>
    )
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="text-sm text-risk-mid">此瀏覽器無法使用 WebGL，改以 2D 示意圖呈現。</div>
      <svg viewBox="0 0 120 40" className="w-full max-w-3xl">
        {box('inlet', 2, 18, 18, 6)}
        {box('scanner', 14, 15, 5, 12)}
        {[0, 1, 2, 3].flatMap((i) => [
          box(`belt-${i + 1}`, 22 + i * 24, 18, 18, 6),
          box(`divert-${i + 1}`, 40 + i * 24, 18, 5, 6),
          box(`chute-${i + 1}`, 40 + i * 24, 26, 5, 10),
        ])}
      </svg>
    </div>
  )
}

export function EquipmentView() {
  const { id, from, event, switchTo, close } = useEquipmentRoute()
  if (!id) return null
  return <EquipmentOverlay key={id} id={id} from={from} event={event} switchTo={switchTo} close={close} />
}

function EquipmentOverlay({ id, from, event, switchTo, close }: {
  id: EquipmentId
  from: EquipmentFrom | null
  event: string | null
  switchTo: (id: EquipmentId) => void
  close: () => void
}) {
  const eq = equipmentData[id]
  const site = siteById[eq.siteId]
  const siblings = equipmentBySite[eq.siteId] ?? [id]
  const risk = eq.riskId ? riskById[eq.riskId] : null
  const plan = eq.riskId ? riskDetail[eq.riskId].plans.find((p) => p.kind === 'maintenance') : undefined
  const events = useMemo(() => equipmentEvents(id), [id])
  const { history, updatedAt } = useLiveMetrics(eq)
  const webgl = useMemo(hasWebGL, [])
  const navigate = useNavigate()
  const { selectRisk, selectPlan } = useScenario()

  // 預設對焦第一個異常元件
  const firstIssue = eq.labels[0]?.component ?? eq.components.find((c) => c.status !== 'normal')?.id ?? null
  const [selected, setSelected] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const selectedC = eq.components.find((c) => c.id === selected) ?? null
  const panelRef = useRef<HTMLDivElement>(null)
  const issues = eq.components.filter((c) => c.status !== 'normal').length
  const cameras = useMemo(() => camerasFor(eq), [eq])
  const [viewing, setViewing] = useState<number | null>(null)
  const today = SCENARIO_NOW.slice(0, 10)

  useEffect(() => {
    if (!firstIssue) return
    const t = setTimeout(() => setFocusId(firstIssue), 700)
    return () => clearTimeout(t)
  }, [firstIssue])

  // Esc 只關閉本層，不連帶關閉底下的風險分析 Panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      // 先收合放大的影像，再關閉本層
      if (viewing !== null) setViewing(null)
      else close()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [close, viewing])

  useEffect(() => {
    if (!event) return
    panelRef.current?.querySelector(`[data-event="${event}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [event])

  const select = (cid: string | null) => {
    setSelected(cid)
    if (cid) {
      setFocusId(cid)
      panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const resetView = () => {
    setSelected(null)
    setFocusId(null)
    setResetKey((k) => k + 1)
  }

  const goPlan = () => {
    if (!eq.riskId || !plan) return
    selectRisk(eq.riskId)
    selectPlan(plan.id)
    navigate('/risk', { state: { focusPlan: plan.id } })
  }

  const goRisk = () => {
    if (!eq.riskId) return
    selectRisk(eq.riskId)
    navigate('/risk', { state: { focusPlan: null } })
  }

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-[35] flex flex-col bg-bg">
      {/* 頂列：返回、麵包屑、設備切換、狀態 */}
      <div className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-panel/80 px-5">
        <button onClick={close} className="rounded-md border border-line px-3 py-1.5 text-[13px] text-ink-2 hover:border-cyan hover:text-ink">
          ← {from ? backLabel[from] : '返回'}
        </button>
        <div className="text-[13px] text-mute">
          {site.name} <span className="mx-1 text-line-strong">›</span> 1F 分揀區 <span className="mx-1 text-line-strong">›</span>
          <span className="text-ink">{equipmentLabel(eq)}</span>
        </div>
        <StatusTag status={eq.status} />
        <div className="ml-4 inline-flex rounded-md border border-line bg-bg/70 p-0.5">
          {siblings.map((sid) => {
            const s = equipmentData[sid]
            return (
              <button
                key={sid}
                onClick={() => sid !== id && switchTo(sid)}
                className={`flex items-center gap-1.5 rounded px-3 py-1 text-[13px] transition-colors ${
                  sid === id ? 'bg-accent text-white shadow-[0_0_12px_rgba(47,123,255,0.5)]' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusTone[s.status] }} />
                {s.zone.toUpperCase()}
              </button>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-mute">
          <span className="inline-flex items-center gap-1.5 rounded border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-cyan">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-cyan" />
            模擬即時資料
          </span>
          <span>
            最後更新 <span className="font-mono text-ink-2">{updatedAt}</span>
          </span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
        {/* 左：3D 設備檢視 */}
        <div className="relative min-h-0 border-r border-line">
          {webgl ? (
            <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-mute">載入 3D 模型中…</div>}>
              <SorterScene equipment={eq} selected={selected} onSelect={select} focusId={focusId} resetKey={resetKey} />
            </Suspense>
          ) : (
            <Fallback2D eq={eq} selected={selected} onSelect={select} />
          )}

          <div className="pointer-events-none absolute top-4 left-4 space-y-1">
            <div className="text-xs tracking-wider text-cyan">設備深入檢視 EQUIPMENT DRILL-DOWN</div>
            <div className="text-lg font-semibold">
              {equipmentLabel(eq)} <span className="ml-1 font-mono text-sm text-mute">{eq.code}</span>
            </div>
            <div className="text-[13px]" style={{ color: statusTone[eq.status] }}>
              {eq.headline}
            </div>
          </div>

          <button
            onClick={resetView}
            className="absolute top-4 right-4 rounded-md border border-line bg-bg/80 px-3 py-1.5 text-[13px] text-ink-2 hover:border-cyan hover:text-ink"
          >
            ⟲ 重設視角
          </button>

          {/* 放大檢視即時影像：覆蓋在 3D 區上方，可與右側面板對照 */}
          {viewing !== null && (
            <div className="absolute inset-0 z-10 flex flex-col bg-bg/95 p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm font-semibold">即時影像</span>
                <div className="inline-flex rounded-md border border-line bg-bg/70 p-0.5">
                  {cameras.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => setViewing(i)}
                      className={`rounded px-3 py-1 text-[13px] transition-colors ${i === viewing ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setViewing(null)}
                  className="ml-auto rounded-md border border-line px-3 py-1.5 text-[13px] text-ink-2 hover:border-cyan hover:text-ink"
                >
                  返回 3D 檢視 ✕
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-line-strong">
                <CameraFrame cam={cameras[viewing]} time={`${today} ${updatedAt}`} large />
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-4 rounded-md border border-line bg-bg/80 px-3 py-2 text-[11px] text-ink-2">
            {(['normal', 'watch', 'alert', 'down'] as EquipStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: s === 'normal' ? '#2557d6' : statusTone[s] }} />
                {equipStatusLabel[s]}
              </span>
            ))}
            <span className="border-l border-line pl-4 text-mute">拖曳旋轉 · 滾輪縮放 · 右鍵平移 · 點元件看細節</span>
          </div>
        </div>

        {/* 右：設備詳細資訊 */}
        <div ref={panelRef} className="min-h-0 space-y-5 overflow-y-auto bg-panel/60 px-5 pt-4 pb-20">
          <section>
            <h3 className="mb-2 text-sm font-semibold">設備摘要</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
              <dt className="text-mute">設備</dt>
              <dd>
                {equipmentLabel(eq)} · <span className="font-mono">{eq.code}</span>
              </dd>
              <dt className="text-mute">所屬據點</dt>
              <dd>
                {site.name} · {site.fullName}
              </dd>
              <dt className="text-mute">目前狀態</dt>
              <dd className="flex items-center gap-2">
                <StatusTag status={eq.status} />
                {eq.statusSince && (
                  <span className="text-xs text-mute">
                    {eq.statusSince} 起 · 已 {statusDuration(eq.statusSince)}
                  </span>
                )}
              </dd>
              <dt className="text-mute">關聯風險</dt>
              <dd>
                {risk ? (
                  <button onClick={goRisk} className="text-left text-cyan hover:underline">
                    {risk.title} →
                  </button>
                ) : (
                  <span className="text-mute">無</span>
                )}
              </dd>
            </dl>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">即時影像</h3>
              <span className="text-xs text-mute">點擊放大</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {cameras.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setViewing(i)}
                  className={`aspect-video overflow-hidden rounded-md border transition ${i === viewing ? 'border-cyan ring-1 ring-cyan/60' : 'border-line hover:border-cyan/60'}`}
                >
                  <CameraFrame cam={c} time={updatedAt} />
                </button>
              ))}
            </div>
          </section>

          {selectedC && (
            <section className="rounded-md border border-cyan/50 bg-cyan/5 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="text-cyan">◆</span>
                  {selectedC.name}
                  <StatusTag status={selectedC.status} />
                </div>
                <button onClick={() => select(null)} className="text-mute hover:text-ink" aria-label="取消選取">
                  ×
                </button>
              </div>
              {selectedC.note && <p className="mt-1.5 text-[13px] text-ink-2">{selectedC.note}</p>}
              <dl className="mt-2 grid grid-cols-2 gap-2">
                {selectedC.readings.map((r) => (
                  <div key={r.label} className="rounded bg-bg/60 px-2 py-1.5">
                    <dt className="text-[11px] text-mute">{r.label}</dt>
                    <dd className="font-mono text-sm">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold">即時指標</h3>
            <div className="grid grid-cols-2 gap-2">
              {eq.metrics.map((m, i) => (
                <MetricTile key={m.key} m={m} series={history[i]} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">元件健康狀態</h3>
              <span className="text-xs text-mute">{issues ? `${issues} 個元件異常` : '全部正常'}</span>
            </div>
            <ul className="divide-y divide-line/50 overflow-hidden rounded-md border border-line">
              {eq.components.map((c) => (
                <ComponentRow key={c.id} c={c} selected={c.id === selected} onClick={() => select(c.id === selected ? null : c.id)} />
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">事件時間軸</h3>
            {events.length ? (
              <ol className="relative ml-1.5 space-y-2.5 border-l border-line pl-4">
                {events.map((e) => (
                  <li
                    key={e.time + e.title}
                    data-event={e.time}
                    className={`relative rounded px-2 py-1 text-xs ${e.time === event ? 'bg-cyan/10 ring-1 ring-cyan/50' : ''}`}
                  >
                    <span className="absolute top-2 -left-[21px] h-2 w-2 rounded-full border-2 border-bg" style={{ background: e.source === 'device' ? color.high : color.accent }} />
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-mute">{e.time}</span>
                      <span className="rounded border border-line px-1 text-[10px] text-ink-2">{evidenceSourceLabel[e.source]}</span>
                      <span className="text-ink">{e.title}</span>
                    </div>
                    <div className="mt-0.5 text-mute">{e.detail}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-mute">近 24 小時無異常事件。</p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">維護資訊</h3>
            <dl className="grid grid-cols-4 gap-2 text-center">
              {[
                ['上次保養', eq.maintenance.last.slice(5)],
                ['預定保養', eq.maintenance.next.slice(5)],
                ['逾期', eq.maintenance.overdueDays ? `${eq.maintenance.overdueDays} 天` : '—'],
                ['近 30 天停機', `${eq.maintenance.downtimes30d} 次`],
              ].map(([k, v]) => (
                <div key={k} className="rounded bg-panel-2 py-2">
                  <dt className="text-[11px] text-mute">{k}</dt>
                  <dd className={`mt-0.5 font-mono text-sm font-semibold ${k === '逾期' && eq.maintenance.overdueDays ? 'text-risk-high' : ''}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {eq.impact && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">對營運的影響</h3>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['本設備產能損失', `${eq.impact.capacityLoss}%`],
                  ['關聯風險影響訂單', `${eq.impact.orders.toLocaleString()} 件`],
                  ['隊列等候', eq.impact.queueHours ? `${eq.impact.queueHours} 小時` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded bg-panel-2 py-2">
                    <dt className="text-[11px] text-mute">{k}</dt>
                    <dd className="mt-0.5 font-mono text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-ink-2">▸ {eq.impact.note}</p>
              {plan && (
                <button
                  onClick={goPlan}
                  className="mt-3 flex w-full items-center justify-between rounded-md border border-accent/60 bg-accent/10 px-3 py-2 text-[13px] transition hover:bg-accent/20"
                >
                  <span>
                    <span className="text-mute">相關處理方案：</span>方案 {plan.id} {plan.title}
                    <span className="ml-2 font-mono text-xs text-risk-low">延遲 ↓{plan.reduction}%</span>
                  </span>
                  <span className="text-cyan">選取方案 →</span>
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
