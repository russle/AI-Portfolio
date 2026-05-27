import type { Portfolio, AllocationTarget, AssetClassKey } from '../context/AppContext';

export interface RebalanceResultItem {
  assetKey: AssetClassKey;
  displayName: string;
  currentValue: number;
  currentPercent: number;
  targetPercent: number;
  differencePercent: number;
  actionAmount: number; // 正值為買入，負值為賣出
}

// 資產與配置目標的映射關係
export const ASSET_MAP: Record<AssetClassKey, { targetKey: keyof AllocationTarget; name: string }> = {
  cash: { targetKey: 'cash', name: '現金 (Cash)' },
  fund: { targetKey: 'bond', name: '基金/債券 (Fund/Bond)' },
  tw_stock: { targetKey: 'tw_stock', name: '台灣股票 (TW Stock)' },
  us_stock: { targetKey: 'us_stock', name: '美國股票 (US Stock)' },
  crypto: { targetKey: 'crypto', name: '加密貨幣 (Crypto)' }
};

// 輔助函式：計算總資產
export const calculateTotalPortfolioValue = (portfolio: Portfolio): number => {
  return portfolio.cash + portfolio.fund + portfolio.tw_stock + portfolio.us_stock + portfolio.crypto;
};

/**
 * 1. 精準再平衡 (Exact Rebalance)
 * 計算使所有資產完全達到目標比例所需要的買賣金額
 */
export const calculateExactRebalance = (
  portfolio: Portfolio,
  target: AllocationTarget
): RebalanceResultItem[] => {
  const total = calculateTotalPortfolioValue(portfolio);
  
  return (Object.keys(ASSET_MAP) as Array<AssetClassKey>).map(key => {
    const mapping = ASSET_MAP[key];
    const currentValue = portfolio[key];
    const targetPercent = target[mapping.targetKey];
    
    const currentPercent = total > 0 ? currentValue / total : 0;
    const targetValue = total * targetPercent;
    const actionAmount = targetValue - currentValue;

    return {
      assetKey: key,
      displayName: mapping.name,
      currentValue,
      currentPercent,
      targetPercent,
      differencePercent: currentPercent - targetPercent,
      actionAmount
    };
  });
};

/**
 * 2. 新資金再平衡 (Cash Only Rebalance)
 * 使用者輸入新資金，在不賣出任何現有資產的前提下，將新資金按比例注入低配資產
 */
export const calculateCashOnlyRebalance = (
  portfolio: Portfolio,
  target: AllocationTarget,
  newCash: number
): RebalanceResultItem[] => {
  const total = calculateTotalPortfolioValue(portfolio);
  const nextTotal = total + newCash;
  
  // 計算在新增資金後，每項資產與理想資產總額的缺口 (Ideal - Current)
  const shortfalls = (Object.keys(ASSET_MAP) as Array<AssetClassKey>).map(key => {
    const mapping = ASSET_MAP[key];
    const currentValue = portfolio[key];
    const targetPercent = target[mapping.targetKey];
    const idealValue = nextTotal * targetPercent;
    const shortfall = idealValue - currentValue;

    return {
      key,
      displayName: mapping.name,
      currentValue,
      targetPercent,
      shortfall: shortfall > 0 ? shortfall : 0 // 僅保留正缺口（即低配資產）
    };
  });

  const totalPositiveShortfall = shortfalls.reduce((sum, item) => sum + item.shortfall, 0);

  return (Object.keys(ASSET_MAP) as Array<AssetClassKey>).map(key => {
    const mapping = ASSET_MAP[key];
    const currentValue = portfolio[key];
    const targetPercent = target[mapping.targetKey];
    const currentPercent = total > 0 ? currentValue / total : 0;
    
    // 如果總缺口大於 0，將新資金按正缺口比例分配給低配資產；否則等比例分配
    let actionAmount = 0;
    const itemShortfall = shortfalls.find(s => s.key === key)?.shortfall || 0;

    if (totalPositiveShortfall > 0) {
      actionAmount = newCash * (itemShortfall / totalPositiveShortfall);
    } else {
      actionAmount = newCash * targetPercent;
    }

    return {
      assetKey: key,
      displayName: mapping.name,
      currentValue,
      currentPercent,
      targetPercent,
      differencePercent: currentPercent - targetPercent,
      actionAmount // 這裏 actionAmount 均為正數，保證「只買不賣」
    };
  });
};

/**
 * 3. 偏離門檻再平衡 (Threshold Rebalance)
 * 只有當某資產類別偏離目標比例超過門檻時，才進行再平衡，否則不予調整 (維持 0)
 */
