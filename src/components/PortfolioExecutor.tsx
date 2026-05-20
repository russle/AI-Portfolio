import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateOrders } from '../utils/formulas';
import { Layers } from 'lucide-react';

export const PortfolioExecutor: React.FC = () => {
  const {
    selectedLegoType,
    targetWeights,
    applyLegoPortfolio,
    investAmtTWD,
    setInvestAmtTWD,
    exchangeRate,
    setExchangeRate,
    etfPrices
  } = useApp();

  const orders = useMemo(() => {
    return calculateOrders(investAmtTWD, exchangeRate, targetWeights, etfPrices);
  }, [investAmtTWD, exchangeRate, targetWeights, etfPrices]);

  const totals = useMemo(() => {
    let totalTargetPercent = 0;
    let totalAllocatedUSD = 0;
    let totalSpentUSD = 0;
    let totalRemainingUSD = 0;

    orders.forEach(o => {
      totalTargetPercent += o.targetPercent;
      totalAllocatedUSD += o.allocatedUSD;
      totalSpentUSD += o.sharesToBuy * o.price;
      totalRemainingUSD += o.remainingUSD;
    });

    return {
      totalTargetPercent,
      totalAllocatedUSD,
      totalSpentUSD,
      totalRemainingUSD
    };
  }, [orders]);

  const handleLegoClick = (type: 'simple' | 'refined' | 'diverse') => {
    applyLegoPortfolio(type);
  };

  return (
    <div className="space-y-8 bg-slate-900 text-slate-100 rounded-3xl p-6 lg:p-8 border border-slate-800 shadow-2xl">
      {/* 標題與簡介 */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">
          <Layers className="w-7 h-7 text-emerald-400" />
          模組 C：樂高式配置與下單計算機
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          一鍵導入經典低成本資產配置模組，並動態精算每筆資金對應各標的的應下單股數，避免資金閒置。
        </p>
      </div>

      {/* C1 樂高模組一鍵套用 */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <span>步驟 1：選擇資產配置模型 (樂高積木組)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 最簡配置 */}
          <div
            onClick={() => handleLegoClick('simple')}
            className={`border cursor-pointer rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:border-slate-600 relative overflow-hidden flex flex-col justify-between ${
              selectedLegoType === 'simple'
                ? 'bg-slate-800/80 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'bg-slate-850/40 border-slate-800 hover:bg-slate-850/60'
            }`}
          >
            {selectedLegoType === 'simple' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] rounded-full font-bold">
                使用中
              </span>
            )}
            <div className="space-y-2">
              <h4 className="text-md font-bold text-slate-200">1. 最簡配置</h4>
              <p className="text-xs text-slate-400 leading-normal">
                專為「極簡主義者」設計。僅需兩檔全球型 ETF，即可建構覆蓋全球股票與全球避險債券之核心組合。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-800/80 mt-2">
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-emerald-400">VT: 70%</span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-sky-400">BNDW: 30%</span>
            </div>
          </div>

          {/* 股債精研 */}
          <div
            onClick={() => handleLegoClick('refined')}
            className={`border cursor-pointer rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:border-slate-600 relative overflow-hidden flex flex-col justify-between ${
              selectedLegoType === 'refined'
                ? 'bg-slate-800/80 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'bg-slate-850/40 border-slate-800 hover:bg-slate-850/60'
            }`}
          >
            {selectedLegoType === 'refined' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] rounded-full font-bold">
                使用中
              </span>
            )}
            <div className="space-y-2">
              <h4 className="text-md font-bold text-slate-200">2. 股債精研</h4>
              <p className="text-xs text-slate-400 leading-normal">
                將股債市場進一步細分。區分美國本地與海外成熟市場股，並拆分美國債與國際債，追求更精細的分散。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-800/80 mt-2">
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-emerald-400">VTI: 40%</span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-emerald-450">VXUS: 30%</span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-sky-400">BND: 20%</span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-sky-450">BNDX: 10%</span>
            </div>
          </div>

          {/* 多元資產 */}
          <div
            onClick={() => handleLegoClick('diverse')}
            className={`border cursor-pointer rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:border-slate-600 relative overflow-hidden flex flex-col justify-between ${
              selectedLegoType === 'diverse'
                ? 'bg-slate-800/80 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'bg-slate-850/40 border-slate-800 hover:bg-slate-850/60'
            }`}
          >
            {selectedLegoType === 'diverse' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] rounded-full font-bold">
                使用中
              </span>
            )}
            <div className="space-y-2">
              <h4 className="text-md font-bold text-slate-200">3. 多元資產</h4>
              <p className="text-xs text-slate-400 leading-normal">
                經典全方位配置。除股債外，額外納入美國 REITs 指數與大宗商品實物，增強抗通膨屬性與資產相關性分散。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-800/80 mt-2">
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-emerald-400">VTI: 35%</span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-emerald-450">VXUS: 25%</span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-sky-400">BND: 20%</span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-yellow-500">VNQ: 10%</span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] rounded text-orange-500">DBC: 10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* C2 即時下單股數計算機 */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-800/80 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>步驟 2：輸入下單金額與匯率</span>
          </h3>

          <div className="flex flex-wrap gap-3">
            {/* 台幣投入金額 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">投入金額:</span>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  min="0"
                  value={investAmtTWD || ''}
                  onChange={(e) => setInvestAmtTWD(Number(e.target.value))}
                  className="w-36 bg-slate-900 border border-slate-800 focus:border-emerald-500/50 focus:outline-none rounded-xl pl-3 pr-10 py-1.5 text-xs font-mono text-slate-200"
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-bold">TWD</span>
              </div>
            </div>

            {/* 美金匯率 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">美金匯率:</span>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  value={exchangeRate || ''}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-24 bg-slate-900 border border-slate-800 focus:border-emerald-500/50 focus:outline-none rounded-xl pl-3 pr-6 py-1.5 text-xs font-mono text-slate-200"
                />
                <span className="absolute right-2 top-2 text-[10px] text-slate-500 font-bold">/</span>
              </div>
            </div>
          </div>
        </div>

        {/* 下單表格 */}
        <div className="bg-slate-850/50 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <th className="px-5 py-3">標的代號</th>
                  <th className="px-5 py-3 text-right">目標權重</th>
                  <th className="px-5 py-3 text-right">即時股價 (USD)</th>
                  <th className="px-5 py-3 text-right">分配美金 (USD)</th>
                  <th className="px-5 py-3 text-right">應買進股數</th>
                  <th className="px-5 py-3 text-right">預估剩餘現金</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs font-semibold">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500 font-medium">
                      請輸入有效的投入台幣金額與匯率以計算下單股數。
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.symbol} className="hover:bg-slate-800/25 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-emerald-400 font-bold font-mono px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/15 rounded">
                          {o.symbol}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-300">
                        {(o.targetPercent * 100).toFixed(0)}%
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-200">
                        ${o.price.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-200">
                        ${o.allocatedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-450 font-bold">
                        {o.sharesToBuy.toLocaleString()} 股
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-400">
                        ${o.remainingUSD.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 表格下方統計面板 */}
          {orders.length > 0 && (
            <div className="bg-slate-900/40 border-t border-slate-800 p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">換匯美金</span>
                <span className="text-sm font-bold font-mono text-slate-200">
                  ${totals.totalAllocatedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">實際買股花費</span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  ${totals.totalSpentUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">剩餘現金 (Cash Drag)</span>
                <span className="text-sm font-bold font-mono text-slate-400">
                  ${totals.totalRemainingUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">分配比例加總</span>
                <span className="text-sm font-bold font-mono text-slate-300">
                  {Math.round(totals.totalTargetPercent * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
