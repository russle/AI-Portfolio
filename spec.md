# 🚀 AI資產配置戰略總覽 (AI-Portfolio) —— 系統規格說明書 (spec.md)

本專案已全面升級重構為基於 **React Router** 的響應式多頁面單頁 Web 應用程式（SPA）。本規格說明書旨在詳細記錄系統的核心技術棧、路由頁面架構、全域狀態持久化設計、三大財務計算引擎核心公式，以及頂級 HSL/毛玻璃視覺美學之實作指南，供後續開發與 AI 助手參考。

---

## 1. 技術棧與系統架構 (Tech Stack & Architecture)

* **核心框架**：React 19 + TypeScript (啟用嚴格型別檢查與 `verbatimModuleSyntax` 嚴格模組語法)。
* **多路由分發**：`react-router-dom` v7.x —— 使用 `HashRouter` 作為路由管理器，防止純 CSR 部署在 Cloudflare Pages 等靜態託管環境下重新整理出現 404 錯誤。
* **狀態管理與持久化**：使用客製化 React Context API + LocalStorage。全站資料以 `aiPortfolio` 作為單一儲存鍵進行讀取與寫入，並於各頁面間進行同步廣播。
* **圖表視覺化**：Recharts v3.x —— 支援流暢的 HSL 漸變渲染、多同心圓環圖及對比柱狀圖。
* **樣式與美學**：Tailwind CSS v4 + Vanilla CSS —— 導入毛玻璃（Glassmorphism）、平滑漸變光影及微動畫，營造 premium 財經工具體驗。

---

## 2. 路由與頁面架構 (Routing & Page Specs)

系統配置了簡潔直觀的毛玻璃 Navbar，支援響應式（RWD）折疊導航，對應六大核心業務分頁：

### 🏠 A. 總覽首頁 (Overview) —— `/` 或 `/#/`
* **頁面功能**：呈現當前全站財務摘要（總資產、預估年化報酬率、退休成功率及通膨率），並繪製 Recharts 漸變歷史淨值折線圖。
* **快捷入口**：提供六大模組卡片，方便一鍵跳轉。

### 📊 B. 配置目標 (Allocation) —— `/#/allocation`
* **頁面功能**：行內輸入與編輯 ETF 的目標配置權重、即時防禦累計加總。
* **視覺對比**：渲染 Recharts 雙層同心圓環圖（外圈顯示大類，內圈顯示具體標的比重），直觀比對「當前實際配置」與「目標配比」。

### 🔄 C. 資產再平衡 (Rebalance) —— `/#/rebalance`
* **頁面功能**：提供強大的資產再平衡決策支援。
* **三大模式**：支援「精準買賣再平衡」、「只買不賣新資金再平衡」與「偏離門檻再平衡」，並支持 slider 動態調節偏差門檻（預設 5%）。

### 🧓 D. 退休財務規劃 (Retirement) —— `/#/retirement`
* **頁面功能**：實作被動提領逆推與 Monte Carlo 隨機模擬。
* **法則選擇**：支援 4% 法則 (Trinity)、Guyton-Klinger 動態護欄法則、以及 Die to Zero 財產歸零法則。
* **儀表板**：以 SVG 半圓形儀表板展現退休可行性評估，並支援退休前累積期與退休後消耗期之圖表翻轉。

### 📝 E. 輔助下單機 (Order) —— `/#/order`
* **頁面功能**：將新增的預備投資金，按目標權重一鍵換算為美股/台股「應買進股數」、「分配美金」與「預估剩餘現金」，進行零頭無損防禦展示。

### 💥 F. 壓力測試與情境預演 (Scenario) —— `/#/scenario`
* **頁面功能**：情境分析與壓力測試沙盒。在不污染真實 context 狀態的情況下，一鍵預演「市場暴跌 -10%」、「美股大牛市 +20%」、「美元飆升至 35 TWD」及「惡性通膨至 5%」對退休成功率的衝擊，並支持「確認套用」將預演配置寫回全域真實狀態。

### 📈 G. 歷史回測與配置績效看板 (Backtest) —— `/#/backtest` [NEW]
* **頁面功能**：提供科學化歷史區間複利模擬，對決「我的配置組合」與「100% 台股基準對照組 (0050.TW)」。
* **抗震對抗**：包含「重大危機壓力測試對決看板 (Crisis Stress Test Showcase)」，詳細計算並發光展示中美貿易戰、新冠爆發、全球股債雙殺期間兩組的「最大跌幅」與「前高復原月數」。

---

## 3. 全域狀態管理與持久化數據模型 (State Model)

