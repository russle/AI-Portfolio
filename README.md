# AI資產配置戰略總覽 (AI-Portfolio)

> **專為被動指數投資者 (Passive Index Investors) 打造的高級互動式 Web 戰略決策系統。本專案傳承經典指數化配置的「長期持有」與「紀律再平衡」哲學，旨在解決投資人從觀念理解到落地執行之間的數據斷層。**

AI-Portfolio 將**「股債歷史動態模擬」**、**「退休財務目標逆推」**、**「自訂樂高配置下單」**與**「資產健康度再平衡」**四大核心模組完美融合，提供投資人一個兼具理論學習與實戰操作的沉浸式財經戰情面板。

透過高度系統化的**雙向智慧比例連動機制**與**100%紀律安全暫停系統**，本專案能夠保障投資人在擬定配置與實際下單時的嚴格一致性，並提供即時的心理壓力測試警告，確保在極端市場波動下仍能堅守投資紀律。

---

## 🚀 核心功能模組

### 模組 A：互動式觀念學習區 (Interactive Learning)
* **股債搭配歷史模擬器**：拉動滑桿調整「股票 %」，利用**基準點線性插值 (Linear Interpolation)** 動態精算任意比例（如 75% 股票）下的年化報酬率、標準差與最大回撤。明確標示以全球股市與全球債券之歷史大數據為估算基準，解決資訊透明度。
* **全球股市與權重地圖**：提供全球、美國、歐洲、亞太成熟、新興市場等各區域代表性低成本 ETF（VT, VTI, BNDW, VGK 等）的配置與定位解析。

### 模組 B：個人化財務規劃與壓力測試 (Financial Planner)
* **多元被動提領法則逆推 (全新升級)**：
  * **4% 提領法則 (Trinity Study)**：標準的通膨調整恆定提領逆推。
  * **蓋頓-克林格動態提領 (Guyton-Klinger)**：初始提領率升至 `5.0%`，並智慧精算與展示 $\pm 20\%$ 的**「富裕增領護欄 (+10% 提領)」**與**「防禦減領護欄 (-10% 提領)」**的台幣金額。
  * **財產歸零提領 (Die to Zero)**：以年金化消耗模式精算目標，退休後資金剛好安全消耗至存活年數終點。
* **Recharts 動態折線圖翻轉**：
  * 當處於 Trinity / GK 法則時，折線圖繪製**「退休前複利累積期」**（本金 vs 含複利資產）。
  * 當處於 Die to Zero 法則時，折線圖自動翻轉為**「退休後消耗期」**（安全目標資產軌跡 vs 實際資產消耗軌跡，至存活終點歸零的完美拋物線）。
* **提前枯竭智慧警報**：在 Die to Zero 消耗期中，若退休累積的實際資產小於安全目標資產，圖表下方將會以紅色高亮警告，指出在幾歲時資產將提前枯竭，提醒使用者追加儲蓄或調整財務預期。
* **心理壓力測試警示系統**：高股票比例配置時自動彈出警告，量化黑天鵝來臨時的帳面虧損金額，壓力測試您的紀律耐受度。

### 模組 C：樂高式配置與下單計算機 (Portfolio Executor)
* **2/3 與 1/3 現代響應式佈局**：重排為左側 2/3 下單配置表格與輸入、右側 1/3 配置視覺化圓餅與精算 Totals 卡片。
* **Recharts 雙層同心圓環圖**：
  * **外圈**：顯示 $>0\%$ 權重的個股與 ETF 具體比重，並為股票類標的分配專屬漸變藍色系（Stock Colors），債券類分配漸變 Slate 灰色系（Bond Colors），呈現頂級視覺層次感。
  * **內圈**：顯示股票與風險資產 vs 債券與避險資產之大類比例。
  * 圓心動態顯示當前實質「股債比」（如 `70/30`）。
* **行內一體化新增標的列**：
  * 擺脫傳統 Modal 限制，在表格 `tbody` 最底端嵌入一行精緻的輸入新增列（代號、計價幣別、單價）。當新增時，該標的以 0% 目標權重寫入 `targetWeights` 地圖並展示於下單表格中，允許立刻進行權重微調。
  * 每個代號旁配有 `Trash2` 垃圾桶按鈕以實現一鍵移除自訂標的。
* **無損資料防禦**：當投入金額或匯率為 0 時，下單表格依然完好呈現所有的標的，並將買進股數、分配美金以 0 無損展示，保證自由編輯不受金額約束。
* **雙向智慧比例連動**：
  * **正向連動 (C ➡️ A/B)**：支援**手動編輯目標權重 %** 與**即時切換資產屬性 Badge**（股票型 `stock` / 債券型 `bond`）。當目標權重加總剛好等於 **100%** 時，系統自動折算全站股債比，完全打通至全站模擬與退休規劃，並亮起**翡翠綠提示條**。
  * **100% 嚴謹紀律警告**：若目標比例加總未達 100%，系統自動亮起黃色警示並**安全暫停全站連動**，督促投資人維持嚴格的配置紀律。
  * **反向連動 (A ➡️ C)**：拉動模組 A 滑桿時，自訂配置中的股票類與債券類 ETF 會智慧地進行**等比例等量縮放**，使總和始終鎖定 100% 並與滑桿同步。
* **即時下單股數計算機**：串接 Yahoo Finance 的價格獲取 (CORS 代理) 與即時美金匯率 API，輸入台幣總入金，無條件捨去精算各標的應下單股數，避免閒置現金 (Cash Drag)。

### 模組 D：資產健康檢查與再平衡 (Health Check & Rebalancing)
* **1/3 與 2/3 現代響應式佈局**：重排為左側 1/3 現有持股輸入與 Yahoo 同步面板、右側 2/3 健康度大牌、對比柱形圖與再平衡指引。
* **Recharts Before-vs-After 雙柱形權重對比圖**：整合 `chartData`，直觀對比各資產的「目前實際權重 %」與「平衡後預估權重 %」之偏差狀態。
* **雙軌智慧再平衡模式**：
  * **🔄 精準買賣模式**：標準的買低賣高雙向交易，精確將權重拉回黃金配比。
  * **💰 新資金只買不賣模式 (Cash-Flow Rebalancing)**：實作創新的「現金流智慧缺口分配演算法」。當輸入新增資金後，系統僅將新資金按比例單向注入「低配資產」，**絕對不賣出任何現有股票**，實現指數投資人最愛的免交易稅、免手續費之漸進式平衡。
* **Yahoo 最新市價一鍵同步按鈕**：在左側持股面板最下方設計「同步 Yahoo 即時價格與匯率」按鈕。按鈕本身綁定 `isMarketUpdating` 載入狀態，提供流暢的微動態旋轉動畫，隨時背景抓取美股個股與台股（純數字代號智慧轉換如 `0050.TW`）之 Yahoo Finance 即時市價。
* **跨模組自訂標的一體化連動**：模組 D 中自訂新增（或刪除）的標的會自動同步註冊至模組 C，反之亦然，實現全站資料共享。


---

## 🛠️ 開發與本地運行指引

本專案使用 **React.js + TypeScript + Vite** 建構，樣式採用 **Tailwind CSS**，圖表使用 **Recharts**。

### 1. 安裝依賴項
```bash
npm install
```

### 2. 啟動開發伺服器
```bash
npm run dev
```

### 3. 生產環境打包與編譯
```bash
npm run build
```

---

## ⚖️ 授權協議 (License)

本專案採用 **[Apache License 2.0](LICENSE)** 授權協議。

```text
Copyright 2026 AI-Portfolio Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
