import React from 'react';
import { Card } from './Card';
import type { RollingBacktestResult } from '../utils/backtest';

interface RollingResultsProps {
  rollingResult: RollingBacktestResult;
  windowMonths: number;
  stepMonths: number;
}

export const RollingResults: React.FC<RollingResultsProps> = ({ rollingResult, windowMonths, stepMonths }) => {
  return (
    <div className="lg:col-span-3">
      <Card className="p-6">
        <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
          🔄 滾動回測績效分布
          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {rollingResult.windows.length} 個窗口
          </span>
        </h3>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-xl">
            <div className="text-[9px] font-bold text-slate-400">中位數 CAGR</div>
            <div className="text-lg font-black text-blue-600">{rollingResult.medianPortfolioCagr.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <div className="text-[9px] font-bold text-slate-400">最差 CAGR</div>
            <div className="text-lg font-black text-rose-600">{rollingResult.worstPortfolioCagr.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <div className="text-[9px] font-bold text-slate-400">最佳 CAGR</div>
            <div className="text-lg font-black text-emerald-600">{rollingResult.bestPortfolioCagr.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <div className="text-[9px] font-bold text-slate-400">P5 CAGR</div>
            <div className="text-lg font-black text-amber-600">{rollingResult.pctl5PortfolioCagr.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <div className="text-[9px] font-bold text-slate-400">P95 CAGR</div>
            <div className="text-lg font-black text-emerald-600">{rollingResult.pctl95PortfolioCagr.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <div className="text-[9px] font-bold text-slate-400">最差回撤</div>
            <div className="text-lg font-black text-rose-600">{rollingResult.worstPortfolioDd.toFixed(1)}%</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase">
                <th className="pb-2">#</th>
                <th className="pb-2">區間</th>
                <th className="pb-2 text-right">配置 CAGR</th>
                <th className="pb-2 text-right">對照組 CAGR</th>
                <th className="pb-2 text-right">配置回撤</th>
                <th className="pb-2 text-right">對照組回撤</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rollingResult.windows.map((w, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2 font-bold text-slate-500">{i + 1}</td>
                  <td className="py-2 text-slate-500 font-medium">{w.startDate} ~ {w.endDate}</td>
                  <td className="py-2 text-right font-bold text-blue-600">{w.portfolio.cagr.toFixed(1)}%</td>
                  <td className="py-2 text-right text-slate-500">{w.benchmark.cagr.toFixed(1)}%</td>
                  <td className="py-2 text-right text-rose-500">{w.portfolio.maxDrawdown.toFixed(1)}%</td>
                  <td className="py-2 text-right text-slate-500">{w.benchmark.maxDrawdown.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[9px] text-slate-400 mt-3 font-medium">
            共 {rollingResult.windows.length} 個滑動窗口 · 每個窗口 {windowMonths} 個月 ({Math.round(windowMonths / 12)} 年) · 步長 {stepMonths} 個月
          </p>
        </div>
      </Card>
    </div>
  );
};