全域狀態定義於 `AppContext.tsx`，資料結構定義如下：

```typescript
export type PortfolioHistoryPoint = {
  date: string;      // YYYY-MM-DD
  net_worth: number; // 當日資產淨值總和
  cash?: number;     // 細分資產明細快照 [NEW]
  fund?: number;
  tw_stock?: number;
  us_stock?: number;
  crypto?: number;
};

export type HoldingItem = {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  currentPrice: number;
  currency: 'TWD' | 'USD';
  assetType: AssetClassKey;
};

export type Portfolio = {
  cash: number;      // 現金
  fund: number;      // 基金與債券
  tw_stock: number;  // 台灣股票
  us_stock: number;  // 美國股票
  crypto: number;    // 加密貨幣
  history: PortfolioHistoryPoint[];
  holdings: HoldingItem[]; // [NEW] 持股明細明細
  isHoldingMode: boolean;   // [NEW] 雙軌混合 Context 持股模式開關
  usdRate: number;         // [NEW] 美元對新台幣即時/全域匯率
};

export type AllocationTarget = {
  tw_stock: number;  // 0 ~ 1 比例
  us_stock: number;
  bond: number;
  cash: number;
  crypto: number;
};

export type RetirementConfig = {
  age: number;              // 目前年齡
  monthly_spending: number; // 退休後每月生活費
  monthly_invest: number;   // 退休前每月持續投入額
  expected_return: number;  // 預期年化報酬率，例如 0.07
  inflation: number;        // 年通膨率，例如 0.02
  life_expectancy: number;  // [NEW] 個人自訂預估壽命設定
  cape_ratio: number;       // [NEW] 市場席勒本益比 (CAPE Ratio)
  spending_smile: boolean;  // [NEW] 是否啟用開銷微笑曲線 (Spending Smile)
};

export type AiPortfolioState = {
  portfolio: Portfolio;
  allocation_target: AllocationTarget;
  retirement: RetirementConfig;
};
```

### 狀態防禦與變動廣播機制
1. **資料初始化**：系統會自動嘗試從 `localStorage.getItem('aiPortfolio')` 讀取並解析資料。若解析失敗或為空，則採用精緻的預設資產數值（例如：總市值約 123 萬，並包含最近 7 個月的歷史數據點）。
2. **自動歷史對齊**：當調用 `updatePortfolioAsset` 更新某個資產金額時，系統會自動重新加總所有資產，並**動態重寫或新增 history 歷史列表中的最後一個數據點**，隨後將其同步持久化到 `localStorage` 中。

---

## 4. 三大財務計算引擎核心公式

### 4.1 智慧再平衡演算法 (`src/utils/rebalance.ts`)

#### 1. 精準買賣再平衡模式 (Exact Rebalance)
旨在完全恢復黃金比例的雙向交易計算。設 $V_{total}$ 為總市值，$Price_i$ 為標的單價，$T_i$ 為目標權重：
$$\text{理想目標市值 } V_{ideal, i} = V_{total} \times T_i$$
$$\text{交易金額缺口 } \text{Gap}_i = V_{ideal, i} - \text{實際市值}_i$$
$$\text{應交易股數 } \text{actionShares}_i = \lfloor \frac{\text{Gap}_i}{Price_i} \rfloor$$
*（正值為「買進」，負值為「賣出」）*

#### 2. 新資金只買不賣再平衡模式 (Cash-Flow Rebalancing)
**核心思想**：不賣出任何現有股票（免交易手續費），僅將新入金 $F_{new}$ 單向分配給低配資產：
* 預估平衡後總市值：$V_{next} = V_{total} + F_{new}$
* 各標的預估理想目標市值：$V_{next\_ideal, i} = V_{next} \times T_i$
* 實質市值缺口：$\text{Gap}_i = V_{next\_ideal, i} - \text{實際市值}_i$
* **智慧分配演算法（僅分配正缺口標的）**：若 $\text{Gap}_i \le 0$，則分配金額 $allocated_i = 0$。對於所有低配標的（即 $\text{Gap}_i > 0$）：
  $$allocated_i = F_{new} \times \frac{\text{Gap}_i}{\sum_{\text{Gap}_j > 0} \text{Gap}_j}$$
  $$\text{應買進股數 } \text{actionShares}_i = \lfloor \frac{allocated_i}{Price_i} \rfloor$$
  *此演算法完美確保 $\text{actionShares}_i \ge 0$，杜絕賣出交易。*

