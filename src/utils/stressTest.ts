import type { Portfolio, RetirementConfig } from '../context/AppContext';

/**
 * 宏觀經濟制度壓力測試引擎
 * 模擬歷史上最嚴峻的三種經濟制度對當前投資組合的影響
 */

export interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  description: string;
  initialAsset: number;
  finalAsset: number;
  assetTrajectory: { year: number; assetValue: number }[];
  maxDrawdown: number;
  isDepleted: boolean;
  depletionYear: number | null;
  yearsSurvived: number;
  annualSpending: number;
}

// 三種歷史宏觀制度年度報酬率資料
const REGIMES = {
  japan_lost_decade: {
    name: '日本失落十年',
    description: '1991-2000 日本資產泡沫破滅後的長期通縮與零增長',
    years: 10,
    returns: {
      tw_stock: [-0.08, -0.05, 0.02, -0.03, 0.01, -0.02, -0.04, 0.03, -0.01, 0.02],
      us_stock: [0.05, 0.03, 0.06, 0.02, 0.04, 0.07, 0.05, 0.08, 0.03, 0.06],
      bond: [0.06, 0.055, 0.05, 0.045, 0.05, 0.04, 0.035, 0.03, 0.025, 0.02],
      crypto: [0.05, 0.03, 0.08, -0.02, 0.05, 0.10, -0.05, 0.08, 0.03, 0.06],
      cash: [0.03, 0.02, 0.015, 0.01, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005]
    }
  },
  us_stagflation: {
    name: '美國滯脹危機',
    description: '1973-1981 石油危機與高通膨，股債雙殺',
    years: 9,
    returns: {
      tw_stock: [-0.10, -0.15, 0.08, 0.12, 0.15, 0.10, -0.05, 0.08, 0.12],
      us_stock: [-0.15, -0.20, 0.05, 0.10, 0.12, 0.08, -0.10, 0.05, 0.10],
      bond: [-0.05, -0.08, 0.02, 0.03, 0.04, 0.01, -0.03, 0.02, 0.03],
      crypto: [0.30, 0.20, 0.15, 0.10, 0.05, 0.08, 0.12, 0.10, 0.08],
      cash: [0.07, 0.08, 0.06, 0.055, 0.05, 0.045, 0.05, 0.06, 0.07]
    }
  },
  zero_interest_rate: {
    name: '零利率失落時代',
    description: '2008-2016 歐/日零利率、低增長、資產價格扭曲',
    years: 8,
    returns: {
      tw_stock: [0.05, 0.08, 0.03, 0.06, 0.04, 0.07, 0.02, 0.05],
      us_stock: [0.08, 0.10, 0.05, 0.12, 0.07, 0.09, 0.04, 0.08],
      bond: [0.04, 0.03, 0.02, 0.01, 0.005, 0.005, 0.01, 0.015],
      crypto: [0.20, 0.30, 0.10, 0.15, 0.25, 0.08, 0.12, 0.18],
      cash: [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005]
    }
  }
};

type RegimeId = keyof typeof REGIMES;

export function runStressTestScenario(
  portfolio: Portfolio,
  retirement: RetirementConfig,
  scenarioId: RegimeId,
  retireAge: number,
  currentAge: number
): StressTestResult {
  const regime = REGIMES[scenarioId];
  const inflation = retirement.inflation;
  
  // 計算當前總資產
  const totalAssets = portfolio.cash + portfolio.fund + portfolio.tw_stock + portfolio.us_stock + portfolio.crypto;
  
  // 計算當前配置權重
  if (totalAssets === 0) {
    return {
      scenarioId,
      scenarioName: regime.name,
      description: regime.description,
      initialAsset: 0,
      finalAsset: 0,
      assetTrajectory: [],
      maxDrawdown: 0,
      isDepleted: true,
      depletionYear: 0,
      yearsSurvived: 0,
      annualSpending: 0
    };
  }
  
  const weights = {
    tw_stock: portfolio.tw_stock / totalAssets,
    us_stock: portfolio.us_stock / totalAssets,
    bond: portfolio.fund / totalAssets,
    crypto: portfolio.crypto / totalAssets,
    cash: portfolio.cash / totalAssets
  };
  
  const annualSpending = currentAge >= retireAge 
    ? retirement.monthly_spending * 12 
    : retirement.monthly_invest * 12;
  
  let asset = totalAssets;
  const trajectory: { year: number; assetValue: number }[] = [{ year: 0, assetValue: Math.round(asset) }];
  let maxDrawdown = 0;
  let peak = asset;
  let depletionYear: number | null = null;
  const isWithdrawal = currentAge >= retireAge;
  
  for (let y = 0; y < regime.years; y++) {
    const yearReturn = 
      weights.tw_stock * (regime.returns.tw_stock[y] ?? 0) +
      weights.us_stock * (regime.returns.us_stock[y] ?? 0) +
      weights.bond * (regime.returns.bond[y] ?? 0) +
      weights.crypto * (regime.returns.crypto[y] ?? 0) +
      weights.cash * (regime.returns.cash[y] ?? 0);
    
    if (isWithdrawal) {
      // 提領階段：先扣生活費再乘報酬(調整通膨)
      asset = Math.max(0, (asset - annualSpending) * (1 + yearReturn)) / (1 + inflation);
    } else {
      // 累積階段：先乘報酬再加投入(調整通膨)
      asset = (asset * (1 + yearReturn) + annualSpending) / (1 + inflation);
    }
    
    trajectory.push({ year: y + 1, assetValue: Math.round(asset) });
    
    if (asset > peak) peak = asset;
    const drawdown = peak > 0 ? (peak - asset) / peak * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    
    if (asset <= 0 && depletionYear === null) {
      depletionYear = y + 1;
    }
  }
  
  return {
    scenarioId,
    scenarioName: regime.name,
    description: regime.description,
    initialAsset: totalAssets,
    finalAsset: Math.round(asset),
    assetTrajectory: trajectory,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    isDepleted: asset <= 0,
    depletionYear,
    yearsSurvived: depletionYear ?? regime.years,
    annualSpending: Math.round(annualSpending)
  };
}

export function runAllStressTests(
  portfolio: Portfolio,
  retirement: RetirementConfig,
  retireAge: number,
  currentAge: number
): StressTestResult[] {
  const scenarioIds: RegimeId[] = ['japan_lost_decade', 'us_stagflation', 'zero_interest_rate'];
  return scenarioIds.map(id => runStressTestScenario(portfolio, retirement, id, retireAge, currentAge));
}

export type { RegimeId };
