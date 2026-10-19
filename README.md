# Digital Twin Prototype

物流數位雙生平台 Concept Prototype（桌面版 Web，模擬資料）。

## 開發

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## 進度

- [x] PRD → [docs/PRD.md](docs/PRD.md)
- [x] 技術評估 → [docs/TECH-EVAL.md](docs/TECH-EVAL.md)
- [x] 骨架：路由、版面、暗色主題、狀態、AI Copilot
- [x] P01 營運總覽（KPI、2D 據點地圖 + 全國／區域／據點／樓層、AI 洞察、風險事件）
- [x] P02 風險預測 + P03 風險分析 Panel（風險摘要、時間趨勢、Risk Matrix、方案 A/B/C、依賴關係圖、證據）
- [x] P04 策略模擬 + P05 策略比較（方案切換、1–2 個參數、Before/After 地圖、關鍵指標、確認方案建立決策紀錄）
- [x] P06 決策成效追蹤（方案摘要、執行時間軸、預測 vs 實際、執行任務與紀錄）

## 結構

```
src/
├── app/Layout.tsx           # 頂部流程導覽 + Copilot
├── pages/                   # 各畫面（未完成者為 Placeholder）
├── components/
│   ├── charts/              # EChart 包裝、TaiwanMap、Sparkline
│   ├── ui/                  # Panel、RiskBadge、Segmented、DemoTag
│   └── copilot/
├── data/
│   ├── scenario.ts          # 示範情境唯一資料來源
│   ├── copilot.ts           # 各畫面預設問答
│   └── taiwan.geo.json      # 台灣縣市邊界（g0v twgeojson，mapshaper 簡化）
├── store/scenario.ts        # zustand：所選風險／方案，存 localStorage
└── theme/tokens.ts          # ECharts 用色票（與 index.css @theme 同值）
docs/                        # PRD、技術評估、參考圖
```
