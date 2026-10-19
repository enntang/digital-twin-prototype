import { equipment, equipmentLabel, equipStatusLabel, type EquipmentId } from './equipment'
import { siteById } from './scenario'
import type { Tracking } from './tracking'

// AI Copilot 預設問答，依畫面切換（PRD §5.1，不串接 LLM）

export interface CopilotQA {
  q: string
  a: string
}

export interface CopilotContext {
  label: string
  greeting: string
  qa: CopilotQA[]
}

export const copilotByRoute: Record<string, CopilotContext> = {
  '/overview': {
    label: '營運總覽',
    greeting: '我已掃描 5 個據點的即時營運資料，有 2 個高風險事件需要關注。',
    qa: [
      {
        q: '今天最需要關注哪個據點？',
        a: '台北 A（北部物流中心）。產能利用率 95%，為全國最高；預測 10/17 起分揀作業超過可用產能，約 2,103 件訂單可能延遲，並會波及桃園 B 與台中 C 的出貨時程。',
      },
      {
        q: '全國出貨準時率為什麼下降？',
        a: '主要來自台北 A（94.2%）與台中 C（95.6%）。兩者產能利用率都超過 85%，分揀與包裝環節出現排隊；其他據點準時率皆維持在 96% 以上。',
      },
      {
        q: '哪個據點還有餘裕可以支援？',
        a: '桃園 B 產能利用率 72%、台南 D 66%，都有承接分流訂單的空間。桃園 B 距離台北 A 最近，運輸成本較低，是跨據點分流的優先選項。',
      },
    ],
  },
  '/risk': {
    label: '風險預測',
    greeting: '目前選取的是北部物流中心產能瓶頸，我可以說明成因與方案差異。',
    qa: [
      {
        q: '為什麼北部物流中心的延遲風險升高？',
        a: '近 7 天訂單量成長 12%，同時分揀機 A3 異常停機、A1 處理速度下降 60%，可用分揀產能下降。兩者疊加使預測產能利用率在 10/17 超過 100%。',
      },
      {
        q: 'A、B、C 三個方案差在哪裡？',
        a: '三者都針對同一個產能瓶頸。方案 A 跨據點分流降幅最大（延遲訂單 ↓62%），需 2 天準備；方案 B 增加夜班人力 1 天可上線，但成本最高、降幅 28%；方案 C 提前保養成本最低，但需 3 天才能恢復產能。',
      },
    ],
  },
  '/simulation': {
    label: '策略模擬',
    greeting: '可以調整方案參數後執行模擬，我會協助解讀結果。',
    qa: [
      {
        q: '哪個方案最能降低出貨延遲？',
        a: '方案 A（跨據點分流 15%）預估將延遲訂單從 2,103 件降至 800 件，降幅 62%，額外成本 NT$24,000，是效益成本比最佳的選項。',
      },
    ],
  },
  '/tracking': {
    label: '成效追蹤',
    greeting: '目前尚未建立決策紀錄。在策略模擬確認採用方案後，我會在這裡比對預測與實際結果。',
    qa: [
      {
        q: '要怎麼開始追蹤決策成效？',
        a: '先到 02 風險預測選擇方案，在 03 策略模擬執行情境模擬，最後於結果頁點選「確認採用方案」，即會建立決策紀錄並進入成效追蹤。',
      },
    ],
  },
}

// 成效追蹤的回覆依實際採用的方案產生，避免與 P06 畫面數字不一致
export function trackingCopilot(t: Tracking): CopilotContext {
  const { onTime, delayed, cost } = t.kpis
  const reduction = Math.round((1 - delayed.actual / delayed.before) * 100)
  const pp = Math.round((onTime.actual - onTime.predicted) * 10) / 10
  return {
    label: '成效追蹤',
    greeting: `方案 ${t.plan.id}「${t.plan.title}」已進入執行階段，我會持續比對預測與實際結果。`,
    qa: [
      {
        q: '目前的改善結果是否符合預期？',
        a: `${pp >= 0 ? '符合預期' : '略低於預期'}。${t.site.name} 出貨準時率實際 ${onTime.actual}%，較方案預測${pp >= 0 ? '高' : '低'} ${Math.abs(pp)} pp；延遲訂單預估由 ${delayed.before.toLocaleString()} 件降至 ${delayed.actual.toLocaleString()} 件（↓${reduction}%）。`,
      },
      {
        q: '執行成本有沒有超出預算？',
        a: `目前執行成本 NT$ ${cost.actual.toLocaleString()}，${cost.actual <= cost.predicted ? '低於' : '高於'}模擬預估的 NT$ ${cost.predicted.toLocaleString()}。`,
      },
      {
        q: '接下來還需要注意什麼？',
        a: `${t.tasks.filter((x) => x.status !== 'done').map((x) => `「${x.name}」`).join('、')}尚未完成，建議持續觀察 10/18 之後的訂單量變化，並於 10/20 進入成效觀察階段。`,
      },
    ],
  }
}

