import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Layers, Plus, Trash2, Coins, TrendingUp } from 'lucide-react';

const INNER_COLORS = { stock: '#3B82F6', bond: '#94A3B8' };
const STOCK_COLORS = ['#2563EB', '#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD', '#1E3A8A'];
const BOND_COLORS = ['#475569', '#64748B', '#94A3B8', '#CBD5E1', '#334155', '#1E293B'];

export const PortfolioExecutor: React.FC = () => {
  const {
    selectedLegoType,
    targetWeights,
    applyLegoPortfolio,
    investAmtTWD,
    setInvestAmtTWD,
    exchangeRate,
    setExchangeRate,
    etfPrices,
    etfAssetClasses,
    setEtfAssetClass,
    setTargetWeight,
    setEtfPrice,
    setEtfCurrency,
    removeCustomEtf
  } = useApp();

  const [newSymbol, setNewSymbol] = useState('');
  const [newPrice, setNewPrice] = useState<number>(100);
  const [newAssetClass, setNewAssetClass] = useState<'stock' | 'bond'>('stock');

  // 計算每個標的的下單明細
  const orders = useMemo(() => {
    const safeAmt = investAmtTWD > 0 ? investAmtTWD : 0;
    const safeEx = exchangeRate > 0 ? exchangeRate : 32.2; // 安全匯率避免除以 0
    const totalUSD = safeAmt / safeEx;

    return Object.entries(targetWeights).map(([symbol, targetPercent]) => {
      const price = etfPrices[symbol] || 100; // 預設 100 以防無價格
      const allocatedUSD = totalUSD * targetPercent;
      
      // 若台幣投入金額為 0，則下單股數與剩餘金額皆為 0
      const sharesToBuy = safeAmt > 0 ? Math.floor(allocatedUSD / price) : 0;
      const remainingUSD = safeAmt > 0 ? allocatedUSD - (sharesToBuy * price) : 0;

      return {
        symbol,
        targetPercent,
        price,
        allocatedUSD,
        sharesToBuy,
        remainingUSD
      };
    });
  }, [investAmtTWD, exchangeRate, targetWeights, etfPrices]);

  // 計算整體加總統計
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

  // 行內新增自訂標的
  const handleAddNewSymbol = () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) {
      alert('請輸入有效的標的代號！');
      return;
    }
    if (targetWeights[symbol] !== undefined) {
      alert(`標的 ${symbol} 已存在於配置清單中！`);
      return;
    }
    setEtfPrice(symbol, newPrice);
    setEtfCurrency(symbol, 'USD');
    setEtfAssetClass(symbol, newAssetClass);
    setTargetWeight(symbol, 0); // 加入配置地圖，初始權重為 0%
    setNewSymbol('');
    setNewPrice(100);
  };

  const handleLegoClick = (type: 'simple' | 'refined' | 'diverse') => {
    applyLegoPortfolio(type);
  };

  // 生成同心雙層圓環圖數據，並分配專屬 HSL 階梯漸層色
  const donutData = useMemo(() => {
    let stockIndex = 0;
    let bondIndex = 0;

    const outer = Object.entries(targetWeights)
      .filter(([_, weight]) => weight > 0)
      .map(([symbol, weight]) => {
        const assetClass = etfAssetClasses[symbol] || 'stock';
        let color = '';
        if (assetClass === 'stock') {
          color = STOCK_COLORS[stockIndex % STOCK_COLORS.length];
          stockIndex++;
        } else {
          color = BOND_COLORS[bondIndex % BOND_COLORS.length];
          bondIndex++;
        }
        return {
          name: symbol,
          value: Math.round(weight * 100),
          assetClass,
          color
        };
      });

    let stockWeight = 0;
    let bondWeight = 0;
    Object.entries(targetWeights).forEach(([symbol, weight]) => {
      if (weight > 0) {
        const assetClass = etfAssetClasses[symbol] || 'stock';
        if (assetClass === 'stock') stockWeight += weight;
        else bondWeight += weight;
      }
    });

    const inner = [];
    if (stockWeight > 0) {
      inner.push({
        name: '📈 股票資產',
        value: Math.round(stockWeight * 100),
        assetClass: 'stock',
        color: INNER_COLORS.stock
      });
    }
    if (bondWeight > 0) {
      inner.push({
        name: '🛡️ 債券資產',
        value: Math.round(bondWeight * 100),
        assetClass: 'bond',
        color: INNER_COLORS.bond
      });
    }

    return { inner, outer };
  }, [targetWeights, etfAssetClasses]);

  return (
    <div className="space-y-8 bg-white text-slate-800 rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-md shadow-slate-100/50">
      {/* 標題與簡介 */}
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
          <Layers className="w-7 h-7 text-blue-600" />
          模組 C：AI資產配置戰略總覽與下單計算機
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          一鍵套用經典低成本資產配置模組，或自由新增美股個股與 ETF，動態演算每筆資金應下單股數，消滅資金閒置。
        </p>
      </div>

      {/* C1 樂高模組一鍵套用 */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <span>步驟 1：選擇資產配置模型 (樂高積木組)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => handleLegoClick('simple')}
            className={`border cursor-pointer rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:shadow-sm relative overflow-hidden flex flex-col justify-between ${
              selectedLegoType === 'simple'
                ? 'bg-blue-50/30 border-blue-600 shadow-md shadow-blue-500/5'
                : 'bg-white border-slate-200 hover:bg-slate-50/50 hover:border-blue-300'
            }`}
          >
            {selectedLegoType === 'simple' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] rounded-full font-bold">使用中</span>
            )}
            <div className="space-y-2">
              <h4 className="text-md font-bold text-slate-700">1. 最簡配置</h4>
              <p className="text-xs text-slate-500 leading-normal">專為「極簡主義者」設計。僅需兩檔全球型 ETF，即可建構覆蓋全球股票與全球避險債券之核心組合。</p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 mt-2">
              <span className="px-2 py-0.5 bg-blue-50/50 border border-blue-100 font-mono text-[10px] rounded text-blue-600">VT: 70%</span>
              <span className="px-2 py-0.5 bg-slate-50/50 border border-slate-200 font-mono text-[10px] rounded text-slate-600">BNDW: 30%</span>
            </div>
          </div>

          <div
            onClick={() => handleLegoClick('refined')}
            className={`border cursor-pointer rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:shadow-sm relative overflow-hidden flex flex-col justify-between ${
              selectedLegoType === 'refined'
                ? 'bg-blue-50/30 border-blue-600 shadow-md shadow-blue-500/5'
                : 'bg-white border-slate-200 hover:bg-slate-50/50 hover:border-blue-300'
            }`}
          >
            {selectedLegoType === 'refined' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] rounded-full font-bold">使用中</span>
            )}
            <div className="space-y-2">
              <h4 className="text-md font-bold text-slate-700">2. 股債精研</h4>
              <p className="text-xs text-slate-500 leading-normal">將股債市場進一步細分。區分美國本地與海外成熟市場股，並拆分美國債與國際債，追求更精細的分散。</p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 mt-2">
              <span className="px-2 py-0.5 bg-blue-50/50 border border-blue-100 font-mono text-[10px] rounded text-blue-600">VTI: 40%</span>
              <span className="px-2 py-0.5 bg-indigo-50/50 border border-indigo-100 font-mono text-[10px] rounded text-indigo-600">VXUS: 30%</span>
              <span className="px-2 py-0.5 bg-slate-50/50 border border-slate-200 font-mono text-[10px] rounded text-slate-600">BND: 20%</span>
              <span className="px-2 py-0.5 bg-slate-50/50 border border-slate-200 font-mono text-[10px] rounded text-slate-500">BNDX: 10%</span>
            </div>
          </div>

          <div
            onClick={() => handleLegoClick('diverse')}
            className={`border cursor-pointer rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:shadow-sm relative overflow-hidden flex flex-col justify-between ${
              selectedLegoType === 'diverse'
                ? 'bg-blue-50/30 border-blue-600 shadow-md shadow-blue-500/5'
                : 'bg-white border-slate-200 hover:bg-slate-50/50 hover:border-blue-300'
            }`}
          >
            {selectedLegoType === 'diverse' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] rounded-full font-bold">使用中</span>
            )}
            <div className="space-y-2">
              <h4 className="text-md font-bold text-slate-700">3. 多元資產</h4>
              <p className="text-xs text-slate-500 leading-normal">經典全方位配置。除股債外，額外納入美國 REITs 指數與大宗商品實物，增強抗通膨屬性與資產相關性分散。</p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 mt-2">
              <span className="px-2 py-0.5 bg-blue-50/50 border border-blue-100 font-mono text-[10px] rounded text-blue-600">VTI: 35%</span>
              <span className="px-2 py-0.5 bg-indigo-50/50 border border-indigo-100 font-mono text-[10px] rounded text-indigo-600">VXUS: 25%</span>
              <span className="px-2 py-0.5 bg-slate-50/50 border border-slate-200 font-mono text-[10px] rounded text-slate-600">BND: 20%</span>
              <span className="px-2 py-0.5 bg-amber-50/50 border border-amber-100 font-mono text-[10px] rounded text-amber-600">VNQ: 10%</span>
              <span className="px-2 py-0.5 bg-orange-50/50 border border-orange-100 font-mono text-[10px] rounded text-orange-600">DBC: 10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* C2 即時下單股數計算機與視覺化排版 */}
      <div className="space-y-6 pt-2 border-t border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span>步驟 2：輸入下單金額與匯率</span>
          </h3>
          <div className="flex flex-wrap gap-3">
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

        {/* 狀態同步提示條 */}
        {orders.length > 0 && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
            Math.abs(totals.totalTargetPercent - 1.0) < 0.001 ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-amber-50/50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${Math.abs(totals.totalTargetPercent - 1.0) < 0.001 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></div>
              <span>
                {Math.abs(totals.totalTargetPercent - 1.0) < 0.001
                  ? `配置總目標比例已達 100%！已成功同步全站股債模擬（目前股票/風險資產比重為 ${Math.round(orders.reduce((sum, o) => sum + ((etfAssetClasses[o.symbol] || 'stock') === 'stock' ? o.targetPercent : 0), 0) * 100)}%）與退休財務計算。`
                  : `目標權重總和為 ${Math.round(totals.totalTargetPercent * 100)}%（未達 100%）。系統連動已暫停，請將比例調至 100% 恢復同步。`}
              </span>
            </div>
            {Math.abs(totals.totalTargetPercent - 1.0) < 0.001 ? (
              <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-[10px] rounded-full uppercase tracking-wider font-bold">已同步</span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-[10px] rounded-full uppercase tracking-wider font-bold">暫停同步</span>
            )}
          </div>
        )}

        {/* 響應式排版：左 2/3 下單表格，右 1/3 圓餅圖與精算統計 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* 左側 2/3 下單表格區域 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <th className="px-5 py-3">標的代號</th>
                      <th className="px-5 py-3">資產屬性</th>
                      <th className="px-5 py-3 text-right">目標權重</th>
                      <th className="px-5 py-3 text-right">估算股價 (USD)</th>
                      <th className="px-5 py-3 text-right">分配美金</th>
                      <th className="px-5 py-3 text-right">應下單股數</th>
                      <th className="px-5 py-3 text-right">剩餘美金</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-medium">
                          請套用配置模型或於下方新增自訂標的。
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr key={o.symbol} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => removeCustomEtf(o.symbol)}
                                className="p-1 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition-all cursor-pointer"
                                title={`移除標的 ${o.symbol}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-blue-600 font-bold font-mono px-2 py-0.5 bg-blue-50 border border-blue-100 rounded">
                                {o.symbol}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => {
                                const currentClass = etfAssetClasses[o.symbol] || 'stock';
                                setEtfAssetClass(o.symbol, currentClass === 'stock' ? 'bond' : 'stock');
                              }}
                              className={`px-2.5 py-1 border text-[10px] rounded-full font-bold cursor-pointer transition-all hover:scale-105 ${
                                (etfAssetClasses[o.symbol] || 'stock') === 'stock'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {(etfAssetClasses[o.symbol] || 'stock') === 'stock' ? '📈 股票型' : '🛡️ 債券型'}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={Math.round(o.targetPercent * 100)}
                                onChange={(e) => {
                                  const newWeight = Math.max(0, Math.min(100, Number(e.target.value))) / 100;
                                  setTargetWeight(o.symbol, newWeight);
                                }}
                                className="w-14 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-lg px-2 py-1 text-right font-mono text-xs text-slate-800 transition-all"
                              />
                              <span className="text-slate-400 font-bold">%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-700">${o.price.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                            ${o.allocatedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-blue-600 font-bold">
                            {o.sharesToBuy.toLocaleString()} 股
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-500">${o.remainingUSD.toFixed(2)}</td>
                        </tr>
                      ))
                    )}

                    {/* 行內一體化新增自訂標的列 */}
                    <tr className="bg-slate-50/40 border-t border-slate-200">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 text-blue-500 shrink-0">
                            <Plus className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            placeholder="代號: AAPL"
                            value={newSymbol}
                            onChange={(e) => setNewSymbol(e.target.value)}
                            className="w-24 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-lg px-2 py-1 text-xs font-mono font-bold placeholder:text-slate-350"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={newAssetClass}
                          onChange={(e) => setNewAssetClass(e.target.value as 'stock' | 'bond')}
                          className="bg-white border border-slate-200 focus:border-blue-500 focus:outline-none rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700"
                        >
                          <option value="stock">📈 股票型 (Stock)</option>
                          <option value="bond">🛡️ 債券型 (Bond)</option>
                        </select>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-slate-400 font-mono text-xs pr-4">0% (預設)</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={newPrice || ''}
                            onChange={(e) => setNewPrice(Number(e.target.value))}
                            className="w-16 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none rounded-lg px-2 py-1 text-right font-mono text-xs text-slate-800"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-400 font-mono">-</td>
                      <td className="px-5 py-3 text-right text-slate-400 font-mono">-</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={handleAddNewSymbol}
                          className="px-3 py-1 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95 ml-auto"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          新增標的
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 右側 1/3 圓餅視覺化與資金精算統計區域 */}
          <div className="space-y-6">
            
            {/* 1. 同心雙層圓環圖卡片 */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>資產配置視覺化圓環</span>
              </h3>
              
              {donutData.outer.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-slate-400 font-medium">
                  暫無配置數據，請設定大於 0% 的權重。
                </div>
              ) : (
                <div className="relative h-56 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900/90 text-white px-3 py-2 rounded-xl border border-slate-700 shadow-xl text-xs font-semibold backdrop-blur-md">
                                <p className="font-bold text-slate-200">{data.name}</p>
                                <p className="mt-1 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></span>
                                  <span>比例: {data.value}%</span>
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  類型: {data.assetClass === 'stock' ? '📈 股票型' : '🛡️ 債券型'}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* 內圈：股債大類 */}
                      <Pie
                        data={donutData.inner}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                      >
                        {donutData.inner.map((entry, index) => (
                          <Cell key={`cell-inner-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      
                      {/* 外圈：具體標的 */}
                      <Pie
                        data={donutData.outer}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={95}
                        paddingAngle={1}
                      >
                        {donutData.outer.map((entry, index) => (
                          <Cell key={`cell-outer-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* 圓環中心的資訊 */}
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">股債比</span>
                    <span className="text-lg font-extrabold text-slate-700 font-mono">
                      {Math.round(donutData.inner.find(i => i.assetClass === 'stock')?.value || 0)}
                      <span className="text-xs text-slate-400 font-medium">/</span>
                      {Math.round(donutData.inner.find(i => i.assetClass === 'bond')?.value || 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* 自訂比例 Legend 面板 */}
              {donutData.outer.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">配置比重圖例</span>
                  
                  {/* 股票大類 */}
                  {donutData.inner.some(i => i.assetClass === 'stock') && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-600">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          股票與風險資產
                        </span>
                        <span className="font-mono">{Math.round(donutData.inner.find(i => i.assetClass === 'stock')?.value || 0)}%</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-3">
                        {donutData.outer.filter(o => o.assetClass === 'stock').map(o => (
                          <div key={o.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-150 px-2 py-0.5 rounded-lg shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: o.color }}></span>
                            <span className="font-mono text-slate-700">{o.name}</span>
                            <span className="text-slate-400 font-mono">{o.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 債券大類 */}
                  {donutData.inner.some(i => i.assetClass === 'bond') && (
                    <div className="space-y-1.5 mt-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          債券與避險資產
                        </span>
                        <span className="font-mono">{Math.round(donutData.inner.find(i => i.assetClass === 'bond')?.value || 0)}%</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-3">
                        {donutData.outer.filter(o => o.assetClass === 'bond').map(o => (
                          <div key={o.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-150 px-2 py-0.5 rounded-lg shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: o.color }}></span>
                            <span className="font-mono text-slate-700">{o.name}</span>
                            <span className="text-slate-400 font-mono">{o.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. 下單資金精算統計卡片 */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-blue-600" />
                <span>下單資金精算統計</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-slate-150 p-3 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">投入台幣</span>
                  <span className="text-xs font-bold font-mono text-slate-700 mt-1">
                    NT$ {investAmtTWD.toLocaleString()}
                  </span>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-150 p-3 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">換匯美金</span>
                  <span className="text-xs font-bold font-mono text-slate-700 mt-1">
                    ${totals.totalAllocatedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-3 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">買股花費</span>
                  <span className="text-xs font-bold font-mono text-blue-600 mt-1">
                    ${totals.totalSpentUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-3 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">剩餘美金現金</span>
                  <span className="text-xs font-bold font-mono text-slate-600 mt-1">
                    ${totals.totalRemainingUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-3.5 flex items-center justify-between text-xs font-semibold">
                <div className="space-y-0.5">
                  <span className="block text-[9px] text-blue-500 font-bold uppercase tracking-wider">現金拖累 (Cash Drag)</span>
                  <p className="text-slate-500 text-[10px] leading-normal font-medium pr-2">由於美股下單最少以 1 股為單位，剩餘美金將保留為現金。</p>
                </div>
                <span className="text-xs font-extrabold font-mono text-blue-600 shrink-0">
                  {totals.totalAllocatedUSD > 0 
                    ? `${((totals.totalRemainingUSD / totals.totalAllocatedUSD) * 100).toFixed(2)}%`
                    : '0.00%'}
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
