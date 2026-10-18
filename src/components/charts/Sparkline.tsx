import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from './EChart'

export function Sparkline({ data, color, className }: { data: number[]; color: string; className?: string }) {
  const option = useMemo<EChartsOption>(
    () => ({
      animation: false,
      grid: { left: 0, right: 0, top: 2, bottom: 2 },
      xAxis: { type: 'category', show: false, boundaryGap: false },
      yAxis: { type: 'value', show: false, scale: true },
      series: [
        {
          type: 'line',
          data,
          smooth: true,
          symbol: 'none',
          lineStyle: { color, width: 1.5 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: color + '55' },
                { offset: 1, color: color + '00' },
              ],
            },
          },
        },
      ],
    }),
    [data, color],
  )
  return <EChart option={option} className={className} />
}
