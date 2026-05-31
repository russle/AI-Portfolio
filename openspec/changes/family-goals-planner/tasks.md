<!--
Each task description MUST state:
- the behavior or contract being delivered (what is observably true when the
  task is complete), and
- the verification target that proves completion (test, CLI invocation,
  analyzer check, manual assertion, or content review).

File paths are supporting context for locating the work, never the task
itself. "Edit file X" is not a valid task — it is missing both behavior and
verification.
-->

## 1. 獨立規劃與退休規劃單人回歸 (Retirement Page Restore to Individual & Setup)

- [x] 1.1 實作 "Retirement Page Restore to Individual"。於 `src/pages/RetirementPage.tsx` 中將先前添加的夫妻模式 state（如 spouseAge 等）與 Member A/B 雙卡片表單 UI 徹底移除，將圖表和可行性表格完全還原為乾淨的單人模式。以手動 assertions 與 npm run build 驗證頁面加載完全正常、單人計算準確無誤。
- [x] 1.2 還原 `/retirement` 導航 Icon。於 `src/App.tsx` 中，將退休規劃對應的選單 Icon 從 `Users` 還原為原本的 `TrendingUp`，並手動 assertions 驗證 RWD 佈局正常。

## 2. 智慧分配演算法與持久化 (Priority-Based Budget Allocation & Storage)

- [x] 2.1 實作 "1. 獨立 LocalStorage 沙盒持久化決策 (Independent LocalStorage Sandbox Decision)"。於 `src/pages/FamilyPlanner.tsx` 新增專屬沙盒儲存，以 `family_planner_goals` 為鍵將目標信封列表與家庭總預算持久化至 LocalStorage 中，並遵循 "1. 資料結構與合約 (FamilyGoal Interface)"。以 Content Review 與手動 F5 刷新驗證資料在重新加載時能順利還原，且完全不影響全域的 `AppContext`。
- [x] 2.2 實作 "Priority-Based Budget Allocation" 與 "2. 優先級權重智慧預算分配決策 (Priority-Based Phase-Out Budget Allocation Decision)"。於 `src/pages/FamilyPlanner.tsx` 中實作智慧分配邏輯，當多個信封的預算總和超支時，依據優先級（rigid > important > flexible）優先滿足高優先級的分配金額，並完全遵循 "2. 優先級智慧分配算法規則 (Allocation Rules)"。以 Unit Test / 手動試算表格（例如 40000 額度下對 30000/20000/10000 進行分配）驗證計算出的 allocated amount 100% 精準。

## 3. 家庭信封規劃主網格與複利曲線 (Family Goal Planning Interface)

- [x] 3.1 實作 "Family Goal Planning Interface" 的主介面。於 `src/pages/FamilyPlanner.tsx` 實作全新雙欄頂級儀表板，包含左側黏性預算控制台與右側毛玻璃卡片網格。點擊新增按鈕能新增自訂目標，當預算超支時，卡片以紅色高亮警示並附帶警告診斷文字。以手動點擊與 CSS 動畫展收驗證 UI 流暢無阻。
- [x] 3.2 實作 Recharts 複利曲線展示。點擊 FamilyPlanner 頁面中的目標卡片時，以抽屜（Drawer）滑出該目標的歷年積累曲線圖與診斷報告，並以 "3. 沙盒複利達成率演算 (Success Rate Math)" 進行累積軌跡計算。以 Recharts 渲染折線圖並以手動 assertions 驗證圖表懸浮 Tooltip 數值精確。
- [x] 3.3 註冊 `/family` 路由。於 `src/App.tsx` 中引入 `FamilyPlanner` 頁面組件，在路由列表中註冊 `/family`，並在頂部導航欄與行動端底欄中新增「家庭規劃」選單（配置 `Users` 圖示），確保 100% 滿足 "4. 驗證條件與範疇 (Acceptance Criteria)" 的所有交付限制。以 npm run build 驗證 tsc 與 vite build 100% 成功。