#### 3. 偏離門檻再平衡模式 (Threshold Rebalance)
只有當某資產類別的實際權重與目標權重偏離程度 $|\Delta W_i| \ge \text{threshold}$ 時，才生成該標的的買賣再平衡金額，否則保持 $0$ 不動。

---

### 4.2 退休規劃與 Monte Carlo 隨機模擬 (`src/utils/retirement.ts`)

#### 1. 實質年化報酬率 ($r_{real}$)
考量長期通膨對購買力的蠶食，公式如下，並設置 $1\%$ 的安全下限防禦：
$$r_{real} = \max(0.01, r - \text{inflation})$$

#### 2. 目標資產總額 ($Target$) 逆推
* **4% 提領法則 (Trinity Study)**：
  $$Target = (\text{月生活費} \times 12) \div 0.04$$
* **蓋頓-克林格動態提領 (Guyton-Klinger)**：初始提領率設為較積極的 $5\%$：
  $$Target = (\text{月生活費} \times 12) \div 0.05$$
  * **富裕增領與防禦減領雙護欄臨界淨值**：
    $$\text{富裕增領臨界資產} = Target \times 1.2 = 1.2 \times \frac{\text{年支出}}{0.05}$$
    $$\text{防禦減領臨界資產} = Target \times 0.8 = 0.8 \times \frac{\text{年支出}}{0.05}$$
* **財產歸零提領 (Die to Zero)**：採用年金現值逆推公式（退休存活年期為 $N_{surv}$，此處為自訂預估壽命 $L_{expectancy}$ 與退休年齡的差值）：
  $$Target = (\text{月生活費} \times 12) \times \frac{1 - (1 + r_{real})^{-N_{surv}}}{r_{real}}$$

#### 3. 全生命週期蒙地卡羅雙軌迭代模擬 (Full-Life Simulation)
系統透過模擬 1,000 次隨機市場報酬率，繪製出當前年齡至自訂預估壽命 $L_{expectancy}$ 的完整資產軌跡。設定資產預期報酬率為 $r$，波動率（標準差）為 $\sigma = 0.15$，每年隨機報酬率為 $R_t \sim N(r, \sigma)$，年通膨率為 $\text{inflation}$。

對於每一條隨機軌跡，設第 $t$ 年的年齡為 $A_t = \text{current\_age} + t$（其中 $t \in [1, L_{expectancy} - \text{current\_age}]$）：

##### A. 退休前累積期 ($A_t \le \text{retire\_age}$)
此階段資產穩步積累，每年年底滾存報酬率並持續注入儲蓄：
$$V_t = \frac{V_{t-1} \times (1 + R_t) + W_{invest}}{1 + \text{inflation}}$$
其中 $W_{invest} = \text{monthly\_invest} \times 12$。由於除以 $(1 + \text{inflation})$，系統中所有資產數值均以**「實質購買力（Constant TWD）」**計價。

##### B. 退休後消耗期 ($A_t > \text{retire\_age}$)
此階段停止儲蓄，改為按提領策略扣除生活費 $W_{withdraw, t}$（若啟用開銷微笑曲線則另乘以折減因子 $f_{smile}(A_t)$），並滾存餘額：
$$V_t = \max\left(0, \frac{(V_{t-1} - W_{withdraw, t} \times f_{smile}(A_t)) \times (1 + R_t)}{1 + \text{inflation}}\right)$$

不同提領策略與微笑因子的計算如下：

* **1. 退休支出微笑曲線折減因子 $f_{smile}(A_t)$**：
  若未開啟微笑曲線，則 $f_{smile}(A_t) = 1.0$；若開啟，則依人生不同精力階段進行科學折減與照護回升：
  $$f_{smile}(A_t) = \begin{cases} 
  1.0, & \text{if } A_t \le 70 \quad \text{(健康活躍期)} \\
  1.0 - (A_t - 70) \times 0.025, & \text{if } 70 < A_t \le 80 \quad \text{(安穩享受期，80歲時折減至 75%)} \\
  \min(1.0, 0.75 + (A_t - 80) \times 0.025), & \text{if } A_t > 80 \quad \text{(醫療照護期，90歲後回升至 100%)}
  \end{cases}$$

