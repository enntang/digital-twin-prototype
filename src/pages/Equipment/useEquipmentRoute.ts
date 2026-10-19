import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { isEquipmentId, type EquipmentId } from '../../data/equipment'

// P07 以網址參數開關（?equipment=tpe-a3），重新整理與瀏覽器返回都能正確還原；底下頁面不會重新掛載，狀態得以保留
export type EquipmentFrom = 'analysis' | 'floor'

export function useEquipmentRoute() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const raw = params.get('equipment')
  const id = isEquipmentId(raw) ? raw : null
  const from = (params.get('from') as EquipmentFrom | null) ?? null
  const event = params.get('event')

  const open = useCallback(
    (eq: EquipmentId, opts: { from?: EquipmentFrom; event?: string } = {}) => {
      const next = new URLSearchParams({ equipment: eq })
      if (opts.from) next.set('from', opts.from)
      if (opts.event) next.set('event', opts.event)
      navigate({ pathname: location.pathname, search: `?${next}` }, { state: { equipmentFromApp: true } })
    },
    [navigate, location.pathname],
  )

  // 切換同據點其他設備：取代目前紀錄，返回時仍回到進入前的畫面
  const switchTo = useCallback(
    (eq: EquipmentId) => {
      const next = new URLSearchParams(params)
      next.set('equipment', eq)
      next.delete('event')
      setParams(next, { replace: true, state: location.state })
    },
    [params, setParams, location.state],
  )

  const close = useCallback(() => {
    if ((location.state as { equipmentFromApp?: boolean } | null)?.equipmentFromApp) navigate(-1)
    else setParams({}, { replace: true })
  }, [location.state, navigate, setParams])

  return { id, from, event, open, switchTo, close }
}
