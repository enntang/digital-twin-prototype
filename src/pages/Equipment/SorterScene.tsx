import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { CameraControls, Edges, Grid } from '@react-three/drei'
import { Color, Object3D, Vector3, type InstancedMesh, type MeshStandardMaterial } from 'three'
import type { EquipComponent, EquipStatus, Equipment } from '../../data/equipment'
import { color, equipStatusColor as statusColor3d } from '../../theme/tokens'

// 分揀線以簡化幾何體程序生成（PRD §4.7.4）：入口 → 掃描門架 → 主線 4 段，各段末端接分流模組與弧形出口滑道
// 主線座標 s 沿包裹流向遞增，世界座標 x = ORIGIN - s
const ORIGIN = 13
const SEG = 5.2
const BELT_LEN = 4
const LINE_END = SEG * 5
const BELT_Y = 0.85
const BELT_W = 0.9
const CHUTE_R = 3
const CHUTE_ARC = Math.PI / 3
const PKG_GAP = 0.7
const PKG_SPEED = 2.2
const MAX_PKG = 64

const X = (s: number) => ORIGIN - s
const beltStart = (i: number) => SEG + SEG * i
const divertCenter = (i: number) => beltStart(i) + BELT_LEN + (SEG - BELT_LEN) / 2

const C = {
  frame: '#2557d6',
  belt: '#262b33',
  leg: '#8796a3',
  roller: '#aeb8c2',
  motor: '#3b4452',
  scanner: '#2557d6',
  glow: '#c04cff',
  pkg: '#c9a46c',
}

type Vec3 = [number, number, number]

interface Bounds {
  center: Vec3
  size: Vec3
}

// 出口滑道中心線：自分流模組向 +z 伸出，往下游方向彎曲並略為下傾
function chutePoint(i: number, t: number): { p: Vec3; heading: number } {
  const xd = X(divertCenter(i))
  const z0 = BELT_W / 2 + 0.05
  const th = t * CHUTE_ARC
  return {
    p: [xd - CHUTE_R + CHUTE_R * Math.cos(th), BELT_Y - 0.2 * t, z0 + CHUTE_R * Math.sin(th)],
    heading: th,
  }
}

function boundsOf(c: EquipComponent): Bounds {
  const i = c.index
  switch (c.kind) {
    case 'inlet':
      return { center: [X(SEG / 2), 0.5, 0], size: [SEG, 1.1, 1.1] }
    case 'scanner':
      return { center: [X(4.2), 1.35, 0], size: [1.5, 2.8, 1.9] }
    case 'belt':
      return { center: [X(beltStart(i) + BELT_LEN / 2), 0.5, 0], size: [BELT_LEN, 1.1, 1.1] }
    case 'divert':
      return { center: [X(divertCenter(i)), 0.5, 0], size: [SEG - BELT_LEN, 1.1, 1.1] }
    case 'motor':
      return { center: [X(beltStart(i) + BELT_LEN / 2), 0.52, 0.36], size: [0.6, 0.42, 0.42] }
    case 'chute': {
      const pts = Array.from({ length: 9 }, (_, k) => chutePoint(i, k / 8).p)
      const xs = pts.map((p) => p[0])
      const zs = pts.map((p) => p[2])
      const [x0, x1, z0, z1] = [Math.min(...xs) - 0.5, Math.max(...xs) + 0.5, Math.min(...zs) - 0.2, Math.max(...zs) + 0.5]
      return { center: [(x0 + x1) / 2, 0.45, (z0 + z1) / 2], size: [x1 - x0, 0.9, z1 - z0] }
    }
  }
}

// 狀態材質：異常元件以狀態色自發光，停機時脈動閃爍
function StatusMat({ base, status, lit }: { base: string; status: EquipStatus; lit: boolean }) {
  const ref = useRef<MeshStandardMaterial>(null)
  // 異常時改用狀態色為底色，避免與藍色框架混色成粉紫
  const tint = status === 'normal' ? base : statusColor3d[status]
  const emissive = status === 'normal' ? color.cyan : statusColor3d[status]
  const intensity = status === 'normal' ? (lit ? 0.25 : 0) : 0.35
  useFrame(({ clock }) => {
    if (status === 'down' && ref.current) ref.current.emissiveIntensity = 0.15 + 0.6 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 5))
  })
  return <meshStandardMaterial ref={ref} color={tint} emissive={emissive} emissiveIntensity={intensity} metalness={0.3} roughness={0.6} />
}

