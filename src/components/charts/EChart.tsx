import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, ECElementEvent } from 'echarts'

interface Props {
  option: EChartsOption
  className?: string
  onClick?: (params: ECElementEvent) => void
}

export function EChart({ option, className, onClick }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)
  const clickRef = useRef(onClick)
  clickRef.current = onClick

  useEffect(() => {
    if (!el.current) return
    const instance = echarts.init(el.current, undefined, { renderer: 'canvas' })
    chart.current = instance
    instance.on('click', (p) => clickRef.current?.(p as ECElementEvent))
    const ro = new ResizeObserver(() => instance.resize())
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      instance.dispose()
      chart.current = null
    }
  }, [])

  useEffect(() => {
    // 不用 notMerge，地圖縮放與中心點切換才會有過場動畫
    chart.current?.setOption(option, { replaceMerge: ['series'] })
  }, [option])

  return <div ref={el} className={className} />
}