* **2. 提領策略年支出金額 $W_{withdraw, t}$**：
  - **4% 提領法則**：每年固定扣除定額實質生活費：
    $$W_{withdraw, t} = \text{monthly\_spending} \times 12$$
  - **蓋頓-克林格 (GK) 動態法則**：根據前一年底資產餘額 $V_{t-1}$ 與目標資產 $V_{target} = (\text{monthly\_spending} \times 12) / 0.05$ 進行防禦性調整：
    $$W_{withdraw, t} = \begin{cases} 
    (\text{monthly\_spending} \times 12) \times 1.1, & \text{if } V_{t-1} \ge V_{target} \times 1.2 \quad \text{(富裕增領)} \\
    (\text{monthly\_spending} \times 12) \times 0.9, & \text{if } V_{t-1} \le V_{target} \times 0.8 \quad \text{(防禦減領)} \\
    \text{monthly\_spending} \times 12, & \text{otherwise}
    \end{cases}$$
  - **Die to Zero 年金均攤法則**：依據剩餘壽命年期 $N_{remain} = L_{expectancy} - A_t + 1$ 動態年金均攤餘額：
    $$W_{withdraw, t} = \frac{V_{t-1}}{\text{AnnuityFactor}_t}$$
    $$\text{AnnuityFactor}_t = \frac{1 - (1 + r_{real})^{-N_{remain}}}{r_{real}}$$
  - **CAPE 估值連動法則 [NEW]**：退休第一年（$A_t = \text{retire\_age} + 1$）初始提領由退休點資產與席勒本益比決定，之後年份隨通膨通滾：
    $$W_{withdraw, t} = \begin{cases}
    V_{retire\_age} \times \left(0.015 + \frac{0.5}{\text{CAPE}}\right), & \text{if } A_t = \text{retire\_age} + 1 \\
    W_{withdraw, t-1} \times (1 + \text{inflation}), & \text{if } A_t > \text{retire\_age} + 1
    \end{cases}$$

#### 4. P5/P50/P95 智慧資產花光歲數預估
模擬結束後，將 1,000 次模擬結果排序，抽取得出 P5（保守極端）、P50（期望中位）、P95（樂觀上限）三條代表性分位軌跡。
對於任一分位數軌跡 $V_{P, t}$（其中 $P \in \{5, 50, 95\}$），其「資產花光歲數」 $\text{depletionAge}_P$ 定義為：
$$\text{depletionAge}_P = \min \{ A_t \mid A_t \ge \text{retire\_age} \text{ and } V_{P, t} \le 0 \}$$
若在所有模擬年期 $t \in [0, L_{expectancy} - \text{current\_age}]$ 內皆滿足 $V_{P, t} > 0$，則花光歲數記為 $\text{null}$，於 UI 面板上呈現 `🛡️ [自訂壽命]歲前安全無虞`。

---

### 4.3 情境預演與壓力測試 (`src/utils/scenario.ts`)

情境預演為純函數（Pure Function）運算，絕不直接污染全域狀態：

* **💥 市場劇烈崩跌 -10%**：
  $$tw\_stock_{new} = tw\_stock \times 0.9$$
  $$us\_stock_{new} = us\_stock \times 0.9$$
* **🚀 美股大牛市 +20%**：
  $$us\_stock_{new} = us\_stock \times 1.2$$
* **💵 美元飆升至 35 TWD**（假設基準匯率為 30）：
  $$us\_stock_{new} = us\_stock \times \frac{35}{30}$$
* **🔥 惡性通膨危機**：
  $$\text{inflation}_{new} = 0.05$$

---

### 4.4 歷史回測與黑天鵝對抗模擬引擎 (`src/utils/backtest.ts`) [NEW]

#### 1. 多標的時間軸 YYYY-MM 對齊與 Forward-fill 補水防禦
設資產配置組合有 $M$ 個標的（在此為台股、美股、債券、加密貨幣）。各大類歷史價格序列為 $P_i(date)$：
* **時間軸並集交集計算**：尋找所有標的歷史收盤價序列的共同交集月份集合 $\mathcal{T} = \bigcap_{i=1}^M \{ date \mid P_i(date) \text{ 存在} \}$。
* **Forward-fill (前向填充)**：當某標的在月份 $date_k$ 的價格丟失時，防禦性地套用前一月價格 $P_i(date_k) = P_i(date_{k-1})$。

#### 2. 定期定額與資產加權複利演化 (Rebalanced Portfolio Evolution)
對於共同時間軸中升序排列的月份 $t \in [0, N-1]$：
* **初始狀態 ($t = 0$)**：
  $$\text{標的持股數 } Shares_i(0) = \frac{V_{initial} \times AllocationTarget_i}{P_i(0)}$$
  $$\text{定存現金額 } Cash(0) = V_{initial} \times AllocationTarget_{cash}$$
