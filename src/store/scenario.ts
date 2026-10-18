import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PlanId = 'A' | 'B' | 'C'

interface ScenarioState {
  selectedRiskId: string
  selectedPlanId: PlanId | null
  selectRisk: (id: string) => void
  selectPlan: (id: PlanId) => void
  reset: () => void
}

const initial = { selectedRiskId: 'r1', selectedPlanId: null }

// 跨畫面保留使用者的選擇，重新整理後仍可延續流程
export const useScenario = create<ScenarioState>()(
  persist(
    (set) => ({
      ...initial,
      selectRisk: (id) => set({ selectedRiskId: id }),
      selectPlan: (id) => set({ selectedPlanId: id }),
      reset: () => set(initial),
    }),
    { name: 'dt-scenario' },
  ),
)
