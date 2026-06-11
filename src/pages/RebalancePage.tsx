import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Tabs } from '../components/Tabs';
import { AlertBanner } from '../components/AlertBanner';
import { 
  calculateExactRebalance, 
  calculateCashOnlyRebalance, 
  calculateThresholdRebalance, 
  calculateTotalPortfolioValue
} from '../utils/rebalance';

export const RebalancePage: React.FC = () => {
  const { state } = useApp();
  const { portfolio, allocation_target } = state;

  const [activeTab, setActiveTab] = useState<'exact' | 'cash' | 'threshold'>('exact');
  const [newCashInput, setNewCashInput] = useState<string>('50000');
  const [thresholdInput, setThresholdInput] = useState<number>(0.05); // 預設 5%
  
  // 計算總資產
  const totalValue = useMemo(() => calculateTotalPortfolioValue(portfolio), [portfolio]);

  // 根據選擇的模式進行計算
  const rebalanceData = useMemo(() => {
    switch (activeTab) {
      case 'exact':
        return calculateExactRebalance(portfolio, allocation_target);
      case 'cash': {
        const cashNum = parseFloat(newCashInput) || 0;
        return calculateCashOnlyRebalance(portfolio, allocation_target, cashNum);
      }
      case 'threshold':
        return calculateThresholdRebalance(portfolio, allocation_target, thresholdInput);
      default:
        return [];
    }
  }, [activeTab, portfolio, allocation_target, newCashInput, thresholdInput]);

  // 檢查是否有偏離需要警示 (任一偏離 > 5%)
  const maxDeviation = useMemo(() => {
    return Math.max(...rebalanceData.map(d => Math.abs(d.differencePercent)));
  }, [rebalanceData]);

  const tabsConfig = [
    { id: 'exact', label: '精準再平衡' },
    { id: 'cash', label: '新資金再平衡' },
    { id: 'threshold', label: '偏離門檻再平衡' }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 頂部引言 */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">再平衡智慧調整 (Rebalancing)</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          當市場波動使資產比例偏離您的目標配置時，透過再平衡能維持預期的風險承受度。本系統提供三種再平衡軌跡，協助您以最低交易成本重回正軌。
        </p>
      </div>

      {/* 警示條 */}
      {maxDeviation >= 0.05 && (
        <AlertBanner 
          type="warning"
          message={`⚠️ 資產配置顯著偏離警告：目前有資產類別偏離目標比例超過 5% (最大偏離為 ${(maxDeviation * 100).toFixed(1)}%)，強烈建議您進行再平衡調整以降低投資組合風險。`}
        />
      )}

      {maxDeviation < 0.05 && maxDeviation > 0 && (
        <AlertBanner 
          type="success"
          message={`✅ 資產狀態良好：您的資產配置偏離度控制在 5% 以內 (最大偏離為 ${(maxDeviation * 100).toFixed(1)}%)，處於相當健康的狀態。`}
        />
      )}

      {/* 模式切換與設定區 */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">請選擇再平衡軌跡</span>
            <Tabs 
              tabs={tabsConfig} 
              activeTab={activeTab} 
              onChange={(id) => setActiveTab(id as 'exact' | 'cash' | 'threshold')} 
            />
          </div>

          {/* 動態設定介面 */}
          <div className="flex-1 max-w-md md:text-right">
            {activeTab === 'cash' && (
              <div className="inline-flex flex-col text-left w-full md:w-auto">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">預計投入新資金 (TWD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">$</span>
                  <input
                    type="number"
                    value={newCashInput}
                    onChange={(e) => setNewCashInput(e.target.value)}
                    className="pl-8 pr-4 py-2 border border-slate-200 rounded-lg w-full md:w-64 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder="請輸入金額"
                    min="0"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">「只買不賣」：新資金將優先填補低配資產的缺口，不售出任何資產。</p>
              </div>
            )}

            {activeTab === 'threshold' && (
              <div className="inline-flex flex-col text-left w-full">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">觸發偏離門檻 (Threshold)</label>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{(thresholdInput * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.01"
                    max="0.20"
                    step="0.01"
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                  />
                  <span className="text-xs font-medium text-slate-400 w-12 text-right">1% ~ 20%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">只有偏離度高於此門檻的資產才會觸發調整建議，其餘資產維持不動 (維持 $0)。</p>
              </div>
            )}

            {activeTab === 'exact' && (
              <div className="text-left md:text-right">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">投資組合總市值</span>
                <span className="text-2xl font-black text-slate-700">${totalValue.toLocaleString()} <span className="text-sm font-medium text-slate-400">TWD</span></span>
                <p className="text-[11px] text-slate-400 mt-1">「完全再平衡」：買入低配資產、賣出高配資產，使其 100% 貼合目標比例。</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 試算結果清單 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 text-sm tracking-wide">平衡建議明細與行動指南</h3>
          <span className="text-xs text-slate-400">當前試算模式：
            <span className="font-bold text-blue-600 ml-1">
              {activeTab === 'exact' && '精準再平衡'}
              {activeTab === 'cash' && '新資金只買不賣'}
              {activeTab === 'threshold' && `偏離門檻再平衡 (${(thresholdInput * 100).toFixed(0)}%)`}
            </span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/30">
                <th className="px-6 py-4">資產大類</th>
                <th className="px-6 py-4 text-right">目前金額</th>
                <th className="px-6 py-4 text-center">目前佔比</th>
                <th className="px-6 py-4 text-center">目標佔比</th>
                <th className="px-6 py-4 text-center">偏離程度</th>
                <th className="px-6 py-4 text-right">建議交易動作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 text-sm font-medium text-slate-600">
              {rebalanceData.map((item) => {
                const diffPct = item.differencePercent * 100;
                const isOver = diffPct > 0;
                
                // 建議交易动作樣式
                let actionText = '維持不變';
                let actionStyle = 'text-slate-400';
                if (item.actionAmount > 0) {
                  actionText = `買入 +$${Math.round(item.actionAmount).toLocaleString()}`;
                  actionStyle = 'text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg';
                } else if (item.actionAmount < 0) {
                  actionText = `賣出 -$${Math.round(Math.abs(item.actionAmount)).toLocaleString()}`;
                  actionStyle = 'text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg';
                }

                return (
                  <tr key={item.assetKey} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{item.displayName}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-700">
                      ${Math.round(item.currentValue).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(item.currentPercent * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400">
                      {(item.targetPercent * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      {Math.abs(diffPct) < 0.1 ? (
                        <span className="text-slate-400 text-xs">完美對齊</span>
                      ) : (
                        <span className={`inline-flex items-center text-xs font-bold ${isOver ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {isOver ? '▲ 高配' : '▼ 低配'} {Math.abs(diffPct).toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={actionStyle}>{actionText}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 底部操作與說明 */}
        <div className="p-6 bg-slate-50/20 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400 leading-relaxed w-full">
            <span className="font-bold text-slate-500 block mb-1.5">💡 理財專家叮嚀：</span>
            本平衡建議經由全自動演算法即時運算產生，作為您的資產配置決策指南。**為了確保帳戶真實資產的 100% 嚴謹性與追蹤一致性，本頁面不提供直接覆寫帳目的按鈕**。您可以參考此建議，前往您的實體交易券商進行買賣，並在系統首頁手動記錄您每月最新的資產變化快照，或在「輔助下單 (Order)」分頁中，查看本期新入金按照權重折算後的台美股應買股數建議。
          </div>
        </div>
      </Card>
    </div>
  );
};
