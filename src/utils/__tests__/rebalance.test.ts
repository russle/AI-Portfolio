import { describe, it, expect } from 'vitest';
import type { Portfolio, AllocationTarget, PortfolioHistoryPoint, HoldingItem } from '../../context/AppContext';
import {
  calculateTotalPortfolioValue,
  calculateExactRebalance,
  calculateCashOnlyRebalance,
  calculateThresholdRebalance,
  calculateDcaAllocation,
  calculateMaxDrawdown,
  calculateSharpeRatio,
} from '../rebalance';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makePortfolio = (overrides: Partial<Portfolio> = {}): Portfolio => ({
  cash: 10000,
  fund: 20000,
  tw_stock: 50000,
  us_stock: 30000,
  crypto: 10000,
  history: [],
  ...overrides,
});

const makeTarget = (overrides: Partial<AllocationTarget> = {}): AllocationTarget => ({
  tw_stock: 0.30,
  us_stock: 0.30,
  bond: 0.20,
  cash: 0.10,
  crypto: 0.10,
  ...overrides,
});

// ---------------------------------------------------------------------------
// calculateTotalPortfolioValue
// ---------------------------------------------------------------------------
describe('calculateTotalPortfolioValue', () => {
  it('returns sum of all asset values', () => {
    const p = makePortfolio();
    expect(calculateTotalPortfolioValue(p)).toBe(10000 + 20000 + 50000 + 30000 + 10000);
  });

  it('returns 0 for all-zero portfolio', () => {
    const p = makePortfolio({ cash: 0, fund: 0, tw_stock: 0, us_stock: 0, crypto: 0 });
    expect(calculateTotalPortfolioValue(p)).toBe(0);
  });

  it('handles negative values (edge case)', () => {
    const p = makePortfolio({ cash: -5000, fund: 10000, tw_stock: 0, us_stock: 0, crypto: 0 });
    expect(calculateTotalPortfolioValue(p)).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// calculateExactRebalance
// ---------------------------------------------------------------------------
describe('calculateExactRebalance', () => {
  it('returns 5 items matching asset classes', () => {
    const result = calculateExactRebalance(makePortfolio(), makeTarget());
    expect(result).toHaveLength(5);
  });

  it('total action amounts sum to approximately 0', () => {
    const result = calculateExactRebalance(makePortfolio(), makeTarget());
    const sumActions = result.reduce((s, item) => s + item.actionAmount, 0);
    expect(Math.abs(sumActions)).toBeLessThan(0.01);
  });

  it('currentPercent and targetPercent are consistent', () => {
    const result = calculateExactRebalance(makePortfolio(), makeTarget());
    const totalCurrentPercent = result.reduce((s, item) => s + item.currentPercent, 0);
    expect(totalCurrentPercent).toBeCloseTo(1.0, 5);
    const totalTargetPercent = result.reduce((s, item) => s + item.targetPercent, 0);
    expect(totalTargetPercent).toBeCloseTo(1.0, 5);
  });

  it('fund maps to bond targetKey', () => {
    const p = makePortfolio({ cash: 0, fund: 100000, tw_stock: 0, us_stock: 0, crypto: 0 });
    const target = makeTarget({ bond: 1.0, cash: 0, tw_stock: 0, us_stock: 0, crypto: 0 });
    const result = calculateExactRebalance(p, target);
    const fundItem = result.find(r => r.assetKey === 'fund')!;
    expect(fundItem.targetPercent).toBe(1.0);
    expect(fundItem.currentPercent).toBe(1.0);
  });

  it('handles total = 0 without division errors', () => {
    const p = makePortfolio({ cash: 0, fund: 0, tw_stock: 0, us_stock: 0, crypto: 0 });
    const result = calculateExactRebalance(p, makeTarget());
    result.forEach(item => {
      expect(Number.isFinite(item.currentPercent)).toBe(true);
      expect(Number.isFinite(item.actionAmount)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// calculateCashOnlyRebalance
// ---------------------------------------------------------------------------
describe('calculateCashOnlyRebalance', () => {
  it('all actionAmounts are >= 0 (no selling)', () => {
    const result = calculateCashOnlyRebalance(makePortfolio(), makeTarget(), 50000);
    result.forEach(item => {
      expect(item.actionAmount).toBeGreaterThanOrEqual(0);
    });
  });

  it('sum of actionAmounts approximately equals newCash', () => {
    const newCash = 50000;
    const result = calculateCashOnlyRebalance(makePortfolio(), makeTarget(), newCash);
    const sum = result.reduce((s, item) => s + item.actionAmount, 0);
    expect(Math.abs(sum - newCash)).toBeLessThan(0.01);
  });

  it('returns 5 items', () => {
    const result = calculateCashOnlyRebalance(makePortfolio(), makeTarget(), 30000);
    expect(result).toHaveLength(5);
  });

  it('handles zero newCash', () => {
    const result = calculateCashOnlyRebalance(makePortfolio(), makeTarget(), 0);
    result.forEach(item => {
      expect(item.actionAmount).toBe(0);
    });
  });

  it('handles zero total portfolio', () => {
    const p = makePortfolio({ cash: 0, fund: 0, tw_stock: 0, us_stock: 0, crypto: 0 });
    const result = calculateCashOnlyRebalance(p, makeTarget(), 10000);
    const sum = result.reduce((s, item) => s + item.actionAmount, 0);
    expect(sum).toBeCloseTo(10000, 1);
  });
});

// ---------------------------------------------------------------------------
// calculateThresholdRebalance
// ---------------------------------------------------------------------------
describe('calculateThresholdRebalance', () => {
  it('returns actionAmount = 0 when abs(diff) < threshold', () => {
    // Portfolio perfectly balanced to target
    const p = makePortfolio({
      cash: 100000,
      tw_stock: 300000,
      us_stock: 300000,
      fund: 200000,
      crypto: 100000,
    });
    const target = makeTarget({ cash: 0.10, tw_stock: 0.30, us_stock: 0.30, bond: 0.20, crypto: 0.10 });
    const result = calculateThresholdRebalance(p, target, 0.05);
    result.forEach(item => {
      expect(item.actionAmount).toBe(0);
    });
  });

  it('returns non-zero actionAmount when abs(diff) >= threshold', () => {
    // Portfolio heavily skewed to cash
    const p = makePortfolio({
      cash: 800000,
      tw_stock: 50000,
      us_stock: 50000,
      fund: 50000,
      crypto: 50000,
    });
    const target = makeTarget({ cash: 0.10, tw_stock: 0.30, us_stock: 0.30, bond: 0.20, crypto: 0.10 });
    const result = calculateThresholdRebalance(p, target, 0.05);
    // Cash should have actionAmount !== 0 since diff is large
    const cashItem = result.find(r => r.assetKey === 'cash')!;
    expect(cashItem.actionAmount).not.toBe(0);
  });

  it('returns exactly 5 items', () => {
    const result = calculateThresholdRebalance(makePortfolio(), makeTarget(), 0.05);
    expect(result).toHaveLength(5);
  });

  it('handles zero total portfolio', () => {
    const p = makePortfolio({ cash: 0, fund: 0, tw_stock: 0, us_stock: 0, crypto: 0 });
    const result = calculateThresholdRebalance(p, makeTarget(), 0.05);
    result.forEach(item => {
      expect(item.actionAmount).toBe(0);
      expect(Number.isFinite(item.currentPercent)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// calculateDcaAllocation
// ---------------------------------------------------------------------------
describe('calculateDcaAllocation', () => {
  const makeHoldings = (): HoldingItem[] => [
    { id: '1', symbol: '0050.TW', name: '元大台灣50', shares: 10, currentPrice: 150, currency: 'TWD', assetType: 'tw_stock' },
    { id: '2', symbol: 'VT', name: 'Vanguard Total World', shares: 5, currentPrice: 100, currency: 'USD', assetType: 'us_stock' },
    { id: '3', symbol: 'BND', name: 'Vanguard Bond', shares: 20, currentPrice: 75, currency: 'USD', assetType: 'fund' },
    { id: '4', symbol: 'BTC', name: 'Bitcoin', shares: 0.5, currentPrice: 60000, currency: 'USD', assetType: 'crypto' },
  ];

  it('returns an entry for each holding', () => {
    const holdings = makeHoldings();
    const result = calculateDcaAllocation(holdings, makePortfolio(), makeTarget(), 30000, 32);
    expect(result).toHaveLength(holdings.length);
  });

  it('all sharesToBuy are >= 0', () => {
    const result = calculateDcaAllocation(makeHoldings(), makePortfolio(), makeTarget(), 30000, 32);
    result.forEach(item => {
      expect(item.sharesToBuy).toBeGreaterThanOrEqual(0);
    });
  });

  it('for non-crypto, remainingCashTwd < priceTwd', () => {
    const result = calculateDcaAllocation(makeHoldings(), makePortfolio(), makeTarget(), 30000, 32);
    result.forEach(item => {
      if (item.assetKey !== 'crypto') {
        expect(item.remainingCashTwd).toBeLessThan(item.priceTwd);
      }
    });
  });

  it('for crypto, remainingCashTwd is 0', () => {
    const result = calculateDcaAllocation(makeHoldings(), makePortfolio(), makeTarget(), 30000, 32);
    const cryptoItem = result.find(r => r.assetKey === 'crypto')!;
    expect(cryptoItem.remainingCashTwd).toBe(0);
  });

  it('has all required fields', () => {
    const result = calculateDcaAllocation(makeHoldings(), makePortfolio(), makeTarget(), 30000, 32);
    const item = result[0];
    expect(item).toHaveProperty('holdingId');
    expect(item).toHaveProperty('symbol');
    expect(item).toHaveProperty('name');
    expect(item).toHaveProperty('sharesToBuy');
    expect(item).toHaveProperty('remainingCashTwd');
    expect(item).toHaveProperty('priceTwd');
    expect(item).toHaveProperty('currency');
  });

  it('handles zero budget', () => {
    const result = calculateDcaAllocation(makeHoldings(), makePortfolio(), makeTarget(), 0, 32);
    result.forEach(item => {
      expect(item.sharesToBuy).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// calculateMaxDrawdown
// ---------------------------------------------------------------------------
describe('calculateMaxDrawdown', () => {
  it('returns 0 for less than 2 data points', () => {
    expect(calculateMaxDrawdown([])).toBe(0);
    expect(calculateMaxDrawdown([{ date: '2024-01', net_worth: 1000 }])).toBe(0);
  });

  it('returns 0 for monotonically increasing values', () => {
    const history: PortfolioHistoryPoint[] = [
      { date: '2024-01', net_worth: 1000 },
      { date: '2024-02', net_worth: 1100 },
      { date: '2024-03', net_worth: 1200 },
    ];
    expect(calculateMaxDrawdown(history)).toBe(0);
  });

  it('returns a negative number when there is a drawdown', () => {
    const history: PortfolioHistoryPoint[] = [
      { date: '2024-01', net_worth: 1000 },
      { date: '2024-02', net_worth: 1200 },
      { date: '2024-03', net_worth: 900 },
      { date: '2024-04', net_worth: 1100 },
    ];
    const dd = calculateMaxDrawdown(history);
    expect(dd).toBeLessThan(0);
    // Max drawdown from peak 1200 to trough 900 = (900-1200)/1200 = -0.25
    expect(dd).toBeCloseTo(-0.25, 2);
  });

  it('sorts by date before computing', () => {
    const history: PortfolioHistoryPoint[] = [
      { date: '2024-03', net_worth: 900 },
      { date: '2024-01', net_worth: 1000 },
      { date: '2024-02', net_worth: 1200 },
    ];
    const dd = calculateMaxDrawdown(history);
    expect(dd).toBeCloseTo(-0.25, 2);
  });
});

// ---------------------------------------------------------------------------
// calculateSharpeRatio
// ---------------------------------------------------------------------------
describe('calculateSharpeRatio', () => {
  it('returns 0 for less than 3 data points', () => {
    expect(calculateSharpeRatio([])).toBe(0);
    expect(calculateSharpeRatio([{ date: '2024-01', net_worth: 1000 }])).toBe(0);
    expect(calculateSharpeRatio([
      { date: '2024-01', net_worth: 1000 },
      { date: '2024-02', net_worth: 1100 },
    ])).toBe(0);
  });

  it('returns a finite number for valid data', () => {
    const history: PortfolioHistoryPoint[] = [
      { date: '2024-01', net_worth: 1000 },
      { date: '2024-02', net_worth: 1050 },
      { date: '2024-03', net_worth: 1030 },
      { date: '2024-04', net_worth: 1100 },
    ];
    const sr = calculateSharpeRatio(history);
    expect(Number.isFinite(sr)).toBe(true);
  });

  it('returns 0 when stdDev is 0 (all same values)', () => {
    const history: PortfolioHistoryPoint[] = [
      { date: '2024-01', net_worth: 1000 },
      { date: '2024-02', net_worth: 1000 },
      { date: '2024-03', net_worth: 1000 },
    ];
    expect(calculateSharpeRatio(history)).toBe(0);
  });

  it('uses custom riskFreeRate', () => {
    const history: PortfolioHistoryPoint[] = [
      { date: '2024-01', net_worth: 1000 },
      { date: '2024-02', net_worth: 1050 },
      { date: '2024-03', net_worth: 1030 },
      { date: '2024-04', net_worth: 1100 },
    ];
    const srDefault = calculateSharpeRatio(history);
    const srHigh = calculateSharpeRatio(history, 0.10);
    // Higher risk-free rate should give lower (or equal) Sharpe ratio
    expect(srHigh).toBeLessThanOrEqual(srDefault);
  });
});
