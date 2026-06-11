import React from 'react';
import { Card } from './Card';
import { ShieldAlert, CheckCircle, HelpCircle, Sparkles } from 'lucide-react';
import { CRISIS_EVENTS } from '../utils/backtest';
import type { CrisisMetrics } from '../utils/backtest';

interface CrisisTableProps {
  crisisMetrics: CrisisMetrics[];
  range: '1y' | '3y' | '5y' | '10y';
}

export const CrisisTable: React.FC<CrisisTableProps> = ({ crisisMetrics, range }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
          <ShieldAlert className="w-4.5 h-4.5 stroke-[2.5]" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-800">重大黑天鵝危機對抗實戰 (Crisis Stress Test Showcase)</h3>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            回測歷史上三次極端系統風險時期，對決多元配置與單一資產 (100% 台股) 的跌幅控制力及爬回前高復原月數。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CRISIS_EVENTS.map((crisis, idx) => {
          // 從結果中獲取當前危機的 metrics
          const matchedMetric = crisisMetrics.find(m => m.name === crisis.name);
          const isAvailable = matchedMetric ? matchedMetric.isAvailable : (range === '10y' || (range === '5y' && idx >= 1) || (range === '3y' && idx === 3));

          // 是否在目前的歷史回測長度內
          const showLocked = !isAvailable;

          return (
            <div key={crisis.name} className="relative group">
              <Card
                hoverEffect={!showLocked}
                className={`bg-white border rounded-2xl p-5 shadow-lg transition-all h-full flex flex-col justify-between ${
                  showLocked
                    ? 'border-slate-100/50 bg-slate-50/60 opacity-60 filter grayscale'
                    : 'border-slate-200/60 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div className="space-y-4">
                  {/* 危機時間與名稱 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-500 rounded font-mono">
                        {crisis.period}
                      </span>
                      <h4 className="text-xs font-black text-slate-800 mt-1">{crisis.name}</h4>
                    </div>
                    {!showLocked && (
                      <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 fill-current text-white bg-emerald-500 rounded-full" />
                      </span>
                    )}
                  </div>

                  {/* 描述 */}
                  <p className="text-[10px] text-slate-400 font-medium leading-normal">
                    {crisis.description}
                  </p>

                  {/* 對決數據牆 */}
                  {!showLocked && matchedMetric ? (
                    <div className="space-y-4 pt-3 border-t border-slate-100">
                      {/* 最大回撤對抗 */}
                      <div>
                        <div className="text-[9px] font-bold text-slate-500 mb-2 flex justify-between">
                          <span>極端最大跌幅對決</span>
                          <span className="text-rose-500 text-[10px]">
                            理想組合比大盤防禦力: <strong className="font-extrabold">
                              {Math.max(0, Math.round(matchedMetric.benchmarkDrop - matchedMetric.portfolioDrop))}%
                            </strong>
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {/* 配置組合 */}
                          <div>
                            <div className="flex justify-between text-[9px] font-bold text-slate-600 mb-1">
                              <span>我的目標配置 (理想藍圖)</span>
                              <span className="text-blue-600 font-mono">{matchedMetric.portfolioDrop.toFixed(2)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, Math.abs(matchedMetric.portfolioDrop) * 2)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* 當前真實持股 [NEW] */}
                          {matchedMetric.actualDrop !== undefined && (
                            <div>
                              <div className="flex justify-between text-[9px] font-bold text-amber-500 mb-1">
                                <span>當前真實持股 (實際偏離)</span>
                                <span className="text-amber-600 font-mono">{matchedMetric.actualDrop.toFixed(2)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                                  style={{ width: `${Math.min(100, Math.abs(matchedMetric.actualDrop) * 2)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {/* 對照組 */}
                          <div>
                            <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                              <span>100% 台股對照組</span>
                              <span className="text-slate-600 font-mono">{matchedMetric.benchmarkDrop.toFixed(2)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-slate-400 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, Math.abs(matchedMetric.benchmarkDrop) * 2)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 復原速度對抗 */}
                      <div className={`grid gap-2.5 pt-2 ${matchedMetric.actualRecovery !== undefined ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <div className="p-2 bg-blue-50/50 border border-blue-100/50 rounded-xl flex flex-col justify-between">
                          <div className="text-[7.5px] font-bold text-blue-500">目標配置復原</div>
                          <div className="text-[10px] font-black text-blue-700 mt-0.5 font-mono">
                            {matchedMetric.portfolioRecovery === -1
                              ? '未復原 ⚠️'
                              : `${matchedMetric.portfolioRecovery}個月`}
                          </div>
                        </div>

                        {matchedMetric.actualRecovery !== undefined && (
                          <div className="p-2 bg-amber-50/50 border border-amber-100/50 rounded-xl flex flex-col justify-between">
                            <div className="text-[7.5px] font-bold text-amber-500">真實持股復原</div>
                            <div className="text-[10px] font-black text-amber-700 mt-0.5 font-mono">
                              {matchedMetric.actualRecovery === -1
                                ? '未復原 ⚠️'
                                : `${matchedMetric.actualRecovery}個月`}
                            </div>
                          </div>
                        )}

                        <div className="p-2 bg-slate-50 border border-slate-200/50 rounded-xl flex flex-col justify-between">
                          <div className="text-[7.5px] font-bold text-slate-400">對照組復原</div>
                          <div className="text-[10px] font-black text-slate-600 mt-0.5 font-mono">
                            {matchedMetric.benchmarkRecovery === -1
                              ? '未復原 ⚠️'
                              : `${matchedMetric.benchmarkRecovery}個月`}
                          </div>
                        </div>
                      </div>

                      {/* 亮點提示 */}
                      {matchedMetric.portfolioRecovery !== -1 && matchedMetric.benchmarkRecovery !== -1 && matchedMetric.portfolioRecovery < matchedMetric.benchmarkRecovery && (
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/50 leading-relaxed">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          資產多元配置比對照組提早 {matchedMetric.benchmarkRecovery - matchedMetric.portfolioRecovery} 個月回到前高！
                        </div>
                      )}

                    </div>
                  ) : (
                    // 骨架屏或鎖定提示
                    <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-[10px] font-bold pt-4">
                      {showLocked ? (
                        <>
                          <HelpCircle className="w-8 h-8 text-slate-300 mb-2" />
                          <span>回測時限外</span>
                          <span className="text-[8px] text-slate-400 mt-1 font-medium font-sans">
                            請切換至 5 年或 10 年回測期解鎖
                          </span>
                        </>
                      ) : (
                        <div className="animate-pulse w-full space-y-3">
                          <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                          <div className="h-5 bg-slate-100 rounded w-full"></div>
                          <div className="h-2 bg-slate-100 rounded w-full"></div>
                          <div className="h-10 bg-slate-100 rounded w-full"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};