export const calculateThresholdRebalance = (
  portfolio: Portfolio,
  target: AllocationTarget,
  threshold: number // 例如 0.05 代表 5%
): RebalanceResultItem[] => {
  const total = calculateTotalPortfolioValue(portfolio);
  
  return (Object.keys(ASSET_MAP) as Array<AssetClassKey>).map(key => {
    const mapping = ASSET_MAP[key];
    const currentValue = portfolio[key];
    const targetPercent = target[mapping.targetKey];
    
    const currentPercent = total > 0 ? currentValue / total : 0;
    const diff = currentPercent - targetPercent;
    
    let actionAmount = 0;
    // 如果偏差大於等於門檻，才生成買賣金額；否則 actionAmount 為 0 保持不動
    if (Math.abs(diff) >= threshold) {
      const targetValue = total * targetPercent;
      actionAmount = targetValue - currentValue;
    }

    return {
      assetKey: key,
      displayName: mapping.name,
      currentValue,
      currentPercent,
      targetPercent,
      differencePercent: diff,
      actionAmount
    };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 進階風險分析指標計算函數（由歷史月誌 net_worth 序列推導）
// ─────────────────────────────────────────────────────────────────────────────

import type { PortfolioHistoryPoint } from '../context/AppContext';

/** 由 net_worth 序列算出逐期月報酬率 */
const getMonthlyReturns = (history: PortfolioHistoryPoint[]): number[] => {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const returns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].net_worth;
    const curr = sorted[i].net_worth;
    if (prev > 0) returns.push((curr - prev) / prev);
  }
  return returns;
};

/**
 * 最大回撤 (Max Drawdown)
 * 回傳值為負數，例如 -0.35 代表最大曾跌 35%
 */
export const calculateMaxDrawdown = (history: PortfolioHistoryPoint[]): number => {
  if (history.length < 2) return 0;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  let peak = sorted[0].net_worth;
  let maxDD = 0;
  for (const point of sorted) {
    if (point.net_worth > peak) peak = point.net_worth;
    const drawdown = peak > 0 ? (point.net_worth - peak) / peak : 0;
    if (drawdown < maxDD) maxDD = drawdown;
  }
  return maxDD;
};

/**
 * 夏普比率 (Sharpe Ratio)
 * = (平均月報酬 - 月無風險利率) / 月報酬標準差 × √12
 * 預設年化無風險利率 riskFreeRate = 0.02（2%）
 */
export const calculateSharpeRatio = (
  history: PortfolioHistoryPoint[],
  riskFreeRate = 0.02
): number => {
  const returns = getMonthlyReturns(history);
  if (returns.length < 3) return 0;
  const monthlyRfr = riskFreeRate / 12;
  const excessReturns = returns.map(r => r - monthlyRfr);
  const mean = excessReturns.reduce((s, r) => s + r, 0) / excessReturns.length;
  const variance = excessReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / excessReturns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  return (mean / stdDev) * Math.sqrt(12);
};

/**
 * 資產相關係數矩陣 (Correlation Matrix)
 * 針對五大類（cash, fund, tw_stock, us_stock, crypto）各期金額序列計算相關性
 * 回傳 5×5 矩陣（陣列順序：cash, tw_stock, us_stock, fund, crypto）
 */
const ASSET_KEYS_ORDER: Array<'cash' | 'tw_stock' | 'us_stock' | 'fund' | 'crypto'> = [
  'cash', 'tw_stock', 'us_stock', 'fund', 'crypto'
];

export const CORRELATION_ASSET_LABELS = ['現金', '台股', '美股', '基金/債', '加密'];

const pearsonCorrelation = (x: number[], y: number[]): number => {
  const n = x.length;
  if (n < 2) return 0;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  const num = x.reduce((s, v, i) => s + (v - meanX) * (y[i] - meanY), 0);
  const denX = Math.sqrt(x.reduce((s, v) => s + Math.pow(v - meanX, 2), 0));
  const denY = Math.sqrt(y.reduce((s, v) => s + Math.pow(v - meanY, 2), 0));
  if (denX === 0 || denY === 0) return 0;
  return num / (denX * denY);
};

export const calculateCorrelationMatrix = (
  history: PortfolioHistoryPoint[]
): number[][] => {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  // 過濾出有細分資產數據的期次
  const valid = sorted.filter(p =>
    p.cash !== undefined && p.tw_stock !== undefined &&
    p.us_stock !== undefined && p.fund !== undefined && p.crypto !== undefined
  );

  const series: Record<string, number[]> = {
    cash: valid.map(p => p.cash ?? 0),
    tw_stock: valid.map(p => p.tw_stock ?? 0),
    us_stock: valid.map(p => p.us_stock ?? 0),
    fund: valid.map(p => p.fund ?? 0),
    crypto: valid.map(p => p.crypto ?? 0),
  };

  return ASSET_KEYS_ORDER.map(keyA =>
    ASSET_KEYS_ORDER.map(keyB => {
      if (keyA === keyB) return 1;
      return parseFloat(pearsonCorrelation(series[keyA], series[keyB]).toFixed(3));
    })
  );
};

import type { HoldingItem } from '../context/AppContext';

export interface DcaAllocationResultItem {
  holdingId: string;
  symbol: string;
  name: string;
  assetKey: AssetClassKey;
  currentValueTwd: number;
  targetPercent: number; // 個股推估之總配置佔比
  gapTwd: number;        // 低配缺口額 (TWD)
  allocatedAmountTwd: number; // 分配到的台幣預算
  sharesToBuy: number;   // 建議買入股數
  remainingCashTwd: number; // 剩餘零頭台幣找零
  priceTwd: number;      // 台幣單價
  currency: 'TWD' | 'USD';
  originalPrice: number; // 原始原幣單價
}

/**
 * 4. 定期定額智慧分配 (DCA Budget Rebalance Advisor)
 * 在只買不賣前提下，優先將 Monthly Regular Budget (DCA budget) 分配給低配個股
 */
export const calculateDcaAllocation = (
  holdings: HoldingItem[],
  portfolio: Portfolio,
  target: AllocationTarget,
  budget: number,
  usdRate: number
): DcaAllocationResultItem[] => {
  const totalValue = calculateTotalPortfolioValue(portfolio);
  
  // 1. 計算所有持股標的當前台幣市值
  const holdingDetails = holdings.map(h => {
    const priceTwd = h.currency === 'USD' ? h.currentPrice * usdRate : h.currentPrice;
    const valueTwd = h.shares * priceTwd;
    return {
      ...h,
      priceTwd,
      valueTwd
    };
  });

  // 計算每個大類的當前總市值
  const classTotals: Record<AssetClassKey, number> = {
    cash: portfolio.cash,
    fund: portfolio.fund,
    tw_stock: portfolio.tw_stock,
    us_stock: portfolio.us_stock,
    crypto: portfolio.crypto
  };

  // 2. 確定每支個股的目標配置佔比
  const dcaItems = holdingDetails.map(h => {
    const classTargetPercent = target[ASSET_MAP[h.assetType].targetKey];
    const classTotalValue = classTotals[h.assetType];
    
    let targetPercent = 0;
    if (classTotalValue > 0) {
      targetPercent = classTargetPercent * (h.valueTwd / classTotalValue);
    } else {
      // Fallback
      const siblingCount = holdings.filter(sibling => sibling.assetType === h.assetType).length;
      targetPercent = siblingCount > 0 ? classTargetPercent / siblingCount : 0;
    }

    const nextTotalValue = totalValue + budget;
    const idealValueTwd = nextTotalValue * targetPercent;
    const gapTwd = idealValueTwd - h.valueTwd;

    return {
      holdingId: h.id,
      symbol: h.symbol,
      name: h.name,
      assetKey: h.assetType,
      currentValueTwd: h.valueTwd,
      targetPercent,
      gapTwd: gapTwd > 0 ? gapTwd : 0, // 只買不賣
      priceTwd: h.priceTwd,
      currency: h.currency,
      originalPrice: h.currentPrice
    };
  });

  const totalPositiveGap = dcaItems.reduce((sum, item) => sum + item.gapTwd, 0);

  // 3. 分配預算與折算股數
  return dcaItems.map(item => {
    let allocatedAmountTwd = 0;
    if (totalPositiveGap > 0) {
      allocatedAmountTwd = budget * (item.gapTwd / totalPositiveGap);
    } else {
      allocatedAmountTwd = budget * item.targetPercent;
    }

    let sharesToBuy = 0;
    let remainingCashTwd = allocatedAmountTwd;

    if (item.priceTwd > 0) {
      if (item.assetKey === 'crypto') {
        sharesToBuy = allocatedAmountTwd / item.priceTwd;
        remainingCashTwd = 0;
      } else {
        sharesToBuy = Math.floor(allocatedAmountTwd / item.priceTwd);
        const actualSpent = sharesToBuy * item.priceTwd;
        remainingCashTwd = allocatedAmountTwd - actualSpent;
      }
    }

    return {
      holdingId: item.holdingId,
      symbol: item.symbol,
      name: item.name,
      assetKey: item.assetKey,
      currentValueTwd: item.currentValueTwd,
      targetPercent: item.targetPercent,
      gapTwd: item.gapTwd,
      allocatedAmountTwd,
      sharesToBuy,
      remainingCashTwd,
      priceTwd: item.priceTwd,
      currency: item.currency,
      originalPrice: item.originalPrice
    };
  });
};
