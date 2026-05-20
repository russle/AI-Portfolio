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
    <div className="space-y-8 bg-white text-slate-800 rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-md shadow-slate-100/50">
      {/* 標題與簡介 */}
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
          <Layers className="w-7 h-7 text-blue-600" />
          模組 C：樂高式配置與下單計算機
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          一鍵導入經典低成本資產配置模組，並動態精算每筆資金對應各標的的應下單股數，避免資金閒置。
        </p>
      </div>

      {/* C1 樂高模組一鍵套用 */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <span>步驟 1：選擇資產配置模型 (樂高積木組)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 最簡配置 */}
          <div
            onClick={() => handleLegoClick('simple')}
            className={`border cursor-pointer rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:shadow-sm relative overflow-hidden flex flex-col justify-between ${
              selectedLegoType === 'simple'
                ? 'bg-blue-50/30 border-blue-600 shadow-md shadow-blue-500/5'
                : 'bg-white border-slate-200 hover:bg-slate-50/50 hover:border-blue-300'
            }`}
          >
            {selectedLegoType === 'simple' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] rounded-full font-bold">
                使用中
              </span>
            )}
            <div className="space-y-2">
              <h4 className="text-md font-bold text-slate-700">1. 最簡配置</h4>
              <p className="text-xs text-slate-500 leading-normal">
                專為「極簡主義者」設計。僅需兩檔全球型 ETF，即可建構覆蓋全球股票與全球避險債券之核心組合。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 mt-2">
              <span className="px-2 py-0.5 bg-blue-50/50 border border-blue-100 font-mono text-[10px] rounded text-blue-600">VT: 70%</span>
              <span className="px-2 py-0.5 bg-slate-50/50 border border-slate-200 font-mono text-[10px] rounded text-slate-600">BNDW: 30%</span>
            </div>
          </div>

          {/* 股債精研 */}
          <div
            onClick={() => handleLegoClick('refined')}
            className={`border cursor-pointer rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:shadow-sm relative overflow-hidden flex flex-col justify-between ${
              selectedLegoType === 'refined'
                ? 'bg-blue-50/30 border-blue-600 shadow-md shadow-blue-500/5'
                : 'bg-white border-slate-200 hover:bg-slate-50/50 hover:border-blue-300'
            }`}
          >
            {selectedLegoType === 'refined' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] rounded-full font-bold">
                使用中
              </span>
            )}
            <div className="space-y-2">
              <h4 className="text-md font-bold text-slate-700">2. 股債精研</h4>
              <p className="text-xs text-slate-500 leading-normal">
                將股債市場進一步細分。區分美國本地與海外成熟市場股，並拆分美國債與國際債，追求更精細的分散。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 mt-2">
              <span className="px-2 py-0.5 bg-blue-50/50 border border-blue-100 font-mono text-[10px] rounded text-blue-600">VTI: 40%</span>
              <span className="px-2 py-0.5 bg-indigo-55/50 border border-indigo-100 font-mono text-[10px] rounded text-indigo-600">VXUS: 30%</span>
              <span className="px-2 py-0.5 bg-slate-50/50 border border-slate-200 font-mono text-[10px] rounded text-slate-600">BND: 20%</span>
              <span className="px-2 py-0.5 bg-slate-50/50 border border-slate-200 font-mono text-[10px] rounded text-slate-500">BNDX: 10%</span>
            </div>
          </div>

          {/* 多元資產 */}
          <div
            onClick={() => handleLegoClick('diverse')}
            className={`border cursor-pointer rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:shadow-sm relative overflow-hidden flex flex-col justify-between ${
              selectedLegoType === 'diverse'
                ? 'bg-blue-50/30 border-blue-600 shadow-md shadow-blue-500/5'
                : 'bg-white border-slate-200 hover:bg-slate-50/50 hover:border-blue-300'
            }`}
          >
            {selectedLegoType === 'diverse' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] rounded-full font-bold">
                使用中
              </span>
            )}
            <div className="space-y-2">
              <h4 className="text-md font-bold text-slate-700">3. 多元資產</h4>
              <p className="text-xs text-slate-500 leading-normal">
                經典全方位配置。除股債外，額外納入美國 REITs 指數與大宗商品實物，增強抗通膨屬性與資產相關性分散。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 mt-2">
              <span className="px-2 py-0.5 bg-blue-50/50 border border-blue-100 font-mono text-[10px] rounded text-blue-600">VTI: 35%</span>
              <span className="px-2 py-0.5 bg-indigo-55/50 border border-indigo-100 font-mono text-[10px] rounded text-indigo-600">VXUS: 25%</span>
              <span className="px-2 py-0.5 bg-slate-50/50 border border-slate-200 font-mono text-[10px] rounded text-slate-600">BND: 20%</span>
              <span className="px-2 py-0.5 bg-amber-50/50 border border-amber-100 font-mono text-[10px] rounded text-amber-600">VNQ: 10%</span>
              <span className="px-2 py-0.5 bg-orange-50/50 border border-orange-100 font-mono text-[10px] rounded text-orange-600">DBC: 10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* C2 即時下單股數計算機 */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span>步驟 2：輸入下單金額與匯率</span>
          </h3>

          <div className="flex flex-wrap gap-3">
            {/* 台幣投入金額 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">投入金額:</span>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  min="0"
                  value={investAmtTWD || ''}
                  onChange={(e) => setInvestAmtTWD(Number(e.target.value))}
                  className="w-36 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-xl pl-3 pr-10 py-1.5 text-xs font-mono text-slate-800 transition-all"
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">TWD</span>
              </div>
            </div>

            {/* 美金匯率 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">美金匯率:</span>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  value={exchangeRate || ''}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-24 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-xl pl-3 pr-6 py-1.5 text-xs font-mono text-slate-800 transition-all"
                />
                <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">/</span>
              </div>
            </div>
          </div>
        </div>

        {/* 下單表格 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  <th className="px-5 py-3">標的代號</th>
                  <th className="px-5 py-3 text-right">目標權重</th>
                  <th className="px-5 py-3 text-right">即時股價 (USD)</th>
                  <th className="px-5 py-3 text-right">分配美金 (USD)</th>
                  <th className="px-5 py-3 text-right">應買進股數</th>
                  <th className="px-5 py-3 text-right">預估剩餘現金</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-medium">
                      請輸入有效的投入台幣金額與匯率以計算下單股數。
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.symbol} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-blue-600 font-bold font-mono px-2 py-0.5 bg-blue-50 border border-blue-100 rounded">
                          {o.symbol}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-600">
                        {(o.targetPercent * 100).toFixed(0)}%
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                        ${o.price.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                        ${o.allocatedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-blue-600 font-bold">
                        {o.sharesToBuy.toLocaleString()} 股
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-500">
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
            <div className="bg-slate-50 border-t border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">換匯美金</span>
                <span className="text-sm font-bold font-mono text-slate-700">
                  ${totals.totalAllocatedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">實際買股花費</span>
                <span className="text-sm font-bold font-mono text-blue-600">
                  ${totals.totalSpentUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">剩餘現金 (Cash Drag)</span>
                <span className="text-sm font-bold font-mono text-slate-600">
                  ${totals.totalRemainingUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">分配比例加總</span>
                <span className="text-sm font-bold font-mono text-slate-600">
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
