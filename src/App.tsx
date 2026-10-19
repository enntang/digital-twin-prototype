import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './app/Layout'
import { Overview } from './pages/Overview/Overview'
import { RiskIntel } from './pages/RiskIntel/RiskIntel'
import { Simulation } from './pages/Simulation/Simulation'
import { Tracking } from './pages/Tracking/Tracking'

export default function App() {
  return (
    // HashRouter：靜態部署展示時不需設定伺服器 rewrite
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/overview" element={<Overview />} />
          <Route path="/risk" element={<RiskIntel />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
