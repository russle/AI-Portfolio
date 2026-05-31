## Context

目前的退休規劃模擬器（`/retirement`）僅支援單人模式下的累積與提領計算。在家庭理財的實務中，夫妻的退休規劃面臨「年齡差」、「退休先後過渡期」、「個人與共同開銷拆分」以及「配偶單獨生存期（女性長壽風險）」等複雜動態。為了解決此痛點，我們需要為系統引進「雙核心夫妻退休規劃與動態達成率系統」，提供高質感的 UI 沙盒與高科學防禦性的四階段蒙地卡羅提領模擬。

## Goals / Non-Goals

**Goals:**

* 於 `RetirementPage.tsx` 內部新增「個人 / 夫妻」雙模式切換開關，且切換時能優雅展收對應的設定面板。
* 在夫妻模式下，支援設定雙方各自的當前年齡、退休年齡、預期壽命、個人退休月開銷、退休被動收入，以及家庭共同開銷。
* 於 `retirement.ts` 實作全新的四階段動態家庭提領生存算法，執行 1,000 次蒙地卡羅隨機模擬，輸出最科學的家庭動態防禦生存率。
* 將選單中「退休規劃」Icon 改為 `Users` 強化產品的家庭理財視覺定位。

**Non-Goals:**

* 本變更維持 100% 純前端本地儲存，不涉及任何後端 API 呼叫與帳目變更。
* 不影響單人退休模式的原有計算精準度與穩定性。

## Decisions

### 1. 夫妻雙核心退休控制台與雙軌切換 UI 設計 (Dual-Engine Control Panel UI Decision)
* **決策**：在 `RetirementPage.tsx` 頂部控制區，引入毛玻璃 Segmented Control (切換個人 `👤 個人模式` 與夫妻 `👩‍❤️‍👨 夫妻模式`)。當點選夫妻模式時，表單利用過度動畫展開「成員 A（先生）」與「成員 B（妻子）」兩個獨立的 Glassmorphism 設定面板，並新增「家庭共同月開銷」欄位。
* **理由**：不改動網頁選單選頁路由的前提下，利用內部雙切換，既防範了行動端 (RWD) 頁面過多擁擠的排版，又能最大程度保留使用者原有的操作心智。

### 2. 四階段動態提領壽命蒙地卡羅算法實作 (Four-Stage Decumulation Monte Carlo Algorithm Decision)
* **決策**：在 `retirement.ts` 新增獨立函式 `runJointFullLifeMonteCarloSimulation` 進行 1,000 次隨機模擬。以主時間軸為基準逐年遞增，動態判斷並精算家庭的淨現金流：
  * **家庭總投入**：成員活著且未退休時，各自貢獻 $50\%$ 的 `monthlyInvest * 12` 儲蓄投入。
  * **家庭被動流**：成員活著且已退休時，各自流入退休被動收入（如勞保年金等）。
  * **家庭總支出**：成員活著且已退休時，支出各自的個人開銷（支援獨立的支出微笑曲線折減）與家庭共同開銷。
  * **淨流計算**：$NetFlow = TotalInvest + TotalPassive - TotalSpend$。
* **理由**：隔離單人與夫妻計算，透過實質家庭淨收支流，完美精算「雙人皆在職」、「單人先退過渡期」、「攜手相伴退休期」與「配偶單獨存活長壽期」四個階段，數據精準度極高。

## Implementation Contract

### 1. 夫妻雙核心資料結構
* 夫妻引數結構契約：
  ```typescript
  export interface JointRetirementParams {
    memberA: {
      currentAge: number;
      retireAge: number;
      maxAge: number;
      monthlySpending: number;
      passiveIncome: number;
    };
    memberB: {
      currentAge: number;
      retireAge: number;
      maxAge: number;
      monthlySpending: number;
      passiveIncome: number;
    };
    jointSpending: number;
    initialAsset: number;
    monthlyInvest: number;
    expectedReturn: number;
    std: number;
    inflation: number;
    enableGlidePath: boolean;
    enableSpendingSmile: boolean;
  }
  ```

### 2. 夫妻模擬輸出結構 (JointMonteCarloResult)
* 新增獨立的夫妻生存模擬輸出結構：
  ```typescript
  export interface JointMonteCarloResult {
    yearsArray: number[];       // 歷年時間軸 (年齡A，如 [30, 31, ...])
    yearsArrayB: number[];      // 歷年時間軸 (年齡B，如 [28, 29, ...])
    p5: number[];
    p50: number[];
    p95: number[];
    depletionAgeP5: number | null;   // P5 軌跡歸零年齡（成員 A 年齡）
    depletionAgeP50: number | null;  // P50 軌跡歸零年齡（成員 A 年齡）
    depletionAgeP95: number | null;  // P95 軌跡歸零年齡（成員 A 年齡）
    successRate: number;        // 夫妻白頭偕老財務安全成功機率
  }
  ```

### 3. 防範與邊界處理
* 當夫妻雙方皆已達到其設定的 `maxAge` 時，模擬終止。
* 在任何一年中，若資產歸零，則資產保持為 0 且該路徑標記為 Depleted (失敗)。

## Risks / Trade-offs

* **[Risk]** 夫妻年齡差較大時，圖表 X 軸以誰的年齡為主會造成語意困擾。
  * **緩解措施**：圖表 X 軸主標記以「成員 A 年齡」為主，但在 Tooltip 或圖表下方同時標示對應的「成員 B 年齡」，並在白頭偕老時間軸上精確繪製出兩人各階段的年齡標記。
