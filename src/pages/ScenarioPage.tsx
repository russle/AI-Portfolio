import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { AiPortfolioState } from '../context/AppContext';
import { Card } from '../components/Card';
import { Gauge } from '../components/Gauge';
import { ScenarioButton } from '../components/ScenarioButton';
import { runScenarioProjection } from '../utils/scenario';
import { runMonteCarloSimulation } from '../utils/retirement';

export const ScenarioPage: React.FC = () => {
  const { state, updatePortfolioAsset, updateRetirementConfig, updateAllocationTarget } = useApp();
  const { portfolio, retirement } = state;

  // 1. 本地臨時預演狀態，預設為 current context state
  const [projectedState, setProjectedState] = useState<AiPortfolioState>(state);
  const [selectedScenario, setSelectedScenario] = useState<string>('none');

  // 當全域狀態改變時，若未選擇情境，則同步更新臨時狀態；否則保持鎖定
  useMemo(() => {
    if (selectedScenario === 'none') {
      setProjectedState(state);
    }
  }, [state, selectedScenario]);

  // 2. 當前（基準）數值計算
  const currentTotal = useMemo(() => {
    return portfolio.cash + portfolio.fund + portfolio.tw_stock + portfolio.us_stock + portfolio.crypto;
  }, [portfolio]);

  const currentFireTarget = useMemo(() => {
    return retirement.monthly_spending * 12 * 25;
  }, [retirement.monthly_spending]);

  const currentYears = useMemo(() => {
    return Math.max(1, 60 - retirement.age); // 預設 60 歲退休
  }, [retirement.age]);

  // 計算目前的退休成功率
  const currentSuccessRate = useMemo(() => {
    const res = runMonteCarloSimulation(
      currentTotal,
      retirement.monthly_invest,
      currentYears,
      retirement.expected_return,
      0.15,
      retirement.inflation,
      currentFireTarget
    );
    return res.successRate;
  }, [currentTotal, retirement, currentYears, currentFireTarget]);

  // 3. 投影數值計算 (Projected)
  const projectedTotal = useMemo(() => {
    const p = projectedState.portfolio;
    return p.cash + p.fund + p.tw_stock + p.us_stock + p.crypto;
  }, [projectedState.portfolio]);

  const projectedFireTarget = useMemo(() => {
    return projectedState.retirement.monthly_spending * 12 * 25;
  }, [projectedState.retirement.monthly_spending]);

  const projectedYears = useMemo(() => {
    return Math.max(1, 60 - projectedState.retirement.age);
  }, [projectedState.retirement.age]);

  const projectedSuccessRate = useMemo(() => {
    const res = runMonteCarloSimulation(
      projectedTotal,
      projectedState.retirement.monthly_invest,
      projectedYears,
      projectedState.retirement.expected_return,
      0.15,
      projectedState.retirement.inflation,
      projectedFireTarget
    );
    return res.successRate;
  }, [projectedTotal, projectedState.retirement, projectedYears, projectedFireTarget]);

  // 4. 切換情境處理
  const handleSelectScenario = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    if (scenarioId === 'none') {
      setProjectedState(state);
    } else {
      // 純函數拷貝運算，不污染全域
      const nextState = runScenarioProjection(state, scenarioId as any);
      setProjectedState(nextState);
    }
  };

  // 5. 將投影數據確認寫回全域 Context
  const handleApplyToRealState = () => {
    if (window.confirm('警告：這將會永久覆寫您在帳戶中的真實資產配置與通膨參數！確定要將此模擬結果寫入您的真實資產嗎？')) {
      
      // 寫回 Portfolio
      const p = projectedState.portfolio;
      (Object.keys(p) as Array<keyof typeof p>).forEach(key => {
        if (key !== 'history') {
          updatePortfolioAsset(key, p[key] as number);
        }
      });

      // 寫回 Retirement Config
      const r = projectedState.retirement;
      (Object.keys(r) as Array<keyof typeof r>).forEach(key => {
        updateRetirementConfig(key, r[key] as number);
      });

      // 寫回 Allocation Target
      updateAllocationTarget(projectedState.allocation_target);

      alert('成功！已將此模擬情境之資產與財務設定寫回您的帳戶！');
      setSelectedScenario('none');
    }
  };

  // 壓力/樂觀情境簡介
  const scenarioDetails = useMemo(() => {
    switch (selectedScenario) {
      case 'market_drop':
        return {
          title: '💥 市場劇烈崩跌 -10%',
          description: '模擬全球金融海嘯、地緣政治衝突或突發性熊市。台股及美股類別資產將在一夜之間同步暴跌 10%，壓力測試您的資產抵禦力。',
          advice: '防禦對策：適度配置債券及高評級現金，能在股票崩跌時起到絕佳的緩衝保護效果。'
        };
      case 'us_bull':
        return {
          title: '🚀 美股狂飆牛市 +20%',
          description: '模擬 AI 科技革命爆發、通膨溫和降溫、聯準會降息，帶動美股進入大牛市。您的美股資產部位將大幅升值 20%。',
          advice: '防禦對策：美股狂飆後佔比會變高，此時是執行「高賣低買」再平衡、鎖定部分獲利的絕佳時機。'
        };
      case 'fx_35':
        return {
          title: '💵 匯率大幅波動：美元飆升至 35 TWD',
          description: '模擬美台利差持續擴大、外資匯出，美元兌台幣匯率由預估的 30 飆升至 35。持有海外美股資產折合台幣部位將同步大幅增值。',
          advice: '防禦對策：持有海外跨國資產本身就是天然的匯率避險管道，能抵禦台幣單一貶值風險。'
        };
      case 'inflation_5':
        return {
          title: '🔥 惡性通膨危機：通膨率飆升至 5%',
          description: '模擬全球供應鏈斷裂、大宗商品價格飛漲，導致台灣與全球實質長期通貨膨脹率調高至每年 5%，大幅侵蝕貨幣購買力。',
          advice: '防禦對策：現金會被通膨迅速蠶食。長期持有股票、房地產與黃金等實體資產，才是抗通膨的最佳利器。'
        };
      default:
        return null;
    }
  }, [selectedScenario]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 頂部引言 */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">壓力測試與情境預演 (Scenario Analysis)</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          投資不可能永遠一帆風順。在本功能中，您可以一鍵對您的資產組合進行「壓力測試」或「牛市預演」，評估不同極端情境對您的退休計劃與成功機率之衝擊。
        </p>
      </div>

      {/* 四大情境一鍵切換按鈕區 */}
      <Card className="p-6">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">請點選要預演的金融情境</span>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={() => handleSelectScenario('none')}
            className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all duration-300 ${
              selectedScenario === 'none'
                ? 'bg-slate-700 text-white border-slate-700 shadow-md'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ⚖️ 基準真實資產
          </button>
          
          <ScenarioButton
            onClick={() => handleSelectScenario('market_drop')}
            isActive={selectedScenario === 'market_drop'}
            label="💥 市場暴跌 -10%"
          />

          <ScenarioButton
            onClick={() => handleSelectScenario('us_bull')}
            isActive={selectedScenario === 'us_bull'}
            label="🚀 美股狂牛 +20%"
          />

          <ScenarioButton
            onClick={() => handleSelectScenario('fx_35')}
            isActive={selectedScenario === 'fx_35'}
            label="💵 美元飆至 35"
          />

          <ScenarioButton
            onClick={() => handleSelectScenario('inflation_5')}
            isActive={selectedScenario === 'inflation_5'}
            label="🔥 惡性通膨 5%"
          />
        </div>
      </Card>

      {/* 情境詳細分析說明 */}
      {scenarioDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-blue-100 text-blue-700 uppercase">模擬中</span>
              <h3 className="text-xl font-bold text-slate-800">{scenarioDetails.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{scenarioDetails.description}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-bold text-slate-600">
              💡 {scenarioDetails.advice}
            </div>
          </Card>

          <Card className="lg:col-span-1 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50/50 to-blue-50/50 border border-indigo-100/40">
            <span className="text-xs font-bold text-indigo-400 block mb-2">情境套用決策</span>
            <button
              onClick={handleApplyToRealState}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-200 hover:shadow-lg transition-all text-xs cursor-pointer transform hover:-translate-y-0.5 text-center"
            >
              確認套用此情境配置
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
              點擊後將會覆寫您的真實帳戶資產與退休通膨設定，使其與此模擬完全一致。
            </p>
          </Card>
        </div>
      )}

      {/* 對比核心面板：基準 vs 情境投影 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 卡片 1：基準真實狀態 */}
        <Card className="p-6 border border-slate-100 space-y-6 relative overflow-hidden">
          <div className="absolute right-4 top-4 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-400">真實基準</div>
          <h3 className="font-bold text-slate-700 text-sm tracking-wide border-b border-slate-100 pb-3">1. 基準狀態分析</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
              <span className="text-xs text-slate-400 block mb-1">基準總市值</span>
              <span className="text-xl font-black text-slate-700">${Math.round(currentTotal).toLocaleString()}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
              <span className="text-xs text-slate-400 block mb-1">通膨率設定</span>
              <span className="text-xl font-black text-slate-700">{(retirement.inflation * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
            <Gauge value={currentSuccessRate} title="基準退休成功率" />
          </div>
        </Card>

        {/* 卡片 2：情境投影狀態 */}
        <Card className="p-6 border-2 border-blue-500/30 bg-blue-50/10 space-y-6 relative overflow-hidden">
          <div className="absolute right-4 top-4 px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold">情境投影</div>
          <h3 className="font-bold text-slate-700 text-sm tracking-wide border-b border-slate-100 pb-3">2. 投影預演分析</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100/50">
              <span className="text-xs text-slate-400 block mb-1">投影總市值</span>
              <span className="text-xl font-black text-slate-700">${Math.round(projectedTotal).toLocaleString()}</span>
            </div>
            <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100/50">
              <span className="text-xs text-slate-400 block mb-1">投影通膨率</span>
              <span className="text-xl font-black text-slate-700">{(projectedState.retirement.inflation * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-blue-50/40 rounded-2xl border border-blue-100/50">
            <Gauge value={projectedSuccessRate} title="投影退休成功率" />
          </div>
        </Card>
      </div>

      {/* 資產明細對比表格 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-700 text-sm tracking-wide">資產類別變動細節對比</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/30">
                <th className="px-6 py-4">資產大類</th>
                <th className="px-6 py-4 text-right">基準金額 (TWD)</th>
                <th className="px-6 py-4 text-right">投影金額 (TWD)</th>
                <th className="px-6 py-4 text-right">變動幅度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 text-sm font-medium text-slate-600">
              {(Object.keys(portfolio) as Array<keyof typeof portfolio>).map(key => {
                if (key === 'history') return null;
                const baseVal = portfolio[key];
                const projVal = projectedState.portfolio[key];
                const changeVal = projVal - baseVal;
                const changePct = baseVal > 0 ? (changeVal / baseVal) * 100 : 0;
                
                let changeStyle = 'text-slate-400';
                if (changeVal > 0) {
                  changeStyle = 'text-emerald-600 font-bold';
                } else if (changeVal < 0) {
                  changeStyle = 'text-rose-600 font-bold';
                }

                return (
                  <tr key={key} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">
                        {key === 'cash' && '現金 (Cash)'}
                        {key === 'fund' && '基金/債券 (Fund/Bond)'}
                        {key === 'tw_stock' && '台灣股票 (TW Stock)'}
                        {key === 'us_stock' && '美國股票 (US Stock)'}
                        {key === 'crypto' && '加密貨幣 (Crypto)'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-600">
                      ${Math.round(baseVal).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-700">
                      ${Math.round(projVal).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {changeVal === 0 ? (
                        <span className="text-slate-400 text-xs">無變動</span>
                      ) : (
                        <span className={`text-xs ${changeStyle}`}>
                          {changeVal > 0 ? '+' : ''}${Math.round(changeVal).toLocaleString()} ({changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
