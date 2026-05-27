## Context

當前系統已具備完善的資產配置管理、雙向再平衡、蒙地卡羅退休生存回測、輔助下單等模組。但隨著持股標的與長期分析需求的增加，在效能、定額投資決策以及退休模擬的科學性上，有必要進行深度的底層重構與功能升級。

## Goals / Non-Goals

**Goals:**

* 實現持股價格的單次批次請求，並引入 15 分鐘 TTL 本地快取，以大幅提高頁面開機與重新整理效能。
* 在輔助下單機中增加「DCA 定期定額智慧分配」專用面板，輔助使用者決定每月定額資金應如何完美填補低配部位。
* 退休蒙地卡羅模擬支持動態 Glide Path 生命週期滑動模型，資產配比隨模擬年齡增長自動走向保守，使回測結果更精確。

**Non-Goals:**

* 不引進任何後端伺服器與資料庫，依然保持 100% 本地 LocalStorage 運作。
* 不影響現有的大類手動輸入模式與歷史快照登載結構。

## Decisions

### 1. 批次查詢與 TTL 快取機制 (Batch Fetch & Cache)
* **決策**：重構 `priceFetcher.ts`，支持傳入多個 symbol。Yahoo Finance 接口支持逗號分隔（如 `VOO,AAPL`）。我們將各標的股價存於 LocalStorage，結構為 `{ price: number, timestamp: number }`，每次抓取前先檢查 timestamp，未滿 15 分鐘（900,000ms）直接加載快取 price。
* **備選方案**：每次都 remote fetch。缺點是持股過多時會被 Yahoo 封鎖 IP，且開機載入極為緩慢。
* **效果**：大幅降低 network overhead，價格載入速度縮短至數毫秒。

### 2. DCA 智慧分配算法與 UI 面板 (DCA Allocation UI)
* **決策**：在 `OrderPage.tsx` 左側面板引進新控制台。當切換至「定期定額 DCA 智慧分配」時，根據 `calculateDcaRebalance` 計算出所有 gap > 0（實際配置 < 目標配置）的標的，將預算按比例只買不賣分配給它們。
* **算法公式**：
  $$\text{DCA 分配額}_i = \text{DCA 預算} \times \frac{\text{Gap}_i}{\sum_{\text{Gap}_j > 0} \text{Gap}_j}$$
  $$\text{DCA 股數}_i = \lfloor \frac{\text{DCA 分配額}_i}{\text{單價}_i} \rfloor$$
* **效果**：符合使用者每月定額發薪日再平衡申購流程。

### 3. 動態 Glide Path 退休模擬演算法 (Dynamic Glide Path Simulation)
* **決策**：重構 `retirement.ts` 中的 `runFullLifeMonteCarloSimulation` 迭代步驟。逐年計算模擬年齡 $Age_t = \text{age} + t$。
* **公式**：
  $$\text{股債動態配比 } \text{StockWeight}_t = \max(0.2, \min(0.9, 1.10 - \text{Age}_t))$$
  $$\text{動態預期報酬率 } R_{expected, t} = \text{StockWeight}_t \times R_{stock} + (1 - \text{StockWeight}_t) \times R_{bond}$$
  $$\text{動態波動率 } \sigma_t = \text{StockWeight}_t \times \sigma_{stock} + (1 - \text{StockWeight}_t) \times \sigma_{bond}$$
* **效果**：讓蒙地卡羅與極端黑天鵝生存壓力回測具備生命週期動態避險的能力。

## Implementation Contract

* **DCA 算法接口**：
  在 `rebalance.ts` 中導出 `calculateDcaAllocation(holdings: HoldingItem[], targetWeights: AllocationTarget, budget: number): DcaAllocationResult[]`。
* **價格快取接口**：
  在 `priceFetcher.ts` 中，`fetchLatestPrice` 支持批次抓取並從 `localStorage` 的 `ticker_cache` 鍵讀取/寫入，過期時間為 15 分鐘。
* **Glide Path 模擬接口**：
  在 `RetirementPage.tsx` 中增加「動態 Glide Path」開關，當開啟時，蒙地卡羅與危機回測會依據年齡動態演化其資產報酬率，並於圖表上可視化。

## Risks / Trade-offs

* **[Risk]** Yahoo Finance 批次查詢偶爾會有 CORS 跨域失敗。
  * **緩解措施**：當 remote error 時，自動降級讀取上一次 LocalStorage 中的過期快取價格，並顯示黃色警告提示。
* **[Risk]** 標的價格極高時（如美股高價個股），DCA 定期定額分配可能因為 floor 股數限制，留下大量未分配零頭。
  * **緩解措施**：計算器中明確標出「剩餘零股分配現金」，建議投資人購買碎股（Fractional Shares）。
