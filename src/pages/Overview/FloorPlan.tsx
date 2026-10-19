import { isEquipmentId } from '../../data/equipment'
import { floorZones, type SiteId, type ZoneStatus } from '../../data/scenario'
import { color } from '../../theme/tokens'
import { useEquipmentRoute } from '../Equipment/useEquipmentRoute'

const statusStyle: Record<ZoneStatus, { stroke: string; fill: string; label: string }> = {
  normal: { stroke: color.low, fill: 'rgba(34,197,94,0.08)', label: '正常' },
  watch: { stroke: color.watch, fill: 'rgba(245,209,66,0.10)', label: '注意' },
  alert: { stroke: color.high, fill: 'rgba(255,77,94,0.14)', label: '異常' },
  down: { stroke: '#ff2d55', fill: 'rgba(255,45,85,0.28)', label: '停機' },
}

// 樓層層級的 2D 平面示意（PRD 不做 3D 倉庫模型）；異常分揀機可點擊進入 P07 設備深入檢視
export function FloorPlan({ siteId }: { siteId: SiteId }) {
  const zones = floorZones[siteId]
  const { open } = useEquipmentRoute()
  return (
    <div className="flex h-full flex-col px-6 pt-14 pb-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="min-h-0 flex-1">
        <defs>
          <pattern id="fp-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M4 0H0V4" fill="none" stroke="rgba(80,140,255,0.12)" strokeWidth="0.15" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100" height="100" rx="1.5" fill="url(#fp-grid)" stroke={color.lineStrong} strokeWidth="0.4" />
        {zones.map((z) => {
          const s = statusStyle[z.status]
          const eqId = `${siteId}-${z.id}`
          const drill = (z.status === 'alert' || z.status === 'down') && isEquipmentId(eqId)
          return (
            <g
              key={z.id}
              onClick={drill ? () => open(eqId, { from: 'floor' }) : undefined}
              className={drill ? 'group cursor-pointer' : undefined}
            >
              <rect
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                rx="1"
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={z.status === 'normal' ? 0.25 : 0.5}
                className={z.status === 'down' ? 'animate-pulse-dot' : undefined}
              />
              <text x={z.x + 1.5} y={z.y + 4} fontSize="2.2" fill={color.ink} fontWeight="600">
                {z.name}
              </text>
              <text x={z.x + 1.5} y={z.y + 7.5} fontSize="1.7" fill={s.stroke}>
                {s.label}
              </text>
              {z.note && (
                <text x={z.x + 1.5} y={z.y + 10.3} fontSize="1.7" fill={color.ink2}>
                  {z.note}
                </text>
              )}
              {drill && (
                <text x={z.x + 1.5} y={z.y + z.h - 2} fontSize="1.7" fill={color.cyan} className="opacity-70 group-hover:opacity-100">
                  檢視設備 →
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="mt-3 flex justify-center gap-5 text-xs text-mute">
        {(Object.keys(statusStyle) as ZoneStatus[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border" style={{ borderColor: statusStyle[k].stroke, background: statusStyle[k].fill }} />
            {statusStyle[k].label}
          </span>
        ))}
      </div>
    </div>
  )
}
