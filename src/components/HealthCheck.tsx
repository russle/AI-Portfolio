import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { ShieldCheck, AlertCircle, RefreshCw, TrendingUp, Info, Plus, Trash2, Coins } from 'lucide-react';

export const HealthCheck: React.FC = () => {
  const {
    targetWeights,
    actualHoldings,
    setActualHolding,
    etfPrices,
    etfCurrencies,
    exchangeRate,
    setEtfPrice,
    setEtfCurrency,
    removeCustomEtf,
    setTargetWeight,
    fetchLatestMarketData,
    isMarketUpdating
  } = useApp();

  // 自訂新增持股表單 State
  const [isAdding, setIsAdding] = useState(false);
  const [customSymbol, setCustomSymbol] = useState('');
  const [customCurrency, setCustomCurrency] = useState<'USD' | 'TWD'>('USD');
  const [customPrice, setCustomPrice] = useState('');

  // 雙軌再平衡狀態
  const [rebalanceMode, setRebalanceMode] = useState<'exact' | 'cashflow'>('exact');
  const [newFundsInputTWD, setNewFundsInputTWD] = useState<number>(30000);

  // 確保能顯示：目標配置標的 + 實際持有大於 0 的標的 + 已經新增但持股為 0 的自訂標的
  const displaySymbols = useMemo(() => {
    const presetSymbols = ['VT', 'BNDW', 'VTI', 'VXUS', 'BND', 'BNDX', 'VNQ', 'DBC'];
    return Array.from(new Set([
      ...Object.keys(targetWeights).filter(symbol => targetWeights[symbol] > 0),
      ...Object.keys(actualHoldings).filter(symbol => actualHoldings[symbol] > 0),
      ...Object.keys(etfCurrencies).filter(symbol => !presetSymbols.includes(symbol))
    ]));
  }, [targetWeights, actualHoldings, etfCurrencies]);

  const handleSharesChange = (symbol: string, val: string) => {
    const num = val === '' ? 0 : Math.max(0, parseInt(val, 10));
    setActualHolding(symbol, num);
  };

  const formatPercent = (val: number) => {
    return (val * 100).toFixed(1) + '%';
  };

  const formatDiff = (val: number) => {
    const pct = val * 100;
    if (pct === 0) return '0.0%';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  };

  // 雙軌再平衡與偏離度智慧演算核心
  const { items, totalValueUSD, hasWarning } = useMemo(() => {
    const allSymbols = displaySymbols;

    // 計算各標的實際市值 (折算為美金) 與實際總市值
    let calculatedTotalValueUSD = 0;
    const rawHoldings = allSymbols.map(symbol => {
      const shares = actualHoldings[symbol] || 0;
      const price = etfPrices[symbol] || 0; 
      const currency = etfCurrencies[symbol] || 'USD';
      
      const priceUSD = currency === 'TWD'
        ? (exchangeRate > 0 ? price / exchangeRate : 0)
        : price;
        
      const valueUSD = shares * priceUSD;
      calculatedTotalValueUSD += valueUSD;
      
      return { symbol, shares, price, priceUSD, valueUSD, currency };
    });

    let finalItems = [];

    if (rebalanceMode === 'exact') {
      // 1. 精準買賣再平衡模式：直接精準配比，允許買低賣高
      let calculatedHasWarning = false;
      finalItems = rawHoldings.map(({ symbol, shares, price, priceUSD, valueUSD, currency }) => {
        const targetPercent = targetWeights[symbol] || 0;
        const currentPercent = calculatedTotalValueUSD > 0 ? valueUSD / calculatedTotalValueUSD : 0;
        const weightDiff = currentPercent - targetPercent;
        const deviationExceeded = Math.abs(weightDiff) >= 0.05;
        
        if (deviationExceeded) {
          calculatedHasWarning = true;
        }

        const targetValueUSD = calculatedTotalValueUSD * targetPercent;
        const actionValueUSD = targetValueUSD - valueUSD;
        
        const activePrice = currency === 'TWD' ? price : priceUSD;
        const actionShares = activePrice > 0
          ? Math.round((currency === 'TWD' ? actionValueUSD * exchangeRate : actionValueUSD) / activePrice)
          : 0;

        return {
          symbol,
          targetPercent,
          currentShares: shares,
          price,
          currentValue: valueUSD,
          currentPercent,
          weightDiff,
          deviationExceeded,
          actionShares,
          actionValueUSD
        };
      });

      return {
        items: finalItems,
        totalValueUSD: calculatedTotalValueUSD,
        hasWarning: calculatedHasWarning
      };
    } else {
      // 2. 新資金只買不賣智慧再平衡模式 (Cash-Flow Rebalancing)
      const newFundsUSD = exchangeRate > 0 ? newFundsInputTWD / exchangeRate : 0;
      const nextTotalValueUSD = calculatedTotalValueUSD + newFundsUSD;
      
      const rawShortfalls = rawHoldings.map(h => {
        const targetPercent = targetWeights[h.symbol] || 0;
        const idealValueUSD = nextTotalValueUSD * targetPercent;
        const shortfallUSD = idealValueUSD - h.valueUSD;
        return { ...h, targetPercent, shortfallUSD };
      });

      // 篩選出所有市值缺口大於 0 的低配標的，並求其總和
      const positiveShortfalls = rawShortfalls.filter(s => s.shortfallUSD > 0);
      const totalShortfallUSD = positiveShortfalls.reduce((sum, s) => sum + s.shortfallUSD, 0);

      let calculatedHasWarning = false;

      finalItems = rawShortfalls.map(({ symbol, shares, price, priceUSD, valueUSD, currency, targetPercent, shortfallUSD }) => {
        const currentPercent = calculatedTotalValueUSD > 0 ? valueUSD / calculatedTotalValueUSD : 0;
        const weightDiff = currentPercent - targetPercent;
        const deviationExceeded = Math.abs(weightDiff) >= 0.05;

        if (deviationExceeded) {
          calculatedHasWarning = true;
        }

        let actionShares = 0;
        let actionValueUSD = 0;

        // 若該標的處於低配缺口，且總缺口大於 0，則按比例注入新資金
        if (shortfallUSD > 0 && totalShortfallUSD > 0) {
          const allocatedNewUSD = newFundsUSD * (shortfallUSD / totalShortfallUSD);
          
          const activePrice = currency === 'TWD' ? price : priceUSD;
          actionShares = activePrice > 0
            ? Math.floor((currency === 'TWD' ? allocatedNewUSD * exchangeRate : allocatedNewUSD) / activePrice)
            : 0;
          
          actionValueUSD = actionShares * priceUSD;
        }

        return {
          symbol,
          targetPercent,
          currentShares: shares,
          price,
          currentValue: valueUSD,
          currentPercent,
          weightDiff,
          deviationExceeded,
          actionShares, // 保證全為非負數 (只買不賣)
          actionValueUSD
        };
      });

      return {
        items: finalItems,
        totalValueUSD: calculatedTotalValueUSD,
        hasWarning: calculatedHasWarning
      };
    }
  }, [displaySymbols, actualHoldings, targetWeights, etfPrices, etfCurrencies, exchangeRate, rebalanceMode, newFundsInputTWD]);

  // Recharts 雙柱形對比圖資料預處理
  const chartData = useMemo(() => {
    const finalTotalValueUSD = totalValueUSD + (rebalanceMode === 'cashflow' ? (newFundsInputTWD / exchangeRate) : 0);
    
    return items.map(item => {
      const currency = etfCurrencies[item.symbol] || 'USD';
      const isTwd = currency === 'TWD';
      const expectedShares = item.currentShares + item.actionShares;
      const expectedValueRaw = expectedShares * item.price;
      const expectedValueUSD = isTwd
        ? (exchangeRate > 0 ? expectedValueRaw / exchangeRate : 0)
        : expectedValueRaw;
      
      const currentPercent = parseFloat((item.currentPercent * 100).toFixed(1));
      const expectedPercent = finalTotalValueUSD > 0
        ? parseFloat(((expectedValueUSD / finalTotalValueUSD) * 100).toFixed(1))
        : parseFloat((item.targetPercent * 100).toFixed(1));

      return {
        name: item.symbol,
        '目前實際權重 (%)': currentPercent,
        '平衡後預估權重 (%)': expectedPercent
      };
    });
  }, [items, etfCurrencies, exchangeRate, totalValueUSD, rebalanceMode, newFundsInputTWD]);

  return (
    <div className="space-y-8 bg-white text-slate-800 rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-md shadow-slate-100/50">
      {/* 標題與簡介 */}
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
          <ShieldCheck className="w-7 h-7 text-blue-600" />
          模組 D：資產健康檢查與雙軌智慧再平衡
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          檢視資產偏差度。若偏離目標權重超過 ±5%，可自由選擇「精準買賣」或「新資金只買不賣」進行無痛再平衡。
        </p>
      </div>

      {/* 響應式佈局：左 1/3 持股輸入與 Yahoo 同步，右 2/3 大盤、圖表與建議 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* 左側：持股動態輸入與同步 */}
        <div className="space-y-4 lg:col-span-1 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-3">
            <span>現有資產持股股數</span>
          </h3>

          <div className="space-y-4">
            {displaySymbols.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">請先在上方模組 C 選擇配置組合，或下方新增自訂持股。</p>
            ) : (
              displaySymbols.map(symbol => {
                const currency = etfCurrencies[symbol] || 'USD';
                const isPreset = ['VT', 'BNDW', 'VTI', 'VXUS', 'BND', 'BNDX', 'VNQ', 'DBC'].includes(symbol);
                
                return (
                  <div key={symbol} className="flex items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-blue-600 font-mono truncate">
                          {symbol}
                        </span>
                        <span className={`text-[8px] font-extrabold px-1 rounded font-sans ${
                          currency === 'TWD' 
                            ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50' 
                            : 'bg-blue-100/80 text-blue-700 border border-blue-200/50'
                        }`}>
                          {currency}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                        單價: {currency === 'TWD' ? 'NT$' : '$'}{etfPrices[symbol]?.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={actualHoldings[symbol] || ''}
                          onChange={(e) => handleSharesChange(symbol, e.target.value)}
                          placeholder="0"
                          className="w-24 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 text-right pr-6 transition-all"
                        />
                        <span className="absolute right-2 top-2 text-[9px] text-slate-400 font-bold uppercase">股</span>
                      </div>
                      
                      {!isPreset && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`確定要移除自訂標的 ${symbol} 嗎？`)) {
                              removeCustomEtf(symbol);
                            }
                          }}
                          className="p-1.5 text-slate-350 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title={`移除自訂標的 ${symbol}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 新增自訂持股表單 */}
          <div className="border-t border-slate-200/60 pt-4 space-y-3">
            {!isAdding ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/60 rounded-xl text-xs font-bold text-blue-600 transition-all cursor-pointer shadow-sm shadow-blue-500/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增自訂持股 (台股/美股)
                </button>
                
                {/* 🔄 Yahoo 最新市價一鍵同步按鈕 */}
                <button
                  type="button"
                  disabled={isMarketUpdating}
                  onClick={async () => {
                    try {
                      const updated = await fetchLatestMarketData(true);
                      if (updated) {
                        alert('市場報價與即時匯率同步成功！');
                      } else {
                        alert('今日報價已是最新，或同步未有變動。');
                      }
                    } catch (err) {
                      alert('同步報價失敗，請稍後再試。');
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    isMarketUpdating
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-350'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isMarketUpdating ? 'animate-spin' : ''}`} />
                  {isMarketUpdating ? '正在同步最新報價...' : '同步 Yahoo 即時價格與匯率'}
                </button>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  let sym = customSymbol.trim().toUpperCase();
                  if (!sym) {
                    alert('請輸入標的代號！');
                    return;
                  }
                  
                  if (/^\d+$/.test(sym) && customCurrency === 'TWD') {
                    sym = `${sym}.TW`;
                  }
                  
                  if (etfPrices[sym] !== undefined) {
                    alert(`標的 ${sym} 已存在於列表中！`);
                    return;
                  }
                  
                  const priceNum = parseFloat(customPrice);
                  if (isNaN(priceNum) || priceNum <= 0) {
                    alert('請輸入有效的目前單價（必須大於 0）！');
                    return;
                  }
                  
                  setEtfCurrency(sym, customCurrency);
                  setEtfPrice(sym, priceNum);
                  setActualHolding(sym, 0); 
                  setTargetWeight(sym, 0); // 智慧跨模組聯動：同步註冊至模組 C 配置地圖
                  
                  setCustomSymbol('');
                  setCustomPrice('');
                  setIsAdding(false);
                }} 
                className="space-y-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm border-dashed"
              >
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Plus className="w-3 h-3 text-blue-600" /> 自訂新增標的
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-[10px] font-semibold text-slate-400 hover:text-slate-650 cursor-pointer"
                  >
                    取消
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">標的代號</label>
                    <input
                      type="text"
                      placeholder="0050 或 VOO"
                      value={customSymbol}
                      onChange={(e) => setCustomSymbol(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">計價幣別</label>
                    <div className="grid grid-cols-2 gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setCustomCurrency('USD')}
                        className={`py-1 text-[9px] font-extrabold rounded-md transition-all cursor-pointer ${
                          customCurrency === 'USD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                        }`}
                      >
                        USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomCurrency('TWD')}
                        className={`py-1 text-[9px] font-extrabold rounded-md transition-all cursor-pointer ${
                          customCurrency === 'TWD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                        }`}
                      >
                        TWD
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                    目前單價 ({customCurrency === 'USD' ? 'USD' : 'TWD'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder={customCurrency === 'USD' ? '美金, 如 500.5' : '台幣, 如 160.0'}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
                >
                  確認加入列表
                </button>
              </form>
            )}
          </div>

          <div className="border-t border-slate-200/60 pt-4 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-500">實際持股總市值:</span>
            <span className="font-extrabold font-mono text-blue-600">
              ${totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
          </div>
        </div>

        {/* 右側：再平衡健康大牌、雙柱圖與行動建議 */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. 健康度總結大牌卡片 */}
          <div className={`rounded-2xl p-5 border flex items-start gap-4 transition-all duration-300 ${
            totalValueUSD === 0
              ? 'bg-slate-50 border-slate-200'
              : hasWarning
              ? 'bg-amber-50 border-amber-250/80 shadow-sm shadow-amber-500/5'
              : 'bg-emerald-50/60 border-emerald-250/80 shadow-sm shadow-emerald-500/5'
          }`}>
            <div className={`p-3 rounded-xl border shrink-0 ${
              totalValueUSD === 0
                ? 'bg-slate-100 border-slate-200 text-slate-400'
                : hasWarning
                ? 'bg-amber-100 border-amber-200 text-amber-700'
                : 'bg-emerald-100 border-emerald-200 text-emerald-700'
            }`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className={`text-md font-bold ${
                totalValueUSD === 0
                  ? 'text-slate-500'
                  : hasWarning
                  ? 'text-amber-800'
                  : 'text-emerald-800'
              }`}>
                {totalValueUSD === 0
                  ? '尚未輸入持股'
                  : hasWarning
                  ? '⚠️ 警示：資產配置已偏離黃金比例！'
                  : '🎉 恭喜！資產配置健康度優良'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                {totalValueUSD === 0
                  ? '請於左側輸入您的實際 ETF 持股股數，系統將即刻進行資產偏差精算。'
                  : hasWarning
                  ? '部分標的的實際權重與目標權重偏差已大於或等於 5%。這會使您的資產配置偏離原定風險，建議按照右側指引執行再平衡。'
                  : '所有標的的實際權重偏離皆在 ±5% 安全範圍內。您的組合防禦力極佳，目前無須執行交易。'}
              </p>
            </div>
          </div>

          {/* 2. 雙軌再平衡 Toggle 面板 */}
          {totalValueUSD > 0 && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">選擇再平衡戰略模式</span>
                
                <div className="grid grid-cols-2 gap-0.5 bg-slate-200/60 p-0.5 rounded-xl border border-slate-250 max-w-xs w-full">
                  <button
                    type="button"
                    onClick={() => setRebalanceMode('exact')}
                    className={`py-1.5 px-3 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                      rebalanceMode === 'exact' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    🔄 精準買賣再平衡
                  </button>
                  <button
                    type="button"
                    onClick={() => setRebalanceMode('cashflow')}
                    className={`py-1.5 px-3 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                      rebalanceMode === 'cashflow' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    💰 新資金只買不賣
                  </button>
                </div>
              </div>

              {rebalanceMode === 'cashflow' && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Coins className="w-3 h-3" /> Cash-Flow Rebalancing
                    </span>
                    <p className="text-xs text-slate-500">輸入預計注入的新資金，系統將優先把錢分配給低配資產，絕不賣出任何股票。</p>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="5000"
                      min="0"
                      value={newFundsInputTWD || ''}
                      onChange={(e) => setNewFundsInputTWD(Number(e.target.value))}
                      className="w-40 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-xl pl-3 pr-10 py-1.5 text-xs font-mono text-slate-800 font-bold"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">TWD</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Recharts 實際/預估雙柱對比圖 (Before vs After) */}
          {totalValueUSD > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-sm shadow-slate-100/20">
              <span className="text-xs font-bold text-slate-650 uppercase tracking-wider block">資產配置比例對比柱形圖 (Before vs After)</span>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748B', fontSize: 10, fontWeight: 'bold' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                      unit="%"
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900/95 text-white px-3 py-2 rounded-xl border border-slate-700 shadow-xl text-xs font-semibold backdrop-blur-md">
                              <p className="font-bold text-slate-200 border-b border-slate-850 pb-1 mb-1.5">{payload[0].payload.name}</p>
                              {payload.map((p, idx) => (
                                <p key={idx} className="flex items-center gap-1.5 py-0.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
                                  <span>{p.name}: {p.value}%</span>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }}
                    />
                    <Bar
                      dataKey="目前實際權重 (%)"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="平衡後預估權重 (%)"
                      fill="#2563EB"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 4. 資產健康偏離分析與行動建議表格 */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <th className="px-5 py-3">標的代號</th>
                    <th className="px-5 py-3 text-right">目標權重</th>
                    <th className="px-5 py-3 text-right">目前權重</th>
                    <th className="px-5 py-3 text-right">實際偏差值</th>
                    <th className="px-5 py-3 text-right">智慧平衡行動建議</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium">
                        請於左側輸入持股資料以進行健康檢查。
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const currency = etfCurrencies[item.symbol] || 'USD';
                      const isTwd = currency === 'TWD';
                      const displayActionVal = isTwd
                        ? `NT$ ${Math.round(Math.abs(item.actionValueUSD * exchangeRate)).toLocaleString()}`
                        : `$ ${Math.round(Math.abs(item.actionValueUSD)).toLocaleString()}`;

                      return (
                        <tr
                          key={item.symbol}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            item.deviationExceeded ? 'bg-amber-50/40 border-l-4 border-l-amber-500' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-600 font-bold font-mono px-2 py-0.5 bg-blue-50 border border-blue-100 rounded">
                                {item.symbol}
                              </span>
                              <span className={`text-[8px] font-extrabold px-1 rounded font-sans scale-90 ${
                                isTwd 
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' 
                                  : 'bg-blue-100 text-blue-700 border border-blue-200/50'
                              }`}>
                                {currency}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-500">
                            {formatPercent(item.targetPercent)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                            {formatPercent(item.currentPercent)}
                          </td>
                          <td className={`px-5 py-3.5 text-right font-mono font-bold ${
                            item.deviationExceeded
                              ? 'text-amber-600'
                              : Math.abs(item.weightDiff) > 0.02
                              ? 'text-slate-600'
                              : 'text-slate-400'
                          }`}>
                            <div className="flex items-center justify-end gap-1">
                              <span>{formatDiff(item.weightDiff)}</span>
                              {item.deviationExceeded && (
                                <span className="text-[8px] bg-amber-100 text-amber-700 border border-amber-200 px-1 py-0.5 rounded font-sans font-bold whitespace-nowrap animate-pulse">
                                  已失衡 ⚠️
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono">
                            {item.actionShares === 0 ? (
                              <span className="text-slate-400 text-xs">維持現狀</span>
                            ) : item.actionShares > 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs rounded-lg shadow-sm">
                                <TrendingUp className="w-3.5 h-3.5" />
                                買進 {item.actionShares.toLocaleString()} 股 (+{displayActionVal})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold px-2 py-1 bg-rose-50 text-rose-700 border border-rose-250 text-xs rounded-lg shadow-sm">
                                <RefreshCw className="w-3 h-3 rotate-180" />
                                賣出 {Math.abs(item.actionShares).toLocaleString()} 股 (-{displayActionVal})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. 再平衡後預估資產對比 */}
          {totalValueUSD > 0 && (
            <div className="bg-blue-50/25 border border-blue-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span>💡 執行智慧平衡後 預估各資產配比</span>
                </h4>
                <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  模擬試算
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {items.map((item) => {
                  const currency = etfCurrencies[item.symbol] || 'USD';
                  const isTwd = currency === 'TWD';
                  const expectedShares = item.currentShares + item.actionShares;
                  const expectedValueRaw = expectedShares * item.price;
                  const expectedValueUSD = isTwd
                    ? (exchangeRate > 0 ? expectedValueRaw / exchangeRate : 0)
                    : expectedValueRaw;
                  
                  const finalTotalValueUSD = totalValueUSD + (rebalanceMode === 'cashflow' ? (newFundsInputTWD / exchangeRate) : 0);
                  const expectedPercent = finalTotalValueUSD > 0 ? expectedValueUSD / finalTotalValueUSD : 0;

                  return (
                    <div key={item.symbol} className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-3 shadow-sm shadow-slate-100/20">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-extrabold text-blue-600 font-mono">{item.symbol}</span>
                          <span className={`text-[7px] font-extrabold px-0.5 rounded font-sans scale-90 ${
                            isTwd ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {currency}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold font-mono">
                          {isTwd ? 'NT$' : '$'}{item.price.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
                        <div>
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase">目前股數</span>
                          <span className="text-xs font-bold font-mono text-slate-700">{item.currentShares} 股</span>
                        </div>
                        <div>
                          <span className="block text-blue-600 font-bold uppercase text-[9px]">平衡後</span>
                          <span className="text-xs font-bold font-mono text-blue-600">{expectedShares} 股</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-center border-t border-slate-100 pt-2">
                        <div>
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase">目前權重</span>
                          <span className="text-xs font-bold font-mono text-slate-600">{formatPercent(item.currentPercent)}</span>
                        </div>
                        <div>
                          <span className="block text-blue-600 font-bold uppercase text-[9px]">平衡後</span>
                          <span className="text-xs font-bold font-mono text-blue-600">{formatPercent(expectedPercent)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. 溫馨小貼士 */}
          <div className="flex gap-2 text-[10px] text-slate-500 leading-normal bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>雙軌再平衡說明：</strong>
              資產配置因市價波動會隨時間失衡。
              <strong className="text-slate-700 font-bold">精準買賣模式</strong>可強制將權重回歸至原黃金配比，但涉及賣出交易。
              而<strong className="text-slate-700 font-bold">新資金只買不賣模式</strong>是利用新增資金去補足偏低資產的缺口，免除賣出股票所產生的稅負或手續費支出，適合持續積累資金的指數化投資人。
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
