## 1. 夫妻雙核心模擬算法實作與測試 (Joint Simulation Algorithm)

- [x] 1.1 實作 "Dynamic four-stage decumulation simulation" 與 "四階段動態提領壽命蒙地卡羅算法實作 (Four-Stage Decumulation Monte Carlo Algorithm Decision)" 核心計算。於 `src/utils/retirement.ts` 新增 `runJointFullLifeMonteCarloSimulation` 函式，遵循 "夫妻雙核心資料結構" 與 "夫妻模擬輸出結構 (JointMonteCarloResult)" 合約，並實作 "防範與邊界處理"（雙方達最大年齡時模擬終止，且資產歸零時保持為 0 ），以 1,000 次蒙地卡羅隨機模擬處理雙人累積、退休、共同開銷及單獨長壽等四階段淨現金流，並以 `npm run build` 驗證 TypeScript 編譯完全成功。
- [x] 1.2 於 `src/utils/retirement.ts` 新增對應的夫妻可行性評估功能，以代碼評審（Content Review）驗證夫妻退休可行性與生存達成率計算邏輯的數學精確度。

## 2. 控制台雙軌 UI 與導航圖示優化 (Dual-Engine UI & Sidebar Icon)

- [x] 2.1 實作 "Joint retirement configuration panel" 與 "夫妻雙核心退休控制台與雙軌切換 UI 設計 (Dual-Engine Control Panel UI Decision)" 前端介面。於 `src/pages/RetirementPage.tsx` 中新增個人與夫妻雙模式切換 Segmented Control，當點選夫妻模式時動態滑出雙人 Glassmorphism 設定面板，並新增家庭共同月開銷欄位。以手動 assertions 驗證開關切換與動畫展收的流暢性。
- [x] 2.2 於 `src/pages/RetirementPage.tsx` 重構退休曲線圖表與達成率看板，支援在夫妻模式下顯示雙人白頭偕老時間軸 Tooltip 與雙軌達成率指標。以手動 assertions 驗證圖表懸浮資訊正常且數值計算準確。
- [x] 2.3 調整網頁 MENU 標籤視覺效果。於 `src/App.tsx` 中，將「退休規劃」選單 of Lucide-react 圖示由 `TrendingUp` 升級為代表家庭共同守護的 `Users` 圖示，以手動 assertions 驗證導航列 RWD 排版無異常折行且圖示完美呈現。