// P07 設備深入檢視（PRD §4.7.7）
const equipmentQA: Partial<Record<EquipmentId, CopilotQA[]>> = {
  'tpe-a3': [
    {
      q: '分揀機 A3 為什麼停機？多久能恢復？',
      a: '14:18 電力短暫波動（210V → 185V）後，A3 第 3 段驅動馬達負載異常，14:28 觸發 E21 過載保護，分流模組 3 停擺、主線中斷。依維護紀錄，檢查驅動模組並重新校正約需 4–6 小時；若排入提前保養，可在 10/16 前恢復全產能。',
    },
    {
      q: '這台設備對本週出貨的影響有多大？',
      a: 'A3 停機使台北 A 可用分揀產能下降約 33%，與 A1 降速疊加後出貨處理量下降 60%，隊列等候 3.2 小時。若未處理，10/17–10/19 約 2,103 件訂單可能延遲。',
    },
    {
      q: '提前保養能解決這個問題嗎？',
      a: '可以解除設備面的瓶頸：方案 C 將 A1、A3 保養提前，預估延遲訂單減少 40%，成本 NT$ 18,000。不過訂單量成長 12% 仍在，建議與方案 A 跨據點分流一併評估。',
    },
  ],
  'tpe-a1': [
    {
      q: '分揀機 A1 為什麼降速？',
      a: '馬達溫度自 14:20 起由 65°C 升至 85°C，超出正常範圍（0–70°C），系統自動將主線降速 60% 以保護驅動馬達 2。14:18 的電力波動可能是溫升的誘因。',
    },
    {
      q: '這台設備對本週出貨的影響有多大？',
      a: 'A1 降速使台北 A 分揀產能下降約 20%，與 A3 停機疊加後出貨處理量下降 60%。若溫度持續偏高，A1 也有停機風險。',
    },
    {
      q: '提前保養能解決這個問題嗎？',
      a: '方案 C 會同時處理 A1、A3，預估延遲訂單減少 40%。A1 建議優先檢查驅動馬達 2 的散熱與軸承。',
    },
  ],
  'txg-a2': [
    {
      q: 'Sorter B 為什麼被判定為高風險？',
      a: '軸承振動 4.9 mm/s（較上週 +53%）、軸承溫度 68°C，且保養已逾期 12 天，B 區段分揀錯誤率由 0.4% 升至 1.1%。預測 10/16 振動將超過 7.1 mm/s 停機警戒值。',
    },
    {
      q: '這台設備對本週出貨的影響有多大？',
      a: '若 10/16–10/17 異常停機，分揀產能約下降 35%，約 1,520 件訂單可能延遲，並影響台南 D 的轉運時程。',
    },
    {
      q: '提前保養能解決這個問題嗎？',
      a: '可以。方案 C 提前保養 Sorter B，預估延遲訂單減少 55%，成本 NT$ 18,000，是三個方案中效果最好的。',
    },
  ],
}

export function equipmentCopilot(id: EquipmentId): CopilotContext {
  const e = equipment[id]
  const site = siteById[e.siteId]
  return {
    label: `設備檢視 · ${site.name} ${equipmentLabel(e)}`,
    greeting:
      e.status === 'normal'
        ? `${site.name} ${equipmentLabel(e)} 目前運轉正常，各項指標皆在正常範圍內。`
        : `${site.name} ${equipmentLabel(e)} 目前為「${equipStatusLabel[e.status]}」：${e.headline}。`,
    qa: equipmentQA[id] ?? [
      {
        q: '這台設備目前狀況如何？',
        a: `${equipmentLabel(e)} 運轉正常，處理量 ${e.metrics[0].value.toLocaleString()} 件/時，下次保養排定於 ${e.maintenance.next}。`,
      },
      {
        q: '這台設備能分擔其他分揀機的負載嗎？',
        a: `目前負載約 ${Math.round((e.metrics[0].value / 6000) * 100)}%，可短時間提高處理量，但長時間滿載會增加軸承與馬達磨耗，建議搭配排班調整。`,
      },
    ],
  }
}
