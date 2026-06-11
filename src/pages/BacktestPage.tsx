import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { MetricCards } from '../components/MetricCards';
import { CrisisTable } from '../components/CrisisTable';
import { RollingResults } from '../components/RollingResults';
import { BacktestParams } from '../components/BacktestParams';
import { runBacktest, runRollingBacktest } from '../utils/backtest';
import type { BacktestResult, RollingBacktestResult } from '../utils/backtest';
import { 
  TrendingUp, 
  RefreshCw, 
  AlertTriangle, 
  History, 
  Sparkles, 
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Label
} from 'recharts';

export const BacktestPage: React.FC = () => {
  const { state } = useApp();
  const { allocation_target, portfolio } = state;

  // 1. 回測模擬參數狀態
  const [range, setRange] = useState<'1y' | '3y' | '5y' | '10y'>('10y');
  const [initialAmount, setInitialAmount] = useState<number>(1000000);
  const [monthlyInvest, setMonthlyInvest] = useState<number>(20000);
  const [rebalanceFreq, setRebalanceFreq] = useState<'none' | 'monthly' | 'yearly'>('yearly');

  // 自定義代表標的 (預設值)
  const [symbols, setSymbols] = useState({
    tw_stock: '0050.TW',
    us_stock: 'VT',
    fund: 'BND',
    crypto: 'BTC-USD'
  });

  const [backtestMode, setBacktestMode] = useState<'single' | 'rolling'>('single');
  const [windowMonths, setWindowMonths] = useState<number>(84);
  const [stepMonths, setStepMonths] = useState<number>(3);
  const [rollingResult, setRollingResult] = useState<RollingBacktestResult | null>(null);

  // 動態精算當前真實持股的大類佔比
  const actualAllocation = useMemo(() => {
    const holdings = portfolio.holdings || [];
    const cash = portfolio.cash || 0;
    const usdRate = portfolio.usdRate ?? 32.2;
    
    let twStockVal = 0;
    let usStockVal = 0;
    let fundVal = 0;
    let cryptoVal = 0;
    
    holdings.forEach(h => {
      const priceTwd = h.currency === 'USD' ? h.currentPrice * usdRate : h.currentPrice;
      const val = Math.round(h.shares * priceTwd);
      
      if (h.assetType === 'tw_stock') twStockVal += val;
      else if (h.assetType === 'us_stock') usStockVal += val;
      else if (h.assetType === 'fund') fundVal += val;
      else if (h.assetType === 'crypto') cryptoVal += val;
    });
    
    const totalVal = twStockVal + usStockVal + fundVal + cryptoVal + cash;
    
    if (totalVal === 0) {
      return null;
    }
    
    return {
      tw_stock: twStockVal / totalVal,
      us_stock: usStockVal / totalVal,
      bond: fundVal / totalVal,
      cash: cash / totalVal,
      crypto: cryptoVal / totalVal
    };
  }, [portfolio.holdings, portfolio.cash, portfolio.usdRate]);

  // 2. 回測結果狀態
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 執行回測模擬
  const executeBacktest = async (
    targetRange = range,
    targetInitial = initialAmount,
    targetMonthly = monthlyInvest,
    targetFreq = rebalanceFreq
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      // 延遲 500ms，以展現高質感的骨架屏載入動畫，避免切換時過於生硬
      await new Promise((resolve) => setTimeout(resolve, 550));

      const actualAllocParam = (portfolio.isHoldingMode && actualAllocation) ? actualAllocation : undefined;

      if (backtestMode === 'rolling') {
        const targetRange = range === '1y' || range === '3y' ? '5y' : range;
        const res = await runRollingBacktest(
          allocation_target,
          symbols,
          targetRange as '5y' | '10y',
          targetInitial,
          targetMonthly,
          targetFreq,
          windowMonths,
          stepMonths
        );
        setRollingResult(res);
        setBacktestResult(null);
      } else {
        const res = await runBacktest(
          allocation_target,
          symbols,
          targetRange,
          targetInitial,
          targetMonthly,
          targetFreq,
          actualAllocParam
        );
        setBacktestResult(res);
        setRollingResult(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '回測執行失敗，請檢查標的代號或網路連線！');
    } finally {
      setIsLoading(false);
    }
  };

  // 切換回測模式時，清除另一模式的結果
  const handleSetBacktestMode = (mode: 'single' | 'rolling') => {
    setBacktestMode(mode);
    if (mode === 'single') {
      setRollingResult(null);
    } else {
      setBacktestResult(null);
    }
  };

  // 元件載入時，自動觸發第一次回測模擬
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    executeBacktest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocation_target, portfolio.isHoldingMode, actualAllocation]); // 當全域配置或真實持股改變時重算

  // 格式化 Y 軸數值 (萬 / 億)
  const formatYAxis = (val: number) => {
    if (val >= 100000000) {
      return `$${(val / 100000000).toFixed(1)}億`;
    }
    if (val >= 10000) {
      return `$${Math.round(val / 10000)}萬`;
    }
    return `$${val}`;
  };

  // 格式化金額顯示
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // 目標配置總比例顯示 (輔助驗證)
  const targetAllocationSum = useMemo(() => {
    return (
      allocation_target.tw_stock +
      allocation_target.us_stock +
      allocation_target.bond +
      allocation_target.crypto +
      allocation_target.cash
    );
  }, [allocation_target]);

  return (
    <div className="space-y-8 animate-fade-in duration-300">
      
      {/* 標題與簡介 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/20 text-xs font-bold text-blue-300">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              全新回測功能上線
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <History className="w-8 h-8 text-blue-400 stroke-[2.5]" />
              歷史回測與配置績效看板
            </h2>
            <p className="text-slate-300 text-xs md:text-sm font-medium max-w-2xl leading-relaxed">
              基於真實歷史月度數據，精算您的「自選資產配置組合」對決「100% 台股基準對照組 (0050.TW)」在各大金融危機期間的防禦防護能力，驗證長線定期定額與再平衡的複利威力。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">目前配置總重</div>
                <div className="text-lg font-black font-mono text-emerald-400">
                  {Math.round(targetAllocationSum * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主配置網格 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左欄：回測控制面板 */}
        <div className="space-y-6 lg:col-span-1">
          <BacktestParams
            range={range}
            setRange={setRange}
            initialAmount={initialAmount}
            setInitialAmount={setInitialAmount}
            monthlyInvest={monthlyInvest}
            setMonthlyInvest={setMonthlyInvest}
            rebalanceFreq={rebalanceFreq}
            setRebalanceFreq={setRebalanceFreq}
            symbols={symbols}
            setSymbols={setSymbols}
            backtestMode={backtestMode}
            setBacktestMode={handleSetBacktestMode}
            windowMonths={windowMonths}
            setWindowMonths={setWindowMonths}
            stepMonths={stepMonths}
            setStepMonths={setStepMonths}
            targetAllocationSum={targetAllocationSum}
            executeBacktest={executeBacktest}
            isLoading={isLoading}
          />
        </div>

        {/* 右欄：圖表與績效發光牆 */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 錯誤橫幅 */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200/50 rounded-2xl flex items-start gap-3 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold">回測模擬出錯</h4>
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* 績效指標發光牆 */}
          <MetricCards
            isLoading={isLoading}
            backtestResult={backtestResult}
            formatYAxis={formatYAxis}
          />

          {/* 圖表卡片 */}
          <Card hoverEffect={false} className="bg-white/80 border border-slate-200/60 p-6 rounded-3xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  資產增值與累積投入走勢對照
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  曲線代表各配置本利和走勢，陰影區為累計投入本金，可檢視是否能穿越三大金融危機。
                </p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-slate-600">我的配置組合</span>
                </span>
                {portfolio.isHoldingMode && actualAllocation && (
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-slate-600">當前真實持股組合</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span className="text-slate-600">對照組 (100% 台股)</span>
                </span>
              </div>
            </div>

            {isLoading ? (
              // 骨架屏載入動畫
              <div className="w-full h-[350px] flex flex-col justify-between select-none animate-pulse">
                <div className="w-full h-[300px] bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2 mr-2" />
                  正在拉取數據並進行高擬真複利模擬...
                </div>
                <div className="h-4 bg-slate-100 rounded w-full mt-4"></div>
              </div>
            ) : backtestResult ? (
              <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={backtestResult.history}
                    margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="grad-portfolio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="grad-actual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="grad-benchmark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="grad-invested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e2e8f0" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#e2e8f0" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />

                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 'bold' }}
                      dy={8}
                      minTickGap={25}
                    />

                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 'bold' }}
                      tickFormatter={formatYAxis}
                      dx={-8}
                    />

                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        borderRadius: '16px',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        boxShadow: '0 10px 25px -5px rgba(148, 163, 184, 0.15)',
                        backdropFilter: 'blur(8px)',
                        padding: '12px'
                      }}
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '10px', fontWeight: 'extrabold', color: '#94a3b8', marginBottom: '6px' }}
                      formatter={(value, name) => {
                        if (value === undefined) return ['', name];
                        const formattedVal = formatCurrency(Number(value));
                        if (name === 'portfolioValue') return [formattedVal, '配置組合本利和'];
                        if (name === 'actualValue') return [formattedVal, '當前真實持股本利和'];
                        if (name === 'benchmarkValue') return [formattedVal, '對照組本利和'];
                        if (name === 'totalInvested') return [formattedVal, '累計投入本金'];
                        return [formattedVal, name];
                      }}
                    />

                    {/* 繪製 2018 貿易戰垂直虛線 */}
                    <ReferenceLine 
                      x="2018-10" 
                      stroke="#ef4444" 
                      strokeDasharray="3 3" 
                      strokeWidth={1.5}
                    >
                      <Label 
                        value="18貿易戰" 
                        fill="#f43f5e" 
                        position="insideTopLeft" 
                        fontSize={8} 
                        fontWeight="black" 
                        offset={4}
                      />
                    </ReferenceLine>

                    {/* 繪製 2020 新冠崩盤垂直虛線 */}
                    <ReferenceLine 
                      x="2020-03" 
                      stroke="#ef4444" 
                      strokeDasharray="3 3" 
                      strokeWidth={1.5}
                    >
                      <Label 
                        value="20新冠崩盤" 
                        fill="#f43f5e" 
                        position="insideTopLeft" 
                        fontSize={8} 
                        fontWeight="black" 
                        offset={4}
                      />
                    </ReferenceLine>

                    {/* 繪製 2022 股債雙殺垂直虛線 */}
                    <ReferenceLine 
                      x="2022-09" 
                      stroke="#ef4444" 
                      strokeDasharray="3 3" 
                      strokeWidth={1.5}
                    >
                      <Label 
                        value="22股債雙殺" 
                        fill="#f43f5e" 
                        position="insideTopLeft" 
                        fontSize={8} 
                        fontWeight="black" 
                        offset={4}
                      />
                    </ReferenceLine>

                    {/* 累計投入本金 (最下層陰影) */}
                    <Area
                      type="monotone"
                      dataKey="totalInvested"
                      stroke="#cbd5e1"
                      strokeWidth={1.5}
                      fill="url(#grad-invested)"
                      dot={false}
                      activeDot={false}
                    />

                    {/* 對照組走勢 */}
                    <Area
                      type="monotone"
                      dataKey="benchmarkValue"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      fill="url(#grad-benchmark)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#94a3b8' }}
                    />

                    {/* 當前真實持股走勢 (有數據時繪製) */}
                    {portfolio.isHoldingMode && actualAllocation && backtestResult?.metrics.actual && (
                      <Area
                        type="monotone"
                        dataKey="actualValue"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        fill="url(#grad-actual)"
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0, fill: '#f59e0b' }}
                      />
                    )}

                    {/* 配置組合走勢 */}
                    <Area
                      type="monotone"
                      dataKey="portfolioValue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#grad-portfolio)"
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                請點選左側「開始歷史回測模擬」以取得高精度報告。
              </div>
            )}
          </Card>

        </div>

        {/* 滾動回測結果 */}
        {rollingResult && (
          <RollingResults
            rollingResult={rollingResult}
            windowMonths={windowMonths}
            stepMonths={stepMonths}
          />
        )}
      </div>

      {/* 下方：重大危機壓力測試對決看板 */}
      <CrisisTable
        crisisMetrics={backtestResult?.crisisMetrics ?? []}
        range={range}
      />

    </div>
  );
};
