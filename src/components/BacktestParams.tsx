import React from 'react';
import { Card } from './Card';
import { ShieldAlert, DollarSign, Calendar, Coins, SlidersHorizontal, Play, RefreshCw } from 'lucide-react';

interface BacktestParamsProps {
  range: '1y' | '3y' | '5y' | '10y';
  setRange: (r: '1y' | '3y' | '5y' | '10y') => void;
  initialAmount: number;
  setInitialAmount: (v: number) => void;
  monthlyInvest: number;
  setMonthlyInvest: (v: number) => void;
  rebalanceFreq: 'none' | 'monthly' | 'yearly';
  setRebalanceFreq: (f: 'none' | 'monthly' | 'yearly') => void;
  symbols: { tw_stock: string; us_stock: string; fund: string; crypto: string };
  setSymbols: React.Dispatch<React.SetStateAction<{ tw_stock: string; us_stock: string; fund: string; crypto: string }>>;
  backtestMode: 'single' | 'rolling';
  setBacktestMode: (m: 'single' | 'rolling') => void;
  windowMonths: number;
  setWindowMonths: (v: number) => void;
  stepMonths: number;
  setStepMonths: (v: number) => void;
  targetAllocationSum: number;
  executeBacktest: (range?: '1y' | '3y' | '5y' | '10y') => void;
  isLoading: boolean;
}

export const BacktestParams: React.FC<BacktestParamsProps> = ({
  range,
  setRange,
  initialAmount,
  setInitialAmount,
  monthlyInvest,
  setMonthlyInvest,
  rebalanceFreq,
  setRebalanceFreq,
  symbols,
  setSymbols,
  backtestMode,
  setBacktestMode,
  windowMonths,
  setWindowMonths,
  stepMonths,
  setStepMonths,
  executeBacktest,
  isLoading,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
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
                onClick={() => setRebalanceFreq(item.key as 'none' | 'monthly' | 'yearly')}
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

        {/* 回測模式切換 */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-[11px] font-bold text-slate-500 mb-2.5 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            回測模式
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setBacktestMode('single')}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                backtestMode === 'single'
                  ? 'bg-white text-blue-600 shadow-md scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              單一回測
            </button>
            <button
              onClick={() => setBacktestMode('rolling')}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                backtestMode === 'rolling'
                  ? 'bg-white text-blue-600 shadow-md scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              滾動回測
            </button>
          </div>
        </div>

        {/* 滾動參數設定 */}
        {backtestMode === 'rolling' && (
          <div className="space-y-4 animate-fade-in pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-2">
                視窗大小: {windowMonths} 個月 ({Math.round(windowMonths / 12)} 年)
              </label>
              <input type="range" min="36" max="120" value={windowMonths}
                onChange={(e) => setWindowMonths(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer" />
              <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-0.5">
                <span>3 年</span>
                <span>7 年</span>
                <span>10 年</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-2">
                步長: {stepMonths} 個月
              </label>
              <input type="range" min="1" max="12" value={stepMonths}
                onChange={(e) => setStepMonths(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer" />
              <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-0.5">
                <span>1 月</span>
                <span>6 月</span>
                <span>12 月</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-medium leading-relaxed bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
              💡 滾動回測會以不同時間窗口反覆驗證策略穩定性，視窗越大越能反映長期表現，步長越小樣本越多。
            </p>
          </div>
        )}

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
  );
};
