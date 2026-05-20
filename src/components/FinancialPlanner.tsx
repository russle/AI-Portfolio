import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getInterpolatedData, calculateTargetAsset, calculateTargetAssetAnnuity, calculateFutureValue, calculateTotalPrincipal, calculateMaxLoss } from '../utils/formulas';
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
    setIsStressConfirmed,
    withdrawalStrategy,
    setWithdrawalStrategy,
    retirementYears,
    setRetirementYears
  } = useApp();

  const interpolated = getInterpolatedData(stockPercent);
  const r = interpolated.returnRate;
  const drawdown = interpolated.maxDrawdown;

  // 計算實質利率 (名目報酬率 - 2.0% 通膨，且不低於 1.0% 安全下限)
  const rReal = useMemo(() => Math.max(0.01, r - 0.02), [r]);

  // 目標資產計算 (依據不同提領策略)
  const targetAsset = useMemo(() => {
    if (withdrawalStrategy === 'trinity') {
      return calculateTargetAsset(monthlyExpense);
    } else if (withdrawalStrategy === 'guyton_klinger') {
      // GK 初始提領率為 5%
      return (monthlyExpense * 12) / 0.05;
    } else {
      // die_to_zero: 財產歸零，依實質利率年金化逆推
      return calculateTargetAssetAnnuity(monthlyExpense * 12, rReal, retirementYears);
    }
  }, [withdrawalStrategy, monthlyExpense, rReal, retirementYears]);

  const n = useMemo(() => Math.max(0, retireAge - currentAge), [retireAge, currentAge]);

  // 退休前夕未來預估總資產 (名目報酬率累積)
  const futureValue = useMemo(() => {
    return calculateFutureValue(initialPV, annualPMT, r, n);
  }, [initialPV, annualPMT, r, n]);

  // 極端最大虧損
  const maxLoss = useMemo(() => {
    return calculateMaxLoss(futureValue, drawdown);
  }, [futureValue, drawdown]);

  // 財產歸零模式下的提前枯竭年齡計算
  const depletionAge = useMemo(() => {
    if (withdrawalStrategy !== 'die_to_zero') return null;
    let currentActual = futureValue;
    const expenseAnnual = monthlyExpense * 12;
    for (let t = 0; t <= retirementYears; t++) {
      if (currentActual < expenseAnnual && t < retirementYears) {
        return retireAge + t;
      }
      currentActual = Math.max(0, (currentActual - expenseAnnual) * (1 + rReal));
    }
    return null;
  }, [withdrawalStrategy, futureValue, monthlyExpense, retirementYears, retireAge, rReal]);

  // 產生 Recharts 成長折線圖數據
  const chartData = useMemo(() => {
    const data = [];
    if (withdrawalStrategy === 'die_to_zero') {
      // 退休後提領消耗期
      let currentActual = futureValue;
      const expenseAnnual = monthlyExpense * 12;
      
      for (let t = 0; t <= retirementYears; t++) {
        // 基準目標資產軌跡 target_t: 剛好在 retirementYears - t 年內歸零所需的年初資產
        const targetT = calculateTargetAssetAnnuity(expenseAnnual, rReal, retirementYears - t);
        
        data.push({
          year: t,
          age: retireAge + t,
          '安全目標資產軌跡 (萬元)': Math.round(targetT / 10000),
          '實際資產提領軌跡 (萬元)': Math.round(currentActual / 10000)
        });
        
        // 年初提領支出，餘額在年底獲得實質報酬增值，做為下一年年初資產
        currentActual = Math.max(0, (currentActual - expenseAnnual) * (1 + rReal));
      }
    } else {
      // 退休前複利累積期
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
    }
    return data;
  }, [withdrawalStrategy, initialPV, annualPMT, r, n, currentAge, retireAge, futureValue, rReal, retirementYears, monthlyExpense]);

  const isAchieved = futureValue >= targetAsset;
  const assetGap = targetAsset - futureValue;

  const handleConfirmDiscipline = () => {
    setIsStressConfirmed(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B']
    });
  };

  const handleReduceRisk = () => {
    setStockPercent(60);
    setIsStressConfirmed(false);
  };

  const formatWan = (value: number) => {
    return (value / 10000).toLocaleString('zh-TW', { maximumFractionDigits: 0 }) + ' 萬';
  };

  const strategies = [
    { id: 'trinity', name: '4% 法則', desc: '經典被動提領 (Trinity Study)' },
    { id: 'guyton_klinger', name: 'Guyton-Klinger', desc: '動態護欄提領 (GK 規則)' },
    { id: 'die_to_zero', name: 'Die to Zero', desc: '財產歸零法則 (人生最大化)' }
  ];

  return (
    <div className="space-y-8 bg-white text-slate-800 rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-md shadow-slate-100/50">
      {/* 標題與簡介 */}
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
          <Calculator className="w-7 h-7 text-blue-600" />
          模組 B：個人化財務規劃與壓力測試
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          利用多種被動投資提領法則，模擬你的退休目標資產，並動態演算資產消長軌跡。
        </p>
      </div>

      {/* 提領法則策略切換 Tab */}
      <div className="bg-slate-100 p-1 rounded-2xl grid grid-cols-3 gap-1 shadow-inner border border-slate-200/40">
        {strategies.map((strat) => (
          <button
            key={strat.id}
            type="button"
            onClick={() => setWithdrawalStrategy(strat.id as any)}
            className={`py-3 px-2 text-center rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center ${
              withdrawalStrategy === strat.id
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <span className="text-xs sm:text-sm font-bold tracking-tight">{strat.name}</span>
            <span className="text-[9px] opacity-80 hidden sm:block font-medium mt-0.5">{strat.desc}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* 左側：輸入表單 */}
        <div className="space-y-4 lg:col-span-1 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-3">
            <Coins className="w-4 h-4 text-blue-600" />
            財務參數設定
          </h3>

          <div className="space-y-4">
            {/* 年齡輸入 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">目前年齡</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={currentAge || ''}
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-xl px-3 py-2 text-sm font-mono text-slate-800 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">預計退休年齡</label>
                <input
                  type="number"
                  min={currentAge}
                  max="120"
                  value={retireAge || ''}
                  onChange={(e) => setRetireAge(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-xl px-3 py-2 text-sm font-mono text-slate-800 transition-all"
                />
              </div>
            </div>

            {/* 每月生活費 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                退休後每月生活費 (新台幣)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="5000"
                  min="0"
                  value={monthlyExpense || ''}
                  onChange={(e) => setMonthlyExpense(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-xl pl-3 pr-10 py-2 text-sm font-mono text-slate-800 transition-all"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">元</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {withdrawalStrategy === 'trinity' && '以 4% 法則計算，目標總資產約為年支出的 25 倍。'}
                {withdrawalStrategy === 'guyton_klinger' && '以較高的 5% 初始提領率計算，目標總資產約為年支出的 20 倍。'}
                {withdrawalStrategy === 'die_to_zero' && '以實質複利報酬率計算，在預期壽命內提領至剛好歸零。'}
              </p>
            </div>

            {/* 現有單筆投入 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                現有資產單筆投入 (新台幣)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="50000"
                  min="0"
                  value={initialPV || ''}
                  onChange={(e) => setInitialPV(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-xl pl-3 pr-10 py-2 text-sm font-mono text-slate-800 transition-all"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">元</span>
              </div>
            </div>

            {/* 每年持續投入 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                每年預計持續投入 (新台幣)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  min="0"
                  value={annualPMT || ''}
                  onChange={(e) => setAnnualPMT(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-xl pl-3 pr-10 py-2 text-sm font-mono text-slate-800 transition-all"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">元</span>
              </div>
            </div>

            {/* 退休後預期存活年數 (僅在 Die to Zero 模式下顯示，具有平滑滑出效果) */}
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                withdrawalStrategy === 'die_to_zero'
                  ? 'max-h-[180px] opacity-100 mt-4 border-t border-slate-200 pt-4'
                  : 'max-h-0 opacity-0 pointer-events-none mt-0'
              }`}
            >
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-blue-800">
                    退休後預期存活年數
                  </label>
                  <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    {retirementYears} 年 (至 {retireAge + retirementYears} 歲)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={retirementYears}
                    onChange={(e) => setRetirementYears(Number(e.target.value))}
                    className="w-full h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <input
                    type="number"
                    min="10"
                    max="50"
                    value={retirementYears}
                    onChange={(e) => setRetirementYears(Number(e.target.value))}
                    className="w-12 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-lg p-1 text-[11px] font-mono text-slate-800 text-center"
                  />
                </div>
                <p className="text-[9px] text-blue-600/80 leading-normal">
                  系統將依實質年化報酬率 ({ (rReal * 100).toFixed(2) }%) 滾存增值，並在第 {retirementYears} 年歸零。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：計算結果與趨勢圖 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 結果卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 目標資產卡 */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-5 space-y-2 relative overflow-hidden group hover:border-blue-300 transition-all flex flex-col justify-between min-h-[140px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8"></div>
              <div>
                <span className="text-xs font-semibold text-slate-500 tracking-wider">
                  {withdrawalStrategy === 'trinity' && '4%法則 退休目標資產'}
                  {withdrawalStrategy === 'guyton_klinger' && 'GK動態提領 目標資產 (初始 5%)'}
                  {withdrawalStrategy === 'die_to_zero' && 'Die to Zero 退休目標資產'}
                </span>
                <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600 font-mono mt-1">
                  {formatWan(targetAsset)}
                </div>
              </div>
              <div className="text-xs text-slate-500 leading-normal mt-2">
                {withdrawalStrategy === 'trinity' && (
                  <p>
                    以 4% 安全提領率估算，每月可提領 <span className="text-blue-600 font-bold">{monthlyExpense.toLocaleString()} 元</span> 的終身基金。
                  </p>
                )}
                {withdrawalStrategy === 'guyton_klinger' && (
                  <div className="space-y-2">
                    <p>
                      以積極的 5% 初始提領率估算。此策略設有動態安全防禦護欄：
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-1.5 text-center">
                        <span className="block text-[9px] text-emerald-600 font-bold">富裕增領護欄 (+20%)</span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">{formatWan(targetAsset * 1.2)}</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-1.5 text-center">
                        <span className="block text-[9px] text-amber-600 font-bold">防禦減領護欄 (-20%)</span>
                        <span className="text-xs font-bold text-amber-700 font-mono">{formatWan(targetAsset * 0.8)}</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight">
                      資產高於富裕護欄可多提領 10%；低於防禦護欄需防禦減領 10% 以防斷炊。
                    </p>
                  </div>
                )}
                {withdrawalStrategy === 'die_to_zero' && (
                  <p>
                    將本金消耗年金化。在實質複利報酬率下，至 <span className="text-blue-600 font-bold">{retireAge + retirementYears} 歲</span> 時資產將完美歸零，將一生積蓄最大化利用。
                  </p>
                )}
              </div>
            </div>

            {/* 預估累積資產卡 */}
            <div className={`bg-slate-50/50 rounded-2xl border p-5 space-y-2 relative overflow-hidden transition-all hover:shadow-sm flex flex-col justify-between min-h-[140px] ${
              isAchieved ? 'border-emerald-200 bg-emerald-50/10 hover:border-emerald-300' : 'border-rose-200 bg-rose-50/10 hover:border-rose-300'
            }`}>
              <div>
                <span className="text-xs font-semibold text-slate-500 tracking-wider">預估退休資產 (含複利)</span>
                <div className={`text-3xl font-extrabold font-mono mt-1 ${
                  isAchieved ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatWan(futureValue)}
                </div>
              </div>
              <div className="text-xs mt-2">
                {isAchieved ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" /> 已達標！超出目標 {formatWan(futureValue - targetAsset)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-600 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> 資金缺口：{formatWan(assetGap)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recharts 折線圖 */}
          <div className="bg-slate-50/30 border border-slate-200/80 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {withdrawalStrategy === 'die_to_zero' ? '退休資產提領與歸零軌跡 (退休後)' : '資產複利增長趨勢 (退休前)'}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200 w-fit">
                {withdrawalStrategy === 'die_to_zero'
                  ? `提領期: ${retirementYears} 年 (實質年化 ${ (rReal * 100).toFixed(2) }%)`
                  : `投資年期: ${n} 年 (預估年化 ${ (r * 100).toFixed(2) }%)`
                }
              </span>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="age" stroke="#64748b" fontSize={11} className="font-mono" />
                  <YAxis stroke="#64748b" fontSize={11} className="font-mono" unit=" W" />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                    labelStyle={{ color: '#64748b', fontWeight: 'bold' }}
                    itemStyle={{ color: '#1e293b', fontFamily: 'monospace' }}
                    formatter={(value, name) => [`${value} 萬元`, name]}
                    labelFormatter={(label) => `年齡: ${label} 歲`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  {withdrawalStrategy === 'die_to_zero' ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="安全目標資產軌跡 (萬元)"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="實際資產提領軌跡 (萬元)"
                        stroke="#6366F1"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </>
                  ) : (
                    <>
                      <Line
                        type="monotone"
                        dataKey="累積投入本金 (萬元)"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="含複利資產總額 (萬元)"
                        stroke="#2563EB"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Die to Zero 模式下提前枯竭的警告 */}
            {withdrawalStrategy === 'die_to_zero' && depletionAge !== null && (
              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 flex items-start gap-3 mt-2 animate-pulse">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800">⚠️ 退休資產提前枯竭警告</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5 leading-normal">
                    以你目前的預估退休資產 <span className="font-bold">{formatWan(futureValue)}</span>，在退休後第 <span className="font-bold">{depletionAge - retireAge} 年</span>（約 <span className="font-bold">{depletionAge} 歲</span>）時，資產將提前耗盡，無法支應後續的年度生活開支。建議增加每年投入、延後退休，或調降退休後月生活費。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 模組 B2：心理壓力測試警示系統 */}
      {stockPercent >= 70 && (
        <div className="transition-all duration-300">
          {isStressConfirmed ? (
            /* 已確認承受風險 */
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">已確認承受波動風險</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    您已確認理解並願意堅守長期投資紀律，能在類似金融海嘯的極端波動中不恐慌拋售。這是長期獲取豐厚複利最關鍵的心理建設！
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsStressConfirmed(false)}
                className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-sm"
              >
                重設壓力評估
              </button>
            </div>
          ) : (
            /* 未確認，跳出警示卡片 */
            <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-6 space-y-4 shadow-md">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-100 text-rose-700 rounded-xl border border-rose-200 shrink-0">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-md font-bold text-rose-800 tracking-tight flex items-center gap-1.5">
                    ⚠️ 極端市場心理壓力測試
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    由於您當前的配置中，**股票比例高達 {stockPercent}%**，屬於高風險組合。當未來面臨類似 2008 年的金融海嘯（股市大跌 50%）時，您的資產在退休前夕可能會面臨高達{' '}
                    <span className="text-rose-600 font-extrabold text-sm font-mono">
                      {formatWan(Math.abs(maxLoss))}
                    </span>{' '}
                    的帳面虧損！
                  </p>
                </div>
              </div>

              <div className="border-t border-rose-100 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                <span className="text-[11px] text-slate-500 mr-auto">
                  * 帳面最大虧損額係以退休前夕總額乘以模擬最大跌幅 {Math.abs(drawdown * 100).toFixed(0)}% 得出。
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleReduceRisk}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:scale-[1.02] active:scale-95 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                  >
                    不，幫我調高債券比重以降低風險
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleConfirmDiscipline}
                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
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