* **定期定額加碼與滾存 ($t > 0$)**：
  設每月新定期定額入金為 $W_{invest}$，現金年定存利率 $r_{cash} = 1.5\%$（月幾何收益率 $r_{m} = (1 + r_{cash})^{1/12} - 1$）：
  $$Shares_i(t) = Shares_i(t-1) + \frac{W_{invest} \times AllocationTarget_i}{P_i(t)}$$
  $$Cash(t) = Cash(t-1) \times (1 + r_m) + W_{invest} \times AllocationTarget_{cash}$$
* **月度總價值**：
  $$V_{portfolio}(t) = \sum_{i=1}^M Shares_i(t) \times P_i(t) + Cash(t)$$
* **再平衡觸發 (Rebalancing)**：若設定為每月或每年再平衡（即滿足 $t \pmod{12} == 0$ 或 $t > 0$），則將本月末總價值重新依照目標比例分配：
  $$Shares_i(t) = \frac{V_{portfolio}(t) \times AllocationTarget_i}{P_i(t)}$$
  $$Cash(t) = V_{portfolio}(t) \times AllocationTarget_{cash}$$

#### 3. 幾何年化報酬率 (CAGR) 精算
為了剔除每月持續定期定額入金對收益率的扭曲，改為使用月純收益率的幾何平均後年化。設月純收益率（扣除本月定額存入 $W_{invest}$）為 $R_{m}(t)$：
$$R_{m}(t) = \frac{V_{portfolio}(t) - W_{invest} - V_{portfolio}(t-1)}{V_{portfolio}(t-1)}$$
$$\text{幾何月平均收益 } \bar{R}_m = \left( \prod_{t=1}^{N-1} (1 + R_m(t)) \right)^{\frac{1}{N-1}} - 1$$
$$\text{幾何年化報酬率 (CAGR)} = \left( (1 + \bar{R}_m)^{12} - 1 \right) \times 100\%$$

#### 4. 危機最大跌幅 (Max Drop) 與爬回前高復原月數 (Recovery Months)
針對重大危機大事記（如 COVID-19 疫情爆發，高峰月為 $date_{peak}$）：
* **最大跌幅 (Max Drop)**：在危機高峰後 12 個月的核心區間內，尋找淨值的最低點 $V_{min}$，精算跌幅：
  $$\text{Max Drop} = \frac{V_{min} - V_{peak}}{V_{peak}} \times 100\%$$
* **復原月數 (Recovery Months)**：自高峰月 $t_{peak}$ 開始，往後尋找第一個淨值重新大於或等於高峰期淨值 $V_{peak}$ 的月份 $t_{recover}$，復原月數為 $t_{recover} - t_{peak}$；若至回測時間軸終點仍未回到前高，則記為 `尚未復原 (-1)`。

---

## 5. UI/UX 視覺美學與高品質組件規範

為營造極致的 Premium 視覺美感，全站遵循以下設計系統：

### 5.1 配色與主題 (HSL Custom Palettes)
* **主色系**：深海藍（#1e3a8a）與翡翠綠（#10b981），傳遞穩健與高信任感。
* **大類資產配對色盤**：
  - **股票型 (Stock) 系列**：採用漸變藍色系（例如 `#3b82f6` 至 `#1d4ed8`）
  - **債券/基金 (Bond/Fund) 系列**：採用穩重的 Slate 灰色系（例如 `#64748b` 至 `#334155`）
  - **現金 (Cash) 類**：採用溫和的翠綠色系（例如 `#10b981`）
  - **加密貨幣 (Crypto)**：採用科技感的紫色與金黃色系（例如 `#f59e0b` / `#8b5cf6`）

### 5.2 磨砂玻璃 (Glassmorphism) 卡片樣式
```css
.card-premium {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 10px 25px -5px rgba(148, 163, 184, 0.05),
              0 8px 10px -6px rgba(148, 163, 184, 0.05);
  border-radius: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 25px -5px rgba(148, 163, 184, 0.1),
              0 10px 10px -5px rgba(148, 163, 184, 0.04);
}
```

### 5.3 互動動畫與微動態效果
- **淡入效果**：全站頁面切換配有 `animate-fade-in`，持續時間 0.4s，營造流暢平滑的頁面加載感。
- **壓力測試按鈕**：啟用狀態時配有 `animate-pulse` 微波脈衝光影，以及 `scale-[1.03]` 與 `ring-2 ring-blue-400/40` 的高亮聚焦。
- **SVG 半圓儀表板**：指針轉動使用 transition CSS 動態，讓成功率指標在切換參數時，指針能夠優雅且平滑地轉動，而非瞬間跳躍。
- **RWD 表格滾動**：所有資料與下單表格外層包裹 `overflow-x-auto`，確保在手機小螢幕下提供順暢的手勢橫向滑動，防堵排版擠壓。