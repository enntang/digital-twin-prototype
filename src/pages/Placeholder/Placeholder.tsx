import { Link } from 'react-router-dom'
import { Panel } from '../../components/ui'

// 尚未建置的畫面：保留可返回的出口，避免流程卡住（驗收標準 9）
export function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Panel className="w-[480px]" bodyClassName="p-8 text-center">
        <div className="text-lg font-semibold">{title}</div>
        <p className="mt-2 text-sm text-mute">{desc}</p>
        <p className="mt-1 text-sm text-mute">此畫面將於下一階段建置。</p>
        <Link to="/overview" className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent/85">
          返回營運總覽
        </Link>
      </Panel>
    </div>
  )
}
