import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import type { Risk } from '../../data/scenario'
import { categoryColor, color } from '../../theme/tokens'
import { EChart } from './EChart'

// 影響程度以影響訂單數示範分級（PRD §9：先以示範分級呈現）
const IMPACT_MAX = 2500

interface Props {
  risks: Risk[]
  selectedId: string
  onSelect: (id: string) => void
  className?: string
}

export function RiskMatrix({ risks, selectedId, onSelect, className }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const zone = (x1: number, y1: number, x2: number, y2: number, alpha: string) => [
      { xAxis: x1, yAxis: y1, itemStyle: { color: color.high + alpha } },
      { xAxis: x2, yAxis: y2 },
    ]
    // 三等分格線：低／中／高
    const axis = (name: string, max: number, labels: string[]) => ({
      type: 'value' as const,
      min: 0,
      max,
      interval: max / 3,
      name,
      nameLocation: 'middle' as const,
      nameGap: 28,
      nameTextStyle: { color: color.mute, fontSize: 12 },
      axisLine: { lineStyle: { color: color.lineStrong } },
      splitLine: { lineStyle: { color: color.line } },
      axisLabel: { color: color.mute, fontSize: 11, formatter: (v: number) => labels[Math.round((v / max) * 3)] ?? '' },
    })

    return {
      grid: { left: 68, right: 24, top: 16, bottom: 44 },
      xAxis: axis('發生可能性', 100, ['0', '33%', '67%', '100%']),
      yAxis: { ...axis('影響訂單（件）', IMPACT_MAX, ['0', '833', '1,667', '2,500']), nameGap: 48 },
      tooltip: {
        backgroundColor: color.panel,
        borderColor: color.lineStrong,
        textStyle: { color: color.ink, fontSize: 12 },
        formatter: (p) => {
          const r = risks[(p as { dataIndex: number }).dataIndex]
          return `${r.title}<br/>發生可能性 ${r.probability}%<br/>影響訂單 ${r.affectedOrders.toLocaleString()} 件`
        },
      },
      series: [
        {
          type: 'scatter',
          data: risks.map((r) => ({
            value: [r.probability, r.affectedOrders],
            symbolSize: 18 + (r.affectedOrders / IMPACT_MAX) * 30,
            itemStyle: {
              color: categoryColor[r.category],
              opacity: r.id === selectedId ? 1 : 0.55,
              borderColor: r.id === selectedId ? '#fff' : 'transparent',
              borderWidth: 2,
              shadowBlur: r.id === selectedId ? 24 : 8,
              shadowColor: categoryColor[r.category],
            },
            label: {
              show: true,
              position: 'right',
              distance: 10,
              formatter: r.title.replace('物流中心', ''),
              color: r.id === selectedId ? color.ink : color.ink2,
              fontSize: 11,
              backgroundColor: color.bg + 'cc',
              borderColor: r.id === selectedId ? categoryColor[r.category] : color.line,
              borderWidth: 1,
              borderRadius: 3,
              padding: [3, 6],
            },
          })),
          // 右上高風險區塊底色較深
          markArea: {
            silent: true,
            data: [
              zone(200 / 3, (IMPACT_MAX * 2) / 3, 100, IMPACT_MAX, '30'),
              zone(100 / 3, (IMPACT_MAX * 2) / 3, 200 / 3, IMPACT_MAX, '14'),
              zone(200 / 3, IMPACT_MAX / 3, 100, (IMPACT_MAX * 2) / 3, '14'),
            ] as never,
          },
        },
      ],
    }
  }, [risks, selectedId])

  return <EChart option={option} className={className} onClick={(p) => onSelect(risks[p.dataIndex].id)} />
}
