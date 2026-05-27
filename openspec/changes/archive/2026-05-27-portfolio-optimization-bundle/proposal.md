## Why

當前 AI-Portfolio 在持股價格抓取、再平衡下單以及退休模擬方面存在三個核心優化痛點：
1. **價格同步效能磨損**：持股明細模式下，多標的會併發多個獨立的價格抓取 fetch 請求，造成頁面加載延遲與 Rate Limit 風險。
2. **與每月定期定額（DCA）申購實務脫節**：輔助下單機目前僅支持對整筆新資金的定比分配，無法在「只買不賣」前提下優先把每月有限的新資金智慧分配給偏離最嚴重的低配部位。
3. **退休規劃之蒙地卡羅模擬配置靜態失真**：現行退休蒙地卡羅模擬是以「固定不變的資產配比」推估未來數十年，忽略了隨著投資人年齡增長而調降風險資產（Glide Path）的理財實務。

## What Changes

我們將為系統導入全套三大核心優化功能：
- **批次價格同步與快取**：重構價格抓取模組，將多個標的請求合併為單次 Yahoo Finance 批次請求，並引進 15 分鐘的本地快取機制。
- **DCA 定期定額智慧分配計算器**：在輔助下單頁面中，新增「每月定期定額（DCA）智慧分配」模式，自動把預算單向分配給低配部位並換算為應買股數。
- **生命週期 Glide Path 動態蒙地卡羅模擬**：在退休規劃頁中引進動態配比滑動模型（支持「110 - 年齡」經典滑動路徑），蒙地卡羅 1,000 次模擬中，資產配比隨時間推移自動滑動。

## Non-Goals (optional)

- 不會建立新的後端資料庫，依然保持 100% 隱私安全的客戶端 LocalStorage 存儲。
- 不會改動現有手動登載的大類資產歷史快照，僅在持股模式下優化即時股價之獲取。

## Capabilities

### New Capabilities

- `batch-price-fetch`: 支持將多個持股標的合為單次請求批次抓取 Yahoo Finance 最新股價，並具備 TTL 本地價格快取機制。
- `dca-rebalance-advisor`: 支持使用者設定每月投入預算，智慧判斷低配缺口，並在只買不賣前提下生成定期定額交易股數建議。
- `glide-path-simulation`: 支持蒙地卡羅隨機模擬隨時間推移，自動根據投資人年齡動態滑動調整股債配置比例，提升退休成功機率推估的科學性。

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - `src/utils/priceFetcher.ts`
    - `src/context/AppContext.tsx`
    - `src/pages/OrderPage.tsx`
    - `src/pages/RetirementPage.tsx`
    - `src/utils/retirement.ts`
