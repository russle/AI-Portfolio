import React from 'react';
import { Card } from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { BacktestResult } from '../utils/backtest';

interface MetricCardsProps {
  isLoading: boolean;
  backtestResult: BacktestResult | null;
  formatYAxis: (val: number) => string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ isLoading, backtestResult, formatYAxis }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

      {/* 卡片 1: 最終資產 */}
      <Card hoverEffect={false} className="bg-gradient-to-b from-blue-50/40 to-white border-blue-100/50 p-4 rounded-2xl">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">最終資產總值</div>
        {isLoading ? (
          <div className="h-6 bg-slate-200 rounded w-28 animate-pulse mt-2"></div>
        ) : (
          <div className="mt-1.5">
            <div className="text-base font-black font-mono text-blue-600">
              {backtestResult ? formatYAxis(backtestResult.metrics.portfolio.finalValue) : '$-'}
            </div>
            {backtestResult?.metrics.actual && (
              <div className="text-[9px] font-bold text-amber-500 mt-0.5 font-mono">
                真實持股: {formatYAxis(backtestResult.metrics.actual.finalValue)}
              </div>
            )}
            <div className="text-[9px] font-bold text-slate-400 mt-1">
              投入: {backtestResult ? formatYAxis(backtestResult.metrics.portfolio.totalInvested) : '-'}
            </div>
          </div>
        )}
      </Card>

      {/* 卡片 2: 年化報酬率 (CAGR) */}
      <Card hoverEffect={false} className="bg-gradient-to-b from-emerald-50/40 to-white border-emerald-100/50 p-4 rounded-2xl">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">年化報酬率 (CAGR)</div>
        {isLoading ? (
          <div className="h-6 bg-slate-200 rounded w-16 animate-pulse mt-2"></div>
        ) : (
          <div className="mt-1.5">
            <div className="text-lg font-black font-mono text-emerald-600 flex items-center gap-0.5">
              {backtestResult ? `${backtestResult.metrics.portfolio.cagr}%` : '-%'}
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            {backtestResult?.metrics.actual && (
              <div className="text-[9px] font-bold text-amber-500 mt-0.5 font-mono">
                真實持股: {backtestResult.metrics.actual.cagr}%
              </div>
            )}
            <div className="text-[9px] font-bold text-slate-400 mt-1">
              對照組: {backtestResult ? `${backtestResult.metrics.benchmark.cagr}%` : '-'}
            </div>
          </div>
        )}
      </Card>

      {/* 卡片 3: 最大回撤 (Max Drawdown) */}
      <Card hoverEffect={false} className="bg-gradient-to-b from-rose-50/40 to-white border-rose-100/50 p-4 rounded-2xl">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">歷史最大回撤</div>
        {isLoading ? (
          <div className="h-6 bg-slate-200 rounded w-20 animate-pulse mt-2"></div>
        ) : (
          <div className="mt-1.5">
            <div className="text-lg font-black font-mono text-rose-600 flex items-center gap-0.5">
              {backtestResult ? `${backtestResult.metrics.portfolio.maxDrawdown}%` : '-%'}
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            </div>
            {backtestResult?.metrics.actual && (
              <div className="text-[9px] font-bold text-amber-500 mt-0.5 font-mono">
                真實持股: {backtestResult.metrics.actual.maxDrawdown}%
              </div>
            )}
            <div className="text-[9px] font-bold text-slate-400 mt-1">
              對照組: {backtestResult ? `${backtestResult.metrics.benchmark.maxDrawdown}%` : '-'}
            </div>
          </div>
        )}
      </Card>

      {/* 卡片 4: 夏普值 (Sharpe Ratio) */}
      <Card hoverEffect={false} className="bg-gradient-to-b from-amber-50/40 to-white border-amber-100/50 p-4 rounded-2xl">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">夏普值 (Sharpe)</div>
        {isLoading ? (
          <div className="h-6 bg-slate-200 rounded w-12 animate-pulse mt-2"></div>
        ) : (
          <div className="mt-1.5">
            <div className="text-lg font-black font-mono text-amber-600 flex items-center gap-1.5">
              {backtestResult ? backtestResult.metrics.portfolio.sharpeRatio : '-'}
              {backtestResult && backtestResult.metrics.portfolio.sharpeRatio >= 1.5 && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-500/10 rounded border border-amber-500/20 text-amber-600 animate-pulse">
                  極佳 🏆
                </span>
              )}
              {backtestResult && backtestResult.metrics.portfolio.sharpeRatio >= 1.0 && backtestResult.metrics.portfolio.sharpeRatio < 1.5 && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-500/10 rounded border border-amber-500/20 text-amber-600">
                  優秀 👍
                </span>
              )}
            </div>
            {backtestResult?.metrics.actual && (
              <div className="text-[9px] font-bold text-amber-500 mt-0.5 font-mono">
                真實持股: {backtestResult.metrics.actual.sharpeRatio}
              </div>
            )}
            <div className="text-[9px] font-bold text-slate-400 mt-1">
              對照組: {backtestResult ? backtestResult.metrics.benchmark.sharpeRatio : '-'}
            </div>
          </div>
        )}
      </Card>

    </div>
  );
};
