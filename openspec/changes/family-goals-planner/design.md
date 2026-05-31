## Context

現有的退休規劃系統主要基於「單一資產大水庫」框架，對於家庭面臨的多目標併行（如子女教育金、買房首購、圓夢旅行、夫妻退休）及其「有限月預算下的資金分配競爭」缺乏清晰的支援。為了提供更貼合家庭實務、高質感的理財決策，我們需要建立全新的「家庭信封目標規劃系統 (Family Goals Planner)」，並將原系統的退休頁面還原為乾淨單人版。

## Goals / Non-Goals

**Goals:**

* 於 `src/pages/FamilyPlanner.tsx` 實作全新獨立的家庭信封規劃頁面，並在 `App.tsx` 中以 `/family` 路由與 `Users` 圖示載入。
* 實作獨立的 LocalStorage 沙盒持久化儲存（鍵名 `family_planner_goals`），儲存自訂目標與總預算。
* 實作優先級權重分配算法（Priority Weighting），在家庭月預算超支時，優先滿足最高優先級的信封，其餘依次壓縮，並以高質感紅色警報呈現受扣減的目標。
* 在每個目標卡片中，提供複利積累計算與達成率估算，點擊後彈出 Drawer 顯示積累軌跡折線圖。
* 還原 `src/pages/RetirementPage.tsx` 與 `src/App.tsx` 至原本穩定的單人蒙地卡羅規劃狀態。

**Non-Goals:**

* 本頁面資料與全域 `AppContext` 的真實資產解耦，不與首頁現有持股進行虛擬帳戶劃撥，保持極簡解耦。
* 不涉及任何後端 API 呼叫，維持 100% 前端本地隱私化。

## Decisions

### 1. 獨立 LocalStorage 沙盒持久化決策 (Independent LocalStorage Sandbox Decision)
* **決策**：在 `FamilyPlanner.tsx` 中，以 LocalState 沙盒管理家庭目標列表與預算限額，並單獨以 `family_planner_goals` 鍵儲存於 LocalStorage。
* **理由**：不改動全域的 `AppContext` 結構，完美杜絕修改過程中影響其他功能頁面（如資產總覽、平衡、下單）的風險，保證系統的向前相容性與解耦。
* **替代方案**：將家庭目標寫入全域 `AppContext` 狀態。這會導致狀態樹變得極為龐大，且還原儲存時需撰寫繁複的型別校驗與防呆程式碼，防禦性極差。

### 2. 優先級權重智慧預算分配決策 (Priority-Based Phase-Out Budget Allocation Decision)
* **決策**：使用者可將目標設定為三種優先級之一：`rigid`（剛性首要）、`important`（重要）、`flexible`（彈性享樂）。若家庭月預算不足，分配演算法將優先 100% 滿足最高優先級的月預算需求，餘額再依次滿足次要優先級。
* **理由**：這比齊頭式的「等比例裁剪」更符合家庭理財實務。家庭不可能在預算不夠時，把買房首付和度假基金按相同比例削減，必然是優先保全剛性首購，壓縮出國旅遊。
* **替代方案**：等比例等差削減法。計算簡單但完全不符合家庭決策實務，缺乏實用價值。

## Implementation Contract

### 1. 資料結構與合約 (FamilyGoal Interface)
* 每個目標信封袋結構：
  ```typescript
  export interface FamilyGoal {
    id: string;
    name: string;
    currentAmount: number;
    targetAmount: number;
    targetYears: number;
    expectedReturn: number; // 年化報酬率，如 0.07 代表 7%
    monthlyBudget: number;  // 預計投入/月
    priority: 'rigid' | 'important' | 'flexible';
  }
  ```

### 2. 優先級智慧分配算法規則 (Allocation Rules)
* 輸入：`goals` 陣列與 `familyMonthlyLimit` (總預算限額)。
* 規則：
  1. 優先級排序：`rigid` > `important` > `flexible`。
  2. 依優先級順序扣除分配：
     - 若 `rigid` 目標的 `monthlyBudget` 總和大於等於 `familyMonthlyLimit`，則 `rigid` 按比例瓜分 `familyMonthlyLimit`，其餘優先級獲得 0。
     - 若滿足 `rigid` 後仍有餘額，則將餘額撥給 `important`。若餘額不足以完全滿足 `important`，則 `important` 按比例瓜分餘額，`flexible` 獲得 0。
     - 若滿足 `important` 後仍有餘額，則分給 `flexible`。
  3. 算出每個目標的實際月分配金額：`allocatedMonthlyAmount`。

### 3. 沙盒複利達成率演算 (Success Rate Math)
* 複利公式：
  $$EndAsset = currentAmount \times (1 + r)^y + \sum_{i=1}^{y} (allocatedAmount \times 12) \times (1 + r)^{y - i}$$
* 達成率計算：
  $$SuccessRate = \min\left(100\%, \frac{EndAsset}{targetAmount} \times 100\%\right)$$
* 診斷文字規則：若 `allocatedMonthlyAmount < monthlyBudget`，卡片以紅色高亮發出警告，並顯示「⚠️ 預算受擠壓！每月被迫減領 ${monthlyBudget - allocatedMonthlyAmount} 元，達成率下降 X%」。

### 4. 驗證條件與範疇 (Acceptance Criteria)
* 100% 通過 TypeScript 與 verbatimModuleSyntax 編譯。
* 使用者在 `/family` 能自由新增、編輯、刪除信封。
* 信封數量不受限制，支持滾動展示。
* 當變更月總預算限額時，所有卡片的分配金額、進度條、達成率、高亮紅色警報與歷年折線圖皆能即時重繪對齊。

## Risks / Trade-offs

* **[Risk]** 當新增極多目標時，頁面垂直拉長，左側控制台會顯得過於空曠。
  * **緩解**：左側控制台採用 `sticky` 定位，隨螢幕捲動始終懸浮固定在左側，保證絕佳的視覺對齊與便捷操作；右側網格卡片引入 `max-h-[70vh] overflow-y-auto` 或是採用流暢的自適應格柵排版。
