import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Flame, Sliders, RotateCcw, ArrowUpRight } from 'lucide-react';

export const MarketConsole: React.FC = () => {
  const {
    exchangeRate,
    setExchangeRate,
    etfPrices,
    setEtfPrice,
    resetEtfPrices,
    targetWeights
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);

  // 取得當前配置中啟用的 ETF
  const activeSymbols = Object.keys(targetWeights).filter(symbol => targetWeights[symbol] > 0);

  const handlePriceChange = (symbol: string, val: string) => {
    const num = val === '' ? 0.01 : Math.max(0.01, parseFloat(val));
    setEtfPrice(symbol, num);
  };

  // 快捷市場事件模擬
  const triggerMarketEvent = (type: 'crash' | 'bubble' | 'strong_usd') => {
    if (type === 'crash') {
      // 股票類暴跌 50%, 債券類微升或維持
      Object.keys(etfPrices).forEach(symbol => {
        const isBond = symbol.includes('BND') || symbol === 'BNDW' || symbol === 'BNDX';
        const current = etfPrices[symbol];
        if (isBond) {
          setEtfPrice(symbol, current * 1.02); // 債券漲 2% (避險資金湧入)
        } else {
          setEtfPrice(symbol, current * 0.50); // 股票腰斬 50%
        }
      });
    } else if (type === 'bubble') {
      // 股票大漲 30%, 債券小跌
      Object.keys(etfPrices).forEach(symbol => {
        const isBond = symbol.includes('BND') || symbol === 'BNDW' || symbol === 'BNDX';
        const current = etfPrices[symbol];
        if (isBond) {
          setEtfPrice(symbol, current * 0.98); // 債券跌 2%
        } else {
          setEtfPrice(symbol, current * 1.30); // 股票大漲 30%
        }
      });
    } else if (type === 'strong_usd') {
      // 美金暴漲，匯率調整至 34.5
      setExchangeRate(34.5);
    }
  };

  return (
    <div className="bg-white/95 border border-slate-200/80 shadow-md shadow-slate-100/50 rounded-3xl p-6 relative overflow-hidden transition-all duration-300">
      {/* 炫光裝飾背景 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-700">
            <Sliders className="w-5 h-5 text-blue-600" />
            模擬市場控制面板 (Market Simulator)
          </h3>
          <p className="text-xs text-slate-500">
            手動編輯市場報價或觸發「宏觀經濟事件」，體驗在不同市場情境下資產配置防禦力與再平衡的運作。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-500/10 rounded-xl transition-all cursor-pointer whitespace-nowrap"
          >
            {isOpen ? '收折控制台' : '展開細部調整'}
          </button>
          <button
            onClick={resetEtfPrices}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-500 hover:text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            一鍵還原
          </button>
        </div>
      </div>

      {/* 快捷宏觀事件 */}
      <div className="flex flex-wrap gap-2 mt-4 border-t border-slate-100 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 self-center mr-1">
          快捷事件模擬:
        </span>
        <button
          onClick={() => triggerMarketEvent('crash')}
          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
        >
          <Flame className="w-3.5 h-3.5" />
          模擬金融海嘯 (股票 -50%)
        </button>
        <button
          onClick={() => triggerMarketEvent('bubble')}
          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          模擬科技牛市 (股票 +30%)
        </button>
        <button
          onClick={() => triggerMarketEvent('strong_usd')}
          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-750 border border-sky-200 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          美金強勢暴漲 (匯率 34.5)
        </button>
      </div>

      {/* 細部價格/匯率編輯欄位 */}
      {isOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-6 border-t border-slate-150 pt-5 animate-fade-in">
          {/* 匯率編輯 */}
          <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              匯率 (USD/TWD)
            </label>
            <input
              type="number"
              step="0.1"
              value={exchangeRate || ''}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:outline-none rounded-lg px-2 py-1 text-xs font-mono text-slate-800 transition-all"
            />
          </div>

          {/* 各個 ETF 價格編輯 */}
          {Object.keys(etfPrices).map((symbol) => {
            const isActive = activeSymbols.includes(symbol);
            return (
              <div
                key={symbol}
                className={`space-y-1 p-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-blue-50/20 border-blue-200 shadow-sm shadow-blue-500/5'
                    : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-blue-600 font-mono">
                    {symbol}
                  </label>
                  {isActive && (
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.5"
                  value={etfPrices[symbol] || ''}
                  onChange={(e) => handlePriceChange(symbol, e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:outline-none rounded-lg px-2 py-1 text-xs font-mono text-slate-800 transition-all"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
