import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { NOW_INDEX, TREND_DAYS, type RiskTrend as Trend } from '../../data/riskIntel'
import { color } from '../../theme/tokens'
import { EChart } from './EChart'

// 實際值實線、預測值虛線、門檻紅線；超過門檻的預測區間以紅色底標示
export function RiskTrend({ trend, className }: { trend: Trend; className?: string }) {
  const option = useMemo<EChartsOption>(() => {
    const pad = Array(NOW_INDEX).fill(null)
    const actual = [...trend.actual, ...Array(TREND_DAYS.length - trend.actual.length).fill(null)]
    const forecast = [...pad, ...trend.forecast]
    const over = forecast.map((v, i) => (v !== null && v > trend.threshold ? i : -1)).filter((i) => i >= 0)
    const max = Math.max(trend.threshold, ...trend.actual, ...trend.forecast)

    return {
      grid: { left: 48, right: 20, top: 28, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: color.panel,
        borderColor: color.lineStrong,
        textStyle: { color: color.ink, fontSize: 12 },
        valueFormatter: (v) => (v == null ? '-' : `${v} ${trend.unit}`),
      },
      xAxis: {
        type: 'category',
        data: TREND_DAYS,
        boundaryGap: false,
        axisLine: { lineStyle: { color: color.line } },
        axisTick: { show: false },
        axisLabel: { color: color.mute, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: Math.ceil((max * 1.25) / 10) * 10 || undefined,
        name: trend.unit,
        nameTextStyle: { color: color.mute, fontSize: 11, padding: [0, 24, 0, 0] },
        splitLine: { lineStyle: { color: color.line, type: 'dashed' } },
        axisLabel: { color: color.mute, fontSize: 11 },
      },
      series: [
        {
          name: '實際值',
          type: 'line',
          data: actual,
          smooth: true,
          symbolSize: 6,
          lineStyle: { color: color.accent, width: 2 },
          itemStyle: { color: color.accent },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color.accent + '40' }, { offset: 1, color: color.accent + '00' }] },
          },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [{ xAxis: NOW_INDEX }],
            lineStyle: { color: color.ink2, type: 'dashed', width: 1 },
            label: { formatter: '現在', color: color.ink2, fontSize: 11 },
          },
        },
        {
          name: '預測值',
          type: 'line',
          data: forecast,
          smooth: true,
          symbolSize: 5,
          lineStyle: { color: color.cyan, width: 2, type: 'dashed' },
          itemStyle: { color: color.cyan },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [{ yAxis: trend.threshold }],
            lineStyle: { color: color.high, width: 1.5 },
            label: { formatter: trend.thresholdLabel, position: 'insideEndTop', color: color.high, fontSize: 11 },
          },
          markArea: over.length
            ? {
                silent: true,
                itemStyle: { color: color.high + '1f' },
                label: { show: true, position: 'insideTop', color: color.high, fontSize: 11, formatter: trend.note, distance: 8 },
                data: [[{ xAxis: TREND_DAYS[over[0]] }, { xAxis: TREND_DAYS[over[over.length - 1]] }]],
              }
            : undefined,
        },
      ],
    }
  }, [trend])

  return <EChart option={option} className={className} />
}