function Legs({ x0, x1 }: { x0: number; x1: number }) {
  const xs = [x0 - 0.15, x1 + 0.15]
  return (
    <>
      {xs.flatMap((x) =>
        [-0.42, 0.42].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.4, z]}>
            <boxGeometry args={[0.06, 0.8, 0.06]} />
            <meshStandardMaterial color={C.leg} metalness={0.5} roughness={0.5} />
          </mesh>
        )),
      )}
      {xs.map((x) => (
        <mesh key={x} position={[x, 0.18, 0]}>
          <boxGeometry args={[0.05, 0.05, 0.84]} />
          <meshStandardMaterial color={C.leg} />
        </mesh>
      ))}
    </>
  )
}

// 平皮帶輸送段：皮帶面＋兩側藍色框架＋支架
function BeltBody({ s0, len, status, lit }: { s0: number; len: number; status: EquipStatus; lit: boolean }) {
  const cx = X(s0 + len / 2)
  return (
    <>
      <mesh position={[cx, BELT_Y, 0]}>
        <boxGeometry args={[len, 0.07, BELT_W - 0.1]} />
        <meshStandardMaterial color={C.belt} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[cx, BELT_Y - 0.05, side * (BELT_W / 2)]}>
          <boxGeometry args={[len, 0.2, 0.07]} />
          <StatusMat base={C.frame} status={status} lit={lit} />
        </mesh>
      ))}
      <Legs x0={X(s0 + len) + 0.2} x1={X(s0) - 0.2} />
    </>
  )
}

function DivertBody({ i, status, lit }: { i: number; status: EquipStatus; lit: boolean }) {
  const cx = X(divertCenter(i))
  const w = SEG - BELT_LEN
  return (
    <>
      <mesh position={[cx, BELT_Y - 0.06, 0]}>
        <boxGeometry args={[w, 0.16, BELT_W]} />
        <StatusMat base={C.frame} status={status} lit={lit} />
      </mesh>
      {/* 擺輪陣列 */}
      {[-0.3, 0, 0.3].flatMap((dz) =>
        [-0.4, -0.13, 0.13, 0.4].map((dx) => (
          <mesh key={`${dx}${dz}`} position={[cx + dx, BELT_Y + 0.05, dz]} rotation={[0, Math.PI / 4, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.12, 10]} />
            <meshStandardMaterial color={C.roller} metalness={0.6} roughness={0.35} />
          </mesh>
        )),
      )}
      <Legs x0={cx - w / 2 + 0.2} x1={cx + w / 2 - 0.2} />
    </>
  )
}

function ChuteBody({ i, status, lit }: { i: number; status: EquipStatus; lit: boolean }) {
  const pieces = 9
  return (
    <>
      {Array.from({ length: pieces }, (_, k) => {
        const { p, heading } = chutePoint(i, (k + 0.5) / pieces)
        const len = (CHUTE_R * CHUTE_ARC) / pieces + 0.02
        return (
          <group key={k} position={p} rotation={[0, -heading, 0]}>
            {/* 局部座標：z 為行進方向 */}
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.42, -0.04, 0]}>
                <boxGeometry args={[0.06, 0.16, len]} />
                <StatusMat base={C.frame} status={status} lit={lit} />
              </mesh>
            ))}
            {[-len / 4, len / 4].map((dz) => (
              <mesh key={dz} position={[0, 0, dz]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
                <meshStandardMaterial color={C.roller} metalness={0.6} roughness={0.35} />
              </mesh>
            ))}
            {k % 3 === 1 && (
              <mesh position={[0, -0.42, 0]}>
                <boxGeometry args={[0.06, 0.7, 0.06]} />
                <meshStandardMaterial color={C.leg} />
              </mesh>
            )}
          </group>
        )
      })}
    </>
  )
}

function MotorBody({ i, status, lit }: { i: number; status: EquipStatus; lit: boolean }) {
  return (
    <mesh position={[X(beltStart(i) + BELT_LEN / 2), 0.52, 0.36]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.15, 0.15, 0.42, 16]} />
      <StatusMat base={C.motor} status={status} lit={lit} />
    </mesh>
  )
}

