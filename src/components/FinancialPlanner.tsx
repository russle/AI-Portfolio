import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getInterpolatedData, calculateTargetAsset, calculateFutureValue, calculateTotalPrincipal, calculateMaxLoss } from '../utils/formulas';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calculator, AlertTriangle, ShieldAlert, Sparkles, CheckCircle2, ChevronRight, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';

export const FinancialPlanner: React.FC = () => {
  const {
    stockPercent,
    setStockPercent,
    currentAge,
    setCurrentAge,
    retireAge,
    setRetireAge,
    monthlyExpense,
    setMonthlyExpense,
    initialPV,
    setInitialPV,
    annualPMT,
    setAnnualPMT,
    isStressConfirmed,
    setIsStressConfirmed
  } = useApp();

  const interpolated = getInterpolatedData(stockPercent);
  const r = interpolated.returnRate;
  const drawdown = interpolated.maxDrawdown;

  // 4% 法則逆推目標金額
  const targetAsset = useMemo(() => calculateTargetAsset(monthlyExpense), [monthlyExpense]);
  const n = useMemo(() => Math.max(0, retireAge - currentAge), [retireAge, currentAge]);

  // 未來總資產
  const futureValue = useMemo(() => {
    return calculateFutureValue(initialPV, annualPMT, r, n);
  }, [initialPV, annualPMT, r, n]);

  // 極端最大虧損
  const maxLoss = useMemo(() => {
    return calculateMaxLoss(futureValue, drawdown);
  }, [futureValue, drawdown]);

  // 產生 Recharts 成長折線圖數據
  const chartData = useMemo(() => {
    const data = [];
    // 限制最大迴圈年份在 100 年，以防極端輸入導致瀏覽器當掉
    const limitN = Math.min(100, n);
    for (let t = 0; t <= limitN; t++) {
      const principal = calculateTotalPrincipal(initialPV, annualPMT, t);
      const fv = calculateFutureValue(initialPV, annualPMT, r, t);
      data.push({
        year: t,
        age: currentAge + t,
        '累積投入本金 (萬元)': Math.round(principal / 10000),
        '含複利資產總額 (萬元)': Math.round(fv / 10000)
      });
    }
    return data;
  }, [initialPV, annualPMT, r, n, currentAge]);

  const isAchieved = futureValue >= targetAsset;
  const assetGap = targetAsset - futureValue;

  const handleConfirmDiscipline = () => {
    setIsStressConfirmed(true);
    // 撒花慶祝！
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B']
    });
  };

  const handleReduceRisk = () => {
    // 一鍵降低風險：調高債券比重至 60% 股 / 40% 債
    setStockPercent(60);
    setIsStressConfirmed(false);
  };

  // 格式化為台幣萬元
  const formatWan = (value: number) => {
    return (value / 10000).toLocaleString('zh-TW', { maximumFractionDigits: 0 }) + ' 萬';
  };

  return (
    <div className="space-y-8 bg-slate-900 text-slate-100 rounded-3xl p-6 lg:p-8 border border-slate-800 shadow-2xl">
      {/* 標題與簡介 */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">
          <Calculator className="w-7 h-7 text-emerald-400" />
          模組 B：個人化財務規劃與壓力測試
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          利用「4% 退養法則」逆推你的退休目標資產，並動態演算未來的複利資產成長。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* 左側：輸入表單 */}
        <div className="space-y-4 lg:col-span-1 bg-slate-850/60 p-5 rounded-2xl border border-slate-800/80">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-3">
            <Coins className="w-4 h-4 text-emerald-400" />
            財務參數設定
          </h3>

          <div className="space-y-4">
            {/* 年齡輸入 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">目前年齡</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={currentAge || ''}
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/50 focus:outline-none rounded-xl px-3 py-2 text-sm font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">預計退休年齡</label>
                <input
                  type="number"
                  min={currentAge}
                  max="120"
                  value={retireAge || ''}
                  onChange={(e) => setRetireAge(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/50 focus:outline-none rounded-xl px-3 py-2 text-sm font-mono text-slate-200"
                />
              </div>
            </div>

            {/* 每月生活費 */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                退休後每月生活費 (新台幣)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="5000"
                  min="0"
                  value={monthlyExpense || ''}
                  onChange={(e) => setMonthlyExpense(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/50 focus:outline-none rounded-xl pl-3 pr-10 py-2 text-sm font-mono text-slate-200"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">元</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                目標總資產將以此金額的 25 倍 (4% 法則) 計算。
              </p>
            </div>

            {/* 現有單筆投入 */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                現有資產單筆投入 (新台幣)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="50000"
                  min="0"
                  value={initialPV || ''}
                  onChange={(e) => setInitialPV(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/50 focus:outline-none rounded-xl pl-3 pr-10 py-2 text-sm font-mono text-slate-200"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">元</span>
              </div>
            </div>

            {/* 每年持續投入 */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                每年預計持續投入 (新台幣)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  min="0"
                  value={annualPMT || ''}
                  onChange={(e) => setAnnualPMT(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/50 focus:outline-none rounded-xl pl-3 pr-10 py-2 text-sm font-mono text-slate-200"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">元</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：計算結果與趨勢圖 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 結果卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 目標資產卡 */}
            <div className="bg-slate-800/40 rounded-2xl border border-slate-800 p-5 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full -mr-8 -mt-8"></div>
              <span className="text-xs font-semibold text-slate-400 tracking-wider">4%法則 退休目標資產</span>
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400 font-mono">
                {formatWan(targetAsset)}
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                以 4% 安全提領率估算，每月可提領 <span className="text-emerald-400 font-semibold">{monthlyExpense.toLocaleString()} 元</span> 的終身基金。
              </p>
            </div>

            {/* 預估累積資產卡 */}
            <div className={`bg-slate-800/40 rounded-2xl border p-5 space-y-2 relative overflow-hidden transition-all ${
              isAchieved ? 'border-emerald-500/20' : 'border-rose-500/20'
            }`}>
              <span className="text-xs font-semibold text-slate-400 tracking-wider">預估退休資產 (含複利)</span>
              <div className={`text-3xl font-extrabold font-mono ${
                isAchieved ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatWan(futureValue)}
              </div>
              <div className="text-xs">
                {isAchieved ? (
                  <span className="flex items-center gap-1 text-emerald-400/90 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" /> 已達標！超出目標 {formatWan(futureValue - targetAsset)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400/90 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> 資金缺口：{formatWan(assetGap)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recharts 折線圖 */}
          <div className="bg-slate-850/40 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">資產複利增長趨勢</span>
              <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 bg-slate-800 rounded-full border border-slate-800">
                投資年期: {n} 年 (年化 { (r * 100).toFixed(2) }%)
              </span>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="age" stroke="#64748b" fontSize={11} className="font-mono" />
                  <YAxis stroke="#64748b" fontSize={11} className="font-mono" unit=" W" />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    itemStyle={{ fontFamily: 'monospace' }}
                    formatter={(value) => [`${value} 萬元`]}
                    labelFormatter={(label) => `年齡: ${label} 歲`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="累積投入本金 (萬元)"
                    stroke="#475569"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="含複利資產總額 (萬元)"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 模組 B2：心理壓力測試警示系統 */}
      {stockPercent >= 70 && (
        <div className="transition-all duration-300">
          {isStressConfirmed ? (
            /* 已確認承受風險 */
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-400">已確認承受波動風險</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    您已確認理解並願意堅守長期投資紀律，能在類似金融海嘯的極端波動中不恐慌拋售。這是長期獲取豐厚複利最關鍵的心理建設！
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsStressConfirmed(false)}
                className="px-4 py-2 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-slate-100 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                重設壓力評估
              </button>
            </div>
          ) : (
            /* 未確認，跳出警示卡片 */
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shrink-0">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-md font-bold text-rose-400 tracking-tight flex items-center gap-1.5">
                    ⚠️ 極端市場心理壓力測試
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pt-1">
                    由於您當前的配置中，**股票比例高達 {stockPercent}%**，屬於高風險組合。當未來面臨類似 2008 年的金融海嘯（股市大跌 50%）時，您的資產在退休前夕可能會面臨高達{' '}
                    <span className="text-rose-400 font-extrabold text-sm font-mono">
                      {formatWan(Math.abs(maxLoss))}
                    </span>{' '}
                    的帳面虧損！
                  </p>
                </div>
              </div>

              <div className="border-t border-rose-950/50 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                <span className="text-[11px] text-slate-400 mr-auto">
                  * 帳面最大虧損額係以退休前夕總額乘以模擬最大跌幅 {Math.abs(drawdown * 100).toFixed(0)}% 得出。
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleReduceRisk}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-sky-500 hover:scale-[1.02] active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                  >
                    不，幫我調高債券比重以降低風險
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleConfirmDiscipline}
                    className="px-4 py-2 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-slate-100 rounded-xl transition-all cursor-pointer"
                  >
                    是的，我能堅守紀律
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
