import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { runBacktest, CRISIS_EVENTS } from '../utils/backtest';
import type { BacktestResult } from '../utils/backtest';
import { 
  Play, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  History, 
  Sparkles, 
  ShieldAlert, 
  Layers,
  CheckCircle,
  HelpCircle,
  Coins
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

      const res = await runBacktest(
        allocation_target,
        symbols,
        targetRange,
        targetInitial,
        targetMonthly,
        targetFreq,
        actualAllocParam // 傳入真實配置大類佔比
      );
      setBacktestResult(res);
    } catch (err: any) {
      setError(err?.message || '回測執行失敗，請檢查標的代號或網路連線！');
    } finally {
      setIsLoading(false);
    }
  };

  // 元件載入時，自動觸發第一次回測模擬
  useEffect(() => {
    executeBacktest();
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
          <Card className="sticky top-20 bg-white/80 border border-slate-200/60 p-6 rounded-2xl shadow-xl">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldAlert className="w-4.5 h-4.5 text-blue-600" />
              回測模擬參數
            </h3>

            <div className="space-y-5">
              {/* 回測區間選擇 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2.5">
                  回測時間長度
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {(['1y', '3y', '5y', '10y'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setRange(r);
                        executeBacktest(r);
                      }}
                      className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        range === r
                          ? 'bg-white text-blue-600 shadow-md scale-[1.02]'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* 初始資金 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2 flex justify-between">
                  <span>初始投資金額</span>
                  <span className="text-blue-600 font-mono font-bold">{formatCurrency(initialAmount)}</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    placeholder="例如: 1000000"
                  />
                </div>
              </div>

              {/* 每月定期定額 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2 flex justify-between">
                  <span>每月定期定額投入</span>
                  <span className="text-blue-600 font-mono font-bold">{formatCurrency(monthlyInvest)}</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    value={monthlyInvest}
                    onChange={(e) => setMonthlyInvest(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    placeholder="例如: 20000"
                  />
                </div>
              </div>

              {/* 再平衡頻率 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2.5">
                  資產再平衡頻率
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {[
                    { key: 'none', label: '不進行' },
                    { key: 'monthly', label: '每月' },
                    { key: 'yearly', label: '每年' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setRebalanceFreq(item.key as any)}
                      className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        rebalanceFreq === item.key
                          ? 'bg-white text-blue-600 shadow-md scale-[1.02]'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[9px] text-slate-400 font-medium">
                  💡 再平衡將定期強制賣出超漲、買入超跌資產，將配置拉回設定目標比例。
                </p>
              </div>

              {/* 代表標的自定義設定 */}
              <div className="p-4 bg-slate-50/80 border border-slate-200/50 rounded-xl space-y-3">
                <div className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-slate-400" />
                  各大類代表標的 (Yahoo Finance 代號)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">台股代號</label>
                    <input
                      type="text"
                      value={symbols.tw_stock}
                      onChange={(e) => setSymbols(prev => ({ ...prev, tw_stock: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">美股代號</label>
                    <input
                      type="text"
                      value={symbols.us_stock}
                      onChange={(e) => setSymbols(prev => ({ ...prev, us_stock: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">基金/債券代號</label>
                    <input
                      type="text"
                      value={symbols.fund}
                      onChange={(e) => setSymbols(prev => ({ ...prev, fund: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">加密貨幣代號</label>
                    <input
                      type="text"
                      value={symbols.crypto}
                      onChange={(e) => setSymbols(prev => ({ ...prev, crypto: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold font-mono focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[8px] text-slate-400 leading-normal">
                  * 預設標的包含完整 10 年離線備份，輸入自訂代號時若遇 CORS 限制，將自動無感啟用高精度離線 fallback，保證系統流暢穩定。
                </p>
              </div>

              {/* 執行按鈕 */}
              <button
                onClick={() => executeBacktest()}
                disabled={isLoading}
                className={`w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  isLoading ? 'opacity-85 pointer-events-none' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    正在運算複雜回測中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    開始歷史回測模擬
                  </>
                )}
              </button>

            </div>
          </Card>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* 卡片 1: 最終資產 */}
            <Card hoverEffect={false} className="bg-gradient-to-b from-blue-50/40 to-white border-blue-100/50 p-4 rounded-2xl">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">最終資產總值</div>
              {isLoading ? (
                <div className="h-6 bg-slate-200 rounded w-28 animate-pulse mt-2"></div>
              ) : (
                <div className="mt-1.5">
                  <div className="text-base font-black font-mono text-blue-600">
                    {backtestResult ? formatYAxis(backtestResult.metrics.portfolio.finalValue) : '$-'}
                  </div>
                  {backtestResult?.metrics.actual && (
                    <div className="text-[9px] font-bold text-amber-500 mt-0.5 font-mono">
                      真實持股: {formatYAxis(backtestResult.metrics.actual.finalValue)}
                    </div>
                  )}
                  <div className="text-[9px] font-bold text-slate-400 mt-1">
                    投入: {backtestResult ? formatYAxis(backtestResult.metrics.portfolio.totalInvested) : '-'}
                  </div>
                </div>
              )}
            </Card>

            {/* 卡片 2: 年化報酬率 (CAGR) */}
            <Card hoverEffect={false} className="bg-gradient-to-b from-emerald-50/40 to-white border-emerald-100/50 p-4 rounded-2xl">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">年化報酬率 (CAGR)</div>
              {isLoading ? (
                <div className="h-6 bg-slate-200 rounded w-16 animate-pulse mt-2"></div>
              ) : (
                <div className="mt-1.5">
                  <div className="text-lg font-black font-mono text-emerald-600 flex items-center gap-0.5">
                    {backtestResult ? `${backtestResult.metrics.portfolio.cagr}%` : '-%'}
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  {backtestResult?.metrics.actual && (
                    <div className="text-[9px] font-bold text-amber-500 mt-0.5 font-mono">
                      真實持股: {backtestResult.metrics.actual.cagr}%
                    </div>
                  )}
                  <div className="text-[9px] font-bold text-slate-400 mt-1">
                    對照組: {backtestResult ? `${backtestResult.metrics.benchmark.cagr}%` : '-'}
                  </div>
                </div>
              )}
            </Card>

            {/* 卡片 3: 最大回撤 (Max Drawdown) */}
            <Card hoverEffect={false} className="bg-gradient-to-b from-rose-50/40 to-white border-rose-100/50 p-4 rounded-2xl">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">歷史最大回撤</div>
              {isLoading ? (
                <div className="h-6 bg-slate-200 rounded w-20 animate-pulse mt-2"></div>
              ) : (
                <div className="mt-1.5">
                  <div className="text-lg font-black font-mono text-rose-600 flex items-center gap-0.5">
                    {backtestResult ? `${backtestResult.metrics.portfolio.maxDrawdown}%` : '-%'}
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  {backtestResult?.metrics.actual && (
                    <div className="text-[9px] font-bold text-amber-500 mt-0.5 font-mono">
                      真實持股: {backtestResult.metrics.actual.maxDrawdown}%
                    </div>
                  )}
                  <div className="text-[9px] font-bold text-slate-400 mt-1">
                    對照組: {backtestResult ? `${backtestResult.metrics.benchmark.maxDrawdown}%` : '-'}
                  </div>
                </div>
              )}
            </Card>

            {/* 卡片 4: 夏普值 (Sharpe Ratio) */}
            <Card hoverEffect={false} className="bg-gradient-to-b from-amber-50/40 to-white border-amber-100/50 p-4 rounded-2xl">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">夏普值 (Sharpe)</div>
              {isLoading ? (
                <div className="h-6 bg-slate-200 rounded w-12 animate-pulse mt-2"></div>
              ) : (
                <div className="mt-1.5">
                  <div className="text-lg font-black font-mono text-amber-600 flex items-center gap-1.5">
                    {backtestResult ? backtestResult.metrics.portfolio.sharpeRatio : '-'}
                    {backtestResult && backtestResult.metrics.portfolio.sharpeRatio >= 1.5 && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-500/10 rounded border border-amber-500/20 text-amber-600 animate-pulse">
                        極佳 🏆
                      </span>
                    )}
                    {backtestResult && backtestResult.metrics.portfolio.sharpeRatio >= 1.0 && backtestResult.metrics.portfolio.sharpeRatio < 1.5 && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-500/10 rounded border border-amber-500/20 text-amber-600">
                        優秀 👍
                      </span>
                    )}
                  </div>
                  {backtestResult?.metrics.actual && (
                    <div className="text-[9px] font-bold text-amber-500 mt-0.5 font-mono">
                      真實持股: {backtestResult.metrics.actual.sharpeRatio}
                    </div>
                  )}
                  <div className="text-[9px] font-bold text-slate-400 mt-1">
                    對照組: {backtestResult ? backtestResult.metrics.benchmark.sharpeRatio : '-'}
                  </div>
                </div>
              )}
            </Card>

          </div>

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
                      formatter={(value: any, name: any) => {
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
      </div>

      {/* 下方：重大危機壓力測試對決看板 */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-4.5 h-4.5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">重大黑天鵝危機對抗實戰 (Crisis Stress Test Showcase)</h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              回測歷史上三次極端系統風險時期，對決多元配置與單一資產 (100% 台股) 的跌幅控制力及爬回前高復原月數。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CRISIS_EVENTS.map((crisis, idx) => {
            // 從結果中獲取當前危機的 metrics
            const matchedMetric = backtestResult?.crisisMetrics.find(m => m.name === crisis.name);
            const isAvailable = matchedMetric ? matchedMetric.isAvailable : (range === '10y' || (range === '5y' && idx >= 1) || (range === '3y' && idx === 3)); 
            
            // 是否在目前的歷史回測長度內
            const showLocked = !isAvailable;

            return (
              <div key={crisis.name} className="relative group">
                <Card 
                  hoverEffect={!showLocked} 
                  className={`bg-white border rounded-2xl p-5 shadow-lg transition-all h-full flex flex-col justify-between ${
                    showLocked 
                      ? 'border-slate-100/50 bg-slate-50/60 opacity-60 filter grayscale' 
                      : 'border-slate-200/60 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <div className="space-y-4">
                    {/* 危機時間與名稱 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-500 rounded font-mono">
                          {crisis.period}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 mt-1">{crisis.name}</h4>
                      </div>
                      {!showLocked && (
                        <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <CheckCircle className="w-3.5 h-3.5 fill-current text-white bg-emerald-500 rounded-full" />
                        </span>
                      )}
                    </div>

                    {/* 描述 */}
                    <p className="text-[10px] text-slate-400 font-medium leading-normal">
                      {crisis.description}
                    </p>

                    {/* 對決數據牆 */}
                    {!showLocked && matchedMetric ? (
                      <div className="space-y-4 pt-3 border-t border-slate-100">
                        {/* 最大回撤對抗 */}
                        <div>
                          <div className="text-[9px] font-bold text-slate-500 mb-2 flex justify-between">
                            <span>極端最大跌幅對決</span>
                            <span className="text-rose-500 text-[10px]">
                              理想組合比大盤防禦力: <strong className="font-extrabold">
                                {Math.max(0, Math.round(matchedMetric.benchmarkDrop - matchedMetric.portfolioDrop))}%
                              </strong>
                            </span>
                          </div>
                          
                          <div className="space-y-2.5">
                            {/* 配置組合 */}
                            <div>
                              <div className="flex justify-between text-[9px] font-bold text-slate-600 mb-1">
                                <span>我的目標配置 (理想藍圖)</span>
                                <span className="text-blue-600 font-mono">{matchedMetric.portfolioDrop.toFixed(2)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-blue-500 h-full rounded-full transition-all duration-1000" 
                                  style={{ width: `${Math.min(100, Math.abs(matchedMetric.portfolioDrop) * 2)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* 當前真實持股 [NEW] */}
                            {matchedMetric.actualDrop !== undefined && (
                              <div>
                                <div className="flex justify-between text-[9px] font-bold text-amber-500 mb-1">
                                  <span>當前真實持股 (實際偏離)</span>
                                  <span className="text-amber-600 font-mono">{matchedMetric.actualDrop.toFixed(2)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, Math.abs(matchedMetric.actualDrop) * 2)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            
                            {/* 對照組 */}
                            <div>
                              <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                                <span>100% 台股對照組</span>
                                <span className="text-slate-600 font-mono">{matchedMetric.benchmarkDrop.toFixed(2)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-slate-400 h-full rounded-full transition-all duration-1000" 
                                  style={{ width: `${Math.min(100, Math.abs(matchedMetric.benchmarkDrop) * 2)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 復原速度對抗 */}
                        <div className={`grid gap-2.5 pt-2 ${matchedMetric.actualRecovery !== undefined ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          <div className="p-2 bg-blue-50/50 border border-blue-100/50 rounded-xl flex flex-col justify-between">
                            <div className="text-[7.5px] font-bold text-blue-500">目標配置復原</div>
                            <div className="text-[10px] font-black text-blue-700 mt-0.5 font-mono">
                              {matchedMetric.portfolioRecovery === -1 
                                ? '未復原 ⚠️' 
                                : `${matchedMetric.portfolioRecovery}個月`}
                            </div>
                          </div>
                          
                          {matchedMetric.actualRecovery !== undefined && (
                            <div className="p-2 bg-amber-50/50 border border-amber-100/50 rounded-xl flex flex-col justify-between">
                              <div className="text-[7.5px] font-bold text-amber-500">真實持股復原</div>
                              <div className="text-[10px] font-black text-amber-700 mt-0.5 font-mono">
                                {matchedMetric.actualRecovery === -1 
                                  ? '未復原 ⚠️' 
                                  : `${matchedMetric.actualRecovery}個月`}
                              </div>
                            </div>
                          )}
                          
                          <div className="p-2 bg-slate-50 border border-slate-200/50 rounded-xl flex flex-col justify-between">
                            <div className="text-[7.5px] font-bold text-slate-400">對照組復原</div>
                            <div className="text-[10px] font-black text-slate-600 mt-0.5 font-mono">
                              {matchedMetric.benchmarkRecovery === -1 
                                ? '未復原 ⚠️' 
                                : `${matchedMetric.benchmarkRecovery}個月`}
                            </div>
                          </div>
                        </div>

                        {/* 亮點提示 */}
                        {matchedMetric.portfolioRecovery !== -1 && matchedMetric.benchmarkRecovery !== -1 && matchedMetric.portfolioRecovery < matchedMetric.benchmarkRecovery && (
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/50 leading-relaxed">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            資產多元配置比對照組提早 {matchedMetric.benchmarkRecovery - matchedMetric.portfolioRecovery} 個月回到前高！
                          </div>
                        )}

                      </div>
                    ) : (
                      // 骨架屏或鎖定提示
                      <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-[10px] font-bold pt-4">
                        {showLocked ? (
                          <>
                            <HelpCircle className="w-8 h-8 text-slate-300 mb-2" />
                            <span>回測時限外</span>
                            <span className="text-[8px] text-slate-400 mt-1 font-medium font-sans">
                              請切換至 5 年或 10 年回測期解鎖
                            </span>
                          </>
                        ) : (
                          <div className="animate-pulse w-full space-y-3">
                            <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                            <div className="h-5 bg-slate-100 rounded w-full"></div>
                            <div className="h-2 bg-slate-100 rounded w-full"></div>
                            <div className="h-10 bg-slate-100 rounded w-full"></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