function ScannerBody({ status, lit }: { status: EquipStatus; lit: boolean }) {
  const cx = X(4.2)
  return (
    <>
      {[-0.65, 0.65].flatMap((dx) =>
        [-0.85, 0.85].map((dz) => (
          <mesh key={`${dx}${dz}`} position={[cx + dx, 1.25, dz]}>
            <boxGeometry args={[0.09, 2.5, 0.09]} />
            <meshStandardMaterial color={C.leg} metalness={0.5} />
          </mesh>
        )),
      )}
      <mesh position={[cx, 2.55, 0]}>
        <boxGeometry args={[1.5, 0.35, 1.9]} />
        <StatusMat base={C.scanner} status={status} lit={lit} />
      </mesh>
      {/* 兩側透明面板 */}
      {[-0.86, 0.86].map((dz) => (
        <mesh key={dz} position={[cx, 1.6, dz]}>
          <boxGeometry args={[1.3, 1.6, 0.03]} />
          <meshStandardMaterial color={C.scanner} transparent opacity={0.35} />
        </mesh>
      ))}
      <mesh position={[cx, 2.36, 0]}>
        <boxGeometry args={[1.2, 0.04, 1.6]} />
        <meshStandardMaterial color={C.glow} emissive={C.glow} emissiveIntensity={status === 'normal' ? 1.4 : 0.4} />
      </mesh>
      <pointLight position={[cx, 2.1, 0]} color={C.glow} intensity={6} distance={4} />
    </>
  )
}

function ComponentNode({ c, hovered, selected, onHover, onSelect, children }: {
  c: EquipComponent
  hovered: boolean
  selected: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  children: ReactNode
}) {
  const b = useMemo(() => boundsOf(c), [c])
  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(c.id)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        onHover(null)
        document.body.style.cursor = ''
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        if (e.delta < 5) onSelect(c.id)
      }}
    >
      {children}
      {(hovered || selected) && (
        <mesh position={b.center} raycast={() => null}>
          <boxGeometry args={b.size} />
          <meshBasicMaterial color={color.cyan} transparent opacity={selected ? 0.08 : 0.04} depthWrite={false} />
          <Edges color={selected ? color.cyan : color.ink2} />
        </mesh>
      )}
    </group>
  )
}

interface Pkg {
  mode: 'off' | 'main' | 'chute'
  s: number
  t: number
  dest: number
}

