## 1. 大類資產配置偏離運算與檢測機制 (Drift Calculation & Checking)

- [x] 1.1 實作 "Portfolio drift threshold checking" 與 "偏差警報門檻值與大類偏差判定 (Drift Alert Threshold Decision)" 計算邏輯。於 `src/pages/OverviewPage.tsx` 中使用 `useMemo` 重構或新增資產大類配置偏差檢測，比對各大類實際佔比與目標比例，偏離閾值設為 `5%` 且對偏差值進行降序排序，並在總資產為 0 時靜默不輸出任何偏離狀態。以代碼評審（Content Review）和 TypeScript 編譯驗證計算邏輯的正確性與零資產邊界防護。
- [x] 1.2 實作 "Safe guard maintenance message" 的狀態判定邏輯。在 `src/pages/OverviewPage.tsx` 中，當所有大類配置偏離絕對值均嚴格小於 5% 時，輸出 healthy 狀態標記，若總資產大於 0 且無偏離則標記為安全狀態，以代碼評審（Content Review）驗證 healthy 狀態判定的完整與精確度。

## 2. 警報與健康毛玻璃橫幅 UI 實作與導航 (Alert & Health Banners UI)

- [x] 2.1 實作 "警報橫幅視覺設計與導航整合 (Alert Banner Glassmorphism UI)" 中的偏離警報橫幅。在 `src/pages/OverviewPage.tsx` 的頂部財務卡片 Grid 下方，實作琥珀黃底色 (`bg-amber-50/80` 與 `border-amber-200`)、毛玻璃特效 (`backdrop-blur-md`) 與發光邊框的警報橫幅。展示偏離最嚴重的大類與數值，並提供 `/rebalance` 及 `/order` 的導航按鈕，以手動 assertions 驗證警報橫幅在偏差 >= 5% 時正確顯示，且按鈕能正常跳轉，且在小螢幕（RWD）下按鈕自動堆疊。
- [x] 2.2 實作 "警報橫幅視覺設計與導航整合 (Alert Banner Glassmorphism UI)" 中的健康維持橫幅。在 `src/pages/OverviewPage.tsx` 同一位置，當處於 healthy 狀態且總資產大於 0 時，顯示翡翠綠底色 (`bg-emerald-50/50` 與 `border-emerald-200/60`) 的 "🛡️ 恭喜！您當前的組合配置已完美維持在 ±5% 黃金安全護欄內。" 橫幅，以手動 assertions 驗證此橫幅在所有大類偏差小於 5% 時正確渲染，且與警報橫幅互斥。
