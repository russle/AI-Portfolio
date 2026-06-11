import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { PortfolioHistoryPoint } from '../context/AppContext';
import { Card } from '../components/Card';
import { LineChart } from '../components/LineChart';
import { StackedAreaChart } from '../components/StackedAreaChart';
import { AlertBanner } from '../components/AlertBanner';
import {
  calculateTotalPortfolioValue,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateCorrelationMatrix,
  CORRELATION_ASSET_LABELS
} from '../utils/rebalance';
import { 
  TrendingUp, 
  Layers, 
  Calculator, 
  Eye, 
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  CalendarPlus,
  Edit,
  Trash2,
  Activity,
  TrendingDown,
  BarChart2,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ShareImportBar } from '../components/ShareImportBar';
import { PortfolioSummaryCards } from '../components/PortfolioSummaryCards';

export const OverviewPage: React.FC = () => {
  const { state, addGranularHistoryPoint, deleteHistoryPoint } = useApp();
  const navigate = useNavigate();
  const { portfolio, allocation_target } = state;

  const [chartView, setChartView] = useState<'line' | 'stacked'>('line');

  const formatCurrency = (val: number) => val.toLocaleString();

  // 補記與編輯快照相關 State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalDate, setModalDate] = useState('');
  const [modalCash, setModalCash] = useState(0);
  const [modalFund, setModalFund] = useState(0);
  const [modalTwStock, setModalTwStock] = useState(0);
  const [modalUsStock, setModalUsStock] = useState(0);
  const [modalCrypto, setModalCrypto] = useState(0);
  const [modalCumulativeInvestment, setModalCumulativeInvestment] = useState(0); // [NEW] 累計本金狀態
  const [modalMsg, setModalMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 1. 淨資產計算
  const totalNetWorth = useMemo(() => {
    return calculateTotalPortfolioValue(portfolio);
  }, [portfolio]);

  // 開啟 Modal（新增模式）並智慧預填
  const openSnapshotModal = () => {
    setModalMode('add');
    const history = portfolio.history;
    const latestPoint = history.length > 0 ? history[history.length - 1] : null;

    setModalDate(new Date().toISOString().split('T')[0]);
    setModalCash(latestPoint?.cash ?? portfolio.cash ?? 0);
    setModalFund(latestPoint?.fund ?? portfolio.fund ?? 0);
    setModalTwStock(latestPoint?.tw_stock ?? portfolio.tw_stock ?? 0);
    setModalUsStock(latestPoint?.us_stock ?? portfolio.us_stock ?? 0);
    setModalCrypto(latestPoint?.crypto ?? portfolio.crypto ?? 0);
    setModalCumulativeInvestment(latestPoint?.cumulative_investment ?? totalNetWorth ?? 0); // [NEW] 智慧預填本金
    setModalMsg(null);
    setIsModalOpen(true);
  };

  // 開啟 Modal（編輯模式）並載入快照數據
  const openEditSnapshotModal = (point: PortfolioHistoryPoint) => {
    setModalMode('edit');
    setModalDate(point.date);
    setModalCash(point.cash ?? 0);
    setModalFund(point.fund ?? 0);
    setModalTwStock(point.tw_stock ?? 0);
    setModalUsStock(point.us_stock ?? 0);
    setModalCrypto(point.crypto ?? 0);
    setModalCumulativeInvestment(point.cumulative_investment ?? point.net_worth ?? 0); // [NEW] 載入編輯本金
    setModalMsg(null);
    setIsModalOpen(true);
  };

  // 提交快照 (新增或編輯)
  const handleModalSubmit = () => {
    if (!modalDate) {
      setModalMsg({ type: 'error', text: '❌ 請選擇正確的日期' });
      return;
    }

    if (modalCash < 0 || modalFund < 0 || modalTwStock < 0 || modalUsStock < 0 || modalCrypto < 0) {
      setModalMsg({ type: 'error', text: '❌ 資產金額不能為負數' });
      return;
    }

    // 只有在新增模式下，如果重複日期才需要彈出 Overwrite 確認
    if (modalMode === 'add') {
      const isDuplicate = portfolio.history.some(p => p.date === modalDate);
      if (isDuplicate) {
        const confirmOverwrite = window.confirm(`⚠️ 日期 [${modalDate}] 已存在歷史快照記錄。是否確定要覆寫該日期的細分資產數據？`);
        if (!confirmOverwrite) return;
      }
    }

    // 呼叫 Context 方法，帶入累計本金
    addGranularHistoryPoint(modalDate, {
      cash: Math.round(modalCash),
      fund: Math.round(modalFund),
      tw_stock: Math.round(modalTwStock),
      us_stock: Math.round(modalUsStock),
      crypto: Math.round(modalCrypto)
    }, modalCumulativeInvestment > 0 ? Math.round(modalCumulativeInvestment) : undefined);

    setIsModalOpen(false);
  };

  // 1.5 帶有 MoM 環比的歷史快照數組 (最新在最前)
  const sortedHistoryWithMoM = useMemo(() => {
    const sorted = [...portfolio.history].sort((a, b) => b.date.localeCompare(a.date));
    return sorted.map((point, index) => {
      const prevPoint = sorted[index + 1];
      let momAmount = 0;
      let momPercent = 0;
      if (prevPoint) {
        momAmount = point.net_worth - prevPoint.net_worth;
        momPercent = prevPoint.net_worth > 0 ? (momAmount / prevPoint.net_worth) * 100 : 0;
      }

      // [NEW] 損益與本金計算
      const cumulativeInvestment = point.cumulative_investment ?? point.net_worth;
      const totalProfit = point.net_worth - cumulativeInvestment;
      const roi = cumulativeInvestment > 0 ? (totalProfit / cumulativeInvestment) * 100 : 0;

      return {
        ...point,
        momAmount,
        momPercent,
        cumulativeInvestment,
        totalProfit,
        roi
      };
    });
  }, [portfolio.history]);

  // [NEW] 進階風險分析指標
  const sharpeRatio = useMemo(() => calculateSharpeRatio(portfolio.history), [portfolio.history]);
  const maxDrawdown = useMemo(() => calculateMaxDrawdown(portfolio.history), [portfolio.history]);
  const correlationMatrix = useMemo(() => calculateCorrelationMatrix(portfolio.history), [portfolio.history]);
  const hasEnoughHistory = portfolio.history.length >= 3;
  const hasGranularHistory = portfolio.history.filter(p =>
    p.cash !== undefined && p.tw_stock !== undefined
  ).length >= 3;

  // 5. 偏離警示
  const deviationAlertMessage = useMemo(() => {
    if (totalNetWorth <= 0) return null;
    
    const actualPercents = {
      tw_stock: portfolio.tw_stock / totalNetWorth,
      us_stock: portfolio.us_stock / totalNetWorth,
      bond: portfolio.fund / totalNetWorth,
      cash: portfolio.cash / totalNetWorth,
      crypto: portfolio.crypto / totalNetWorth
    };

    const deviations = [
      { name: '台灣股票', diff: actualPercents.tw_stock - allocation_target.tw_stock },
      { name: '美國股票', diff: actualPercents.us_stock - allocation_target.us_stock },
      { name: '基金/債券', diff: actualPercents.bond - allocation_target.bond },
      { name: '現金', diff: actualPercents.cash - allocation_target.cash },
      { name: '加密貨幣', diff: actualPercents.crypto - allocation_target.crypto }
    ];

    const highDeviations = deviations.filter(d => Math.abs(d.diff) >= 0.05);
    
    if (highDeviations.length > 0) {
      const itemsStr = highDeviations.map(d => {
        const sign = d.diff > 0 ? '+' : '';
        return `${d.name}偏離了 ${sign}${(d.diff * 100).toFixed(1)}%`;
      }).join('、');
      return `⚠️ 配置偏離提示：您的實際配置中 ${itemsStr}。偏離幅度已達 5% 門檻，建議前往「再平衡」頁面進行優化調整。`;
    }

    return null;
  }, [portfolio, allocation_target, totalNetWorth]);

  // [NEW] Drift Guard 智慧資產偏離狀態計算 (Drift Alert Threshold Decision & Portfolio drift threshold checking)
  const driftStatus = useMemo(() => {
    if (totalNetWorth <= 0) {
      return {
        hasDrift: false,
        items: [],
        isHealthy: false
      };
    }

    const actualPercents = {
      tw_stock: portfolio.tw_stock / totalNetWorth,
      us_stock: portfolio.us_stock / totalNetWorth,
      bond: portfolio.fund / totalNetWorth,
      cash: portfolio.cash / totalNetWorth,
      crypto: portfolio.crypto / totalNetWorth
    };

    const deviations = [
      { name: '台股', diff: actualPercents.tw_stock - allocation_target.tw_stock, absDiff: Math.abs(actualPercents.tw_stock - allocation_target.tw_stock) },
      { name: '美股', diff: actualPercents.us_stock - allocation_target.us_stock, absDiff: Math.abs(actualPercents.us_stock - allocation_target.us_stock) },
      { name: '基金/債券', diff: actualPercents.bond - allocation_target.bond, absDiff: Math.abs(actualPercents.bond - allocation_target.bond) },
      { name: '現金', diff: actualPercents.cash - allocation_target.cash, absDiff: Math.abs(actualPercents.cash - allocation_target.cash) },
      { name: '加密貨幣', diff: actualPercents.crypto - allocation_target.crypto, absDiff: Math.abs(actualPercents.crypto - allocation_target.crypto) }
    ];

    // 過濾出偏離值 >= 5% 的大類，並依照 absDiff 降序排序
    const highDeviations = deviations
      .filter(d => d.absDiff >= 0.05)
      .sort((a, b) => b.absDiff - a.absDiff);

    const hasDrift = highDeviations.length > 0;
    
    // (Safe guard maintenance message) 當所有大類配置偏離絕對值均嚴格小於 5% 時為 healthy 狀態
    const isHealthy = !hasDrift;

    return {
      hasDrift,
      items: highDeviations,
      isHealthy
    };
  }, [portfolio, allocation_target, totalNetWorth]);

  return (
    <div className="space-y-8 animate-fade-in duration-300">

      <PortfolioSummaryCards portfolio={portfolio} formatCurrency={formatCurrency} />

      {/* [NEW] Drift Guard 智慧資產偏離警報 / 健康維持橫幅 (Alert Banner Glassmorphism UI) */}
      {totalNetWorth > 0 && (
        <div className="space-y-4">
          {driftStatus.hasDrift ? (
            <div className="relative group overflow-hidden rounded-2xl border border-amber-200/80 bg-amber-50/80 backdrop-blur-md p-4 sm:p-5 shadow-lg shadow-amber-500/5 transition-all duration-300 hover:shadow-amber-500/10 hover:border-amber-300">
              {/* 發光背景效果 */}
              <div 
                className="absolute -inset-y-12 -inset-x-12 opacity-50 blur-xl pointer-events-none" 
                style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)' }}
              />
              
              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* 左側：警告圖示與偏離文字 */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0 shadow-inner mt-0.5">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-900 flex items-center gap-1.5">
                      ⚠️ Drift Guard 智慧配置警報
                      <span className="text-[10px] font-black px-1.5 py-0.5 bg-amber-200/70 text-amber-800 rounded-md">
                        偏離度 ≥ 5%
                      </span>
                    </h3>
                    <p className="text-xs text-amber-800/90 font-bold mt-1 leading-relaxed">
                      檢測到大類配置偏離黃金安全區間！偏離度排序（由大到小）：{' '}
                      {/* 行動端與桌面端分流：行動端僅顯示前 2 名以防折行，桌面端顯示全部 */}
                      <span className="inline md:hidden">
                        {driftStatus.items.slice(0, 2).map((item) => {
                          const sign = item.diff > 0 ? '+' : '';
                          return (
                            <strong key={item.name} className="text-amber-950 underline decoration-amber-400 font-extrabold ml-1">
                              {item.name} ({sign}{(item.diff * 100).toFixed(1)}%)
                            </strong>
                          );
                        })}
                        {driftStatus.items.length > 2 && <span className="text-amber-700/80 ml-1">等共 {driftStatus.items.length} 個大類</span>}
                      </span>
                      <span className="hidden md:inline">
                        {driftStatus.items.map((item, idx) => {
                          const sign = item.diff > 0 ? '+' : '';
                          return (
                            <span key={item.name} className="mr-2">
                              {idx > 0 && '、'}
                              <strong className="text-amber-950 font-extrabold">
                                {item.name} ({sign}{(item.diff * 100).toFixed(1)}%)
                              </strong>
                            </span>
                          );
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                {/* 右側：跳轉決策導航按鈕 (⚖️ 再平衡 & 💰 下單) */}
                <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
                  <button
                    onClick={() => navigate('/rebalance')}
                    className="flex items-center gap-1.5 py-2 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-sm shadow-amber-600/10 cursor-pointer transition-all duration-200 active:scale-95"
                  >
                    ⚖️ 一鍵智慧再平衡
                  </button>
                  <button
                    onClick={() => navigate('/order')}
                    className="flex items-center gap-1.5 py-2 px-3.5 bg-white/90 hover:bg-slate-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-black shadow-sm cursor-pointer transition-all duration-200 active:scale-95"
                  >
                    💰 定期定額下單
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-emerald-50/50 backdrop-blur-md p-4 sm:p-5 shadow-lg shadow-emerald-500/5 transition-all duration-300 hover:shadow-emerald-500/10 hover:border-emerald-300">
              <div 
                className="absolute -inset-y-12 -inset-x-12 opacity-40 blur-xl pointer-events-none" 
                style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)' }}
              />
              
              <div className="relative flex items-center gap-3">
                <div className="p-2 bg-emerald-100/80 text-emerald-600 rounded-xl flex-shrink-0 shadow-inner">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                    🛡️ Safe Guard 黃金防禦守護中
                  </h3>
                  <p className="text-xs text-emerald-800/90 font-bold mt-0.5">
                    恭喜！您當前的組合配置已完美維持在 ±5% 黃金安全護欄內。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 偏離警告橫幅 */}
      {deviationAlertMessage && (
        <AlertBanner type="warning" message={deviationAlertMessage} />
      )}

      {/* ── 📊 組合風險分析指標牆 ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 select-none">
          <span className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
            <Activity className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-800">組合風險分析</h2>
            <p className="text-[10px] font-semibold text-slate-400">由歷史快照序列自動精算的量化風險指標</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* 夏普比率 */}
          <Card hoverEffect={false} className="flex flex-col border-l-4 border-l-violet-500 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sharpe Ratio</span>
              <span className="p-1 bg-violet-50 rounded-lg">
                <BarChart2 className="w-3.5 h-3.5 text-violet-500" />
              </span>
            </div>
            {hasEnoughHistory ? (
              <>
                <span className={`text-2xl font-black tracking-tight mt-1 ${
                  sharpeRatio >= 1 ? 'text-emerald-600' : sharpeRatio >= 0 ? 'text-amber-500' : 'text-rose-600'
                }`}>
                  {sharpeRatio.toFixed(2)}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    sharpeRatio >= 1 ? 'bg-emerald-50 text-emerald-700' :
                    sharpeRatio >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {sharpeRatio >= 1 ? '✅ 優秀 ≥1' : sharpeRatio >= 0.5 ? '🟡 良好 ≥0.5' : sharpeRatio >= 0 ? '⚠️ 偏低' : '❌ 負值'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold">越高越好</span>
                </div>
              </>
            ) : (
              <span className="text-sm text-slate-400 font-bold mt-2">需 ≥3 期歷史</span>
            )}
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 w-52 bg-slate-800 text-white text-[10px] leading-relaxed p-2.5 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              <p className="font-bold mb-1">📐 夏普比率（Sharpe Ratio）</p>
              <p>= 超額年化報酬 ÷ 波動率（標準差）</p>
              <p className="mt-1 text-slate-300">評估每承受一單位風險能獲得多少超額回報。≥1 為優秀，&lt;0 代表跑輸無風險利率。</p>
            </div>
          </Card>

          {/* 最大回撤 */}
          <Card hoverEffect={false} className="flex flex-col border-l-4 border-l-rose-500 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Max Drawdown</span>
              <span className="p-1 bg-rose-50 rounded-lg">
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              </span>
            </div>
            {hasEnoughHistory ? (
              <>
                <span className={`text-2xl font-black tracking-tight mt-1 ${
                  maxDrawdown > -0.1 ? 'text-emerald-600' : maxDrawdown > -0.25 ? 'text-amber-500' : 'text-rose-600'
                }`}>
                  {(maxDrawdown * 100).toFixed(1)}%
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    maxDrawdown > -0.1 ? 'bg-emerald-50 text-emerald-700' :
                    maxDrawdown > -0.25 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {maxDrawdown > -0.1 ? '✅ 控制良好' : maxDrawdown > -0.25 ? '⚠️ 中度回撤' : '❌ 重度回撤'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold">越小越好</span>
                </div>
              </>
            ) : (
              <span className="text-sm text-slate-400 font-bold mt-2">需 ≥3 期歷史</span>
            )}
            <div className="absolute bottom-full left-0 mb-2 w-52 bg-slate-800 text-white text-[10px] leading-relaxed p-2.5 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              <p className="font-bold mb-1">📉 最大回撤（Max Drawdown）</p>
              <p>= 歷史高點到最低谷的最大跌幅</p>
              <p className="mt-1 text-slate-300">反映最壞情況的虧損幅度。&lt;-25% 為重度回撤，需評估防禦配置是否充足。</p>
            </div>
          </Card>

          {/* 資產分散評分 */}
          <Card hoverEffect={false} className="flex flex-col border-l-4 border-l-sky-500 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">資產類別分散數</span>
              <span className="p-1 bg-sky-50 rounded-lg">
                <Layers className="w-3.5 h-3.5 text-sky-500" />
              </span>
            </div>
            {(() => {
              const activeAssets = [
                portfolio.cash > 0,
                portfolio.fund > 0,
                portfolio.tw_stock > 0,
                portfolio.us_stock > 0,
                portfolio.crypto > 0
              ].filter(Boolean).length;
              return (
                <>
                  <span className={`text-2xl font-black tracking-tight mt-1 ${
                    activeAssets >= 4 ? 'text-emerald-600' : activeAssets >= 3 ? 'text-amber-500' : 'text-rose-600'
                  }`}>
                    {activeAssets} / 5
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                      activeAssets >= 4 ? 'bg-emerald-50 text-emerald-700' :
                      activeAssets >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {activeAssets >= 4 ? '✅ 高度分散' : activeAssets >= 3 ? '🟡 中度分散' : '⚠️ 集中度偏高'}
                    </span>
                  </div>
                </>
              );
            })()}
            <div className="absolute bottom-full left-0 mb-2 w-52 bg-slate-800 text-white text-[10px] leading-relaxed p-2.5 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              <p className="font-bold mb-1">🎯 資產分散度</p>
              <p>統計目前持有餘額大於 0 的資產類別數量（現金/台股/美股/基金/加密）。</p>
              <p className="mt-1 text-slate-300">持有 4 種以上視為充分分散，可有效降低單一資產暴跌風險。</p>
            </div>
          </Card>

        </div>
      </div>

      {/* 中間主要圖表區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左側：資產成長趨勢折線圖 / 堆疊面積圖 */}
        <div className="lg:col-span-2">
          <Card hoverEffect={false} className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">資產歷史趨勢</h2>
                <p className="text-xs font-semibold text-slate-400">
                  {chartView === 'line' ? '展示最近歷史記點的本金與複利累積實況 (藍市值 vs 橙本金)' : '細分資產在各個歷史快照的消長結構'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* 📝 補記歷史快照按鈕 */}
                <button
                  onClick={openSnapshotModal}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[10px] font-black cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  補記快照
                </button>

                {/* 雙視角 Segmented Control */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 text-[10px] font-bold select-none">
                  <button
                    onClick={() => setChartView('line')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      chartView === 'line'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📈 本金與市值對照
                  </button>
                  <button
                    onClick={() => setChartView('stacked')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      chartView === 'stacked'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📊 資產消長堆疊
                  </button>
                </div>
                
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </span>
              </div>
            </div>
            
            <div className="flex-1 min-h-[280px] flex items-center">
              {chartView === 'line' ? (
                <LineChart 
                  data={portfolio.history} 
                  xKey="date" 
                  lines={[
                    { key: 'net_worth', name: '資產總市值', stroke: '#3b82f6' },
                    { key: 'cumulative_investment', name: '累計投入本金', stroke: '#f59e0b' }
                  ]} 
                />
              ) : (
                <StackedAreaChart 
                  data={portfolio.history} 
                  xKey="date" 
                />
              )}
            </div>
          </Card>
        </div>

        {/* 右側：相關性熱圖 + 數據備份 */}
        <div className="flex flex-col gap-5">
          {/* 上部：相關性熱圖 */}
          <Card hoverEffect={false} className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Activity className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-800">資產相關性熱圖</h2>
                <p className="text-[10px] text-slate-400 font-semibold">各類資產間的歷史相關係數</p>
              </div>
            </div>

            {hasGranularHistory ? (
              <div className="overflow-x-auto">
                <div className="min-w-[200px]">
                  {/* 欄標題 */}
                  <div className="flex mb-1">
                    <div className="w-14 flex-shrink-0" />
                    {CORRELATION_ASSET_LABELS.map(label => (
                      <div key={label} className="flex-1 text-center text-[9px] font-black text-slate-500 truncate px-0.5">{label}</div>
                    ))}
                  </div>
                  {/* 熱圖矩陣 */}
                  {correlationMatrix.map((row, i) => (
                    <div key={i} className="flex mb-1 items-center">
                      <div className="w-14 text-[9px] font-black text-slate-500 flex-shrink-0 truncate pr-1">
                        {CORRELATION_ASSET_LABELS[i]}
                      </div>
                      {row.map((val, j) => {
                        let bg = 'bg-slate-100';
                        let textColor = 'text-slate-400';
                        if (i === j) {
                          bg = 'bg-slate-200'; textColor = 'text-slate-600';
                        } else if (val >= 0.7) {
                          bg = 'bg-rose-500'; textColor = 'text-white';
                        } else if (val >= 0.4) {
                          bg = 'bg-rose-200'; textColor = 'text-rose-800';
                        } else if (val >= 0.1) {
                          bg = 'bg-rose-50'; textColor = 'text-rose-600';
                        } else if (val <= -0.7) {
                          bg = 'bg-blue-500'; textColor = 'text-white';
                        } else if (val <= -0.4) {
                          bg = 'bg-blue-200'; textColor = 'text-blue-800';
                        } else if (val <= -0.1) {
                          bg = 'bg-blue-50'; textColor = 'text-blue-600';
                        }
                        return (
                          <div
                            key={j}
                            title={`${CORRELATION_ASSET_LABELS[i]} vs ${CORRELATION_ASSET_LABELS[j]}: ${val.toFixed(2)}`}
                            className={`flex-1 aspect-square flex items-center justify-center text-[9px] font-black rounded mx-0.5 cursor-default transition-transform hover:scale-110 ${bg} ${textColor}`}
                          >
                            {i === j ? '—' : val.toFixed(2)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {/* 色彩圖例 */}
                  <div className="flex items-center gap-2 mt-3 text-[9px] font-bold text-slate-400">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded bg-blue-500" />
                      <span>負相關</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200" />
                      <span>無相關</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded bg-rose-500" />
                      <span>正相關</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <span className="text-3xl mb-2">📊</span>
                <p className="text-xs font-bold text-slate-600">需要 ≥3 期含細分資產的快照</p>
                <p className="text-[10px] text-slate-400 mt-1">補記快照時請填入各類資產金額</p>
              </div>
            )}
          </Card>

          <ShareImportBar />
        </div>

      </div>

      {/* 📝 歷史月誌與快照管理面板 (Monthly Asset Logger) */}
      <Card hoverEffect={false} className="bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 select-none">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              📝 歷史月誌與快照管理面板
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              按月管理您的資產歷史快照，即時追蹤 MoM 環比成長與配置消長
            </p>
          </div>
          <button
            onClick={openSnapshotModal}
            className="flex items-center justify-center gap-1.5 py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm transition-all hover:scale-[1.02] self-start sm:self-auto"
          >
            <CalendarPlus className="w-4 h-4" />
            補記歷史快照
          </button>
        </div>

        {sortedHistoryWithMoM.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-3">📭</span>
            <h3 className="text-sm font-bold text-slate-700">目前尚無歷史月誌快照</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm">
              快照歷史可以幫助您生成長期的資產增長圖表與年化報酬精算。請點擊上方按鈕補記您的第一筆快照！
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">
                  <th className="pb-3 font-black">月份 / 日期</th>
                  <th className="pb-3 font-black">總淨資產 (TWD)</th>
                  <th className="pb-3 font-black">累計本金 / 累計損益</th>
                  <th className="pb-3 font-black">MoM 環比變化</th>
                  <th className="pb-3 font-black">細分資產配置 (大於 $0 標的)</th>
                  <th className="pb-3 text-right font-black">操作項目</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {sortedHistoryWithMoM.map((point) => (
                  <tr key={point.date} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="py-4 font-bold text-slate-800">{point.date}</td>
                    <td className="py-4 font-extrabold text-slate-900">
                      ${point.net_worth.toLocaleString()}
                    </td>
                    <td className="py-4">
                      <div className="font-extrabold text-slate-700">
                        ${point.cumulativeInvestment.toLocaleString()}
                      </div>
                      <div className={`text-[10px] font-black mt-0.5 ${point.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {point.totalProfit >= 0 ? '盈 +' : '虧 '}${point.totalProfit.toLocaleString()} ({point.roi.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="py-4">
                      {point.momAmount !== 0 || sortedHistoryWithMoM.indexOf(point) < sortedHistoryWithMoM.length - 1 ? (
                        <div className={`flex items-center gap-0.5 font-bold ${point.momAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {point.momAmount >= 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          <span>
                            {point.momAmount >= 0 ? '+' : ''}
                            {point.momAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] opacity-90 ml-1">
                            ({point.momAmount >= 0 ? '+' : ''}
                            {point.momPercent.toFixed(1)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                          首期記點
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {point.cash !== undefined && point.cash > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200/50">
                            💵 現金: ${point.cash.toLocaleString()}
                          </span>
                        )}
                        {point.fund !== undefined && point.fund > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200/50">
                            📈 基金/債券: ${point.fund.toLocaleString()}
                          </span>
                        )}
                        {point.tw_stock !== undefined && point.tw_stock > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                            🇹🇼 台股: ${point.tw_stock.toLocaleString()}
                          </span>
                        )}
                        {point.us_stock !== undefined && point.us_stock > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200/50">
                            🇺🇸 美股: ${point.us_stock.toLocaleString()}
                          </span>
                        )}
                        {point.crypto !== undefined && point.crypto > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200/50">
                            🪙 加密: ${point.crypto.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-85 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditSnapshotModal(point)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg cursor-pointer transition-colors"
                          title="編輯此期快照"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const confirmDelete = window.confirm(`⚠️ 您確定要刪除 [${point.date}] 的歷史快照嗎？此操作將會重新精算您的資產曲線與環比數據，且無法復原。`);
                            if (confirmDelete) {
                              deleteHistoryPoint(point.date);
                            }
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                          title="刪除此期快照"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 四大入口卡片區 */}
      <div>
        <div className="flex flex-col mb-4 select-none">
          <h2 className="text-base font-bold text-slate-800">資產戰情室入口</h2>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">點擊下方卡片即可直接跳轉至各功能模組進行精算</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. 資產配置 */}
          <Card 
            onClick={() => navigate('/allocation')}
            className="group cursor-pointer hover:border-blue-300/80"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Layers className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">ALLOCATION</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">資產配置比例盤</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">
              對照當前實際資產與目標比例的偏離，一鍵調整風險模式 (保守/穩健/積極/進取)。
            </p>
          </Card>

          {/* 2. 再平衡 */}
          <Card 
            onClick={() => navigate('/rebalance')}
            className="group cursor-pointer hover:border-emerald-300/80"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <RefreshCw className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-full group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">REBALANCE</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">三軌再平衡控制台</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">
              實作精準平衡、新資金只買不賣、以及偏離門檻三種智慧再平衡模型，生成買賣指引。
            </p>
          </Card>

          {/* 3. 退休規劃 */}
          <Card 
            onClick={() => navigate('/retirement')}
            className="group cursor-pointer hover:border-indigo-300/80"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <Calculator className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">RETIREMENT</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">蒙地卡羅退休財務</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">
              透過 1000 次 Box-Muller 隨機複利模擬，精算各年齡退休可行度及成功率。
            </p>
          </Card>

          {/* 4. 情境模擬 */}
          <Card 
            onClick={() => navigate('/scenario')}
            className="group cursor-pointer hover:border-purple-300/80"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <Eye className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-full group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">SCENARIO</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors">黑天鵝極端情境預演</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">
              即時預演市場暴跌、美股暴漲、匯率劇烈波動及惡性通膨對您的資產版圖之影響。
            </p>
          </Card>

        </div>
      </div>

      {/* 底部輔助工具入口 */}
      <div className="flex justify-center select-none pt-4">
        <button
          onClick={() => navigate('/order')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-[1.01]"
        >
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          開啟「即時下單股數計算輔助器」
        </button>
      </div>

      {/* 補記歷史快照 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xl rounded-2xl max-w-md w-full overflow-hidden p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 select-none">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <CalendarPlus className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-black text-slate-800">
                  {modalMode === 'add' ? '📝 補記歷史快照' : '✏️ 編輯歷史快照'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {modalMsg && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{modalMsg.text}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* 日期欄位 */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  {modalMode === 'add' ? '選擇快照日期' : '快照日期 (編輯模式下不可修改)'}
                </label>
                <input
                  type="date"
                  value={modalDate}
                  disabled={modalMode === 'edit'}
                  onChange={(e) => setModalDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-bold transition-colors focus:outline-none focus:border-blue-500 ${
                    modalMode === 'edit'
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                />
              </div>

              {/* 資產明細欄位 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">💵 現金 (TWD)</label>
                  <input
                    type="number"
                    value={modalCash || ''}
                    onChange={(e) => setModalCash(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">📈 基金/債券 (TWD)</label>
                  <input
                    type="number"
                    value={modalFund || ''}
                    onChange={(e) => setModalFund(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">🇹🇼 台灣股票 (TWD)</label>
                  <input
                    type="number"
                    value={modalTwStock || ''}
                    onChange={(e) => setModalTwStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">🇺🇸 美國股票 (TWD)</label>
                  <input
                    type="number"
                    value={modalUsStock || ''}
                    onChange={(e) => setModalUsStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">🪙 加密貨幣 (TWD)</label>
                  <input
                    type="number"
                    value={modalCrypto || ''}
                    onChange={(e) => setModalCrypto(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="col-span-2 animate-fade-in">
                  <label className="block text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1">💰 累計投入本金 (TWD，選填)</label>
                  <input
                    type="number"
                    value={modalCumulativeInvestment || ''}
                    onChange={(e) => setModalCumulativeInvestment(Number(e.target.value))}
                    placeholder="用於精算您的本金與複利市值剪刀差"
                    className="w-full px-3 py-2 bg-blue-50/30 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* 智慧預填與防禦說明 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-[10px] text-slate-500 leading-relaxed space-y-1">
                <p className="font-bold text-slate-600">💡 系統智慧快照邏輯：</p>
                <ul className="list-disc pl-3.5 space-y-0.5 font-semibold">
                  <li>智慧預填：自動套用上一期歷史快照做為預填底稿。</li>
                  <li>本金對比：選填的累計本金將在首頁生成橙色的累計本金虛線，與藍色市值進行對照。</li>
                  <li>最新同步：補記今天或新日期，會同步更新當前實際資產。</li>
                  <li>漏帳不污染：補記過去歷史漏帳時，僅寫入 history，不污染當前資產現值。</li>
                </ul>
              </div>

              {/* 按鈕操作區 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleModalSubmit}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer transition-all shadow-sm"
                >
                  確認儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
