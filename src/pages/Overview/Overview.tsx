import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkline } from '../../components/charts/Sparkline'
import { TaiwanMap, type MapView } from '../../components/charts/TaiwanMap'
import { Panel, RiskBadge } from '../../components/ui'
import {
  NATION_VIEW,
  notices,
  overviewInsight,
  overviewKpis,
  regions,
  risks,
  siteById,
  sites,
  type RegionId,
  type SiteId,
} from '../../data/scenario'
import { useScenario } from '../../store/scenario'
import { color, riskColor } from '../../theme/tokens'
import { FloorPlan } from './FloorPlan'

type Level = 'nation' | 'region' | 'site' | 'floor'

export function Overview() {
  const navigate = useNavigate()
  const selectRisk = useScenario((s) => s.selectRisk)

  const [regionId, setRegionId] = useState<RegionId | null>(null)
  const [siteId, setSiteId] = useState<SiteId | null>(null)
  const [floor, setFloor] = useState(false)
  const [showFlows, setShowFlows] = useState(true)

  const level: Level = floor ? 'floor' : siteId ? 'site' : regionId ? 'region' : 'nation'
  const site = siteId ? siteById[siteId] : null
  const region = regions.find((r) => r.id === regionId) ?? null

  const view = useMemo<MapView>(() => {
    if (site) return { center: site.coord, zoom: 4 }
    if (region) return { center: region.center, zoom: region.zoom }
    return NATION_VIEW
  }, [site, region])

  const siteRisk = site ? risks.find((r) => r.siteId === site.id) : undefined
  const impact = useMemo(() => {
    // 全國或北區層級預設顯示主情境的影響範圍；選取據點時顯示該據點風險的影響
    const r = siteRisk ?? (level === 'nation' || regionId === 'north' ? risks[0] : undefined)
    return r && r.impactSites.length ? { from: r.siteId, to: r.impactSites } : null
  }, [siteRisk, level, regionId])

  const pickSite = useCallback((id: SiteId) => {
    setSiteId(id)
    setRegionId(siteById[id].region)
    setFloor(false)
  }, [])

  const goRisk = (riskId: string) => {
    selectRisk(riskId)
    navigate('/risk')
  }

  const crumbs: { label: string; onClick?: () => void }[] = [
    { label: '全國', onClick: level !== 'nation' ? () => { setRegionId(null); setSiteId(null); setFloor(false) } : undefined },
  ]
  if (region) crumbs.push({ label: region.name, onClick: level !== 'region' ? () => { setSiteId(null); setFloor(false) } : undefined })
  if (site) crumbs.push({ label: site.name, onClick: floor ? () => setFloor(false) : undefined })
  if (floor) crumbs.push({ label: '1F 作業樓層' })

  return (
    <div className="grid h-full grid-cols-[300px_minmax(0,1fr)_380px] gap-4 p-4">
      {/* 左：主要營運 KPI */}
      <div className="flex min-h-0 flex-col gap-3">
        {overviewKpis.map((k) => {
          const tone = k.good ? color.low : color.high
          return (
            <Panel key={k.id} className="shrink-0" bodyClassName="flex items-end justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-[13px] text-mute">{k.label}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-[26px] leading-none font-semibold">{k.value}</span>
                  {k.unit && <span className="text-xs text-mute">{k.unit}</span>}
                </div>
                <div className="mt-1.5 text-xs">
                  <span style={{ color: tone }}>{k.delta}</span>
                  <span className="ml-1.5 text-mute">較前 7 天</span>
                </div>
              </div>
              <Sparkline data={k.trend} color={k.good ? color.cyan : tone} className="h-10 w-24" />
            </Panel>
          )
        })}

        <Panel title="據點狀態" className="flex-1" bodyClassName="overflow-y-auto px-2 pb-2">
          {sites.map((s) => (
            <button
              key={s.id}
              onClick={() => pickSite(s.id)}
              className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-[13px] transition ${
                s.id === siteId ? 'bg-accent/15 ring-1 ring-accent/50' : 'hover:bg-panel-2'
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: riskColor[s.risk], boxShadow: `0 0 8px ${riskColor[s.risk]}` }} />
              <span className="w-14 shrink-0">{s.name}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${s.utilization}%`, background: s.utilization >= 85 ? color.high : color.accent }}
                />
              </span>
              <span className="w-10 text-right font-mono text-ink-2">{s.utilization}%</span>
            </button>
          ))}
          <div className="px-2 pt-1 text-[11px] text-mute">產能利用率 · ≥ 85% 標示為高負載</div>
        </Panel>
      </div>

      {/* 中：2D 據點地圖 */}
      <Panel className="overflow-hidden" bodyClassName="relative">
        <div className="absolute top-3 left-4 z-10 flex items-center gap-3">
          <nav className="flex items-center gap-1 rounded-md border border-line bg-bg/80 px-2 py-1 text-[13px]">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1">
                {i > 0 && <span className="text-mute">›</span>}
                {c.onClick ? (
                  <button onClick={c.onClick} className="text-cyan hover:underline">
                    {c.label}
                  </button>
                ) : (
                  <span className="text-ink">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          {level !== 'floor' && (
            <div className="flex gap-1">
              {regions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setRegionId(r.id); setSiteId(null) }}
                  className={`rounded border px-2.5 py-1 text-xs transition ${
                    r.id === regionId && !siteId ? 'border-accent bg-accent/20 text-ink' : 'border-line bg-bg/70 text-ink-2 hover:border-accent/60'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {level !== 'floor' && (
          <div className="absolute top-3 right-4 z-10 w-40 space-y-2 rounded-md border border-line bg-bg/80 p-3 text-xs text-ink-2">
            <div className="text-mute">據點狀態</div>
            {(['high', 'mid', 'low'] as const).map((lv) => (
              <div key={lv} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: riskColor[lv] }} />
                {lv === 'high' ? '高風險' : lv === 'mid' ? '中風險' : '正常'}
              </div>
            ))}
            {impact && (
              <div className="flex items-center gap-2 border-t border-line pt-2">
                <span className="h-0.5 w-4 rounded" style={{ background: color.high }} />
                風險影響範圍
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2 border-t border-line pt-2">
              <input type="checkbox" checked={showFlows} onChange={(e) => setShowFlows(e.target.checked)} className="accent-cyan" />
              顯示物流流向
            </label>
          </div>
        )}

        {level === 'floor' && site ? (
          <FloorPlan siteId={site.id} />
        ) : (
          <TaiwanMap
            view={view}
            selectedSiteId={siteId}
            showFlows={showFlows}
            impact={impact}
            onSiteClick={pickSite}
            className="absolute inset-0"
          />
        )}

        {level === 'floor' && site && (
          <div className="absolute top-3 right-4 z-10 flex gap-2">
            <button onClick={() => setFloor(false)} className="rounded-md border border-line-strong bg-bg/80 px-3 py-1.5 text-[13px] text-ink-2 hover:border-cyan hover:text-ink">
              返回地圖
            </button>
            {siteRisk && (
              <button onClick={() => goRisk(siteRisk.id)} className="rounded-md bg-accent px-3 py-1.5 text-[13px] text-white hover:bg-accent/85">
                查看風險預測
              </button>
            )}
          </div>
        )}

        {site && level !== 'floor' && (
          <div className="absolute bottom-4 left-4 z-10 w-[300px] rounded-lg border border-line-strong bg-bg/90 p-4 shadow-[0_0_30px_rgba(20,90,220,0.25)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  {site.name} · {site.fullName}
                </div>
                <div className="text-xs text-mute">{regions.find((r) => r.id === site.region)?.name}</div>
              </div>
              <RiskBadge level={site.risk} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ['訂單量', site.orders.toLocaleString()],
                ['準時率', `${site.onTimeRate}%`],
                ['產能利用率', `${site.utilization}%`],
              ].map(([k, v]) => (
                <div key={k} className="rounded bg-panel-2 py-2">
                  <dt className="text-[11px] text-mute">{k}</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {siteRisk && (
              <div className="mt-3 rounded border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-xs text-ink-2">
                <span className="text-risk-high">預測風險：</span>
                {siteRisk.title}，{siteRisk.startDate} 起影響約 {siteRisk.affectedOrders.toLocaleString()} 件訂單
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setFloor(true)}
                className="flex-1 rounded-md border border-line-strong py-1.5 text-[13px] text-ink-2 hover:border-cyan hover:text-ink"
              >
                查看樓層
              </button>
              {siteRisk && (
                <button onClick={() => goRisk(siteRisk.id)} className="flex-1 rounded-md bg-accent py-1.5 text-[13px] text-white hover:bg-accent/85">
                  查看風險預測
                </button>
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* 右：AI 洞察與風險事件 */}
      <div className="flex min-h-0 flex-col gap-4">
        <Panel
          className="shrink-0 border-cyan/40"
          title={
            <span className="flex items-center gap-2">
              <span className="text-cyan">✦</span> AI 洞察
            </span>
          }
          bodyClassName="px-4 pb-4"
        >
          <div className="font-semibold text-risk-high">{overviewInsight.title}</div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{overviewInsight.body}</p>
          <button
            onClick={() => goRisk(overviewInsight.riskId)}
            className="mt-3 w-full rounded-md bg-accent py-2 text-sm text-white shadow-[0_0_16px_rgba(47,123,255,0.4)] hover:bg-accent/85"
          >
            查看風險預測 →
          </button>
        </Panel>

        <Panel title="風險事件" extra={<span className="text-xs text-mute">未來 7 天預測</span>} className="flex-1" bodyClassName="overflow-y-auto px-3 pb-3">
          <ul className="space-y-2">
            {risks.map((r, i) => (
              <li key={r.id}>
                <button
                  onClick={() => goRisk(r.id)}
                  className="group w-full rounded-md border border-line bg-bg/40 p-3 text-left transition hover:border-accent/70 hover:bg-panel-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-semibold text-bg"
                      style={{ background: riskColor[r.level] }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">{r.title}</span>
                    <RiskBadge level={r.level} />
                    <span className="text-mute transition group-hover:translate-x-0.5 group-hover:text-cyan">›</span>
                  </div>
                  <div className="mt-1.5 flex gap-4 pl-7 text-xs text-mute">
                    <span>{siteById[r.siteId].name}</span>
                    <span>
                      影響 <span className="font-mono text-ink-2">{r.affectedOrders.toLocaleString()}</span> 件
                    </span>
                    <span>預計 {r.startDate} 開始</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 mb-1 px-1 text-xs text-mute">一般通報</div>
          {notices.map((n) => (
            <div key={n.id} className="flex items-start gap-2 rounded-md border border-line/60 px-3 py-2 text-xs text-ink-2">
              <span className="mt-0.5 text-accent">ⓘ</span>
              <div className="flex-1">
                <span className="text-ink">{siteById[n.siteId].name}</span> {n.title}
                <div className="text-mute">{n.detail}</div>
              </div>
              <span className="font-mono text-mute">{n.time}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  )
}
