import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateRebalancing } from '../utils/formulas';
import { ShieldCheck, AlertCircle, RefreshCw, TrendingUp, Info, Plus, Trash2 } from 'lucide-react';

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
    removeCustomEtf
  } = useApp();

  // 自訂新增持股表單 State
  const [isAdding, setIsAdding] = useState(false);
  const [customSymbol, setCustomSymbol] = useState('');
  const [customCurrency, setCustomCurrency] = useState<'USD' | 'TWD'>('USD');
  const [customPrice, setCustomPrice] = useState('');

  const { items, totalValueUSD, hasWarning } = useMemo(() => {
    return calculateRebalancing(actualHoldings, targetWeights, etfPrices, etfCurrencies, exchangeRate);
  }, [actualHoldings, targetWeights, etfPrices, etfCurrencies, exchangeRate]);

  // 確保能顯示：目標配置標的 + 實際持有大於 0 的標的 + 已經新增但持股為 0 的自訂標的
  const displaySymbols = useMemo(() => {
    const presetSymbols = ['VT', 'BNDW', 'VTI', 'VXUS', 'BND', 'BNDX', 'VNQ', 'DBC'];
    return Array.from(new Set([
      ...Object.keys(targetWeights).filter(symbol => targetWeights[symbol] > 0),
      ...Object.keys(actualHoldings).filter(symbol => actualHoldings[symbol] > 0),
      ...Object.keys(etfCurrencies).filter(symbol => !presetSymbols.includes(symbol)) // 自訂的新增標的
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


  return (
    <div className="space-y-8 bg-white text-slate-800 rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-md shadow-slate-100/50">
      {/* 標題與簡介 */}
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
          <ShieldCheck className="w-7 h-7 text-blue-600" />
          模組 D：資產健康檢查與再平衡
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          定期檢視各資產因市價變動導致的「權重偏離度」。若偏離度超過 ±5%，應進行再平衡以維持原風險屬性。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* 左側：現有持股動態輸入 */}
        <div className="space-y-4 lg:col-span-1 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-3">
            <span>輸入現有持股股數</span>
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
          <div className="border-t border-slate-200/60 pt-4">
            {!isAdding ? (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/60 rounded-xl text-xs font-bold text-blue-600 transition-all cursor-pointer shadow-sm shadow-blue-500/5"
              >
                <Plus className="w-3.5 h-3.5" />
                新增自訂持股 (台股/美股)
              </button>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  let sym = customSymbol.trim().toUpperCase();
                  if (!sym) {
                    alert('請輸入標的代號！');
                    return;
                  }
                  
                  // 台股智慧轉換：若為純數字，且選擇台幣，自動加上 .TW
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
                  
                  // 寫入 context 狀態
                  setEtfCurrency(sym, customCurrency);
                  setEtfPrice(sym, priceNum);
                  setActualHolding(sym, 0); // 預設持股 0 股
                  
                  // 清空表單與還原狀態
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
                  {/* 代號 */}
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
                  {/* 幣別選擇 */}
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

                {/* 單價 */}
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
            <span className="font-semibold text-slate-500">當前持股總市值:</span>
            <span className="font-extrabold font-mono text-blue-600">
              ${totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
          </div>
        </div>


        {/* 右側：健康度分析與再平衡行動建議 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 健康度總結卡片 */}
          <div className={`rounded-2xl p-5 border flex items-start gap-4 transition-all duration-300 ${
            totalValueUSD === 0
              ? 'bg-slate-50 border-slate-200'
              : hasWarning
              ? 'bg-amber-50 border-amber-200/80 shadow-sm shadow-amber-500/5'
              : 'bg-emerald-50/60 border-emerald-200/80 shadow-sm shadow-emerald-500/5'
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
                  ? '請於左側輸入您的現有 ETF 持股股數，系統將自動比對偏差。'
                  : hasWarning
                  ? '部分標的的實際權重與目標權重偏差已大於或等於 5%。這會使組合的風險或報酬屬性偏離初衷，建議根據下方指南執行再平衡。'
                  : '所有標定的權重偏離皆在安全範圍內（小於 5%）。您的組合處於最優的防禦狀態，無須執行交易。'}
              </p>
            </div>
          </div>

          {/* 資產偏離分析表格 */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <th className="px-5 py-3">標的代號</th>
                    <th className="px-5 py-3 text-right">目標權重</th>
                    <th className="px-5 py-3 text-right">目前權重</th>
                    <th className="px-5 py-3 text-right">偏差值</th>
                    <th className="px-5 py-3 text-right">再平衡建議</th>
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
                            item.deviationExceeded ? 'bg-amber-50/70' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5 flex items-center gap-2">
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
                              ? 'text-slate-650'
                              : 'text-slate-400'
                          }`}>
                            {formatDiff(item.weightDiff)}
                            {item.deviationExceeded && (
                              <span className="inline-block text-[9px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md ml-1.5 font-sans font-bold">
                                已失衡
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono">
                            {item.actionShares === 0 ? (
                              <span className="text-slate-400 text-xs">維持現狀</span>
                            ) : item.actionShares > 0 ? (
                              <span className="text-emerald-600 text-xs flex items-center justify-end gap-1 font-bold">
                                <TrendingUp className="w-3.5 h-3.5" />
                                買進 {item.actionShares.toLocaleString()} 股 (+{displayActionVal})
                              </span>
                            ) : (
                              <span className="text-rose-600 text-xs flex items-center justify-end gap-1 font-bold">
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

          {/* 再平衡後預估資產對比 */}
          {totalValueUSD > 0 && (
            <div className="bg-blue-50/25 border border-blue-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin-slow" />
                  <span>💡 執行再平衡後 預估模擬對比</span>
                </h4>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  模擬試算
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {items.map((item) => {
                  const currency = etfCurrencies[item.symbol] || 'USD';
                  const isTwd = currency === 'TWD';
                  const expectedShares = item.currentShares + item.actionShares;
                  // 原始幣別的預估市值
                  const expectedValueRaw = expectedShares * item.price;
                  // 折合美金以計算權重
                  const expectedValueUSD = isTwd
                    ? (exchangeRate > 0 ? expectedValueRaw / exchangeRate : 0)
                    : expectedValueRaw;
                  const expectedPercent = totalValueUSD > 0 ? expectedValueUSD / totalValueUSD : 0;

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
                          <span className="block text-[9px] text-blue-600 font-bold uppercase">平衡後預估</span>
                          <span className="text-xs font-bold font-mono text-blue-600">{expectedShares} 股</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center border-t border-slate-100 pt-2">
                        <div>
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase">目前權重</span>
                          <span className="text-xs font-bold font-mono text-slate-650">{formatPercent(item.currentPercent)}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-blue-600 font-bold uppercase">平衡後預估</span>
                          <span className="text-xs font-bold font-mono text-blue-600">{formatPercent(expectedPercent)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 溫馨小貼士 */}
          <div className="flex gap-2 text-[10px] text-slate-500 leading-normal bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>再平衡說明：</strong>資產再平衡通常採「買低賣高」邏輯，系統會自動建議您賣出漲多的標的（偏差為正），並買進跌多或少漲的標的（偏差為負），從而控制投資組合的整體風險不至於失控。建議每半年或一年檢查一次。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
