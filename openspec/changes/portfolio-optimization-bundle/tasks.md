## 1. 批次查詢與 TTL 快取機制 (Batch Fetch & Cache)

- [x] 1.1 實作 "Batch fetching Yahoo Finance ticker prices" 功能。重構 `src/utils/priceFetcher.ts` 使其支援合併多個 ticker 發起單次批次 fetch 請求，以 `npm run build` 驗證 TypeScript 型別與編譯無任何錯誤。
- [x] 1.2 實作 "Ticker price TTL caching" 機制。在 `src/utils/priceFetcher.ts` 中將抓取到的最新價格以 `{ price, timestamp }` 快取至 LocalStorage，存期設定為 15 分鐘（900,000ms），驗證在此 TTL 期間內重複切換或刷新持股頁面時，不會觸發新的遠端網路請求。

## 2. DCA 智慧分配算法與 UI 面板 (DCA Allocation UI)

- [x] 2.1 實作 "DCA budget single-directional allocation" 機制。在 `src/utils/rebalance.ts` 中新增定期定額分配算法，確保新預算只單向分配給實際資產低於目標的標的（gap > 0），並在 `src/context/AppContext.tsx` 暴露該 API，以代碼評審（Content Review）驗證分配邏輯的正確性。
- [x] 2.2 實作 "Shares conversion with remaining cash" 功能。於分配算法後段，根據標的單價將分配額度智慧換算為整股股數並計算找零的剩餘現金，以代碼評審（Content Review）驗證股數與餘額找零的數值計算正確性。
- [x] 2.3 在下單輔助面板 `src/pages/OrderPage.tsx` 中，整合新增「定期定額 DCA 智慧分配」專用控制台 UI。提供 DCA 投入預算輸入框與即時試算按鈕，驗證在 UI 上輸入預算後，能流暢渲染各標的應買股數與找零現金。

## 3. 動態 Glide Path 退休模擬演算法 (Dynamic Glide Path Simulation)

- [x] 3.1 實作 "Dynamic glide path configuration" 機制。在 `src/utils/retirement.ts` 中新增基於年齡線性滑動調降股權配比的動態 Glide Path 滑動路徑邏輯，以單元測試或程式碼代碼評審驗證 30 歲至 95 歲的滑動區間計算數值平滑無極端異常值。
- [x] 3.2 實作 "Monte Carlo integration with glide path" 機制。重構蒙地卡羅 1,000 次路徑迭代步驟，使每一年模擬都動態計算當前模擬年齡對應的 Glide Path，並即時套用動態調整後的預期報酬率與標準差，以 `npm run build` 驗證模擬引擎重構編譯成功。
- [x] 3.3 在退休規劃頁面 `src/pages/RetirementPage.tsx` 中整合新增「生命週期動態 Glide Path」開關 UI 與說明工具提示。點擊切換時重新觸發蒙地卡羅模擬，驗證在開啟與關閉此功能時，圖表繪製的資產餘額生存軌跡具有顯著的防禦性滑動數值差異。
