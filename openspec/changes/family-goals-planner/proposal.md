## Why

現有的退休規劃系統主要基於「單人單一資產大水庫」進行蒙地卡羅與提領回測。然而在真實的家庭理財實務中，夫妻不僅面臨「退休」這一個終極目標，往往伴隨著多樣且併行的階段性目標（例如子女教育基金、購屋換屋準備金、家庭圓夢旅遊等）。這些目標在時間軸與月預算上存在激烈的「預算競爭關係」。本變更案旨在引入全然獨立且與真實資產解耦的「目標導向多水庫（信封袋）規劃系統」，協助家庭精算有限預算下的多目標達成率與優先級智慧分配。

## What Changes

* **[NEW] 家庭信封規劃主頁**：新增獨立的 `/family` 路由與 `src/pages/FamilyPlanner.tsx` 頁面，採用「雙欄頂級儀表板」架構：
  * 左側為家庭預算主控制台，可設定「家庭每月總理財預算」。
  * 頂部顯示預算分配圓環、總分配率與超支警報。
  * 下段為目標信封袋卡片網格（Card Grid），提供視覺感極強的進度條與達成率百分比。
  * 點擊信封卡片能以微動畫展示積累曲線折線圖與優化診斷報告。
* **[NEW] 優先級智慧預算分配算法**：實作優先級權重分配法（Priority Weighting），在家庭月預算超支時優先滿足最高優先級的信封，其餘依次壓縮並以紅色高亮發出警告。
* **[MODIFY] 選單與導航重組**：
  * 在 `src/App.tsx` 中加入 `/family` 路由，將代表家庭共同守護的 `Users` 圖示配置給家庭信封規劃。
  * 將原本單人退休規劃的選單 Icon 還原為 `TrendingUp`，與家庭模組徹底分流。
* **[MODIFY] 退休規劃單人回歸**：
  * 清除 `src/pages/RetirementPage.tsx` 內置的夫妻模式相關 State 與複雜的多雙卡片表單 UI。
  * 使 `RetirementPage.tsx` 完全回歸純淨、穩定的單人蒙地卡羅與危機回測，維持極簡代碼。

## Capabilities

### New Capabilities

- `family-goals-planner`: 提供家庭目標導向多信封理財規劃。支援新增/刪除自訂信封袋、沙盒獨立初始資產、目標年限與預期年化報酬；整合家庭月預算，提供優先級權重智慧預算分配與超支警報；以精美雙欄儀表板、Recharts 複利曲線與高亮警告呈現最 Wow 的家庭理財視覺。

### Modified Capabilities

(none)

## Impact

- Affected specs:
  - `family-goals-planner` (New spec file at `openspec/specs/family-goals-planner/spec.md`)
- Affected code:
  - Modified:
    - `src/App.tsx`
    - `src/pages/RetirementPage.tsx`
    - `src/utils/retirement.ts`
  - New:
    - `src/pages/FamilyPlanner.tsx`
