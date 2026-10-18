# 技術評估

依據 [PRD.md](PRD.md) 與 `reference/` 參考圖。

## 結論

| 層 | 選擇 | 理由 |
|---|---|---|
| 框架 | **React 18 + TypeScript + Vite** | PRD 指定；桌面 Web、無後端 |
| 圖表 + 地圖 | **Apache ECharts**（`echarts-for-react`） | 一個庫涵蓋全部視覺需求，暗色霓虹風格天生合適（見下表） |
| 路由 | **React Router** | 6 個畫面中 P01/P02/P04/P06 為路由；P03 是 Panel、P05 是 P04 的結果狀態 |
| 狀態 | **Zustand + persist** | 跨頁保留「所選風險／方案／參數／決策紀錄」，存 localStorage |
| 樣式 | **Tailwind CSS** + CSS 變數 tokens | 快速排出參考圖密度的卡片版面；色票集中管理 |
| Mock 資料 | 單一 `src/data/scenario.ts` | 滿足「同一事件各畫面資料一致」 |
| Copilot | 依路由切換的預設問答 JSON + 打字動畫 | 不接 LLM |

## 為什麼是 ECharts

參考圖中的每一種視覺元素，ECharts 都有原生 series，不需混用多個圖表庫：

| 參考圖元素 | ECharts 實作 |
|---|---|
| 台灣據點地圖、節點發光 | `geo` + 台灣 GeoJSON、`effectScatter`（漣漪） |
| 物流流向、調度路線、路線高亮 | `lines` + `effect`（流動光點）、依流量分色 |
| 立體地圖感（風格參考） | 多層 `geo` 疊加位移 + `shadowBlur` 做偽 3D 浮起，不用 WebGL |
| Before／After 雙地圖 | 兩個相同 `geo` 設定的實例，鎖定相同中心與縮放 |
| 風險時間趨勢、產能上限線、預測虛線 | `line` + `markLine` / `markArea` |
| Risk Matrix 泡泡 | `scatter`（symbolSize 對應影響訂單） |
| 7 天據點風險時間軸 | `heatmap` |
| Dependency Graph | `graph`（固定座標 layout） |
| 延遲訂單比較、Before/After 指標 | `bar` |
| KPI 迷你走勢 | `line` sparkline |

**替代方案與取捨**
- Recharts／Nivo：一般圖表好用，但沒有地圖與流向線，地圖得另做 SVG → 兩套視覺語言。
- MapLibre／deck.gl：真實地理精度，但 PRD 明確「示意地圖、不追求地理精度」，殺雞用牛刀，暗色瓦片也要額外處理。
- echarts-gl `geo3D`：可做真正立體地圖，但 PRD 規定不做 3D；先以偽 3D 達成風格，有需要再升級。

## 需要注意的點

1. **台灣 GeoJSON**：需取得縣市邊界資料（例如 g0v 的 twgeojson，簡化後約 100KB 以內）。
2. **01-2 參考圖的 3D 倉庫模型**：PRD 不做 3D。P03 Panel 中改用靜態等角插圖或 2D 平面圖標示設備位置。
3. **資料一致性**：參考圖數字（2,103 件、95%→82%、96.4% 等）在多張圖重複出現，全部從 `scenario.ts` 引用，不在元件內硬寫。
4. **方案 A/B/C 定義**：依 PRD 暫定為跨據點分流（15%）、增加夜班人力（10 人）、提前設備保養；P04 每方案各 1–3 個參數，結果為預先定義的查表。
5. **示範標示**：P06 須明確標示「示範情境」。

## 建議結構

```
src/
├── app/            # router、layout（頂部導覽 + Copilot 抽屜）
├── pages/
│   ├── Overview/        # P01
│   ├── RiskIntel/       # P02 + P03 RiskAnalysisPanel
│   ├── Simulation/      # P04 設定 / P05 結果
│   └── Tracking/        # P06
├── components/
│   ├── charts/     # 基於 ECharts 的共用圖表（TaiwanMap、RiskMatrix…）
│   ├── ui/         # Card、KpiTile、Badge、Tabs、Panel
│   └── copilot/
├── data/           # scenario.ts、copilot.ts、taiwan.geo.json
├── store/          # zustand
└── theme/          # 色票 tokens、ECharts 暗色主題
```

## 開發順序建議
1. 骨架：Vite 專案、路由、版面、暗色主題 tokens、ECharts 主題
2. Mock 資料與 store
3. 共用 `TaiwanMap` 元件（P01、P04、P05、P06 共用）
4. P01 → P02/P03 → P04/P05 → P06（照使用者流程）
5. Copilot
6. 走一次完整流程對照驗收標準 1–10
