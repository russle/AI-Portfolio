export interface HistoryData {
  stockPercent: number;
  returnRate: number;    // 年化報酬率 (例如 0.085 代表 8.5%)
  sigma: number;         // 標準差 (例如 0.162 代表 16.2%)
  maxDrawdown: number;   // 2008年金融海嘯模擬跌幅 (例如 -0.50 代表 -50%)
}

// 根據 spec.md 的數據，並補足 0% 作為滑桿的完整支持
export const ANCHORS: HistoryData[] = [
  { stockPercent: 100, returnRate: 0.085, sigma: 0.162, maxDrawdown: -0.50 },
  { stockPercent: 80,  returnRate: 0.073, sigma: 0.131, maxDrawdown: -0.38 },
  { stockPercent: 60,  returnRate: 0.061, sigma: 0.102, maxDrawdown: -0.26 },
  { stockPercent: 40,  returnRate: 0.049, sigma: 0.075, maxDrawdown: -0.14 },
  { stockPercent: 20,  returnRate: 0.037, sigma: 0.051, maxDrawdown: -0.04 },
  { stockPercent: 0,   returnRate: 0.025, sigma: 0.027, maxDrawdown: 0.00 }   // 0% 股票時預估年化 2.5%, 標準差 2.7%, 跌幅 0%
];

/**
 * 根據股票比重，使用線性插值 (Linear Interpolation) 動態計算年化報酬率、標準差與最大回撤
 */
export function getInterpolatedData(stockPercent: number): HistoryData {
  const percent = Math.min(100, Math.max(0, stockPercent));
  
  if (percent >= 100) return { ...ANCHORS[0] };
  if (percent <= 0) return { ...ANCHORS[ANCHORS.length - 1] };

  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const upper = ANCHORS[i];
    const lower = ANCHORS[i + 1];
    
    if (percent <= upper.stockPercent && percent >= lower.stockPercent) {
      const ratio = (percent - lower.stockPercent) / (upper.stockPercent - lower.stockPercent);
      
      return {
        stockPercent: percent,
        returnRate: lower.returnRate + ratio * (upper.returnRate - lower.returnRate),
        sigma: lower.sigma + ratio * (upper.sigma - lower.sigma),
        maxDrawdown: lower.maxDrawdown + ratio * (upper.maxDrawdown - lower.maxDrawdown),
      };
    }
  }
  
  return { ...ANCHORS[ANCHORS.length - 1] };
}

/**
 * 運用 4% 法則逆推退休目標總資產 (單位：新台幣)
 * Target = (Exp_month * 12) / 0.04
 */
export function calculateTargetAsset(expMonth: number): number {
  if (expMonth <= 0) return 0;
  return (expMonth * 12) / 0.04;
}

/**
 * 利用複利公式計算未來資產總值 (FV)
 * FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
 * 
 * @param pv 現有資產單筆投入
 * @param pmt 每年預計持續投入金額
 * @param r 年化報酬率 (小數，如 0.061)
 * @param n 投資年期
 */
export function calculateFutureValue(pv: number, pmt: number, r: number, n: number): number {
  if (n <= 0) return pv;
  
  // 防禦性處理：若報酬率極近於 0
  if (Math.abs(r) < 0.0001) {
    return pv + pmt * n;
  }
  
  const compoundPV = pv * Math.pow(1 + r, n);
  const compoundPMT = pmt * ((Math.pow(1 + r, n) - 1) / r);
  
  return compoundPV + compoundPMT;
}

/**
 * 計算累積總投入本金
 * Total Principal = PV + PMT * n
 */
export function calculateTotalPrincipal(pv: number, pmt: number, n: number): number {
  if (n <= 0) return pv;
  return pv + pmt * n;
}

/**
 * 心理壓力測試帳面預估最大虧損額
 * Loss_max = FV * D_max
 */
export function calculateMaxLoss(fv: number, drawdown: number): number {
  return fv * drawdown;
}

/**
 * 即時下單股數計算標的明細
 */
