import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Gauge } from '../components/Gauge';
import { LineChart } from '../components/LineChart';
import { AlertBanner } from '../components/AlertBanner';
import { 
  runMonteCarloSimulation as runMonteCarlo, 
  assessRetirementFeasibility as assessFeasibility, 
  runFullLifeMonteCarloSimulation,
  runRetirementCrisisBacktest // [NEW] 引入危機回測
} from '../utils/retirement';
import { calculateSpendingForDieToZero } from '../utils/formulas';
import { AlertTriangle } from 'lucide-react';

export const RetirementPage: React.FC = () => {
  const { state, updateRetirementConfig } = useApp();
  const { portfolio, retirement } = state;

  // 使用者可手動輸入與調整退休年限與提領法則
  const [targetRetirementAge, setTargetRetirementAge] = useState<number>(60);
  const [withdrawalRule, setWithdrawalRule] = useState<'four_percent' | 'gk_dynamic' | 'die_to_zero' | 'cape_based'>('four_percent');

  // [NEW] 歷史黑天鵝回測狀態
  const [crisisScenario, setCrisisScenario] = useState<'tech_2000' | 'financial_2008' | 'inflation_2022'>('financial_2008');

  // [NEW] 生命週期動態 Glide Path 配置開關
  const [enableGlidePath, setEnableGlidePath] = useState<boolean>(false);

  // 全球股市說明：股債配置是以全球股市來估算
  const globalMarketNote = "本系統之股債配置預估報酬率，是以全球股市（例如 MSCI ACWI 指數）及全球債券 market 之長期歷史年化回報率為估算基礎。全球股市在過去數十年間的年化回報率約為 7%~8%，投資組合會依據您的股債比例調和出對應的預期報酬率。";

  // 計算目前資產總額
  const currentAsset = useMemo(() => {
    return portfolio.cash + portfolio.fund + portfolio.tw_stock + portfolio.us_stock + portfolio.crypto;
  }, [portfolio]);

  // 1. 計算 FIRE 目標金額 (4% 法則下，為年支出的 25 倍，即月支出 * 12 * 25)
  // 如果是 Die to Zero，目標金額可能因花光邏輯而有不同，但在計算上，我們以常規 FIRE 目標作為基準值供儀表板對比
  const fireTarget = useMemo(() => {
    return retirement.monthly_spending * 12 * 25;
  }, [retirement.monthly_spending]);

  // 模擬年期 (目標退休年齡 - 目前年齡)
  const simulationYears = useMemo(() => {
    return Math.max(1, targetRetirementAge - retirement.age);
  }, [targetRetirementAge, retirement.age]);

  // 根據選擇的提領法則調整預期年化報酬或模擬參數
  // 4%提領法則：正常年報酬，定額提領。
  // GK動態提領：因為有動態調降提領風險，在同樣資產下有更高的資產安全度，我們用稍微保守的標準差或動態調整展現。
  // Die to Zero：旨在壽命結束時歸零。
  const ruleDescription = useMemo(() => {
    switch (withdrawalRule) {
      case 'four_percent':
        return {
          title: '4% 提領法則 (定額提領)',
          desc: '源於著名的「三一研究」(Trinity Study)。退休第一年提領資產的 4% 作為生活費，之後每年依通貨膨脹率等比例調升提領金額。此法則旨在追求「本金幾乎不耗損」的永續提領。',
          detail: '優點：規則簡單、資產永續性極高；缺點：可能過於保守，導致過世時留下龐大遺產未動用。'
        };
      case 'gk_dynamic':
        return {
          title: 'Guyton-Klinger (GK) 動態提領法則',
          desc: '設有「提領安全護欄」。初始提領率可設較高（如 5%），但當市場下跌導致資產縮水、使提領率高於安全護欄時，將主動調降提領金額 10%；反之當市場大漲時則調升提領。',
          detail: '優點：能有效避免在熊市初期過度提領導致資產歸零，成功率極高；缺點：退休生活費會隨市場波動。'
        };
      case 'cape_based':
        return {
          title: 'CAPE 估值連動提領法則 (Shiller PE 連動)',
          desc: '基於諾貝爾獎得主席勒的 CAPE (本益比) 動態計算初始提領率。公式為：初始提領率 = 1.5% + 50 / CAPE 本益比。當市場估值過高 (泡沫期) 時自動防禦收縮提領，防止序列風險；估值便宜 (熊市底) 時自動增加提領，充分享受人生。',
          detail: '優點：以嚴謹的估值理論極限規避退休初期股市大跌的歸零威脅；缺點：初始提領金額完全取決於您退休時的市場估值高低。'
        };
      case 'die_to_zero':
        return {
          title: 'Die to Zero (花光為止法則)',
          desc: `以「死前剛好把錢花光」為目標。規劃在預期壽命（預估為 ${retirement.life_expectancy ?? 85} 歲）結束時，資產剛好歸零。此提領法則旨在最大化人生在世時的財富使用效率，將財富轉換為人生體驗。`,
          detail: '優點：退休期間可享有更高的生活水平；缺點：如果活得比預期長，會面臨晚年無錢可用的「長壽風險」。'
        };
      default:
        return { title: '', desc: '', detail: '' };
    }
  }, [withdrawalRule, retirement.life_expectancy]);

  // 執行全生命週期（累積期 + 提領消耗期）的蒙地卡羅隨機模擬
  const fullLifeResult = useMemo(() => {
    const strategy = withdrawalRule === 'four_percent' ? 'four_percent' :
                     withdrawalRule === 'gk_dynamic' ? 'gk_dynamic' :
                     withdrawalRule === 'cape_based' ? 'cape_based' : 'die_to_zero';
                      
    return runFullLifeMonteCarloSimulation(
      currentAsset,
      retirement.monthly_invest,
      retirement.age,
      targetRetirementAge,
      retirement.expected_return,
      0.15, // std
      retirement.inflation,
      retirement.monthly_spending,
      strategy,
      retirement.life_expectancy ?? 85, // maxAge 動態從 Context 取值
      retirement.cape_ratio ?? 30, // capeRatio 動態取值
      retirement.spending_smile ?? false, // enableSpendingSmile 開關連動
      enableGlidePath // [NEW] 串接動態 Glide Path
    );
  }, [currentAsset, retirement.monthly_invest, retirement.age, targetRetirementAge, retirement.expected_return, retirement.inflation, retirement.monthly_spending, withdrawalRule, retirement.life_expectancy, retirement.cape_ratio, retirement.spending_smile, enableGlidePath]);

  // 將全生命週期蒙地卡羅結果轉換成 Recharts 格式
  const chartData = useMemo(() => {
    const data = [];
    const yearsArray = fullLifeResult.yearsArray;
    const p5 = fullLifeResult.p5;
    const p50 = fullLifeResult.p50;
    const p95 = fullLifeResult.p95;

    for (let i = 0; i < yearsArray.length; i++) {
      data.push({
        year: `${yearsArray[i]} 歲`,
        p5: p5[i],
        p50: p50[i],
        p95: p95[i],
      });
    }
    return data;
  }, [fullLifeResult]);

  // 退休可行性評估
  const feasibilityAges = useMemo(() => {
    return assessFeasibility(
      currentAsset,
      retirement.monthly_invest,
      retirement.age,
      retirement.expected_return,
      0.15,
      retirement.inflation,
      fireTarget
    );
  }, [currentAsset, retirement.monthly_invest, retirement.age, retirement.expected_return, retirement.inflation, fireTarget]);

  // 計算退休點（目標退休年齡）之積累成功率
  const retireSuccessRate = useMemo(() => {
    const res = runMonteCarlo(
      currentAsset,
      retirement.monthly_invest,
      simulationYears,
      retirement.expected_return,
      0.15,
      retirement.inflation,
      fireTarget
    );
    return res.successRate;
  }, [currentAsset, retirement.monthly_invest, simulationYears, retirement.expected_return, retirement.inflation, fireTarget]);

  // 當提領法則為 Die to Zero 時，動態計算退休後每月可支配金額
  const dieToZeroResult = useMemo(() => {
    // 找出 targetRetirementAge 在 fullLifeResult 中的 index
    const retireAgeIndex = fullLifeResult.yearsArray.indexOf(targetRetirementAge);
    const expectedAssetAtRetire = retireAgeIndex !== -1 ? fullLifeResult.p50[retireAgeIndex] : 0;
    
    const remainingYears = Math.max(1, (retirement.life_expectancy ?? 85) - targetRetirementAge);
    const rReal = Math.max(0.01, retirement.expected_return - retirement.inflation);
    
    const { annual, monthly } = calculateSpendingForDieToZero(expectedAssetAtRetire, rReal, remainingYears);
    const diffAmount = monthly - retirement.monthly_spending;
    const diffPercent = retirement.monthly_spending > 0 ? (diffAmount / retirement.monthly_spending) * 100 : 0;
    
    return {
      expectedAssetAtRetire,
      monthlySpending: monthly,
      annualSpending: annual,
      diffAmount,
      diffPercent,
      remainingYears
    };
  }, [fullLifeResult, targetRetirementAge, retirement.expected_return, retirement.inflation, retirement.monthly_spending, retirement.life_expectancy]);

  // [NEW] 歷史黑天鵝危機回測計算
  const totalAssetVal = currentAsset || 1;
  const currentWeight = useMemo(() => {
    return {
      tw_stock: portfolio.tw_stock / totalAssetVal,
      us_stock: portfolio.us_stock / totalAssetVal,
      bond: portfolio.fund / totalAssetVal,
      cash: portfolio.cash / totalAssetVal,
      crypto: portfolio.crypto / totalAssetVal
    };
  }, [portfolio, totalAssetVal]);

  const allocationToUse = useMemo(() => {
    if (currentAsset > 0) {
      return currentWeight;
    }
    return {
      tw_stock: state.allocation_target.tw_stock,
      us_stock: state.allocation_target.us_stock,
      bond: state.allocation_target.bond,
      cash: state.allocation_target.cash,
      crypto: state.allocation_target.crypto
    };
  }, [currentAsset, currentWeight, state.allocation_target]);

  const crisisResult = useMemo(() => {
    const initialAssetToUse = currentAsset > 0 ? currentAsset : 10000000;
    return runRetirementCrisisBacktest(
      initialAssetToUse,
      retirement.monthly_spending,
      allocationToUse,
      withdrawalRule === 'gk_dynamic',
      retirement.spending_smile ?? false,
      crisisScenario,
      retirement.inflation
    );
  }, [currentAsset, retirement.monthly_spending, allocationToUse, withdrawalRule, retirement.spending_smile, crisisScenario, retirement.inflation]);

  const crisisChartData = useMemo(() => {
    return crisisResult.history.map(point => ({
      month: `${point.month}月`,
      assetValue: point.assetValue,
      spentValue: point.spentValue
    }));
  }, [crisisResult]);

  const crisisLinesConfig = [
    { key: 'assetValue', name: '退休金餘額 (TWD)', stroke: '#ef4444' }
  ];

  const linesConfig = [
    { key: 'p95', name: '樂觀上限 (P95)', stroke: '#10b981' },
    { key: 'p50', name: '預期中位數 (P50)', stroke: '#3b82f6' },
    { key: 'p5', name: '保守下限 (P5)', stroke: '#ef4444' }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 頂部引言 */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">退休與 FIRE 模擬器 (Retirement)</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          透過蒙地卡羅 (Monte Carlo) 隨機常態分佈演算法，模擬未來市場的隨機波動，為您計算出最真實的退休路徑與成功機率。
        </p>
      </div>

      {/* 全球股市估算提示 */}
      <AlertBanner
        type="success"
        message={`💡 股債報酬率估算基準說明：${globalMarketNote}`}
      />

      {/* 退休核心資訊與模擬成功率儀表板 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左側：退休參數設定面板 */}
        <Card className="p-6 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-bold text-slate-700 text-sm tracking-wide border-b border-slate-100 pb-3">退休規劃設定</h3>
            
            <div className="space-y-4">
              {/* 年齡 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">目前年齡</label>
                  <input
                    type="number"
                    value={retirement.age}
                    onChange={(e) => updateRetirementConfig('age', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                    min="18"
                    max="100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">預計退休年齡</label>
                  <input
                    type="number"
                    value={targetRetirementAge}
                    onChange={(e) => setTargetRetirementAge(Math.max(retirement.age + 1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                    min={retirement.age + 1}
                    max="100"
                  />
                </div>
              </div>

              {/* 預估壽命 */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">個人預估壽命 (Life Expectancy)</label>
                <input
                  type="number"
                  value={retirement.life_expectancy ?? 85}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    // 動態雙向安全護欄：目前年齡 + 5 ~ 120 歲
                    const minAllowed = retirement.age + 5;
                    const constrained = Math.min(120, Math.max(minAllowed, val));
                    updateRetirementConfig('life_expectancy', constrained);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                  min={retirement.age + 5}
                  max="120"
                />
                <span className="text-[9px] text-slate-400 font-medium block mt-1 leading-normal">
                  💡 長壽精算終點，影響提領年數與年金均攤（防禦範圍：{retirement.age + 5} ~ 120 歲）。
                </span>
              </div>

              {/* 每月開銷 */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">預估退休後每月支出 (TWD)</label>
                <input
                  type="number"
                  value={retirement.monthly_spending}
                  onChange={(e) => updateRetirementConfig('monthly_spending', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                  min="0"
                  step="1000"
                />
              </div>

              {/* 每月投資 */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">每月持續投入投資額 (TWD)</label>
                <input
                  type="number"
                  value={retirement.monthly_invest}
                  onChange={(e) => updateRetirementConfig('monthly_invest', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                  min="0"
                  step="1000"
                />
              </div>

              {/* 預估報酬與通膨 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">年化報酬率 (%)</label>
                  <input
                    type="number"
                    value={(retirement.expected_return * 100).toFixed(1)}
                    onChange={(e) => updateRetirementConfig('expected_return', (parseFloat(e.target.value) || 0) / 100)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                    min="0"
                    max="30"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">通貨膨脹率 (%)</label>
                  <input
                    type="number"
                    value={(retirement.inflation * 100).toFixed(1)}
                    onChange={(e) => updateRetirementConfig('inflation', (parseFloat(e.target.value) || 0) / 100)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                    min="0"
                    max="15"
                    step="0.1"
                  />
                </div>
              </div>

              {/* CAPE 與 微笑曲線 */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">席勒本益比 (CAPE)</label>
                  <input
                    type="number"
                    value={retirement.cape_ratio ?? 30}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      // 限制在 10 ~ 50 之間以防禦隨機溢出
                      updateRetirementConfig('cape_ratio', Math.min(50, Math.max(10, val)));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                    min="10"
                    max="50"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="text-xs font-bold text-slate-400 block mb-2">開銷微笑曲線</label>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!retirement.spending_smile}
                      onChange={(e) => updateRetirementConfig('spending_smile', e.target.checked ? 1 : 0)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-2 text-xs font-bold text-slate-500 peer-checked:text-blue-600 font-mono">
                      {retirement.spending_smile ? '已啟用 ✨' : '已關閉'}
                    </span>
                  </label>
                </div>
              </div>

              {/* [NEW] 生命週期動態 Glide Path */}
              <div className="pt-3.5 border-t border-slate-100 mt-2.5">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block">生命週期動態 Glide Path</label>
                    <span className="text-[10px] text-slate-400 font-semibold block leading-normal mt-0.5 max-w-[200px]">
                      💡 隨模擬年齡增長自動線性調降高風險股權配比，大幅避免長壽資金耗盡歸零。
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none ml-2 shrink-0">
                    <input
                      type="checkbox"
                      checked={enableGlidePath}
                      onChange={(e) => setEnableGlidePath(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-2 text-xs font-bold text-slate-500 peer-checked:text-blue-600 min-w-10 text-center font-mono">
                      {enableGlidePath ? '已啟用 ✨' : '已關閉'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
            * 模擬年數為 <span className="font-bold text-slate-600">{simulationYears} 年</span>。
            <br />
            * 目標金額（FIRE 目標）：<span className="font-bold text-slate-600">${Math.round(fireTarget / 10000).toLocaleString()} 萬</span> (以 4% 提領率反推年支出的 25 倍計算)。
          </div>
        </Card>

        {/* 中間：提領法則選擇區 */}
        <Card className="p-6 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-bold text-slate-700 text-sm tracking-wide border-b border-slate-100 pb-3">提領法則與策略選擇</h3>
            
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 block mb-1">選擇提領法則</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setWithdrawalRule('four_percent')}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    withdrawalRule === 'four_percent' 
                      ? 'bg-blue-50/60 border-blue-200 text-blue-700 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  🏦 4% 提領法則 (定額永續)
                </button>
                <button
                  onClick={() => setWithdrawalRule('gk_dynamic')}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    withdrawalRule === 'gk_dynamic' 
                      ? 'bg-blue-50/60 border-blue-200 text-blue-700 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  ⚖️ GK 動態提領法則 (護欄機制)
                </button>
                <button
                  onClick={() => setWithdrawalRule('die_to_zero')}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    withdrawalRule === 'die_to_zero' 
                      ? 'bg-blue-50/60 border-blue-200 text-blue-700 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  ☠️ Die to Zero (花光為止)
                </button>
                <button
                  onClick={() => setWithdrawalRule('cape_based')}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    withdrawalRule === 'cape_based' 
                      ? 'bg-blue-50/60 border-blue-200 text-blue-700 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  📈 CAPE 估值連動法則 (席勒 PE)
                </button>
              </div>

              {/* 提領法則簡介 */}
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="font-bold text-xs text-slate-700">{ruleDescription.title}</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">{ruleDescription.desc}</div>
                <div className="text-[10px] text-slate-400 italic leading-relaxed pt-1 border-t border-slate-200/50">{ruleDescription.detail}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* 右側：蒙地卡羅成功率儀表板 */}
        <Card className="p-6 lg:col-span-1 flex flex-col items-center justify-center">
          <Gauge 
            value={retireSuccessRate} 
            title={`${targetRetirementAge} 歲退休成功機率`} 
          />
          <div className="text-center mt-2 max-w-xs">
            <p className="text-xs text-slate-400 leading-relaxed">
              在 {simulationYears} 年的累積期中，經過 1000 次隨機複利演算，有 <span className="font-bold text-slate-600">{(retireSuccessRate * 100).toFixed(0)}%</span> 的軌跡最終累積資產超越了目標金額。
            </p>
          </div>
        </Card>
      </div>

      {/* Die to Zero 每月可花額度提示卡片 */}
      {withdrawalRule === 'die_to_zero' && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 backdrop-blur-md p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in">
          {/* 左側資訊 */}
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-blue-700 bg-blue-100/60 border border-blue-200/50 uppercase tracking-wider">
              ☠️ Die to Zero 財富自由提領指南
            </div>
            <h4 className="text-lg font-black text-slate-800 tracking-tight">
              在 {targetRetirementAge} 歲退休時，您預估可擁有中位數資產 <span className="text-blue-600 font-extrabold">${Math.round(dieToZeroResult.expectedAssetAtRetire).toLocaleString()}</span> 元。
            </h4>
            <p className="text-slate-500 text-xs leading-relaxed max-w-2xl">
              依據您的設定，退休後實質複利報酬率為 <span className="font-bold text-slate-700">{((retirement.expected_return - retirement.inflation) * 100).toFixed(1)}%</span>。以 {retirement.life_expectancy ?? 85} 歲（剩餘 {dieToZeroResult.remainingYears} 年）財產歸零為目標進行年金均攤，退休後您的每月安全花費額度為：
            </p>
            {/* 防呆代價提示 */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-amber-800 bg-amber-500/10 border border-amber-500/20 leading-relaxed max-w-2xl">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
              <span>長壽禦敵警示：Die to Zero 模擬在極端市場下會被動調降提領金額以確保資產至 {retirement.life_expectancy ?? 85} 歲剛好歸零。若遇連續熊市，晚年實質生活水平將顯著下降。</span>
            </div>
          </div>

          {/* 右側大字金額 */}
          <div className="flex flex-col items-center md:items-end justify-center p-4 bg-white/60 rounded-xl border border-white/80 shadow-inner min-w-[240px]">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">實質購買力 / 每月可花費</span>
            <span className="text-3xl font-black text-blue-600 my-1 font-mono tracking-tight">
              ${Math.round(dieToZeroResult.monthlySpending).toLocaleString()} <span className="text-xs text-slate-400 font-sans font-medium">元</span>
            </span>
            <div className="text-center md:text-right mt-1">
              {dieToZeroResult.diffAmount >= 0 ? (
                <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  比預設支出多 ${Math.round(dieToZeroResult.diffAmount).toLocaleString()} 元 (+{dieToZeroResult.diffPercent.toFixed(1)}%) ✨
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                  比預設支出少 ${Math.round(Math.abs(dieToZeroResult.diffAmount)).toLocaleString()} 元 ({Math.abs(dieToZeroResult.diffPercent).toFixed(1)}%) ⚠️
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GK 法則安全護欄指南發光卡片 */}
      {withdrawalRule === 'gk_dynamic' && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-sky-50/30 backdrop-blur-md p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in">
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-blue-700 bg-blue-100/60 border border-blue-200/50 uppercase tracking-wider">
              🛡️ Guyton-Klinger 動態安全護欄防禦線指南
            </div>
            <h4 className="text-lg font-black text-slate-800 tracking-tight">
              初始提領率為 5%，年初始開銷為 <span className="text-blue-600 font-extrabold">${(retirement.monthly_spending * 12).toLocaleString()}</span> 元。
            </h4>
            <p className="text-slate-500 text-xs leading-relaxed max-w-2xl">
              GK 護欄將根據您設定的預期支出，實時精算退休資產波盪中的安全紅線與享樂綠線。當退休後的資產現值跨越臨界點，系統將自動觸發動態提領率調整：
            </p>
          </div>

          <div className="flex gap-4 min-w-[340px]">
            {/* 享樂綠線 */}
            <div className="flex-1 p-3.5 bg-emerald-50/60 border border-emerald-100/80 rounded-xl flex flex-col justify-between">
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">🟢 富裕增領線</span>
              <span className="text-lg font-black text-emerald-700 mt-1 font-mono">
                ${Math.round(1.2 * (retirement.monthly_spending * 12 / 0.05)).toLocaleString()} <span className="text-[10px] font-sans font-medium text-slate-400">元</span>
              </span>
              <p className="text-[8px] text-slate-400 mt-1 leading-normal">
                資產漲過此線，提領率偏低，觸發安全溢出，**自動增領 10%** 提升生活品質。
              </p>
            </div>

            {/* 禦敵紅線 */}
            <div className="flex-1 p-3.5 bg-rose-50/60 border border-rose-100/80 rounded-xl flex flex-col justify-between">
              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">🔴 防禦減領線</span>
              <span className="text-lg font-black text-rose-700 mt-1 font-mono">
                ${Math.round(0.8 * (retirement.monthly_spending * 12 / 0.05)).toLocaleString()} <span className="text-[10px] font-sans font-medium text-slate-400">元</span>
              </span>
              <p className="text-[8px] text-slate-400 mt-1 leading-normal">
                資產跌破此線，面臨歸零威脅，觸發警戒收縮，**自動減領 10%** 避險防空。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CAPE 估值提領指南卡片 */}
      {withdrawalRule === 'cape_based' && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 backdrop-blur-md p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in">
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-blue-700 bg-blue-100/60 border border-blue-200/50 uppercase tracking-wider">
              📈 CAPE 估值連動提領指南
            </div>
            <h4 className="text-lg font-black text-slate-800 tracking-tight">
              當前設定市場席勒本益比為 <span className="text-blue-600 font-extrabold">CAPE {retirement.cape_ratio ?? 30}</span>。
            </h4>
            <p className="text-slate-500 text-xs leading-relaxed max-w-2xl">
              根據席勒 CAPE 提領模型（初始提領率 = 1.5% + 50 / CAPE %），系統為您動態精算出科學的初始提領率。隨後年份此金額將自動隨通膨滾動，極限規避退休初期序列報酬風險：
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end justify-center p-4 bg-white/60 rounded-xl border border-white/80 shadow-inner min-w-[240px]">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">Shiller PE 對應初始提領率</span>
            <span className="text-3xl font-black text-blue-600 my-1 font-mono tracking-tight">
              {(0.015 * 100 + 50 / (retirement.cape_ratio ?? 30)).toFixed(2)}%
            </span>
            <div className="text-center md:text-right mt-1">
              <span className="inline-flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                估值越高，初始提領越保守
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 退休後資產壽命與歸零預估面板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* P5 */}
        <Card className="p-5 border-l-4 border-l-rose-500 bg-rose-50/10 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">🔴 保守極端情況 (P5 軌跡)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-700">
                {fullLifeResult.depletionAgeP5 
                  ? `${fullLifeResult.depletionAgeP5} 歲花光` 
                  : withdrawalRule === 'die_to_zero'
                    ? '🛡️ 被動動態重均攤'
                    : `🛡️ ${retirement.life_expectancy ?? 85}歲前安全無虞`}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
              {fullLifeResult.depletionAgeP5 
                ? `在市場極度低迷情況下，資產預計於退休後 ${fullLifeResult.depletionAgeP5 - targetRetirementAge} 年內耗盡。` 
                : withdrawalRule === 'die_to_zero'
                  ? `💡 極端低迷行情下，資產絕不提前枯竭。但代價是您的生活費會被大盤暴跌【動態腰斬/收縮】，晚年實質生活水平將顯著調降。`
                  : `即使在極端低迷行情下，資產也能安全支撐至 ${retirement.life_expectancy ?? 85} 歲以上不枯竭。`}
            </p>
          </div>
          {/* 其他法則的剛性割肉破產警示 */}
          {fullLifeResult.depletionAgeP5 && withdrawalRule === 'four_percent' ? (
            <div className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/20 mt-3">
              ⚠️ 剛性提領在熊市底部割肉賣股加速枯竭，建議考慮 GK 動態護欄或 CAPE 估值避險。
            </div>
          ) : fullLifeResult.depletionAgeP5 ? (
            <div className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg mt-3 w-fit">
              ⚠️ 長壽風險極高，建議追加儲蓄
            </div>
          ) : withdrawalRule === 'die_to_zero' ? (
            <div className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 mt-3">
              ⚠️ 警惕：成功率 100% 的背後是犧牲生活品質，熊市下每月開銷將極度收縮。
            </div>
          ) : null}
        </Card>

        {/* P50 */}
        <Card className="p-5 border-l-4 border-l-blue-500 bg-blue-50/10 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">🔵 中位期望情況 (P50 軌跡)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-700">
                {fullLifeResult.depletionAgeP50 
                  ? `${fullLifeResult.depletionAgeP50} 歲花光` 
                  : `🛡️ ${retirement.life_expectancy ?? 85}歲前安全無虞`}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              {fullLifeResult.depletionAgeP50 
                ? `符合平均市場表現下，資產預計於退休後 ${fullLifeResult.depletionAgeP50 - targetRetirementAge} 年內花光。` 
                : '平均市場表現下，資產非常安全，完全不會枯竭。'}
            </p>
          </div>
          {fullLifeResult.depletionAgeP50 ? (
            <div className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-lg mt-3 w-fit">
              💡 可延後 3~5 年退休以求資產永續
            </div>
          ) : (
            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg mt-3 w-fit">
              🎉 期望表現下達到財務自由
            </div>
          )}
        </Card>

        {/* P95 */}
        <Card className="p-5 border-l-4 border-l-emerald-500 bg-emerald-50/10 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">🟢 樂觀上游情況 (P95 軌跡)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-700">
                {fullLifeResult.depletionAgeP95 
                  ? `${fullLifeResult.depletionAgeP95} 歲花光` 
                  : `🛡️ ${retirement.life_expectancy ?? 85}歲前安全無虞`}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              {fullLifeResult.depletionAgeP95 
                ? `在市場繁榮的大牛市行情下，資產仍將於 ${fullLifeResult.depletionAgeP95} 歲花光。` 
                : `大牛市行情下，資產將呈爆發性增值，至 ${retirement.life_expectancy ?? 85} 歲仍留有龐大餘額。`}
            </p>
          </div>
          <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg mt-3 w-fit">
            {fullLifeResult.depletionAgeP95 ? '📈 可享有更優渥的生活品質' : '💎 傳承子孫的資產非常豐厚'}
          </div>
        </Card>
      </div>

      {/* 蒙地卡羅資產成長軌跡折線圖 */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-slate-700 text-sm tracking-wide">1,000 次蒙地卡羅資產軌跡預測</h3>
            <p className="text-xs text-slate-400 mt-1">展示保守 (P5)、期望中位 (P50) 及樂觀 (P95) 三種不同機率下的未來資產積累走勢</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">目前帳戶淨資產</span>
            <span className="font-black text-slate-600">${Math.round(currentAsset).toLocaleString()} TWD</span>
          </div>
        </div>

        <div className="h-80 w-full">
          <LineChart 
            data={chartData} 
            xKey="year" 
            lines={linesConfig} 
            height={320}
          />
        </div>
      </Card>

      {/* 各年齡層退休可行性評估 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-700 text-sm tracking-wide">黃金年齡退休可行性評估比較</h3>
          <p className="text-xs text-slate-400 mt-0.5">預先為您試算在 52、55、58、60 歲時分別退休的成功概率與期望中位數資產</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/30">
                <th className="px-6 py-4">目標退休年齡</th>
                <th className="px-6 py-4 text-center">剩餘奮鬥年數</th>
                <th className="px-6 py-4 text-center">蒙地卡羅成功機率</th>
                <th className="px-6 py-4 text-right">期望中位數退休資產</th>
                <th className="px-6 py-4 text-center">可行性評級</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 text-sm font-medium text-slate-600">
              {feasibilityAges.map((item) => {
                let badgeStyle = 'bg-rose-50 border-rose-200 text-rose-600';
                if (item.rating === '🟢 非常可行') {
                  badgeStyle = 'bg-emerald-50 border-emerald-200 text-emerald-600';
                } else if (item.rating === '✅ 可行') {
                  badgeStyle = 'bg-blue-50 border-blue-200 text-blue-600';
                } else if (item.rating === '⚠️ 勉強可行') {
                  badgeStyle = 'bg-amber-50 border-amber-200 text-amber-600';
                }

                return (
                  <tr key={item.age} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{item.age} 歲退休</div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 font-semibold">
                      {item.years} 年
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">
                      {(item.successRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-700">
                      ${Math.round(item.expectedAsset).toLocaleString()} 元
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${badgeStyle}`}>
                        {item.rating}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 🦖 [NEW] 歷史黑天鵝退休生存實測沙盒 */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-slate-100 pb-4 select-none">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              🦖 歷史黑天鵝極端生存實測沙盒 (Crisis Backtest)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              將退休組合帶入真實的歷史慘烈股災，壓力測試在每月剛性提領下能否存活 (唯讀沙盒)
            </p>
          </div>
          <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 flex text-[10px] font-black">
            <button
              onClick={() => setCrisisScenario('tech_2000')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                crisisScenario === 'tech_2000'
                  ? 'bg-white text-rose-600 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ☄️ 2000 科技股破滅
            </button>
            <button
              onClick={() => setCrisisScenario('financial_2008')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                crisisScenario === 'financial_2008'
                  ? 'bg-white text-rose-600 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🌊 2008 全球金融海嘯
            </button>
            <button
              onClick={() => setCrisisScenario('inflation_2022')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                crisisScenario === 'inflation_2022'
                  ? 'bg-white text-rose-600 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🔥 2022 股債雙殺高通膨
            </button>
          </div>
        </div>

        {/* 沙盒配置說明 */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch">
          <div className="xl:col-span-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase tracking-wider block w-fit">
                壓力測試規格
              </span>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-bold">初始退休金：</span>
                  <span className="text-slate-700 font-extrabold">
                    ${(currentAsset > 0 ? currentAsset : 10000000).toLocaleString()} TWD
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-bold">月提領支出：</span>
                  <span className="text-slate-700 font-extrabold">
                    ${retirement.monthly_spending.toLocaleString()} TWD/月
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-bold">配置組合：</span>
                  <span className="text-blue-600 font-black">
                    {currentAsset > 0 ? '當前實際持股佔比' : '目標配置比例'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-bold">提領規則：</span>
                  <span className="text-slate-700 font-extrabold">{ruleDescription.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">通膨保護：</span>
                  <span className="text-emerald-600 font-black">開啟 (逐月調整)</span>
                </div>
              </div>

              {currentAsset === 0 && (
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[9px] font-semibold text-blue-600 leading-normal">
                  💡 提示：偵測到您目前無真實持股，系統自動啟用「目標配置比例」並以 $1,000 萬 TWD 初始金為您進行 10 年危機生存回測。
                </div>
              )}
            </div>

            {/* 生存診斷報告 */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <span className="text-[10px] font-black text-slate-400 block mb-2 tracking-wider">測試生存診斷報告</span>
              {crisisResult.isDepleted ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 space-y-1.5">
                  <h4 className="text-xs font-black flex items-center gap-1">❌ 退休金已消耗枯竭！</h4>
                  <p className="text-[10px] leading-relaxed font-bold">
                    在該危機衝擊下，您的退休金於第 <span className="font-extrabold text-sm">{crisisResult.depletionMonth}</span> 個月 (約第 {Math.ceil((crisisResult.depletionMonth ?? 0)/12)} 年) 宣告歸零，無法安全熬過 10 年考驗！
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-700 space-y-1.5">
                  <h4 className="text-xs font-black flex items-center gap-1">🎉 成功熬過危機考驗！</h4>
                  <p className="text-[10px] leading-relaxed font-bold">
                    您的配置成功抵禦了黑天鵝打擊！歷經 10 年提領，最終仍保有 <span className="font-extrabold text-xs">${crisisResult.finalAsset.toLocaleString()} TWD</span> 的穩健資產餘額！
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 危機折線圖 */}
          <div className="xl:col-span-3 h-80 min-h-[300px]">
            <LineChart 
              data={crisisChartData} 
              xKey="month" 
              lines={crisisLinesConfig} 
              height={320}
              formatYAxis={(val) => {
                if (val >= 10000) {
                  return `$${Math.round(val / 10000)}萬`;
                }
                return `$${val}`;
              }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
