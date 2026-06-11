/**
 * AI-Portfolio 效率前緣 (Efficient Frontier) 計算引擎
 *
 * 基於均值-變異數模型 (Mean-Variance Optimization)，使用蒙地卡羅模擬
 * 生成大量隨機權重組合以描繪效率前緣曲線。
 *
 * 預期報酬與波動度參數基於長期歷史數據估算：
 *   台股: 9% / 18%
 *   美股: 8% / 16%
 *   債券: 3% / 5%
 *   加密: 15% / 60%
 *   現金: 1.5% / 0.5%
 */

import type { AllocationTarget } from '../context/AppContext';

/* ------------------------------------------------------------------ */
/*  Public Types                                                       */
/* ------------------------------------------------------------------ */

export interface EfficientFrontierPoint {
  volatility: number;     // 年化標準差 (%)
  expectedReturn: number; // 年化期望報酬率 (%)
  sharpeRatio: number;
  weights: AllocationTarget;
}

export interface OptimizationResult {
  frontier: EfficientFrontierPoint[];   // ~100 points
  maxSharpe: EfficientFrontierPoint;    // 夏普最大化
  minVolatility: EfficientFrontierPoint; // 最小波動
  current: EfficientFrontierPoint;       // 當前配置位置
}

/* ------------------------------------------------------------------ */
/*  Asset Parameters                                                   */
/* ------------------------------------------------------------------ */

const ASSET_KEYS: (keyof AllocationTarget)[] = [
  'tw_stock',
  'us_stock',
  'bond',
  'crypto',
  'cash',
];

/** 年化期望報酬率 (小數，非百分比) */
const EXPECTED_RETURNS: Record<keyof AllocationTarget, number> = {
  tw_stock: 0.09,
  us_stock: 0.08,
  bond: 0.03,
  crypto: 0.15,
  cash: 0.015,
};

/** 年化波動度 (小數) */
const VOLATILITIES: Record<keyof AllocationTarget, number> = {
  tw_stock: 0.18,
  us_stock: 0.16,
  bond: 0.05,
  crypto: 0.60,
  cash: 0.005,
};

/** 無風險利率 */
const RISK_FREE_RATE = 0.015;

/* ------------------------------------------------------------------ */
/*  Correlation / Covariance Matrix                                    */
/* ------------------------------------------------------------------ */

/**
 * 取得兩資產間的相關係數
 * 基於歷史經驗估算，反映真實市場相關性結構
 */
function getCorrelation(
  a: keyof AllocationTarget,
  b: keyof AllocationTarget,
): number {
  if (a === b) return 1;
  const key = [a, b].sort().join('_');
  const map: Record<string, number> = {
    bond_cash: 0.0,
    bond_crypto: 0.05,
    bond_tw_stock: 0.10,
    bond_us_stock: 0.05,
    cash_crypto: 0.0,
    cash_tw_stock: 0.0,
    cash_us_stock: 0.0,
    crypto_tw_stock: 0.30,
    crypto_us_stock: 0.35,
    tw_stock_us_stock: 0.65,
  };
  return map[key] ?? 0;
}

/** 計算兩資產間的共變異數 */
function getCovariance(
  a: keyof AllocationTarget,
  b: keyof AllocationTarget,
): number {
  return getCorrelation(a, b) * VOLATILITIES[a] * VOLATILITIES[b];
}

/* ------------------------------------------------------------------ */
/*  Portfolio Math Helpers                                             */
/* ------------------------------------------------------------------ */

function computeReturn(weights: AllocationTarget): number {
  return ASSET_KEYS.reduce(
    (sum, k) => sum + weights[k] * EXPECTED_RETURNS[k],
    0,
  );
}

function computeVariance(weights: AllocationTarget): number {
  let v = 0;
  for (const i of ASSET_KEYS) {
    for (const j of ASSET_KEYS) {
      v += weights[i] * weights[j] * getCovariance(i, j);
    }
  }
  return v;
}

function computePoint(weights: AllocationTarget): EfficientFrontierPoint {
  const ret = computeReturn(weights);
  const vol = Math.sqrt(computeVariance(weights));
  const sharpe = vol > 0 ? (ret - RISK_FREE_RATE) / vol : 0;
  return {
    expectedReturn: ret * 100,
    volatility: vol * 100,
    sharpeRatio: sharpe,
    weights: { ...weights },
  };
}