export interface OrderItem {
  symbol: string;
  targetPercent: number; // 設定比例 (例如 0.70 代表 70%)
  price: number;         // 即時美金股價
  allocatedUSD: number;  // 分配美金
  sharesToBuy: number;   // 應買進股數 (無條件捨去整數)
  remainingUSD: number;  // 預估剩餘未足一股之現金
}

/**
 * 計算即時下單股數
 * @param amtTWD 本次預計投入總台幣金額
 * @param exRate 當前美金匯率
 * @param targets ETF 代號與目標比例
 * @param prices 各 ETF 最新即時市價
 */
export function calculateOrders(
  amtTWD: number,
  exRate: number,
  targets: { [symbol: string]: number },
  prices: { [symbol: string]: number }
): OrderItem[] {
  if (amtTWD <= 0 || exRate <= 0) return [];
  
  const totalUSD = amtTWD / exRate;
  
  return Object.entries(targets).map(([symbol, targetPercent]) => {
    const price = prices[symbol] || 1;
    const allocatedUSD = totalUSD * targetPercent;
    const sharesToBuy = Math.floor(allocatedUSD / price);
    const remainingUSD = allocatedUSD - (sharesToBuy * price);
    
    return {
      symbol,
      targetPercent,
      price,
      allocatedUSD,
      sharesToBuy,
      remainingUSD
    };
  });
}

/**
 * 再平衡行動建議條目
 */
export interface RebalanceItem {
  symbol: string;
  targetPercent: number;  // 目標權重 (例如 0.70)
  currentShares: number;  // 實際現有股數
  price: number;          // 最新股價
  currentValue: number;   // 實際總市值 (USD)
  currentPercent: number; // 實際現有權重
  weightDiff: number;     // 偏差值 (實際 - 目標)
  deviationExceeded: boolean; // 是否超過 ±5%
  actionShares: number;   // 應交易股數 (正數代表買進，負數代表賣出)
  actionValueUSD: number; // 應交易市值 (USD)
}

/**
 * 計算一鍵再平衡
 * @param holdings 使用者輸入的各檔 ETF 實際現有股數
 * @param targets 目標比例設定
 * @param prices 最新股價
 */
export function calculateRebalancing(
  holdings: { [symbol: string]: number },
  targets: { [symbol: string]: number },
  prices: { [symbol: string]: number }
): {
  items: RebalanceItem[];
  totalValueUSD: number;
  hasWarning: boolean;
} {
  // 1. 計算各標的實際市值與總市值
  let totalValueUSD = 0;
  const rawItems = Object.keys(targets).map(symbol => {
    const shares = holdings[symbol] || 0;
    const price = prices[symbol] || 0;
    const value = shares * price;
    totalValueUSD += value;
    
    return { symbol, shares, price, value };
  });

  // 2. 計算權重與偏差值
  let hasWarning = false;
  const items: RebalanceItem[] = rawItems.map(({ symbol, shares, price, value }) => {
    const targetPercent = targets[symbol] || 0;
    const currentPercent = totalValueUSD > 0 ? value / totalValueUSD : 0;
    const weightDiff = currentPercent - targetPercent;
    const deviationExceeded = Math.abs(weightDiff) >= 0.05;
    
    if (deviationExceeded) {
      hasWarning = true;
    }

    // 目標市值
    const targetValueUSD = totalValueUSD * targetPercent;
    // 應交易市值
    const actionValueUSD = targetValueUSD - value;
    // 應交易股數 (無條件取整，如果是買進可用 Math.floor，如果是賣出可取 Math.ceil，
    // 為簡單起見直接以金額除以股價並四捨五入或無條件捨去，這裡用 Math.round 來盡量精準對齊目標比例)
    const actionShares = price > 0 ? Math.round(actionValueUSD / price) : 0;

    return {
      symbol,
      targetPercent,
      currentShares: shares,
      price,
      currentValue: value,
      currentPercent,
      weightDiff,
      deviationExceeded,
      actionShares,
      actionValueUSD
    };
  });

  return {
    items,
    totalValueUSD,
    hasWarning
  };
}
