import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { PieChart } from '../components/PieChart';
import { AlertBanner } from '../components/AlertBanner';
import { calculateTotalPortfolioValue } from '../utils/rebalance';
import { Sliders, ShieldAlert, Award, RefreshCw } from 'lucide-react';
import type { AllocationTarget, AssetClassKey } from '../context/AppContext';
import { HoldingsManager } from '../components/HoldingsManager';


// 風險模式定義
const RISK_MODES = {
  conservative: {
    name: '🛡️ 保守型',
    desc: '高現金與固定收益比重，極力追求本金防禦與規避波動。',
    target: { cash: 0.40, bond: 0.28, tw_stock: 0.15, us_stock: 0.15, crypto: 0.02 }
  },
  moderate: {
    name: '⚖️ 穩健型',
    desc: '股債均衡搭配，在大盤長期合理成長與中度風險波動間取得黃金平衡。',
    target: { cash: 0.15, bond: 0.18, tw_stock: 0.30, us_stock: 0.35, crypto: 0.02 }
  },
  aggressive: {
    name: '🚀 積極型',
    desc: '重倉全球股票權益，容忍較大回撤以追求超越通膨的長線複利最大化。',
    target: { cash: 0.08, bond: 0.08, tw_stock: 0.35, us_stock: 0.45, crypto: 0.04 }
  },
  enterprising: {
    name: '🔥 進取型',
    desc: '極限配置於股票型與高風險另類資產，為追求超高增值而甘冒劇烈震盪。',
    target: { cash: 0.03, bond: 0.02, tw_stock: 0.40, us_stock: 0.50, crypto: 0.05 }
  }
};

