import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { AlertBanner } from '../components/AlertBanner';
import { 
  calculateExactRebalance, 
  calculateCashOnlyRebalance, 
  calculateDcaAllocation, 
  ASSET_MAP 
} from '../utils/rebalance';

interface AssetOrderConfig {
  symbol: string;      // 標的代碼/名稱
  price: number;       // 目前單價
  currency: 'TWD' | 'USD';
}

export const OrderPage: React.FC = () => {
  const { state, updateUsdRate } = useApp();
  const { portfolio, allocation_target } = state;

  // 1. 設定各資產大類的代表標的與目前市價
  const [orderConfigs, setOrderConfigs] = useState<Record<string, AssetOrderConfig>>({
    tw_stock: { symbol: '0050 (元大台灣50)', price: 165, currency: 'TWD' },
    us_stock: { symbol: 'VT (先鋒全球股票)', price: 112, currency: 'USD' },
    fund: { symbol: '全球優質債券基金', price: 25, currency: 'TWD' },
    crypto: { symbol: 'BTC (比特幣)', price: 67000, currency: 'USD' },
    cash: { symbol: '台幣現金存款', price: 1, currency: 'TWD' }
  });

  // [NEW] 下單計算器相關狀態
  const [newCash, setNewCash] = useState<number>(50000);
  const [orderMode, setOrderMode] = useState<'cash_rebalance' | 'cash_fixed' | 'exact' | 'dca'>('cash_rebalance');

  // 美金匯率微調 (已全域化)
  const usdFxRate = portfolio.usdRate ?? 32.2;

  // 2. 依模式動態計算大類配置調整差額
  const currentRebalanceData = useMemo(() => {
    if (orderMode === 'cash_rebalance') {
      return calculateCashOnlyRebalance(portfolio, allocation_target, newCash);
    } else if (orderMode === 'cash_fixed') {
      // 軌道 2：新資金定比下單 (只買不賣)
      const total = portfolio.cash + portfolio.fund + portfolio.tw_stock + portfolio.us_stock + portfolio.crypto;
      return (Object.keys(ASSET_MAP) as Array<keyof typeof ASSET_MAP>).map(key => {
        const mapping = ASSET_MAP[key];
        const currentValue = portfolio[key];
        const targetPercent = allocation_target[mapping.targetKey];
        const currentPercent = total > 0 ? currentValue / total : 0;
        const actionAmount = newCash * targetPercent;
        
        return {
          assetKey: key,
          displayName: mapping.name,
          currentValue,
          currentPercent,
          targetPercent,
          differencePercent: currentPercent - targetPercent,
          actionAmount // 均為正數
        };
      });
    } else if (orderMode === 'exact') {
      // 軌道 3：精準雙向調整
      return calculateExactRebalance(portfolio, allocation_target);
    }
    return [];
  }, [portfolio, allocation_target, orderMode, newCash]);

  // [NEW] 定期定額 DCA 智慧分配計算
  const dcaResults = useMemo(() => {
    if (orderMode !== 'dca') return [];
    return calculateDcaAllocation(portfolio.holdings || [], portfolio, allocation_target, newCash, usdFxRate);
  }, [portfolio, allocation_target, orderMode, newCash, usdFxRate]);

  // 修改特定資產的單價或標的名稱
  const handleConfigChange = (key: string, field: keyof AssetOrderConfig, value: string | number) => {
    setOrderConfigs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // 3. 計算大類下單換算結果
  const orderResults = useMemo(() => {
    return currentRebalanceData.map(item => {
      const config = orderConfigs[item.assetKey];
      const targetActionTwd = item.actionAmount; // 正數代表買，負數代表賣
      const isCash = item.assetKey === 'cash';

      // 轉換單價為台幣
      const priceTwd = config.currency === 'USD' ? config.price * usdFxRate : config.price;
      
      let shares = 0;
      let actualSpentTwd = 0;
      let remainderTwd = 0;

      if (isCash) {
        shares = Math.round(targetActionTwd);
        actualSpentTwd = targetActionTwd;
        remainderTwd = 0;
      } else if (priceTwd > 0) {
        const absAction = Math.abs(targetActionTwd);
        
        if (item.assetKey === 'crypto') {
          shares = absAction / priceTwd;
          actualSpentTwd = absAction;
          remainderTwd = 0;
        } else {
          shares = Math.floor(absAction / priceTwd);
          actualSpentTwd = shares * priceTwd;
          remainderTwd = absAction - actualSpentTwd;
        }

        if (targetActionTwd < 0) {
          shares = -shares;
          actualSpentTwd = -actualSpentTwd;
          remainderTwd = -remainderTwd;
        }
      }

      return {
        ...item,
        symbol: config.symbol,
        price: config.price,
        currency: config.currency,
        priceTwd,
        shares,
        actualSpentTwd,
        remainderTwd
      };
    });
  }, [currentRebalanceData, orderConfigs, usdFxRate]);

  // 過濾出有需要交易的項目
  const activeOrders = useMemo(() => {
    return orderResults.filter(o => Math.abs(o.actionAmount) >= 1 && o.assetKey !== 'cash');
  }, [orderResults]);

  // [NEW] 過濾出有需要交易的 DCA 項目
  const activeDcaOrders = useMemo(() => {
    return dcaResults.filter(o => o.sharesToBuy > 0);
  }, [dcaResults]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 頂部引言 */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">交易下單輔助換算 (Order Helper)</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          再平衡算出了台幣金額，但不知道該去券商下單幾股嗎？此頁面協助您切換不同入金與調整軌道，自動將再平衡交易金額換算成對應的 **下單股數**，並精算剩餘零頭。
        </p>
      </div>

      <AlertBanner
        type="success"
        message="💡 沙盒安全提示：本交易下單輔助器為 100% 唯讀模擬沙盒，計算結果不會覆寫與修改您的真實持有資產數據，請放心進行多種入金配置模擬！"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* 左側：模式與市價設定面板 */}
        <Card className="p-6 xl:col-span-1 space-y-6">
          <div>
            <h3 className="font-bold text-slate-700 text-sm tracking-wide border-b border-slate-100 pb-3">下單計算器控制台</h3>
            <p className="text-xs text-slate-400 mt-1">請選擇您的下單交易軌道與投入資金：</p>
          </div>

          {/* 下單模式高級 Tabs - 4-tabs 佈局 */}
          <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setOrderMode('cash_rebalance')}
              className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all whitespace-nowrap px-1.5 ${
                orderMode === 'cash_rebalance'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ⚖️ 智慧再平衡
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('cash_fixed')}
              className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all whitespace-nowrap px-1.5 ${
                orderMode === 'cash_fixed'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📈 定比分配
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('dca')}
              className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all whitespace-nowrap px-1.5 ${
                orderMode === 'dca'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              💰 定期定額 DCA
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('exact')}
              className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all whitespace-nowrap px-1.5 ${
                orderMode === 'exact'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              🔄 雙向精準
            </button>
          </div>

          {/* 新增新資金輸入框 */}
          {(orderMode === 'cash_rebalance' || orderMode === 'cash_fixed' || orderMode === 'dca') && (
            <div className="animate-fade-in space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
              <label className="text-xs font-black text-blue-700 flex items-center gap-1">
                💰 {orderMode === 'dca' ? '每月定期定額預算 (DCA Budget)' : '預計投入新資金'} (TWD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={newCash}
                  onChange={(e) => setNewCash(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-2 border border-blue-200 rounded-lg text-sm font-black text-blue-800 bg-white focus:outline-none focus:border-blue-500"
                  placeholder="請輸入欲投入金額"
                  step="1000"
                />
                <span className="absolute left-2.5 top-2 text-sm font-bold text-blue-400">$</span>
              </div>
              <span className="text-[10px] text-blue-500 block leading-relaxed">
                {orderMode === 'cash_rebalance' && '💡 智慧模式：新資金將「只買不賣」優先填補當前低配最嚴重的部位，在不賣出現有資產的前提下漸進達成再平衡。'}
                {orderMode === 'cash_fixed' && '💡 定比模式：新資金將按您設定的目標權重定比分配，不考慮當前的實際偏離狀態。'}
                {orderMode === 'dca' && '💡 定期定額 DCA：每月定額預算將在「只買不賣」前提下優先填補低配個股，並精算至整股/零股與找零。'}
              </span>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-slate-400 block mb-3 uppercase tracking-wider">市價與匯率微調</h4>
            <div className="space-y-4">
              {/* 匯率 */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">美金對台幣匯率 (USD/TWD)</label>
                <input
                  type="number"
                  value={usdFxRate}
                  onChange={(e) => updateUsdRate(parseFloat(e.target.value) || 32)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                  step="0.05"
                />
              </div>

              {orderMode !== 'dca' && Object.keys(ASSET_MAP).map(key => {
                if (key === 'cash') return null;
                const mapping = ASSET_MAP[key as keyof typeof ASSET_MAP];
                const config = orderConfigs[key];

                return (
                  <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 block">{mapping.name} 代表標的</span>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        value={config.symbol}
                        onChange={(e) => handleConfigChange(key, 'symbol', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                        placeholder="標代碼/名稱"
                      />
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={config.price}
                          onChange={(e) => handleConfigChange(key, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white"
                          placeholder="每股單價"
                          step="0.01"
                        />
                        <select
                          value={config.currency}
                          onChange={(e) => handleConfigChange(key, 'currency', e.target.value as 'TWD' | 'USD')}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 bg-white focus:outline-none"
                        >
                          <option value="TWD">TWD</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {orderMode === 'dca' && (
                <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 select-none">
                  💡 定期定額智慧分配模式自動抓取您登載的真實持股明細價格與即時美金匯率，無需在此手動設定大類代表標的價格。
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 右側：下單換算結果表格 */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-sm tracking-wide">
                自動下單股數建議表 ({
                  orderMode === 'cash_rebalance' ? '智慧再平衡' : 
                  orderMode === 'cash_fixed' ? '新資金定比' : 
                  orderMode === 'dca' ? '定期定額 DCA 智慧分配' : '精準平衡'
                })
              </h3>
              <span className="text-xs text-slate-400">目前匯率：<span className="font-bold text-slate-600">1 USD = {usdFxRate} TWD</span></span>
            </div>

            {orderMode === 'dca' ? (
              // 💰 定期定額 DCA 智慧分配 (個股持股明細模式)
              <div className="overflow-x-auto">
                {(!portfolio.isHoldingMode || !portfolio.holdings || portfolio.holdings.length === 0) ? (
                  <div className="p-10 text-center space-y-3">
                    <span className="text-slate-400 font-bold block text-sm">⚠️ 尚未啟用或登載持股明細</span>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                      本定期定額 DCA 智慧分配是基於「持股明細模式」所設計。請前往「配置目標」開啟持股明細模式並登載標的，以體驗最精密整股換算的個股 DCA 投資指南！
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/30">
                        <th className="px-6 py-4">持股標的</th>
                        <th className="px-6 py-4">大類屬性</th>
                        <th className="px-6 py-4 text-right">當前市值 (TWD)</th>
                        <th className="px-6 py-4 text-right">目標佔比</th>
                        <th className="px-6 py-4 text-right">DCA 分配 (TWD)</th>
                        <th className="px-6 py-4 text-center">建議買入</th>
                        <th className="px-6 py-4 text-right">剩餘現金找零</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80 text-sm font-medium text-slate-600">
                      {dcaResults.map(item => {
                        const hasAllocation = item.allocatedAmountTwd >= 1;
                        const badgeBg = 'bg-indigo-50 text-indigo-600 border border-indigo-100';

                        return (
                          <tr key={item.holdingId} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-700">{item.symbol}</div>
                              <div className="text-[10px] text-slate-400 font-bold mt-0.5">{item.name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                                {ASSET_MAP[item.assetKey].name.split(' ')[0]}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-600">
                              ${Math.round(item.currentValueTwd).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right text-xs font-extrabold text-slate-500">
                              {(item.targetPercent * 100).toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={hasAllocation ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}>
                                {hasAllocation ? `+$${Math.round(item.allocatedAmountTwd).toLocaleString()}` : '$0'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {item.sharesToBuy <= 0 ? (
                                <span className="text-slate-400 text-xs">免買入</span>
                              ) : (
                                <span className={`px-2 py-1 rounded text-xs font-black ${badgeBg}`}>
                                  買 {item.assetKey === 'crypto' ? item.sharesToBuy.toFixed(4) : item.sharesToBuy.toLocaleString()} {item.assetKey === 'crypto' ? '單位' : '股'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-400">
                              ${Math.round(item.remainingCashTwd).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              // 原有的大類分配表格
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/30">
                      <th className="px-6 py-4">資產大類</th>
                      <th className="px-6 py-4">對應標的</th>
                      <th className="px-6 py-4 text-right">目標分配/調整</th>
                      <th className="px-6 py-4 text-right">標的報價</th>
                      <th className="px-6 py-4 text-center">需交易股數</th>
                      <th className="px-6 py-4 text-right">實際交易值 (TWD)</th>
                      <th className="px-6 py-4 text-right">剩餘零頭 (TWD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80 text-sm font-medium text-slate-600">
                    {orderResults.map(item => {
                      const isCash = item.assetKey === 'cash';
                      const absAction = Math.abs(item.actionAmount);
                      const isBuy = item.actionAmount > 0;
                      
                      if (isCash) {
                        return (
                          <tr key={item.assetKey} className="bg-slate-50/20 text-slate-400">
                            <td className="px-6 py-4 font-bold text-slate-500">{item.displayName}</td>
                            <td className="px-6 py-4 text-xs italic">
                              {orderMode !== 'exact' ? '注入儲蓄現金' : '無須交易下單'}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold">
                              {item.actionAmount > 0 ? '+' : ''}${Math.round(item.actionAmount).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right">-</td>
                            <td className="px-6 py-4 text-center">-</td>
                            <td className="px-6 py-4 text-right">-</td>
                            <td className="px-6 py-4 text-right">-</td>
                          </tr>
                        );
                      }

                      let actionColor = 'text-slate-500';
                      let badgeBg = 'bg-slate-100';
                      if (item.actionAmount > 0) {
                        actionColor = 'text-emerald-600 font-bold';
                        badgeBg = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                      } else if (item.actionAmount < 0) {
                        actionColor = 'text-rose-600 font-bold';
                        badgeBg = 'bg-rose-50 text-rose-600 border border-rose-100';
                      }

                      return (
                        <tr key={item.assetKey} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-700">{item.displayName}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-700">{item.symbol}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={actionColor}>
                              {isBuy ? '買入 +' : '賣出 -'}${Math.round(absAction).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-xs">
                            {item.price} {item.currency}
                            {item.currency === 'USD' && (
                              <span className="block text-[10px] text-slate-400">≈ ${Math.round(item.priceTwd)} TWD</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {absAction < 10 ? (
                              <span className="text-slate-400 text-xs">免調整</span>
                            ) : (
                              <span className={`px-2 py-1 rounded text-xs font-black ${badgeBg}`}>
                                {item.shares > 0 ? '買 ' : '賣 '}{Math.abs(item.shares).toLocaleString()} {item.assetKey === 'crypto' ? '單位' : '股'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-700">
                            ${Math.round(Math.abs(item.actualSpentTwd)).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-400">
                            ${Math.round(Math.abs(item.remainderTwd)).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* 券商下單指南 */}
          <Card className="p-6">
            <h4 className="font-bold text-slate-700 text-sm tracking-wide mb-3">📋 券商再平衡下單行動指南</h4>
            <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
              {orderMode === 'dca' ? (
                // DCA 智慧分配下單指南
                (!portfolio.isHoldingMode || !portfolio.holdings || portfolio.holdings.length === 0 || activeDcaOrders.length === 0) ? (
                  <div className="text-slate-400 font-semibold p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    🎉 目前無須進行任何下單交易！
                  </div>
                ) : (
                  <ol className="list-decimal list-inside space-y-2">
                    {activeDcaOrders.map((ord) => {
                      return (
                        <li key={ord.holdingId} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          前往您的
                          <span className="font-bold text-slate-700 mx-1">{ord.currency === 'USD' ? '海外券商/複委託' : '國內證券商'}</span>
                          ，對標的物
                          <span className="font-bold text-slate-700 mx-1">{ord.symbol} ({ord.name})</span>
                          送出
                          <span className="font-black mx-1 text-indigo-600">
                            買入 {ord.assetKey === 'crypto' ? ord.sharesToBuy.toFixed(4) : ord.sharesToBuy.toLocaleString()} {ord.assetKey === 'crypto' ? '單位' : '股'}
                          </span>
                          的限價單或市價單。預估台幣成交價值為
                          <span className="font-bold text-slate-600 mx-1">${Math.round(ord.sharesToBuy * ord.priceTwd).toLocaleString()} TWD</span>
                          。
                        </li>
                      );
                    })}
                  </ol>
                )
              ) : (
                // 大類再平衡下單指南
                activeOrders.length === 0 ? (
                  <div className="text-slate-400 font-semibold p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    🎉 目前無須進行任何下單交易！
                  </div>
                ) : (
                  <ol className="list-decimal list-inside space-y-2">
                    {activeOrders.map((ord) => {
                      const absShares = Math.abs(ord.shares);
                      const isBuy = ord.actionAmount > 0;
                      
                      return (
                        <li key={ord.assetKey} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          前往您的
                          <span className="font-bold text-slate-700 mx-1">{ord.currency === 'USD' ? '海外券商/複委託' : '國內證券商'}</span>
                          ，對標的物
                          <span className="font-bold text-slate-700 mx-1">{ord.symbol}</span>
                          送出
                          <span className={`font-black mx-1 ${isBuy ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isBuy ? '買入' : '賣出'} {ord.assetKey === 'crypto' ? absShares.toFixed(4) : absShares.toLocaleString()} {ord.assetKey === 'crypto' ? '單位' : '股'}
                          </span>
                          的限價單或市價單。預估台幣成交價值為
                          <span className="font-bold text-slate-600 mx-1">${Math.round(Math.abs(ord.actualSpentTwd)).toLocaleString()} TWD</span>
                          。
                        </li>
                      );
                    })}
                  </ol>
                )
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
