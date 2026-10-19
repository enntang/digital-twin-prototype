import { useMemo } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { EChart } from './EChart'
import taiwanGeo from '../../data/taiwan.geo.json'
import { flows as allFlows, siteById, sites, type Flow, type RiskLevel, type SiteId } from '../../data/scenario'
import { color, riskColor } from '../../theme/tokens'

echarts.registerMap('taiwan', taiwanGeo as unknown as Parameters<typeof echarts.registerMap>[1])

export interface MapView {
  center: [number, number]
  zoom: number
}

interface Props {
  view: MapView
  selectedSiteId?: SiteId | null
  showFlows?: boolean
  flows?: Flow[]
  // 風險來源據點 → 受影響據點，以紅線標示
  impact?: { from: SiteId; to: SiteId[] } | null
  // 策略調度路線（P04/P05），以指定顏色與箭頭標示
  routes?: { from: SiteId; to: SiteId; color: string }[]
  // 覆寫據點風險狀態（P05 After 地圖）
  levels?: Partial<Record<SiteId, RiskLevel>>
  // 據點標籤下方的第二行說明，例如「產能 95% → 82%」
  notes?: Partial<Record<SiteId, string>>
  onSiteClick?: (id: SiteId) => void
  className?: string
}

// 台北 A 與桃園 B 距離很近，標籤分左右放避免重疊
const labelPosition: Partial<Record<SiteId, 'left' | 'right'>> = { tyn: 'left' }

const flowColor = (v: number) => (v >= 20000 ? color.cyan : v >= 10000 ? '#5b8cff' : color.violet)

export function TaiwanMap({ view, selectedSiteId, showFlows = true, flows = allFlows, impact, routes, levels, notes, onSiteClick, className }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const geoBase = {
      map: 'taiwan',
      roam: false,
      silent: true,
      center: view.center,
      zoom: view.zoom,
      aspectScale: 0.92,
      layoutSize: '92%',
      label: { show: false },
      emphasis: { disabled: true },
      select: { disabled: true },
    }

    const flowSeries = showFlows
      ? [
          {
            type: 'lines' as const,
            geoIndex: 1,
            zlevel: 2,
            effect: { show: true, period: 5, trailLength: 0.35, symbol: 'circle', symbolSize: 3 },
            lineStyle: { width: 1.2, opacity: 0.7, curveness: 0.25 },
            data: flows.map((f) => ({
              coords: [siteById[f.from].coord, siteById[f.to].coord],
              lineStyle: { color: flowColor(f.volume), width: f.volume >= 20000 ? 2 : 1.2 },
            })),
          },
        ]
      : []

    const impactSeries = impact
      ? [
          {
            type: 'lines' as const,
            geoIndex: 1,
            zlevel: 3,
            effect: { show: true, period: 2.5, trailLength: 0.5, symbol: 'arrow', symbolSize: 6, color: color.high },
            lineStyle: { color: color.high, width: 2.5, opacity: 0.85, curveness: -0.3 },
            data: impact.to.map((to) => ({ coords: [siteById[impact.from].coord, siteById[to].coord] })),
          },
        ]
      : []

    const routeSeries = routes?.length
      ? [
          {
            type: 'lines' as const,
            geoIndex: 1,
            zlevel: 3,
            effect: { show: true, period: 2.2, trailLength: 0.4, symbol: 'arrow', symbolSize: 7 },
            lineStyle: { width: 3, opacity: 0.95, curveness: 0.3 },
            data: routes.map((r) => ({
              coords: [siteById[r.from].coord, siteById[r.to].coord],
              lineStyle: { color: r.color, shadowColor: r.color, shadowBlur: 12 },
              effect: { color: r.color },
            })),
          },
        ]
      : []

    return {
      geo: [
        // 底層：下移並加光暈，做出地圖浮起的立體感
        {
          ...geoBase,
          layoutCenter: ['50%', '52.2%'],
          z: 1,
          itemStyle: {
            areaColor: '#020815',
            borderColor: '#0d3e86',
            borderWidth: 1,
            shadowColor: 'rgba(30,120,255,0.75)',
            shadowBlur: 28,
            shadowOffsetY: 10,
          },
        },
        {
          ...geoBase,
          layoutCenter: ['50%', '50%'],
          z: 2,
          itemStyle: {
            areaColor: {
              type: 'radial', x: 0.5, y: 0.45, r: 0.8,
              colorStops: [
                { offset: 0, color: '#0f3a7a' },
                { offset: 1, color: '#061a3d' },
              ],
            },
            borderColor: 'rgba(90,170,255,0.55)',
            borderWidth: 0.8,
          },
        },
      ],
      series: [
        ...flowSeries,
        ...impactSeries,
        ...routeSeries,
        {
          type: 'effectScatter',
          coordinateSystem: 'geo',
          geoIndex: 1,
          zlevel: 4,
          rippleEffect: { scale: 3.2, brushType: 'stroke', period: 3 },
          data: sites.map((s) => {
            const selected = s.id === selectedSiteId
            const level = levels?.[s.id] ?? s.risk
            const note = notes?.[s.id]
            return {
              id: s.id,
              name: s.name,
              value: s.coord,
              symbolSize: selected ? 20 : 13,
              itemStyle: {
                color: riskColor[level],
                borderColor: selected ? '#fff' : 'rgba(255,255,255,0.6)',
                borderWidth: selected ? 3 : 1.5,
                shadowColor: riskColor[level],
                shadowBlur: 16,
              },
              label: {
                show: true,
                position: labelPosition[s.id] ?? 'right',
                distance: 10,
                formatter: note ? `{name|${s.name}}\n{note|${note}}` : s.name,
                rich: { name: { fontSize: 13, fontWeight: 600, color: color.ink }, note: { fontSize: 11, color: color.ink2, padding: [3, 0, 0, 0] } },
                color: color.ink,
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: 'rgba(4,12,28,0.85)',
                borderColor: selected ? color.cyan : 'rgba(90,150,255,0.45)',
                borderWidth: 1,
                borderRadius: 4,
                padding: [4, 8],
              },
            }
          }),
          cursor: onSiteClick ? 'pointer' : 'default',
        },
      ],
    }
  }, [view, selectedSiteId, showFlows, flows, impact, routes, levels, notes, onSiteClick])

  return (
    <EChart
      option={option}
      className={className}
      onClick={(p) => {
        if (p.seriesType === 'effectScatter' && onSiteClick) onSiteClick((p.data as { id: SiteId }).id)
      }}
    />
  )
}