// 包裹以 InstancedMesh 沿輸送線移動；停止段之前的包裹會依序排隊堆積
function Packages({ flow }: { flow: Equipment['flow'] }) {
  const ref = useRef<InstancedMesh>(null)
  const pkgs = useRef<Pkg[]>(Array.from({ length: MAX_PKG }, () => ({ mode: 'off', s: 0, t: 0, dest: 0 })))
  const spawnClock = useRef(0)
  const dummy = useMemo(() => new Object3D(), [])

  useEffect(() => {
    pkgs.current.forEach((p) => (p.mode = 'off'))
    const mesh = ref.current
    if (!mesh) return
    const c = new Color()
    for (let i = 0; i < MAX_PKG; i++) mesh.setColorAt(i, c.set(C.pkg).offsetHSL(0, 0, (Math.random() - 0.5) * 0.12))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [flow])

  const speedAt = (s: number) => {
    if (s < SEG) return flow.inlet
    const k = Math.min(3, Math.floor((s - SEG) / SEG))
    return flow.belts[k]
  }
  // 第一個停止段的起點，包裹不能越過
  const stopAt = useMemo(() => {
    const k = flow.belts.findIndex((v) => v === 0)
    return k < 0 ? Infinity : beltStart(k) - 0.3
  }, [flow])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const list = pkgs.current
    const working = flow.diverts.map((ok, i) => (ok ? i : -1)).filter((i) => i >= 0)
    const queued = list.filter((p) => p.mode === 'main' && p.s > stopAt - 8).length

    // 生成：入口有空位時才放入新包裹
    spawnClock.current += dt * flow.inlet
    const inletClear = !list.some((p) => p.mode === 'main' && p.s < PKG_GAP)
    if (flow.inlet > 0 && spawnClock.current > 0.6 && inletClear) {
      const free = list.find((p) => p.mode === 'off')
      if (free) {
        spawnClock.current = 0
        const pool = queued > 8 || Math.random() < 0.8 ? working : [0, 1, 2, 3]
        free.mode = 'main'
        free.s = 0
        free.dest = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 3
      }
    }

    // 主線：由最前方往後更新，維持間距
    const main = list.filter((p) => p.mode === 'main').sort((a, b) => b.s - a.s)
    let ahead = Infinity
    for (const p of main) {
      let next = p.s + PKG_SPEED * speedAt(p.s) * dt
      next = Math.min(next, stopAt, ahead - PKG_GAP)
      p.s = Math.max(p.s, next)
      const dc = divertCenter(p.dest)
      if (flow.diverts[p.dest] && p.s >= dc && p.s - dc < 0.5) {
        p.mode = 'chute'
        p.t = 0
        continue
      }
      if (p.s >= LINE_END) {
        p.mode = 'off'
        continue
      }
      ahead = p.s
    }

    for (const p of list) {
      if (p.mode === 'chute') {
        p.t += (dt * PKG_SPEED * 0.8) / (CHUTE_R * CHUTE_ARC)
        if (p.t >= 1) p.mode = 'off'
      }
    }

    const mesh = ref.current
    if (!mesh) return
    list.forEach((p, i) => {
      if (p.mode === 'off') {
        dummy.scale.setScalar(0)
      } else if (p.mode === 'main') {
        dummy.position.set(X(p.s), BELT_Y + 0.2, 0)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.setScalar(1)
      } else {
        const { p: pos, heading } = chutePoint(p.dest, p.t)
        dummy.position.set(pos[0], pos[1] + 0.22, pos[2])
        dummy.rotation.set(0, -heading, 0)
        dummy.scale.setScalar(1)
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_PKG]} raycast={() => null}>
      <boxGeometry args={[0.46, 0.3, 0.4]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  )
}

const OVERVIEW = { pos: [11, 16, 26] as Vec3, target: [0.5, 0.4, 1.5] as Vec3 }

function CameraRig({ focus, resetKey }: { focus: Vec3 | null; resetKey: number }) {
  const ref = useRef<CameraControls>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    if (!focus) {
      c.setLookAt(...OVERVIEW.pos, ...OVERVIEW.target, true)
      return
    }
    const [x, y, z] = focus
    c.setLookAt(x + 4.5, y + 4.5, z + 6.5, x, y, z, true)
  }, [focus, resetKey])
  return <CameraControls ref={ref} makeDefault minDistance={3} maxDistance={45} maxPolarAngle={Math.PI / 2.1} smoothTime={0.6} />
}

const HOVER_KEY = '__hover'

