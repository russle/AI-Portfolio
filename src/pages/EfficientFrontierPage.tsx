import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { AllocationTarget } from '../context/AppContext';
import { Card } from '../components/Card';
import {
  computeEfficientFrontier,
  computeCurrentPosition,
} from '../utils/portfolioOptimization';
import type {
  EfficientFrontierPoint,
  OptimizationResult,
} from '../utils/portfolioOptimization';
import { BarChart3, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Custom Chart Tooltip                                               */
/* ------------------------------------------------------------------ */

interface TooltipPayloadItem {
  name: string;
  x: number;
  y: number;
  sharpe?: number;
  payload: TooltipPayloadItem;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-xl p-3 shadow-xl text-xs">
        <p className="font-bold text-slate-700 mb-1.5">{data.name}</p>
        <p className="text-slate-500">
          波動率:{' '}
          <span className="font-bold text-slate-700">{data.x}%</span>
        </p>
        <p className="text-slate-500">
          預期報酬:{' '}
          <span className="font-bold text-emerald-600">{data.y}%</span>
        </p>
        {data.sharpe !== undefined && (
          <p className="text-slate-500">
            夏普值:{' '}
            <span className="font-bold text-blue-600">{data.sharpe}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

/* ------------------------------------------------------------------ */
/*  Weight Bar Visualisation                                           */
/* ------------------------------------------------------------------ */

const WeightBar: React.FC<{
  weights: AllocationTarget;
  label: string;
}> = ({ weights, label }) => {
  const items: {
    key: keyof AllocationTarget;
    label: string;
    color: string;
  }[] = [
    { key: 'tw_stock', label: '台股', color: 'bg-blue-500' },
    { key: 'us_stock', label: '美股', color: 'bg-emerald-500' },
    { key: 'bond', label: '債券', color: 'bg-amber-500' },
    { key: 'crypto', label: '加密', color: 'bg-purple-500' },
    { key: 'cash', label: '現金', color: 'bg-slate-400' },
  ];
  return (
    <div className="p-3 bg-slate-50 rounded-xl">
      <div className="text-[9px] font-bold text-slate-400 mb-1.5">
        {label}
      </div>
      <div className="flex h-3 rounded-full overflow-hidden">
        {items.map((item) => {
          const pct = Math.round((weights[item.key] ?? 0) * 100);
          return pct > 0 ? (
            <div
              key={item.key}
              className={`${item.color}`}
              style={{ width: `${pct}%` }}
            />
          ) : null;
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
        {items
          .filter((item) => (weights[item.key] ?? 0) > 0)
          .map((item) => (
            <span
              key={item.key}
              className="text-[8px] font-bold text-slate-500"
            >
              {item.label} {Math.round((weights[item.key] ?? 0) * 100)}%
            </span>
          ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export const EfficientFrontierPage: React.FC = () => {
  const { state } = useApp();
  const { allocation_target } = state;

  const [showCurrent, setShowCurrent] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  /* ---- 初始載入延遲以展示骨架屏 ---- */
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  /* ---- 計算最佳化結果 ---- */
  const result = useMemo<OptimizationResult>(() => {
    return computeEfficientFrontier(100, 10000);
  }, []);

  const currentPoint = useMemo<EfficientFrontierPoint>(() => {
    return computeCurrentPosition(allocation_target);
  }, [allocation_target]);

  /* ---- 圖表資料準備 ---- */
  const chartData = useMemo(() => {
    return result.frontier.map((p, i) => ({
      x: Number(p.volatility.toFixed(2)),
      y: Number(p.expectedReturn.toFixed(2)),
      sharpe: Number(p.sharpeRatio.toFixed(3)),
      name: `點${i + 1}`,
      weights: p.weights,
    }));
  }, [result]);

  const maxSharpePoint = {
    x: Number(result.maxSharpe.volatility.toFixed(2)),
    y: Number(result.maxSharpe.expectedReturn.toFixed(2)),
    sharpe: Number(result.maxSharpe.sharpeRatio.toFixed(3)),
    name: '最大夏普值',
    weights: result.maxSharpe.weights,
  };

  const minVolPoint = {
    x: Number(result.minVolatility.volatility.toFixed(2)),
    y: Number(result.minVolatility.expectedReturn.toFixed(2)),
    name: '最小波動',
    weights: result.minVolatility.weights,
  };

  const currentChartPoint = {
    x: Number(currentPoint.volatility.toFixed(2)),
    y: Number(currentPoint.expectedReturn.toFixed(2)),
    sharpe: Number(currentPoint.sharpeRatio.toFixed(3)),
    name: '當前配置',
    weights: allocation_target,
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {isLoading ? (
        /* ═══ 骨架屏 ═══ */
        <div className="space-y-8 animate-pulse">
          {/* Title skeleton */}
          <div className="space-y-3">
            <div className="h-8 bg-slate-200 rounded w-72" />
            <div className="h-4 bg-slate-200 rounded w-96" />
          </div>
          {/* Metrics cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white/80 border border-slate-200/60 rounded-2xl p-4">
                <div className="h-3 bg-slate-200 rounded w-20 mb-3" />
                <div className="h-6 bg-slate-200 rounded w-16 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-28" />
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-6">
            <div className="h-4 bg-slate-200 rounded w-40 mb-6" />
            <div className="h-[420px] bg-slate-100 rounded-2xl" />
          </div>
          {/* Weight bars skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <div className="h-3 bg-slate-200 rounded w-24 mb-3" />
                <div className="h-3 bg-slate-200 rounded-full w-full mb-2" />
                <div className="h-2 bg-slate-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-blue-600" />
          效率前緣 (Efficient Frontier)
        </h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          基於均值-變異數模型 (Mean-Variance
          Optimization)，描繪不同資產配置下的風險與報酬取捨曲線。
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase">
            最大夏普組合
          </div>
          <div className="mt-1 text-lg font-black text-blue-600">
            {result.maxSharpe.sharpeRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">
            報酬 {result.maxSharpe.expectedReturn.toFixed(1)}% · 波動{' '}
            {result.maxSharpe.volatility.toFixed(1)}%
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase">
            最小波動組合
          </div>
          <div className="mt-1 text-lg font-black text-emerald-600">
            {result.minVolatility.volatility.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500">
            報酬 {result.minVolatility.expectedReturn.toFixed(1)}%
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase">
            當前配置波動
          </div>
          <div className="mt-1 text-lg font-black text-amber-600">
            {currentPoint.volatility.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500">
            報酬 {currentPoint.expectedReturn.toFixed(1)}%
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase">
            當前夏普值
          </div>
          <div
            className={`mt-1 text-lg font-black ${
              currentPoint.sharpeRatio >= 1.5
                ? 'text-emerald-600'
                : currentPoint.sharpeRatio >= 1.0
                  ? 'text-blue-600'
                  : 'text-amber-600'
            }`}
          >
            {currentPoint.sharpeRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">
            {currentPoint.sharpeRatio >= 1.5
              ? '極佳 🏆'
              : currentPoint.sharpeRatio >= 1.0
                ? '優秀 👍'
                : '普通'}
          </div>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6">
        <h3 className="font-bold text-slate-700 text-sm mb-4">
          風險報酬取捨曲線
        </h3>
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart
            margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="x"
              name="volatility"
              unit="%"
              label={{
                value: '年化波動率 (%)',
                position: 'bottom',
                style: { fontSize: 11, fill: '#94a3b8' },
              }}
              tick={{ fontSize: 10 }}
              domain={[0, 'auto']}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="return"
              unit="%"
              label={{
                value: '年化期望報酬率 (%)',
                angle: -90,
                position: 'left',
                style: { fontSize: 11, fill: '#94a3b8' },
              }}
              tick={{ fontSize: 10 }}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Efficient frontier scatter */}
            <Scatter
              name="效率前緣"
              data={chartData}
              fill="#3b82f6"
              opacity={0.6}
              shape="circle"
            />

            {/* Max Sharpe point */}
            <Scatter
              name="最大夏普"
              data={[maxSharpePoint]}
              fill="#10b981"
              shape="diamond"
            />

            {/* Min Volatility point */}
            <Scatter
              name="最小波動"
              data={[minVolPoint]}
              fill="#f59e0b"
              shape="triangle"
            />

            {/* Current allocation point */}
            {showCurrent && (
              <Scatter
                name="當前配置"
                data={[currentChartPoint]}
                fill="#ef4444"
                shape="star"
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-slate-500 justify-center">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500" /> 效率前緣
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-500 rotate-45" /> 最大夏普
          </span>
          <span className="flex items-center gap-1">
            <span className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-b-amber-500" />{' '}
            最小波動
          </span>
          <span className="flex items-center gap-1">
            <span className="text-red-500">★</span> 當前配置
          </span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showCurrent}
              onChange={(e) => setShowCurrent(e.target.checked)}
              className="accent-blue-600"
            />
            顯示當前配置
          </label>
        </div>
      </Card>

      {/* Portfolio Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WeightBar
          weights={result.maxSharpe.weights}
          label="🏆 最大夏普組合"
        />
        <WeightBar
          weights={result.minVolatility.weights}
          label="🛡️ 最小波動組合"
        />
        <WeightBar
          weights={allocation_target}
          label="📌 當前配置"
        />
      </div>

      {/* Explanation */}
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-500 leading-relaxed space-y-2">
            <p>
              <strong className="text-slate-700">效率前緣（Efficient Frontier）</strong>
              是現代投資組合理論的核心概念。曲線上的每一點都代表一個「在給定風險下能實現的最大預期報酬」的投資組合。
            </p>
            <p>
              <strong className="text-slate-700">
                最大夏普組合（Maximum Sharpe Ratio）
              </strong>
              是曲線上風險調整後報酬最優的點，代表每單位波動風險能獲得最高的超額報酬。
            </p>
            <p>
              <strong className="text-slate-700">
                最小波動組合（Minimum Volatility Portfolio）
              </strong>
              是整條曲線中最左側的點，代表風險最低的資產配置。
            </p>
            <p className="text-amber-600 font-medium">
              ⚠️ 本模型基於長期歷史數據（標準差與相關係數），實際未來表現可能有所差異。
            </p>
          </div>
        </div>
      </Card>
        </>
      )}
    </div>
  );
};
