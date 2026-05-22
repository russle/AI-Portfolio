import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Gauge } from '../components/Gauge';
import { LineChart } from '../components/LineChart';
import { AlertBanner } from '../components/AlertBanner';
import { runMonteCarloSimulation as runMonteCarlo, assessRetirementFeasibility as assessFeasibility } from '../utils/retirement';

export const RetirementPage: React.FC = () => {
  const { state, updateRetirementConfig } = useApp();
  const { portfolio, retirement } = state;

  // 使用者可手動輸入與調整退休年限與提領法則
  const [targetRetirementAge, setTargetRetirementAge] = useState<number>(60);
  const [withdrawalRule, setWithdrawalRule] = useState<'four_percent' | 'gk_dynamic' | 'die_to_zero'>('four_percent');

  // 全球股市說明：股債配置是以全球股市來估算
  const globalMarketNote = "本系統之股債配置預估報酬率，是以全球股市（例如 MSCI ACWI 指數）及全球債券市場之長期歷史年化回報率為估算基礎。全球股市在過去數十年間的年化回報率約為 7%~8%，投資組合會依據您的股債比例調和出對應的預期報酬率。";

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
      case 'die_to_zero':
        return {
          title: 'Die to Zero (花光為止法則)',
          desc: '以「死前剛好把錢花光」為目標。規劃在預期壽命（假設為 85 歲）結束時，資產剛好歸零。此提領法則旨在最大化人生在世時的財富使用效率，將財富轉換為人生體驗。',
          detail: '優點：退休期間可享有更高的生活水平；缺點：如果活得比預期長，會面臨晚年無錢可用的「長壽風險」。'
        };
      default:
        return { title: '', desc: '', detail: '' };
    }
  }, [withdrawalRule]);

  // 執行蒙地卡羅模擬
  // 我們可以使用隨機模擬來計算退休前資產積累，並且在折線圖上渲染
  const monteCarloResult = useMemo(() => {
    // 預設標準差 15%
    return runMonteCarlo(
      currentAsset,
      retirement.monthly_invest,
      simulationYears,
      retirement.expected_return,
      0.15, // std
      retirement.inflation,
      fireTarget
    );
  }, [currentAsset, retirement.monthly_invest, simulationYears, retirement.expected_return, retirement.inflation, fireTarget]);

  // 將蒙地卡羅結果轉換成 Recharts 格式
  const chartData = useMemo(() => {
    const data = [];
    const yearsArray = monteCarloResult.yearsArray;
    const p5 = monteCarloResult.p5;
    const p50 = monteCarloResult.p50;
    const p95 = monteCarloResult.p95;

    for (let i = 0; i < yearsArray.length; i++) {
      data.push({
        year: `第 ${yearsArray[i]} 年`,
        p5: p5[i],
        p50: p50[i],
        p95: p95[i],
      });
    }
    return data;
  }, [monteCarloResult]);

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
            value={monteCarloResult.successRate} 
            title={`${targetRetirementAge} 歲退休成功機率`} 
          />
          <div className="text-center mt-2 max-w-xs">
            <p className="text-xs text-slate-400 leading-relaxed">
              在 {simulationYears} 年的累積期中，經過 1000 次隨機複利演算，有 <span className="font-bold text-slate-600">{(monteCarloResult.successRate * 100).toFixed(0)}%</span> 的軌跡最終累積資產超越了目標金額。
            </p>
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
    </div>
  );
};