/* ------------------------------------------------------------------ */
/*  Random Portfolio Generation                                        */
/* ------------------------------------------------------------------ */

/**
 * 生成一組 Dirichlet 分布隨機權重 (5 維單純形抽樣)
 * 使用指數分布變換使權重在單純形上較均勻分散
 */
function randomWeights(): AllocationTarget {
  const raw = ASSET_KEYS.map(() => -Math.log(Math.random()));
  const sum = raw.reduce((a, b) => a + b, 0);
  const result: AllocationTarget = {
    tw_stock: 0,
    us_stock: 0,
    bond: 0,
    crypto: 0,
    cash: 0,
  };
  ASSET_KEYS.forEach((k, i) => {
    result[k] = raw[i] / sum;
  });
  return result;
}

/**
 * 從大量隨機組合中提取效率前緣 (Pareto frontier)
 * 演算法：
 *   1. 按波動度升冪排序
 *   2. 掃描並保留波動度遞增時報酬也遞增的點 (dominant points)
 *   3. 從 dominant points 中均勻取樣 ~100 點
 */
function extractFrontier(
  points: EfficientFrontierPoint[],
  targetCount: number,
): EfficientFrontierPoint[] {
  if (points.length === 0) return [];

  // 按波動度排序
  const sorted = [...points].sort((a, b) => a.volatility - b.volatility);

  // 保留 Pareto 優勢點：波動度上升時報酬必須也上升
  const dominant: EfficientFrontierPoint[] = [];
  let maxRet = -Infinity;
  for (const p of sorted) {
    if (p.expectedReturn > maxRet) {
      // 排除波動度暴增但報酬僅微增的點 (保留 sharp 曲線)
      if (
        dominant.length > 0
      ) {
        const last = dominant[dominant.length - 1];
        const volDelta = p.volatility - last.volatility;
        const retDelta = p.expectedReturn - last.expectedReturn;
        // 若波動增加但報酬幾乎不變，跳過該點
        if (volDelta > 0.01 && retDelta / volDelta < 0.01) {
          maxRet = p.expectedReturn;
          continue;
        }
      }
      dominant.push(p);
      maxRet = p.expectedReturn;
    }
  }

  if (dominant.length <= targetCount) return dominant;

  // 均勻取樣
  const step = (dominant.length - 1) / (targetCount - 1);
  const result: EfficientFrontierPoint[] = [];
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.round(i * step);
    result.push(dominant[Math.min(idx, dominant.length - 1)]);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * 計算效率前緣
 * @param steps - 輸出曲線上的點數 (預設 100)
 * @param samplesPerStep - 每點蒙地卡羅樣本數 (預設 10000，總樣本 = steps * samplesPerStep)
 */
export function computeEfficientFrontier(
  steps: number = 100,
  samplesPerStep: number = 10000,
): OptimizationResult {
  const totalSamples = steps * samplesPerStep;
  const points: EfficientFrontierPoint[] = [];

  for (let i = 0; i < totalSamples; i++) {
    const w = randomWeights();
    points.push(computePoint(w));
  }

  const frontier = extractFrontier(points, steps);

  // 找最大夏普
  let maxSharpe = frontier[0];
  for (const p of frontier) {
    if (p.sharpeRatio > maxSharpe.sharpeRatio) maxSharpe = p;
  }

  // 找最小波動
  let minVol = frontier[0];
  for (const p of frontier) {
    if (p.volatility < minVol.volatility) minVol = p;
  }

  // 當前配置：使用預設權重計算
  const defaultWeights: AllocationTarget = {
    tw_stock: 0.3,
    us_stock: 0.4,
    bond: 0.15,
    cash: 0.1,
    crypto: 0.05,
  };
  const current = computePoint(defaultWeights);

  return {
    frontier,
    maxSharpe,
    minVolatility: minVol,
    current,
  };
}

/**
 * 計算給定權重配置的期望報酬、波動度與夏普值
 */
export function computeCurrentPosition(
  currentWeights: AllocationTarget,
): EfficientFrontierPoint {
  return computePoint(currentWeights);
}
