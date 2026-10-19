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
