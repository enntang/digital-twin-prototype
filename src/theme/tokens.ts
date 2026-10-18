import type { RiskLevel } from '../data/scenario'

// ECharts 無法讀 CSS 變數，這裡與 index.css 的 @theme 保持同值
export const color = {
  bg: '#040a17',
  panel: '#081428',
  line: '#15325c',
  lineStrong: '#1f4a85',
  ink: '#e6f0ff',
  ink2: '#b4c5e0',
  mute: '#6f86ab',
  accent: '#2f7bff',
  cyan: '#22d3ee',
  violet: '#a78bfa',
  high: '#ff4d5e',
  mid: '#ffa424',
  watch: '#f5d142',
  low: '#22c55e',
}

export const riskColor: Record<RiskLevel, string> = {
  high: color.high,
  mid: color.mid,
  low: color.low,
}

export const riskLabel: Record<RiskLevel, string> = {
  high: '高',
  mid: '中',
  low: '低',
}
