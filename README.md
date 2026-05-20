# 綠角資產配置戰略總覽 (AI-Portfolio)

> **專為 passive index investors 打造的互動式 Web 戰略工具，傳承指數化配置教父綠角（Greenhorn）的長期持有與紀律再平衡哲學。**

本專案將「股債動態模擬」、「退休財務逆推」、「樂高下單計算」與「資產再平衡」四大模組完美融合，提供投資人一個兼具觀念學習與實戰操作的沉浸式財經面板，並支援高度系統化的數據連動。

---

## 🚀 核心功能模組

### 模組 A：互動式觀念學習區 (Interactive Learning)
* **股債搭配歷史模擬器**：拉動滑桿調整「股票 %」，利用**基準點線性插值 (Linear Interpolation)** 動態精算任意比例（如 75% 股票）下的年化報酬率、標準差與最大回撤。
* **全球股市與權重地圖**：提供全球、美國、歐洲、亞太成熟、新興市場等各區域代表性低成本 ETF（VT, VTI, BNDW, VGK 等）的配置與定位解析。

### 模組 B：個人化財務規劃與壓力測試 (Financial Planner)
* **退休財務目標逆推計算機**：運用 **4% 法則** 逆推每月生活費對應的目標資產總額，搭配未來資產成長趨勢折線圖，一眼掌握財務本金 vs. 複利的長線增值軌跡。
* **心理壓力測試警示系統**：高股票比例配置時自動彈出警告，量化黑天鵝來臨時的帳面虧損金額，壓力測試您的紀律耐受度。

### 模組 C：樂高式配置與下單計算機 (Portfolio Executor)
* **樂高模組一鍵套用**：內建「最簡配置」、「股債精研」與「多元資產」三類經典低成本 ETF 積木模組，一鍵導入。
* **雙向智慧比例連動 (全新優化)**：
  * **正向連動 (C ➡️ A/B)**：支援**手動編輯目標權重 %** 與**即時切換資產屬性 Badge**（股票型 `stock` / 債券型 `bond`）。當目標權重加總剛好等於 **100%** 時，系統自動折算全站股債比，完全打通至全站模擬與退休規劃。
  * **100% 嚴謹紀律警告**：若目標比例加總未達 100%，系統自動亮起黃色警示並**安全暫停全站連動**，督促投資人維持嚴格的配置紀律。
  * **反向連動 (A ➡️ C)**：拉動模組 A 滑桿時，自訂配置中的股票類與債券類 ETF 會智慧地進行**等比例等量縮放**，使總和始終鎖定 100% 並與滑桿同步。
* **即時下單股數計算機**：串接 Yahoo Finance 的價格獲取 (CORS 代理) 與即時美金匯率 API，輸入台幣總入金，無條件捨去精算各標的應下單股數，避免閒置現金 (Cash Drag)。

### 模組 D：資產健康檢查與再平衡 (Health Check & Rebalancing)
* **一鍵再平衡計算機**：輸入當前持有股數，自動換算總市值，當偏離度超過 **±5%** 時觸發高亮警示，並精準生成「買進/賣出」股數行動建議，省去繁瑣計算。

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