export const AllocationPage: React.FC = () => {
  const { state, updateAllocationTarget, updatePortfolioAsset } = useApp();
  const { portfolio, allocation_target } = state;

  const totalNetWorth = useMemo(() => {
    return calculateTotalPortfolioValue(portfolio);
  }, [portfolio]);

  // 目前實際資產數據 (PieChart 格式)
  const currentPieData = useMemo(() => {
    return [
      { name: '現金', value: portfolio.cash },
      { name: '基金/債券', value: portfolio.fund },
      { name: '台灣股票', value: portfolio.tw_stock },
      { name: '美國股票', value: portfolio.us_stock },
      { name: '加密貨幣', value: portfolio.crypto }
    ];
  }, [portfolio]);

  // 目標配置資產數據 (PieChart 格式，以當前淨值乘以設定比例，使數值對齊)
  const targetPieData = useMemo(() => {
    const total = totalNetWorth > 0 ? totalNetWorth : 1000000; // 避免 0 元淨值時無圓弧展示
    return [
      { name: '現金', value: total * allocation_target.cash },
      { name: '基金/債券', value: total * allocation_target.bond },
      { name: '台灣股票', value: total * allocation_target.tw_stock },
      { name: '美國股票', value: total * allocation_target.us_stock },
      { name: '加密貨幣', value: total * allocation_target.crypto }
    ];
  }, [allocation_target, totalNetWorth]);

  // 1. 偏差與列表對比計算
  const comparisonList = useMemo(() => {
    const total = totalNetWorth > 0 ? totalNetWorth : 1;
    
    return [
      {
        key: 'cash' as AssetClassKey,
        name: '現金 (Cash)',
        currentVal: portfolio.cash,
        currentPct: portfolio.cash / total,
        targetPct: allocation_target.cash,
        diffPct: (portfolio.cash / total) - allocation_target.cash
      },
      {
        key: 'fund' as AssetClassKey,
        name: '基金/債券 (Fund/Bond)',
        currentVal: portfolio.fund,
        currentPct: portfolio.fund / total,
        targetPct: allocation_target.bond,
        diffPct: (portfolio.fund / total) - allocation_target.bond
      },
      {
        key: 'tw_stock' as AssetClassKey,
        name: '台灣股票 (TW Stock)',
        currentVal: portfolio.tw_stock,
        currentPct: portfolio.tw_stock / total,
        targetPct: allocation_target.tw_stock,
        diffPct: (portfolio.tw_stock / total) - allocation_target.tw_stock
      },
      {
        key: 'us_stock' as AssetClassKey,
        name: '美國股票 (US Stock)',
        currentVal: portfolio.us_stock,
        currentPct: portfolio.us_stock / total,
        targetPct: allocation_target.us_stock,
        diffPct: (portfolio.us_stock / total) - allocation_target.us_stock
      },
      {
        key: 'crypto' as AssetClassKey,
        name: '加密貨幣 (Crypto)',
        currentVal: portfolio.crypto,
        currentPct: portfolio.crypto / total,
        targetPct: allocation_target.crypto,
        diffPct: (portfolio.crypto / total) - allocation_target.crypto
      }
    ];
  }, [portfolio, allocation_target, totalNetWorth]);

  // 目標配置手動編輯狀態
  const [editingTarget, setEditingTarget] = useState({
    cash: (allocation_target.cash * 100).toString(),
    bond: (allocation_target.bond * 100).toString(),
    tw_stock: (allocation_target.tw_stock * 100).toString(),
    us_stock: (allocation_target.us_stock * 100).toString(),
    crypto: (allocation_target.crypto * 100).toString()
  });

  // 同步當前 target 至 input 狀態
  const syncInputsFromGlobal = (newTarget: AllocationTarget) => {
    setEditingTarget({
      cash: Math.round(newTarget.cash * 100).toString(),
      bond: Math.round(newTarget.bond * 100).toString(),
      tw_stock: Math.round(newTarget.tw_stock * 100).toString(),
      us_stock: Math.round(newTarget.us_stock * 100).toString(),
      crypto: Math.round(newTarget.crypto * 100).toString()
    });
  };

  const handleInputChange = (key: string, val: string) => {
    // 限制只能輸入數字或點
    const sanitized = val.replace(/[^0-9.]/g, '');
    setEditingTarget(prev => ({ ...prev, [key]: sanitized }));
  };

  // 2. 目標配置比例總和校驗
  const targetSum = useMemo(() => {
    const c = parseFloat(editingTarget.cash) || 0;
    const b = parseFloat(editingTarget.bond) || 0;
    const tw = parseFloat(editingTarget.tw_stock) || 0;
    const us = parseFloat(editingTarget.us_stock) || 0;
    const cry = parseFloat(editingTarget.crypto) || 0;
    return c + b + tw + us + cry;
  }, [editingTarget]);

  // 儲存手動微調的目標配置
  const saveCustomTargets = () => {
    if (Math.abs(targetSum - 100) > 0.01) return; // 總和不為 100% 時不予保存

    const newTarget: AllocationTarget = {
      cash: (parseFloat(editingTarget.cash) || 0) / 100,
      bond: (parseFloat(editingTarget.bond) || 0) / 100,
      tw_stock: (parseFloat(editingTarget.tw_stock) || 0) / 100,
      us_stock: (parseFloat(editingTarget.us_stock) || 0) / 100,
      crypto: (parseFloat(editingTarget.crypto) || 0) / 100
    };
    updateAllocationTarget(newTarget);
  };

  // 風險模式切換處理
  const applyRiskMode = (modeKey: keyof typeof RISK_MODES) => {
    const newTarget = RISK_MODES[modeKey].target;
    updateAllocationTarget(newTarget);
    syncInputsFromGlobal(newTarget);
  };

  const isHoldingMode = portfolio.isHoldingMode || false;

  // 現有實際資產手動微調 (允許直接在配置頁面微調金額以觸發連動)
  const [editingActuals, setEditingActuals] = useState({
    cash: portfolio.cash.toString(),
    fund: portfolio.fund.toString(),
    tw_stock: portfolio.tw_stock.toString(),
    us_stock: portfolio.us_stock.toString(),
    crypto: portfolio.crypto.toString()
  });

  const saveActualAssetValue = (key: AssetClassKey, valStr: string) => {
    const val = Math.max(0, parseInt(valStr) || 0);
    updatePortfolioAsset(key, val);
    setEditingActuals(prev => ({ ...prev, [key]: valStr }));
  };

  return (
    <div className="space-y-8 animate-fade-in duration-300">
      
      {/* 頂部引導說明 */}
      <div className="flex flex-col select-none">
        <h1 className="text-xl font-black text-slate-800">資產配置比例盤</h1>
        <p className="text-xs font-semibold text-slate-400 mt-1">
          設定您的目標配置板塊，並將其與實際資產進行精準偏離分析。可採用經典風險模型一鍵套用，或自由手動微調。
        </p>
      </div>

      {/* 第一區塊：目前配置 vs 目標配置雙圖對比 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 左側：目前實際配置 */}
        <Card hoverEffect={false} className="flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4 select-none">
            <div>
              <h2 className="text-sm font-bold text-slate-800">目前資產實際配置</h2>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">以最新資產市值折算實際佔比</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
              ${totalNetWorth.toLocaleString()} TWD
            </span>
          </div>
          
          <div className="w-full flex-1">
            <PieChart data={currentPieData} />
          </div>
        </Card>

        {/* 右側：目標理想配置 */}
        <Card hoverEffect={false} className="flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4 select-none">
            <div>
              <h2 className="text-sm font-bold text-slate-800">目標理想資產配置</h2>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">黃金配置設定所映射之理想分佈</p>
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Golden Target
            </span>
          </div>

          <div className="w-full flex-1">
            <PieChart data={targetPieData} />
          </div>
        </Card>

      </div>

      {/* 第二區塊：風險承受度模式選擇 */}
      <div>
        <div className="flex items-center gap-2 mb-4 select-none">
          <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Sliders className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-bold text-slate-800">經典風險配置模型一鍵套用</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.keys(RISK_MODES) as Array<keyof typeof RISK_MODES>).map(modeKey => {
            const mode = RISK_MODES[modeKey];
            
            // 比對當前目標是否與該模式完全對齊
            const isMatched = 
              Math.abs(allocation_target.cash - mode.target.cash) < 0.01 &&
              Math.abs(allocation_target.bond - mode.target.bond) < 0.01 &&
              Math.abs(allocation_target.tw_stock - mode.target.tw_stock) < 0.01 &&
              Math.abs(allocation_target.us_stock - mode.target.us_stock) < 0.01 &&
              Math.abs(allocation_target.crypto - mode.target.crypto) < 0.01;

            return (
              <Card 
                key={modeKey}
                onClick={() => applyRiskMode(modeKey)}
                className={`
                  cursor-pointer group flex flex-col justify-between transition-all duration-300 border-2
                  ${isMatched 
                    ? 'border-blue-500/80 bg-blue-50/10 shadow-lg shadow-blue-500/5' 
                    : 'border-slate-200/60 hover:border-blue-300'
                  }
                `}
              >
                <div className="select-none">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-800">{mode.name}</span>
                    {isMatched && (
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 leading-relaxed">{mode.desc}</p>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 text-[9px] font-black text-slate-500">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">股: {Math.round((mode.target.tw_stock + mode.target.us_stock) * 100)}%</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">債: {Math.round(mode.target.bond * 100)}%</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">金: {Math.round(mode.target.cash * 100)}%</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">幣: {Math.round(mode.target.crypto * 100)}%</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 第三區塊：資產配置偏差分析與手動直接微調 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* 左側：資產偏離分析表格 */}
        <div className="xl:col-span-2">
          <Card hoverEffect={false} className="overflow-hidden p-0">
            <div className="p-6 border-b border-slate-100 select-none">
              <h2 className="text-sm font-bold text-slate-800">資產偏差度透視與實際值修改</h2>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">即時追蹤每項資產板塊相較於目標理想比例的漂移狀態</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold select-none">
                    <th className="p-4 pl-6">資產類別</th>
                    <th className="p-4">現有實際值 (TWD)</th>
                    <th className="p-4">目前實際比重</th>
                    <th className="p-4">目標理想比重</th>
                    <th className="p-4 pr-6">配置偏差偏差 %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 font-semibold text-slate-700">
                  {comparisonList.map((item) => {
                    const isHighDeviation = Math.abs(item.diffPct) >= 0.05;
                    const diffPctStr = (item.diffPct * 100).toFixed(1);
                    
                    return (
                      <tr 
                        key={item.key} 
                        className={`
                          transition-all duration-200
                          ${isHighDeviation ? 'bg-rose-50/10 hover:bg-rose-50/20' : 'hover:bg-slate-50/40'}
                        `}
                      >
                        <td className="p-4 pl-6 font-bold text-slate-800">{item.name}</td>
                        <td className="p-4">
                          <input
                            type="text"
                            value={editingActuals[item.key]}
                            onChange={(e) => {
                              const sanitized = e.target.value.replace(/[^0-9]/g, '');
                              setEditingActuals(prev => ({ ...prev, [item.key]: sanitized }));
                            }}
                            onBlur={() => saveActualAssetValue(item.key, editingActuals[item.key])}
                            disabled={isHoldingMode && item.key !== 'cash'}
                            className="w-28 px-2 py-1 text-xs border border-slate-200 rounded bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none font-bold disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
                            placeholder={isHoldingMode && item.key !== 'cash' ? '🔒 鎖定' : ''}
                          />
                        </td>
                        <td className="p-4 text-slate-500">{(item.currentPct * 100).toFixed(1)}%</td>
                        <td className="p-4 text-slate-500">{(item.targetPct * 100).toFixed(1)}%</td>
                        <td className="p-4 pr-6">
                          <span 
                            className={`
                              px-2 py-0.5 rounded-full font-black text-[10px] border flex items-center gap-1 w-fit
                              ${isHighDeviation 
                                ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' 
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                              }
                            `}
                          >
                            {isHighDeviation && <ShieldAlert className="w-3 h-3 flex-shrink-0" />}
                            {item.diffPct >= 0 ? '+' : ''}{diffPctStr}%
                            {isHighDeviation && ' (已失衡)'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* 右側：手動微調目標配置板塊 */}
        <div>
          <Card hoverEffect={false} className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 select-none">
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Sliders className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-800">手動微調目標配置 %</h2>
              </div>

              <div className="space-y-4 font-semibold text-xs text-slate-700">
                {/* 台灣股票 */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">台灣股票 (TW Stock)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingTarget.tw_stock}
                      onChange={(e) => handleInputChange('tw_stock', e.target.value)}
                      className="w-16 px-2 py-1 text-center border border-slate-200 rounded font-bold hover:border-blue-400 focus:outline-none"
                    />
                    <span>%</span>
                  </div>
                </div>

                {/* 美國股票 */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">美國股票 (US Stock)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingTarget.us_stock}
                      onChange={(e) => handleInputChange('us_stock', e.target.value)}
                      className="w-16 px-2 py-1 text-center border border-slate-200 rounded font-bold hover:border-blue-400 focus:outline-none"
                    />
                    <span>%</span>
                  </div>
                </div>

                {/* 基金/債券 */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">基金/債券 (Fund/Bond)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingTarget.bond}
                      onChange={(e) => handleInputChange('bond', e.target.value)}
                      className="w-16 px-2 py-1 text-center border border-slate-200 rounded font-bold hover:border-blue-400 focus:outline-none"
                    />
                    <span>%</span>
                  </div>
                </div>

                {/* 現金 */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">現金 (Cash)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingTarget.cash}
                      onChange={(e) => handleInputChange('cash', e.target.value)}
                      className="w-16 px-2 py-1 text-center border border-slate-200 rounded font-bold hover:border-blue-400 focus:outline-none"
                    />
                    <span>%</span>
                  </div>
                </div>

                {/* 加密貨幣 */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">加密貨幣 (Crypto)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingTarget.crypto}
                      onChange={(e) => handleInputChange('crypto', e.target.value)}
                      className="w-16 px-2 py-1 text-center border border-slate-200 rounded font-bold hover:border-blue-400 focus:outline-none"
                    />
                    <span>%</span>
                  </div>
                </div>

                {/* 總和顯示 */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 font-bold text-xs select-none">
                  <span>目標配置總和：</span>
                  <span className={Math.abs(targetSum - 100) < 0.01 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black animate-pulse'}>
                    {targetSum.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 儲存按鈕與校驗警告 */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              {Math.abs(targetSum - 100) > 0.01 && (
                <AlertBanner 
                  type="error" 
                  message={`⚠️ 權重總和為 ${targetSum.toFixed(1)}%。必須剛好等於 100% 才能保存配置連動。`} 
                />
              )}
              <button
                disabled={Math.abs(targetSum - 100) > 0.01}
                onClick={saveCustomTargets}
                className={`
                  w-full py-2.5 rounded-xl text-xs font-black select-none cursor-pointer flex items-center justify-center gap-1.5 transition-all
                  ${Math.abs(targetSum - 100) < 0.01
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 hover:scale-[1.01]'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }
                `}
              >
                <RefreshCw className="w-3.5 h-3.5" /> 保存目標配置與全站連動
              </button>
            </div>
          </Card>
        </div>

      </div>

      {/* 持股明細管理器 */}
      <HoldingsManager />

    </div>
  );
};
