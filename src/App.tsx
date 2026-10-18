import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './app/Layout'
import { Overview } from './pages/Overview/Overview'
import { Placeholder } from './pages/Placeholder/Placeholder'

export default function App() {
  return (
    // HashRouter：靜態部署展示時不需設定伺服器 rewrite
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/overview" element={<Overview />} />
          <Route path="/risk" element={<Placeholder title="02 風險預測 Risk Intelligence" desc="風險摘要、預測圖表、Risk Matrix、AI 建議方案 A／B／C 與風險分析 Panel。" />} />
          <Route path="/simulation" element={<Placeholder title="03 策略情境模擬 Scenario Simulation" desc="策略設定、參數調整與 Before／After 比較。" />} />
          <Route path="/tracking" element={<Placeholder title="04 決策成效追蹤 Decision Tracking" desc="方案摘要、執行時間軸與預測／實際成效。" />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
