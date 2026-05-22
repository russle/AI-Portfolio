import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { AlertBanner } from '../components/AlertBanner';
import { calculateExactRebalance, ASSET_MAP } from '../utils/rebalance';

interface AssetOrderConfig {
  symbol: string;      // 標的代碼/名稱
  price: number;       // 目前單價
  currency: 'TWD' | 'USD';
}

export const OrderPage: React.FC = () => {
  const { state } = useApp();
  const { portfolio, allocation_target } = state;

  // 1. 設定各資產大類的代表標的與目前市價
  const [orderConfigs, setOrderConfigs] = useState<Record<string, AssetOrderConfig>>({
    tw_stock: { symbol: '0050 (元大台灣50)', price: 165, currency: 'TWD' },
    us_stock: { symbol: 'VT (先鋒全球股票)', price: 112, currency: 'USD' },
    fund: { symbol: '全球優質債券基金', price: 25, currency: 'TWD' },
    crypto: { symbol: 'BTC (比特幣)', price: 67000, currency: 'USD' },
    cash: { symbol: '台幣現金存款', price: 1, currency: 'TWD' }
  });

  // 美金匯率微調
  const [usdFxRate, setUsdFxRate] = useState<number>(32.2);

  // 2. 獲取精準再平衡的交易建議金額 (以 TWD 為單位)
  const exactRebalanceData = useMemo(() => {
    return calculateExactRebalance(portfolio, allocation_target);
  }, [portfolio, allocation_target]);

  // 修改特定資產的單價或標的名稱
  const handleConfigChange = (key: string, field: keyof AssetOrderConfig, value: any) => {
    setOrderConfigs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // 3. 計算下單換算結果
  const orderResults = useMemo(() => {
    return exactRebalanceData.map(item => {
      const config = orderConfigs[item.assetKey];
      const targetActionTwd = item.actionAmount; // 正數代表買，負數代表賣
      const isCash = item.assetKey === 'cash';

      // 轉換單價為台幣
      const priceTwd = config.currency === 'USD' ? config.price * usdFxRate : config.price;
      
      let shares = 0;
      let actualSpentTwd = 0;
      let remainderTwd = 0;

      if (isCash) {
        // 現金不需要下單，直接就是該變動金額
        shares = Math.round(targetActionTwd);
        actualSpentTwd = targetActionTwd;
        remainderTwd = 0;
      } else if (priceTwd > 0) {
        const absAction = Math.abs(targetActionTwd);
        
        // 對於加密貨幣，通常允許高度分割的零頭，所以不用整除一股
        if (item.assetKey === 'crypto') {
          shares = absAction / priceTwd;
          actualSpentTwd = absAction;
          remainderTwd = 0;
        } else {
          // 股票與基金，我們以整數「股/份」來做計算 (如果是零股交易，也可以是整數)
          // 買入或賣出整數股
          shares = Math.floor(absAction / priceTwd);
          actualSpentTwd = shares * priceTwd;
          remainderTwd = absAction - actualSpentTwd;
        }

        // 把方向乘回去
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
  }, [exactRebalanceData, orderConfigs, usdFxRate]);

  // 過濾出有需要交易的項目 (交易金額不為 0)
  const activeOrders = useMemo(() => {
    return orderResults.filter(o => Math.abs(o.actionAmount) >= 1 && o.assetKey !== 'cash');
  }, [orderResults]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 頂部引言 */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">交易下單輔助換算 (Order Helper)</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          再平衡算出了台幣金額，但不知道該去券商下單幾股嗎？此頁面協助您輸入即時市價，自動將再平衡交易金額換算成對應的 **下單股數**，並精算剩餘零頭。
        </p>
      </div>

      <AlertBanner
        type="success"
        message="💡 下單提示：下單換算結果是基於您在「配置再平衡」中的「精準再平衡」試算差額。您可以在左側面板隨時微調目前市價與美金匯率，以獲得最精準的下單數據。"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* 左側：單價與匯率設定面板 */}
        <Card className="p-6 xl:col-span-1 space-y-6">
          <div>
            <h3 className="font-bold text-slate-700 text-sm tracking-wide border-b border-slate-100 pb-3">市價與匯率微調</h3>
            <p className="text-xs text-slate-400 mt-1">請手動填寫您打算交易的標的與最新即時報價：</p>
          </div>

          {/* 匯率 */}
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">美金對台幣匯率 (USD/TWD)</label>
            <input
              type="number"
              value={usdFxRate}
              onChange={(e) => setUsdFxRate(parseFloat(e.target.value) || 32)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
              step="0.05"
            />
          </div>

          <div className="space-y-4">
            {Object.keys(ASSET_MAP).map(key => {
              if (key === 'cash') return null; // 現金不需要設定單價
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
                        onChange={(e) => handleConfigChange(key, 'currency', e.target.value as any)}
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
          </div>
        </Card>

        {/* 右側：下單換算結果表格 */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-sm tracking-wide">自動下單股數建議表</h3>
              <span className="text-xs text-slate-400">目前匯率：<span className="font-bold text-slate-600">1 USD = {usdFxRate} TWD</span></span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/30">
                    <th className="px-6 py-4">資產大類</th>
                    <th className="px-6 py-4">對應標的</th>
                    <th className="px-6 py-4 text-right">目標調整金額</th>
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
                          <td className="px-6 py-4 text-xs italic">無須交易下單</td>
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
          </Card>

          {/* 券商下單指南 */}
          <Card className="p-6">
            <h4 className="font-bold text-slate-700 text-sm tracking-wide mb-3">📋 券商再平衡下單行動指南</h4>
            <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
              {activeOrders.length === 0 ? (
                <div className="text-slate-400 font-semibold p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                  🎉 目前您的帳戶配置完美貼合目標，不需要進行任何下單交易！
                </div>
              ) : (
                <ol className="list-decimal list-inside space-y-2">
                  {activeOrders.map((ord) => {
                    const absShares = Math.abs(ord.shares);
                    const isBuy = ord.actionAmount > 0;
                    
                    return (
                      <li key={ord.assetKey} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                        第一步，前往您的
                        <span className="font-bold text-slate-700 mx-1">{ord.currency === 'USD' ? '海外券商/複委託' : '國內證券商'}</span>
                        ，對標的物
                        <span className="font-bold text-slate-700 mx-1">{ord.symbol}</span>
                        送出
                        <span className={`font-black mx-1 ${isBuy ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isBuy ? '買入' : '賣出'} {absShares.toLocaleString()} {ord.assetKey === 'crypto' ? '單位' : '股'}
                        </span>
                        的限價單或市價單。預估台幣成交價值為
                        <span className="font-bold text-slate-600 mx-1">${Math.round(Math.abs(ord.actualSpentTwd)).toLocaleString()} TWD</span>
                        。
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
