import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { runStressTestScenario, runAllStressTests } from '../utils/stressTest';
import type { StressTestResult, RegimeId } from '../utils/stressTest';
import {
  FlaskConical, TrendingDown, Calendar, AlertTriangle,
  Clock, DollarSign, ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

// ─── 宏觀經濟制度 UI 對照資訊 ───
const REGIME_INFO: Record<RegimeId, { name: string; description: string; years: number }> = {
  japan_lost_decade: {
    name: '日本失落十年',
    description: '1991-2000 日本資產泡沫破滅後的長期通縮與零增長',
    years: 10,
  },
  us_stagflation: {
    name: '美國滯脹危機',
    description: '1973-1981 石油危機與高通膨，股債雙殺',
    years: 9,
  },
  zero_interest_rate: {
    name: '零利率失落時代',
    description: '2008-2016 歐/日零利率、低增長、資產價格扭曲',
    years: 8,
  },
};

type SelectableRegime = RegimeId | 'all';

// ─── 格式化輔助函式 ───
const formatAmount = (val: number) => {
  if (val >= 100000000) return `$${(val / 100000000).toFixed(1)}億`;
  if (val >= 10000) return `$${Math.round(val / 10000)}萬`;
  return `$${Math.round(val).toLocaleString()}`;
};

const formatPercent = (val: number) => `${val.toFixed(1)}%`;

// ═══════════════════════════════════════════════
//  組件
// ═══════════════════════════════════════════════
export const StressTestPage: React.FC = () => {
  const { state } = useApp();
  const { portfolio, retirement } = state;

  const retireAge = retirement.life_expectancy ?? 65;
  const currentAge = retirement.age ?? 30;

  const [selectedRegime, setSelectedRegime] = useState<SelectableRegime | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── 計算壓力測試結果 ──
  const results = useMemo<StressTestResult[]>(() => {
    if (selectedRegime === 'all') {
      return runAllStressTests(portfolio, retirement, retireAge, currentAge);
    }
    if (selectedRegime) {
      return [runStressTestScenario(portfolio, retirement, selectedRegime, retireAge, currentAge)];
    }
    return [];
  }, [selectedRegime, portfolio, retirement, retireAge, currentAge]);

  // ── 事件處理 ──
  const handleSelect = (id: SelectableRegime) => {
    setSelectedRegime(id);
    if (showResult) setShowResult(false);
  };

  const handleRunTest = () => {
    if (!selectedRegime) return;
    setIsLoading(true);
    setShowResult(false);
    setTimeout(() => {
      setShowResult(true);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ═══ 標題區 ═══ */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <FlaskConical className="w-8 h-8 text-blue-500" />
          宏觀經濟脫水測試儀表板
        </h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          選取歷史上著名的宏觀經濟制度，對您的投資組合進行極端壓力測試。
          評估在歷經長期衰退、滯脹或零利率環境下，您的資產能否熬過考驗。
        </p>
      </div>

      {/* ═══ 場景選擇卡片 ═══ */}
      <div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">
          選擇壓力場景
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ── 全部場景 ── */}
          <button
            onClick={() => handleSelect('all')}
            className={`
              backdrop-blur-md rounded-2xl p-5 text-left transition-all duration-300
              border-2 shadow-xl
              ${selectedRegime === 'all'
                ? 'border-blue-500 bg-blue-50/80 shadow-blue-200/50'
                : 'border-slate-200/60 bg-white/80 hover:shadow-2xl hover:-translate-y-0.5 cursor-pointer'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-800 text-base">全部場景</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              同時模擬三種經濟制度，全面檢驗資產韌性
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>綜合分析</span>
            </div>
          </button>

          {/* ── 各經濟制度卡片 ── */}
          {(Object.entries(REGIME_INFO) as [RegimeId, typeof REGIME_INFO[RegimeId]][]).map(([id, info]) => (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              className={`
                backdrop-blur-md rounded-2xl p-5 text-left transition-all duration-300
                border-2 shadow-xl
                ${selectedRegime === id
                  ? 'border-blue-500 bg-blue-50/80 shadow-blue-200/50'
                  : 'border-slate-200/60 bg-white/80 hover:shadow-2xl hover:-translate-y-0.5 cursor-pointer'
                }
              `}
            >
              <h3 className="font-bold text-slate-800 text-base mb-1">{info.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                {info.description}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>持續 {info.years} 年</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 啟動按鈕 ═══ */}
      <div className="flex justify-center">
        <button
          onClick={handleRunTest}
          disabled={!selectedRegime}
          className={`
            px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300
            flex items-center gap-2 shadow-lg
            ${selectedRegime
              ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white hover:shadow-blue-300/50 hover:-translate-y-0.5 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          <FlaskConical className="w-4 h-4" />
          開始脫水測試
        </button>
      </div>

      {/* ═══ 結果展示區 ═══ */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-5 bg-slate-200 rounded w-48" />
                <div className="h-3 bg-slate-200 rounded w-72" />
              </div>
              <div className="h-8 bg-slate-200 rounded w-28" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/40">
                  <div className="h-3 bg-slate-200 rounded w-16 mb-3" />
                  <div className="h-6 bg-slate-200 rounded w-24" />
                </div>
              ))}
            </div>
            <div className="h-64 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      )}

      {showResult && results.length > 0 && (
        <div className="space-y-8">
          {results.map((result) => {
            const regimeInfo = REGIME_INFO[result.scenarioId as RegimeId];
            const totalYears = regimeInfo?.years ?? result.yearsSurvived;
            const survived = !result.isDepleted;
            const gradientId = `assetGradient-${result.scenarioId}`;

            return (
              <Card key={result.scenarioId} className="p-6 space-y-6">
                {/* 1. 場景標題列 */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-blue-100 text-blue-700 uppercase">
                        壓力測試結果
                      </span>
                      {result.isDepleted && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-rose-100 text-rose-700 uppercase">
                          資產歸零
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mt-2">
                      {result.scenarioName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{result.description}</p>
                  </div>

                  {/* 狀態標章 */}
                  <div
                    className={`
                      px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0
                      ${survived
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }
                    `}
                  >
                    {survived ? (
                      <span className="flex items-center gap-1.5">✅ 熬過考驗</span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        ❌ 第 {result.depletionYear} 年歸零
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. 摘要指標網格 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 初始資產 */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/40">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className="font-semibold">初始資產</span>
                    </div>
                    <span className="text-lg font-black text-slate-800">
                      {formatAmount(result.initialAsset)}
                    </span>
                  </div>

                  {/* 最終資產 */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/40">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className="font-semibold">最終資產</span>
                    </div>
                    <span className={`text-lg font-black ${survived ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {result.finalAsset >= 0 ? formatAmount(result.finalAsset) : '$0'}
                    </span>
                  </div>

                  {/* 最大回撤 */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/40">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span className="font-semibold">最大回撤</span>
                    </div>
                    <span className="text-lg font-black text-rose-600">
                      {formatPercent(result.maxDrawdown)}
                    </span>
                  </div>

                  {/* 存活年數 */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/40">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-semibold">存活年數</span>
                    </div>
                    <span className={`text-lg font-black ${survived ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {result.yearsSurvived}
                      <span className="text-sm font-semibold text-slate-400"> / {totalYears} 年</span>
                    </span>
                  </div>
                </div>

                {/* 3. 耗盡警報 */}
                {result.isDepleted && result.depletionYear && (
                  <div className="flex items-start gap-3 p-4 bg-rose-50/80 border border-rose-200/60 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sm text-rose-700">資產耗盡警示</span>
                      <p className="text-xs text-rose-600 mt-1">
                        在第 <strong>{result.depletionYear}</strong> 年資產歸零。當前年度生活費為{' '}
                        <strong>{formatAmount(result.annualSpending)}</strong>，
                        累計熬過 <strong>{result.yearsSurvived}</strong> / {totalYears} 年。
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. 資產走勢圖 */}
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                    資產變動軌跡
                  </span>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={result.assetTrajectory}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor={survived ? '#10b981' : '#f43f5e'}
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="95%"
                              stopColor={survived ? '#10b981' : '#f43f5e'}
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="year"
                          tick={{ fontSize: 12, fill: '#94a3b8' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                          label={{ value: '年份', position: 'insideBottomRight', offset: -5, style: { fontSize: 11, fill: '#94a3b8' } }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#94a3b8' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => `$${(v / 10000).toFixed(0)}萬`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number | undefined) => value !== undefined ? [formatAmount(value), '資產價值'] : ['', '資產價值']}
                          labelFormatter={(label: number | string) => `第 ${label} 年`}
                        />
                        <Area
                          type="monotone"
                          dataKey="assetValue"
                          stroke={survived ? '#10b981' : '#f43f5e'}
                          strokeWidth={2}
                          fill={`url(#${gradientId})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 無結果時的說明提示 */}
      {!isLoading && !showResult && (
        <div className="text-center py-10">
          <p className="text-sm text-slate-400">
            選擇上方場景後，點擊「開始脫水測試」按鈕檢視結果
          </p>
        </div>
      )}
    </div>
  );
};
