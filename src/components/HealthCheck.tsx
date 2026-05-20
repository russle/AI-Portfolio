import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateRebalancing } from '../utils/formulas';
import { ShieldCheck, AlertCircle, RefreshCw, TrendingUp, Info } from 'lucide-react';

export const HealthCheck: React.FC = () => {
  const {
    targetWeights,
    actualHoldings,
    setActualHolding,
    etfPrices
  } = useApp();

  const { items, totalValueUSD, hasWarning } = useMemo(() => {
    return calculateRebalancing(actualHoldings, targetWeights, etfPrices);
  }, [actualHoldings, targetWeights, etfPrices]);

  const activeSymbols = useMemo(() => {
    return Object.keys(targetWeights).filter(symbol => targetWeights[symbol] > 0);
  }, [targetWeights]);

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

  return (
    <div className="space-y-8 bg-slate-900 text-slate-100 rounded-3xl p-6 lg:p-8 border border-slate-800 shadow-2xl">
      {/* 標題與簡介 */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          模組 D：資產健康檢查與再平衡
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          定期檢視各資產因市價變動導致的「權重偏離度」。若偏離度超過 ±5%，應進行再平衡以維持原風險屬性。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* 左側：現有持股動態輸入 */}
        <div className="space-y-4 lg:col-span-1 bg-slate-850/60 p-5 rounded-2xl border border-slate-800/85">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-3">
            <span>輸入現有持股股數</span>
          </h3>

          <div className="space-y-4">
            {activeSymbols.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">請先在上方模組 C 選擇配置組合。</p>
            ) : (
              activeSymbols.map(symbol => (
                <div key={symbol} className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-emerald-400 font-mono">
                      {symbol}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium font-mono">
                      單價: ${etfPrices[symbol]?.toFixed(2)}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={actualHoldings[symbol] || ''}
                      onChange={(e) => handleSharesChange(symbol, e.target.value)}
                      placeholder="0"
                      className="w-32 bg-slate-900 border border-slate-800 focus:border-emerald-500/50 focus:outline-none rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 text-right pr-8"
                    />
                    <span className="absolute right-3 top-2 text-[9px] text-slate-500 font-bold uppercase">股</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-800/80 pt-4 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-400">當前持股總市值:</span>
            <span className="font-extrabold font-mono text-emerald-400">
              ${totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
          </div>
        </div>

        {/* 右側：健康度分析與再平衡行動建議 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 健康度總結卡片 */}
          <div className={`rounded-2xl p-5 border flex items-start gap-4 transition-all duration-300 ${
            totalValueUSD === 0
              ? 'bg-slate-800/20 border-slate-850'
              : hasWarning
              ? 'bg-amber-950/20 border-amber-500/30'
              : 'bg-emerald-950/15 border-emerald-500/25'
          }`}>
            <div className={`p-3 rounded-xl border shrink-0 ${
              totalValueUSD === 0
                ? 'bg-slate-900 border-slate-800 text-slate-500'
                : hasWarning
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className={`text-md font-bold ${
                totalValueUSD === 0
                  ? 'text-slate-400'
                  : hasWarning
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {totalValueUSD === 0
                  ? '尚未輸入持股'
                  : hasWarning
                  ? '⚠️ 警示：資產配置已偏離黃金比例！'
                  : '🎉 恭喜！資產配置健康度優良'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
                {totalValueUSD === 0
                  ? '請於左側輸入您的現有 ETF 持股股數，系統將自動比對偏差。'
                  : hasWarning
                  ? '部分標的的實際權重與目標權重偏差已大於或等於 5%。這會使組合的風險或報酬屬性偏離初衷，建議根據下方指南執行再平衡。'
                  : '所有標的的權重偏離皆在安全範圍內（小於 5%）。您的組合處於最優的防禦狀態，無須執行交易。'}
              </p>
            </div>
          </div>

          {/* 資產偏離分析表格 */}
          <div className="bg-slate-850/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    <th className="px-5 py-3">標的代號</th>
                    <th className="px-5 py-3 text-right">目標權重</th>
                    <th className="px-5 py-3 text-right">目前權重</th>
                    <th className="px-5 py-3 text-right">偏差值</th>
                    <th className="px-5 py-3 text-right">再平衡建議</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-xs font-semibold">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500 font-medium">
                        請於左側輸入持股資料以進行健康檢查。
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr
                        key={item.symbol}
                        className={`hover:bg-slate-800/25 transition-colors ${
                          item.deviationExceeded ? 'bg-amber-500/[0.03]' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 flex items-center gap-2">
                          <span className="text-emerald-400 font-bold font-mono px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/15 rounded">
                            {item.symbol}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-400">
                          {formatPercent(item.targetPercent)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-200">
                          {formatPercent(item.currentPercent)}
                        </td>
                        <td className={`px-5 py-3.5 text-right font-mono font-bold ${
                          item.deviationExceeded
                            ? 'text-amber-500'
                            : Math.abs(item.weightDiff) > 0.02
                            ? 'text-slate-300'
                            : 'text-slate-500'
                        }`}>
                          {formatDiff(item.weightDiff)}
                          {item.deviationExceeded && (
                            <span className="inline-block text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.5 rounded ml-1.5 font-sans font-bold">
                              已失衡
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono">
                          {item.actionShares === 0 ? (
                            <span className="text-slate-500 text-xs">維持現狀</span>
                          ) : item.actionShares > 0 ? (
                            <span className="text-emerald-400 text-xs flex items-center justify-end gap-1 font-bold">
                              <TrendingUp className="w-3.5 h-3.5" />
                              買進 {item.actionShares.toLocaleString()} 股 (+${Math.round(item.actionValueUSD)})
                            </span>
                          ) : (
                            <span className="text-rose-400 text-xs flex items-center justify-end gap-1 font-bold">
                              <RefreshCw className="w-3 h-3 rotate-180" />
                              賣出 {Math.abs(item.actionShares).toLocaleString()} 股 (-${Math.round(Math.abs(item.actionValueUSD))})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 溫馨小貼士 */}
          <div className="flex gap-2 text-[10px] text-slate-500 leading-normal bg-slate-900/30 p-3 rounded-xl border border-slate-800/80">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>再平衡說明：</strong>資產再平衡通常採「買低賣高」邏輯，系統會自動建議您賣出漲多的標的（偏差為正），並買進跌多或少漲的標的（偏差為負），從而控制投資組合的整體風險不至於失控。建議每半年或一年檢查一次。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
