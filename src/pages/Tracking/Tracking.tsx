import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { EChartsOption } from 'echarts'
import { EChart } from '../../components/charts/EChart'
import { DemoTag, Panel, RiskBadge } from '../../components/ui'
import { describeParams } from '../../data/simulation'
import { ACTUAL_UNTIL, buildTracking, TRACK_DAYS, TRACK_NOW, type StepState, type TaskStatus, type Tracking as TrackingData } from '../../data/tracking'
import { useScenario } from '../../store/scenario'
import { color } from '../../theme/tokens'

const stepDot: Record<StepState, string> = {
  done: 'border-risk-low bg-risk-low text-bg',
  current: 'border-cyan bg-cyan/20 text-cyan shadow-[0_0_14px_rgba(34,211,238,0.6)]',
  todo: 'border-line-strong bg-bg text-mute',
}

const taskBadge: Record<TaskStatus, [string, string]> = {
  done: ['已完成', 'border-risk-low/50 bg-risk-low/10 text-risk-low'],
  running: ['執行中', 'border-accent/60 bg-accent/15 text-accent'],
  pending: ['待執行', 'border-line-strong bg-bg text-mute'],
}

function Timeline({ steps }: { steps: TrackingData['steps'] }) {
  return (
    <ol className="flex items-start px-6 pt-2 pb-5">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex flex-1 flex-col items-center text-center">
          {i < steps.length - 1 && (
            <span className={`absolute top-3.5 left-1/2 h-0.5 w-full ${s.state === 'done' ? 'bg-risk-low/70' : 'bg-line-strong'}`} />
          )}
          <span className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold ${stepDot[s.state]}`}>
            {s.state === 'done' ? '✓' : i + 1}
          </span>
          <span className={`mt-2 text-[13px] ${s.state === 'todo' ? 'text-mute' : 'text-ink'}`}>
            {i + 1}. {s.label}
          </span>
          <span className={`mt-0.5 font-mono text-[11px] ${s.state === 'current' ? 'text-cyan' : 'text-mute'}`}>
            {s.state === 'current' ? '進行中 · ' : ''}
            {s.time}
          </span>
        </li>
      ))}
    </ol>
  )
}

function ResultChart({ t }: { t: TrackingData }) {
  const option = useMemo<EChartsOption>(() => {
    const { baseline, predicted, actual } = t.chart
    const min = Math.floor(Math.min(...baseline) - 2)
    return {
      grid: { left: 44, right: 24, top: 36, bottom: 28 },
      legend: {
        top: 0,
        right: 8,
        itemWidth: 16,
        itemHeight: 2,
        textStyle: { color: color.mute, fontSize: 11 },
        data: ['未採取措施（預測）', '方案預測', '實際值'],
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: color.panel,
        borderColor: color.lineStrong,
        textStyle: { color: color.ink, fontSize: 12 },
        valueFormatter: (v) => (v == null ? '-' : `${v}%`),
      },
      xAxis: {
        type: 'category',
        data: TRACK_DAYS,
        boundaryGap: false,
        axisLine: { lineStyle: { color: color.line } },
        axisTick: { show: false },
        axisLabel: { color: color.mute, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min,
        max: 100,
        axisLabel: { color: color.mute, fontSize: 11, formatter: '{value}%' },
        splitLine: { lineStyle: { color: color.line, type: 'dashed' } },
      },
      series: [
        {
          name: '未採取措施（預測）',
          type: 'line',
          data: baseline,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: color.high, width: 1.5, type: 'dotted', opacity: 0.8 },
          itemStyle: { color: color.high },
        },
        {
          name: '方案預測',
          type: 'line',
          data: predicted,
          smooth: true,
          symbolSize: 5,
          lineStyle: { color: color.cyan, width: 2, type: 'dashed' },
          itemStyle: { color: color.cyan },
        },
        {
          name: '實際值',
          type: 'line',
          data: actual,
          smooth: true,
          symbolSize: 7,
          lineStyle: { color: color.accent, width: 2.5 },
          itemStyle: { color: color.accent, borderColor: '#fff', borderWidth: 1 },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color.accent + '40' }, { offset: 1, color: color.accent + '00' }] },
          },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [{ xAxis: ACTUAL_UNTIL }],
            lineStyle: { color: color.ink2, type: 'dashed', width: 1 },
            label: { formatter: '最新實際', color: color.ink2, fontSize: 11 },
          },
          markPoint: {
            symbol: 'roundRect',
            symbolSize: [96, 26],
            symbolOffset: [0, -24],
            itemStyle: { color: color.bg, borderColor: color.cyan, borderWidth: 1 },
            label: { color: color.cyan, fontSize: 11, formatter: `實際 ${t.latest.actual}%` },
            data: [{ name: '最新實際', coord: [ACTUAL_UNTIL, t.latest.actual] }],
          },
        },
      ],
    }
  }, [t])
  return <EChart option={option} className="absolute inset-0" />
}

export function Tracking() {
  const navigate = useNavigate()
  const { decision, reset } = useScenario()
  const t = useMemo(() => (decision ? buildTracking(decision) : null), [decision])

  if (!decision || !t) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Panel className="w-[480px]" bodyClassName="p-8 text-center">
          <div className="text-lg font-semibold">尚未建立決策紀錄</div>
          <p className="mt-2 text-sm text-mute">請先在策略模擬中執行情境模擬，並確認採用方案。</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/risk" className="rounded-md border border-line-strong px-4 py-2 text-sm text-ink-2 hover:border-cyan hover:text-ink">
              前往風險預測
            </Link>
            <Link to="/simulation" className="rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent/85">
              前往策略模擬
            </Link>
          </div>
        </Panel>
      </div>
    )
  }

  const { kpis } = t
  const fmtDelta = (v: number, unit: string) => `${v > 0 ? '+' : ''}${v.toLocaleString()}${unit}`
  const cards = [
    {
      label: '出貨準時率',
      before: `${kpis.onTime.before}%`,
      predicted: `${kpis.onTime.predicted}%`,
      actual: `${kpis.onTime.actual}%`,
      vs: fmtDelta(Math.round((kpis.onTime.actual - kpis.onTime.predicted) * 10) / 10, ' pp'),
      good: kpis.onTime.actual >= kpis.onTime.predicted,
    },
    {
      label: '延遲訂單',
      before: `${kpis.delayed.before.toLocaleString()} 件`,
      predicted: `${kpis.delayed.predicted.toLocaleString()} 件`,
      actual: `${kpis.delayed.actual.toLocaleString()} 件`,
      vs: fmtDelta(kpis.delayed.actual - kpis.delayed.predicted, ' 件'),
      good: kpis.delayed.actual <= kpis.delayed.predicted,
    },
    {
      label: '執行成本',
      before: 'NT$ 0',
      predicted: `NT$ ${kpis.cost.predicted.toLocaleString()}`,
      actual: `NT$ ${kpis.cost.actual.toLocaleString()}`,
      vs: fmtDelta(kpis.cost.actual - kpis.cost.predicted, ''),
      good: kpis.cost.actual <= kpis.cost.predicted,
    },
  ]

  const restart = () => {
    reset()
    navigate('/overview')
  }

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-4 p-4">
      {/* 上：方案摘要 + 執行進度時間軸 */}
      <div className="grid grid-cols-[420px_minmax(0,1fr)] gap-4">
        <Panel
          title={
            <span className="flex items-center gap-2">
              方案 {t.plan.id}｜{t.plan.title}
              <span className="rounded-full border border-risk-low/50 bg-risk-low/10 px-2 py-0.5 text-[11px] font-normal text-risk-low">已核准 · 執行中</span>
            </span>
          }
          bodyClassName="px-4 pb-4"
        >
          <div className="mb-3 flex items-center gap-2 text-xs text-ink-2">
            <RiskBadge level={t.risk.level} />
            {t.risk.title}
          </div>
          <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-[13px]">
            {[
              ['決策目標', '最小化出貨延遲'],
              ['負責單位', t.owner],
              ['執行期間', t.period],
              ['策略參數', describeParams(t.plan, decision.params)],
              ['決策時間', decision.confirmedAt],
              ['核准人', '營運長'],
            ].map(([k, v]) => (
              <div key={k} className={k === '策略參數' ? 'col-span-2' : ''}>
                <dt className="text-[11px] text-mute">{k}</dt>
                <dd className="mt-0.5 truncate">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel
          title="決策執行進度"
          extra={
            <span className="flex items-center gap-3 text-xs text-mute">
              示範時間 <span className="font-mono text-ink-2">{TRACK_NOW}</span>
              <DemoTag />
            </span>
          }
        >
          <Timeline steps={t.steps} />
        </Panel>
      </div>

      {/* 下：成效分析 + 執行任務與紀錄 */}
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_440px] gap-4">
        <Panel
          title={`成效分析 · ${t.site.name}`}
          extra={<span className="text-xs text-mute">預測 vs 實際（實際值至 10/17）</span>}
          bodyClassName="flex min-h-0 flex-col gap-3 px-4 pb-4"
        >
          <div className="grid shrink-0 grid-cols-3 gap-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-md border border-line bg-bg/40 px-4 py-3">
                <div className="text-[13px] text-mute">{c.label}</div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold">{c.actual}</span>
                  <span className="text-xs" style={{ color: c.good ? color.low : color.mid }}>
                    較預測 {c.vs}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-2 text-[11px] text-mute">
                  <span>
                    執行前 <span className="font-mono text-ink-2">{c.before}</span>
                  </span>
                  <span>
                    方案預測 <span className="font-mono text-ink-2">{c.predicted}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[13px] font-medium text-ink-2">出貨準時率趨勢</div>
          <div className="relative min-h-0 flex-1">
            <ResultChart t={t} />
          </div>
        </Panel>

        <Panel
          title="執行任務與紀錄"
          extra={
            <button onClick={restart} className="text-xs text-cyan hover:underline">
              ↺ 重新開始示範
            </button>
          }
          bodyClassName="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pb-4"
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] text-mute">
                <th className="pb-2 font-normal">任務</th>
                <th className="pb-2 font-normal">負責單位</th>
                <th className="pb-2 font-normal">狀態</th>
                <th className="pb-2 text-right font-normal">預計完成</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {t.tasks.map((task) => {
                const [label, cls] = taskBadge[task.status]
                return (
                  <tr key={task.name}>
                    <td className="py-2 pr-2">
                      <div>{task.name}</div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${task.progress}%` }} />
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-xs text-ink-2">{task.owner}</td>
                    <td className="py-2 pr-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap ${cls}`}>{label}</span>
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-ink-2">{task.due}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div>
            <div className="mb-2 text-xs text-mute">執行紀錄</div>
            <ol className="space-y-2 border-l border-line-strong pl-4">
              {t.logs.map((l) => (
                <li key={l.time + l.text} className="relative text-[13px]">
                  <span className="absolute top-1.5 -left-[21px] h-2 w-2 rounded-full bg-cyan" />
                  <span className="mr-2 font-mono text-xs text-mute">{l.time}</span>
                  <span className="text-ink-2">{l.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </Panel>
      </div>
    </div>
  )
}
