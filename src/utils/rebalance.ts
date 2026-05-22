import type { Portfolio, AllocationTarget } from '../context/AppContext';

export interface RebalanceResultItem {
  assetKey: keyof Omit<Portfolio, 'history'>;
  displayName: string;
  currentValue: number;
  currentPercent: number;
  targetPercent: number;
  differencePercent: number;
  actionAmount: number; // 正值為買入，負值為賣出
}

// 資產與配置目標的映射關係
export const ASSET_MAP: Record<keyof Omit<Portfolio, 'history'>, { targetKey: keyof AllocationTarget; name: string }> = {
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
  
  return (Object.keys(ASSET_MAP) as Array<keyof Omit<Portfolio, 'history'>>).map(key => {
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
  const shortfalls = (Object.keys(ASSET_MAP) as Array<keyof Omit<Portfolio, 'history'>>).map(key => {
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

  return (Object.keys(ASSET_MAP) as Array<keyof Omit<Portfolio, 'history'>>).map(key => {
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
  
  return (Object.keys(ASSET_MAP) as Array<keyof Omit<Portfolio, 'history'>>).map(key => {
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
