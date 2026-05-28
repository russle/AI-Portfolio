## Context

資產配置的防禦核心在於維持目標配比。然而，目前系統僅在 `/rebalance` 或 `/order` 頁面顯示具體偏離，首頁（Overview）缺乏主動的「配置偏離警報橫幅」，投資人無法第一時間感知組合是否健康。因此，我們需要在首頁導入主動監控的 Drift Guard 智慧看門狗與健康維持橫幅。

## Goals / Non-Goals

**Goals:**

* 當任一大類資產偏離目標配置比例 >= 5% 時，首頁頂部自動顯示發光的毛玻璃警報橫幅，詳列偏離最嚴重的部位並提供導航閉環。
* 當所有大類配置偏離均嚴格控制在 ±5% 安全區間內時，首頁顯示精緻的「🛡️ 組合配置已完美維持於黃金安全護欄內」健康綠色橫幅，給予用戶心靈反饋。

**Non-Goals:**

* 首頁橫幅純作資訊警示與決策跳轉，不包含任何帳目寫入邏輯。

## Decisions

### 1. 偏差警報門檻值與大類偏差判定 (Drift Alert Threshold Decision)
* **決策**：在 `OverviewPage.tsx` 中新增一個 `useMemo` 計算模組，將當前各大類資產佔比與目標比例比對。偏離閾值設定為 `5%`（0.05）。當任一大類的實際與目標偏差之絕對值 `>= 0.05` 時，觸發警報；反之若所有類別皆 `< 0.05` 則觸發健康維持提示。
* **判定算法**：
  * 計算總資產：$V_{total} = \sum V_i$。
  * 偏差值：$Diff_i = (V_i / V_{total}) - Target_i$。
  * 若 $\exists i$ 使得 $|Diff_i| \ge 0.05$，則為偏離狀態。

### 2. 警報橫幅視覺設計與導航整合 (Alert Banner Glassmorphism UI)
* **決策**：
  * 警報橫幅（Drift Alert）：採用琥珀黃底色 (`bg-amber-50/80` 與 `border-amber-200`)、毛玻璃特效 (`backdrop-blur-md`) 以及發光邊框。內部列出所有偏離超過 5% 的大類及其具體偏離幅度（如 `台股偏離 +6.2%`）。右側提供 `⚖️ 一鍵智慧再平衡` 與 `💰 定期定額下單` 的導航連結按鈕。
  * 健康橫幅（Drift Healthy）：採用翡翠綠底色 (`bg-emerald-50/50` 與 `border-emerald-200/60`)，內文為 `🛡️ 恭喜！您當前的組合配置已完美维持在 ±5% 黃金安全護欄內。`。
* **效果**：達成理財引導與心靈激勵的極致結合，且視覺上呈現極高端毛玻璃質感。

## Implementation Contract

* **數據結構**：
  於 `OverviewPage` 中，根據 `portfolio` 和 `allocation_target` 計算出 `driftStatus`：
  ```typescript
  interface DriftStatus {
    hasDrift: boolean;
    items: Array<{ name: string; diff: number; absDiff: number }>;
    isHealthy: boolean;
  }
  ```
* **錯誤處理與防呆**：
  當總資產為 0（例如初次加載或清空資料）時，靜默不顯示任何警報或健康橫幅，防範零值分母溢出 Bug。
* **位置安放**：
  此橫幅將精確安放於 `OverviewPage` 首頁頂部財務摘要 6 卡片 Grid 的下方、原偏離警告橫幅的上方。

## Risks / Trade-offs

* **[Risk]** 在有多個大類偏離時，警報橫幅的文字可能會過長，在行動端（RWD）發生換行錯置。
  * **緩解措施**：對偏離大類依照 `absDiff` 進行降序排序，在行動端僅列出偏離最嚴重的 1~2 個標的（或以精簡文字描述），且導航按鈕在小螢幕下自動換行堆疊展示。
