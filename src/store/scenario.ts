import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SimParams, SimResult } from '../data/simulation'

export type PlanId = 'A' | 'B' | 'C'

// P05 確認採用後建立的模擬決策紀錄，供 P06 追蹤
export interface Decision {
  riskId: string
  planId: PlanId
  params: SimParams
  result: SimResult
  confirmedAt: string
}

interface ScenarioState {
  selectedRiskId: string
  selectedPlanId: PlanId | null
  // key 為 `${riskId}-${planId}`，保留使用者調整過的參數
  simParams: Record<string, SimParams>
  decision: Decision | null
  selectRisk: (id: string) => void
  selectPlan: (id: PlanId) => void
  setParams: (key: string, params: SimParams) => void
  confirmDecision: (d: Decision) => void
  reset: () => void
}

const initial = { selectedRiskId: 'r1', selectedPlanId: null, simParams: {}, decision: null }

// 跨畫面保留使用者的選擇，重新整理後仍可延續流程
export const useScenario = create<ScenarioState>()(
  persist(
    (set) => ({
      ...initial,
      // 方案 A/B/C 隸屬於單一風險，換風險時清除已選方案
      selectRisk: (id) => set((s) => (s.selectedRiskId === id ? s : { selectedRiskId: id, selectedPlanId: null })),
      selectPlan: (id) => set({ selectedPlanId: id }),
      setParams: (key, params) => set((s) => ({ simParams: { ...s.simParams, [key]: params } })),
      confirmDecision: (d) => set({ decision: d }),
      reset: () => set(initial),
    }),
    { name: 'dt-scenario' },
  ),
)
