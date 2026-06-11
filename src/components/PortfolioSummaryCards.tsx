import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { Portfolio } from '../context/AppContext';
import { calculateTotalPortfolioValue } from '../utils/rebalance';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  portfolio: Portfolio;
  formatCurrency: (val: number) => string;
}

export const PortfolioSummaryCards: React.FC<Props> = ({ portfolio, formatCurrency }) => {
  const { refreshUsdRate } = useApp();

  // ── Local FX refresh state ──
  const [isFxRefreshing, setIsFxRefreshing] = useState(false);
  const [fxMsg, setFxMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── 淨資產計算 ──
  const totalNetWorth = useMemo(() => {
    return calculateTotalPortfolioValue(portfolio);
  }, [portfolio]);

  // ── 取得退休設定 ──
  // We need retirement config from context for FIRE calculations;
  // useApp() gives us the full state. We only read, not write.
  const retirement = useApp().state.retirement;

  // ── 最新一期本金與盈餘精算 ──
  const latestHistoryPoint = useMemo(() => {
    const history = portfolio.history;
    return history.length > 0 ? history[history.length - 1] : null;
  }, [portfolio.history]);

  const latestCumulativeInvestment = useMemo(() => {
    return latestHistoryPoint?.cumulative_investment ?? totalNetWorth;
  }, [latestHistoryPoint, totalNetWorth]);

  const totalProfitAmt = useMemo(() => {
    return totalNetWorth - latestCumulativeInvestment;
  }, [totalNetWorth, latestCumulativeInvestment]);

  const totalRoi = useMemo(() => {
    return latestCumulativeInvestment > 0 ? (totalProfitAmt / latestCumulativeInvestment) * 100 : 0;
  }, [totalProfitAmt, latestCumulativeInvestment]);

  // ── 年化報酬率 (CAGR) ──
  const cagrReturn = useMemo(() => {
    const history = portfolio.history;
    if (history.length < 2) return 0;

    const startPoint = history[0];
    const endPoint = history[history.length - 1];

    const startDate = new Date(startPoint.date);
    const endDate = new Date(endPoint.date);

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

    if (diffYears < 0.05 || startPoint.net_worth <= 0) {
      return ((endPoint.net_worth - startPoint.net_worth) / startPoint.net_worth);
    }

    const cagr = Math.pow(endPoint.net_worth / startPoint.net_worth, 1 / diffYears) - 1;
    return cagr;
  }, [portfolio.history]);

  // ── FIRE 進度計算 ──
  const fireTarget = useMemo(() => {
    return retirement.monthly_spending * 12 * 25;
  }, [retirement.monthly_spending]);

  const firePercent = useMemo(() => {
    if (fireTarget <= 0) return 0;
    return (totalNetWorth / fireTarget) * 100;
  }, [totalNetWorth, fireTarget]);

  // ── USD/TWD 手動同步 ──
  const handleRefreshFx = useCallback(async () => {
    if (isFxRefreshing) return;
    setIsFxRefreshing(true);
    const success = await refreshUsdRate();
    setIsFxRefreshing(false);
    if (success) {
      setFxMsg({ type: 'success', text: `💱 USD/TWD 匯率同步成功！協 ${(portfolio.usdRate ?? 32.2).toFixed(2)}` });
    } else {
      setFxMsg({ type: 'error', text: '❌ 匯率同步失敗，請檢查網絡。' });
    }
    setTimeout(() => setFxMsg(null), 4000);
  }, [isFxRefreshing, refreshUsdRate, portfolio.usdRate]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 select-none">

      {/* 1. 最新淨資產 */}
      <Card hoverEffect={false} className="flex flex-col justify-center border-l-4 border-l-blue-500 col-span-2 sm:col-span-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">最新淨資產 (TWD)</span>
        <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1">
          ${formatCurrency(totalNetWorth)}
        </span>
        <div className="flex flex-wrap items-center gap-1.5 mt-1 select-none">
          <span className="text-[10px] text-slate-400 font-bold">即時資產市值加總</span>
          {portfolio.isHoldingMode && (
            <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-1 py-0.5 rounded">
              📊 持股模式
            </span>
          )}
        </div>
      </Card>

      {/* 2. 累計投入本金 */}
      <Card hoverEffect={false} className="flex flex-col justify-center border-l-4 border-l-slate-400">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">累計投入本金</span>
        <span className="text-xl sm:text-2xl font-black text-slate-700 tracking-tight mt-1">
          ${formatCurrency(latestCumulativeInvestment)}
        </span>
        <span className="text-[10px] text-slate-400 font-bold mt-1">每月歷史月誌累計儲蓄</span>
      </Card>

      {/* 3. 累計投資損益 & ROI */}
      <Card hoverEffect={false} className={`flex flex-col justify-center border-l-4 ${totalProfitAmt >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">累計損益與報酬</span>
        <div className="flex items-baseline gap-1 mt-1 flex-wrap">
          <span className={`text-xl sm:text-2xl font-black tracking-tight ${totalProfitAmt >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalProfitAmt >= 0 ? '+' : ''}${formatCurrency(totalProfitAmt)}
          </span>
          <span className={`text-xs font-bold flex items-center ${totalProfitAmt >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalProfitAmt >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {totalRoi.toFixed(1)}%
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-bold mt-1">市值相較本金複利剪刀差</span>
      </Card>

      {/* 4. 年化報酬率 */}
      <Card hoverEffect={false} className="flex flex-col justify-center border-l-4 border-l-purple-500">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CAGR 年化報酬</span>
        <span className="text-xl sm:text-2xl font-black text-purple-600 tracking-tight mt-1">
          {(cagrReturn * 100).toFixed(1)}%
        </span>
        <span className="text-[10px] text-slate-400 font-bold mt-1">由歷史首尾淨值幾何精算</span>
      </Card>

      {/* 5. FIRE 進度 */}
      <Card hoverEffect={false} className="flex flex-col justify-center border-l-4 border-l-teal-500">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">FIRE 目標進度</span>
        <span className="text-xl sm:text-2xl font-black text-teal-600 tracking-tight mt-1">{firePercent.toFixed(1)}%</span>
        <div className="mt-1.5">
          <ProgressBar value={firePercent} showText={false} />
        </div>
        <span className="text-[10px] text-slate-400 font-bold mt-1">目標：${formatCurrency(fireTarget)}</span>
      </Card>

      {/* 6. USD/TWD 即時匯率 */}
      <Card hoverEffect={false} className="flex flex-col justify-center border-l-4 border-l-orange-400">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">USD/TWD 匯率</span>
          <button
            onClick={handleRefreshFx}
            disabled={isFxRefreshing}
            title="重新拉取 USD/TWD 即時匯率"
            className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-orange-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFxRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <span className="text-xl sm:text-2xl font-black text-orange-500 tracking-tight mt-1 tabular-nums">
          {(portfolio.usdRate ?? 32.2).toFixed(2)}
        </span>
        {portfolio.fxLastUpdated ? (
          <span className="text-[10px] font-bold mt-1 text-emerald-600 flex items-center gap-1 select-none">
            ⚡ 自動同步 {new Date(portfolio.fxLastUpdated).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-bold mt-1 select-none">點擊同步</span>
        )}
        {fxMsg && (
          <span className={`text-[9px] font-bold mt-0.5 ${fxMsg.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
            {fxMsg.text}
          </span>
        )}
      </Card>

    </div>
  );
};