// 將 3D 錨點投影為螢幕座標，直接寫入 DOM 標籤的 transform，避免每幀觸發 React 重繪
function LabelProjector({ anchors, refs }: { anchors: { key: string; pos: Vec3 }[]; refs: { current: Record<string, HTMLDivElement | null> } }) {
  const v = useMemo(() => new Vector3(), [])
  useFrame(({ camera, size }) => {
    for (const a of anchors) {
      const el = refs.current[a.key]
      if (!el) continue
      v.set(...a.pos).project(camera)
      const hidden = v.z > 1
      el.style.display = hidden ? 'none' : ''
      if (!hidden) el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`
    }
  })
  return null
}

export interface SorterSceneProps {
  equipment: Equipment
  selected: string | null
  onSelect: (id: string | null) => void
  // 相機對焦的元件；null 為全景
  focusId: string | null
  resetKey: number
}

export default function SorterScene({ equipment: eq, selected, onSelect, focusId, resetKey }: SorterSceneProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const down = useRef<[number, number] | null>(null)
  const byId = useMemo(() => Object.fromEntries(eq.components.map((c) => [c.id, c])), [eq])
  const focus = useMemo(() => (focusId && byId[focusId] ? boundsOf(byId[focusId]).center : null), [focusId, byId])
  const hoverC = hovered ? byId[hovered] : null

  useEffect(() => () => void (document.body.style.cursor = ''), [])

  const body = (c: EquipComponent, lit: boolean) => {
    switch (c.kind) {
      case 'inlet':
        return <BeltBody s0={0} len={SEG} status={c.status} lit={lit} />
      case 'belt':
        return <BeltBody s0={beltStart(c.index)} len={BELT_LEN} status={c.status} lit={lit} />
      case 'divert':
        return <DivertBody i={c.index} status={c.status} lit={lit} />
      case 'chute':
        return <ChuteBody i={c.index} status={c.status} lit={lit} />
      case 'motor':
        return <MotorBody i={c.index} status={c.status} lit={lit} />
      case 'scanner':
        return <ScannerBody status={c.status} lit={lit} />
    }
  }

  const labelAt = (id: string): Vec3 => {
    const b = boundsOf(byId[id])
    // 馬達位於皮帶下方，標籤放在前側下方，避免與皮帶段標籤重疊
    if (byId[id].kind === 'motor') return [b.center[0], 0.2, b.center[2] + 0.8]
    return [b.center[0], b.center[1] + b.size[1] / 2 + 0.5, b.center[2]]
  }

  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // hover 中的元件以提示框取代其浮動標籤
  const labels = eq.labels.slice(0, 3).filter((l) => l.component !== hovered)
  const anchors = [
    ...labels.map((l) => ({ key: l.component, pos: labelAt(l.component) })),
    ...(hoverC ? [{ key: HOVER_KEY, pos: labelAt(hoverC.id) }] : []),
  ]

  return (
    <div
      className="relative h-full w-full"
      onPointerDown={(e) => (down.current = [e.clientX, e.clientY])}
      onPointerLeave={() => {
        setHovered(null)
        document.body.style.cursor = ''
      }}
    >
      <Canvas
        camera={{ position: OVERVIEW.pos, fov: 40, near: 0.1, far: 200 }}
        dpr={[1, 2]}
        onPointerMissed={(e) => {
          // 拖曳旋轉後放開不算點擊空白
          const d = down.current
          if (d && Math.hypot(e.clientX - d[0], e.clientY - d[1]) < 5) onSelect(null)
        }}
      >
        <color attach="background" args={[color.bg]} />
        <fog attach="fog" args={[color.bg, 30, 70]} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#9cc1ff', '#0b1426', 0.6]} />
        <directionalLight position={[8, 18, 12]} intensity={1.6} />
        <directionalLight position={[-10, 8, -8]} intensity={0.4} color="#6f9bff" />

        <Grid args={[80, 80]} position={[0, 0, 0]} cellSize={1} cellColor={color.line} sectionSize={5} sectionColor={color.lineStrong} fadeDistance={60} infiniteGrid />

        {eq.components.map((c) => (
          <ComponentNode key={c.id} c={c} hovered={hovered === c.id} selected={selected === c.id} onHover={setHovered} onSelect={onSelect}>
            {body(c, hovered === c.id || selected === c.id)}
          </ComponentNode>
        ))}

        <Packages flow={eq.flow} />

        <LabelProjector anchors={anchors} refs={labelRefs} />

        <CameraRig focus={focus} resetKey={resetKey} />
      </Canvas>

      {/* 浮動標籤與 hover 提示：一般 DOM 元素，由 LabelProjector 每幀投影到畫面座標 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {labels.map((l) => (
          <div key={l.component} ref={(el) => void (labelRefs.current[l.component] = el)} className="absolute top-0 left-0">
            <div
              className="rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap shadow-lg"
              style={{
                borderColor: statusColor3d[byId[l.component].status],
                color: statusColor3d[byId[l.component].status],
                background: 'rgba(4,10,23,0.85)',
              }}
            >
              {l.text}
            </div>
          </div>
        ))}
        {hoverC && (
          <div ref={(el) => void (labelRefs.current[HOVER_KEY] = el)} className="absolute top-0 left-0">
            <div className="min-w-32 rounded-md border border-line-strong bg-panel/95 px-3 py-2 text-xs whitespace-nowrap shadow-xl">
              <div className="flex items-center gap-1.5 font-semibold text-ink">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor3d[hoverC.status] }} />
                {hoverC.name}
              </div>
              {hoverC.readings.slice(0, 2).map((r) => (
                <div key={r.label} className="mt-0.5 flex justify-between gap-4 text-ink-2">
                  <span className="text-mute">{r.label}</span>
                  <span className="font-mono">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
