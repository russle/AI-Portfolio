import { describe, it, expect } from 'vitest';
import {
  getInterpolatedData,
  calculateTargetAsset,
  calculateTargetAssetAnnuity,
  calculateFutureValue,
  calculateMaxLoss,
  calculateOrders,
  calculateSpendingForDieToZero,
} from '../formulas';

// ---------------------------------------------------------------------------
// getInterpolatedData
// ---------------------------------------------------------------------------
describe('getInterpolatedData', () => {
  it('at 100% stock, matches ANCHORS[0]', () => {
    const result = getInterpolatedData(100);
    expect(result.stockPercent).toBe(100);
    expect(result.returnRate).toBeCloseTo(0.085, 4);
    expect(result.sigma).toBeCloseTo(0.162, 4);
    expect(result.maxDrawdown).toBeCloseTo(-0.50, 4);
  });

  it('at 0% stock, matches last ANCHOR', () => {
    const result = getInterpolatedData(0);
    expect(result.stockPercent).toBe(0);
    expect(result.returnRate).toBeCloseTo(0.025, 4);
    expect(result.sigma).toBeCloseTo(0.027, 4);
    expect(result.maxDrawdown).toBeCloseTo(0.00, 4);
  });

  it('clamps values above 100 to 100', () => {
    const result = getInterpolatedData(150);
    expect(result.stockPercent).toBe(100);
    expect(result.returnRate).toBeCloseTo(0.085, 4);
  });

  it('clamps values below 0 to 0', () => {
    const result = getInterpolatedData(-10);
    expect(result.stockPercent).toBe(0);
    expect(result.returnRate).toBeCloseTo(0.025, 4);
  });

  it('returns exact anchor values at 80% and 60% and 40% and 20%', () => {
    const anchors = [
      { sp: 80, rr: 0.073, sg: 0.131, dd: -0.38 },
      { sp: 60, rr: 0.061, sg: 0.102, dd: -0.26 },
      { sp: 40, rr: 0.049, sg: 0.075, dd: -0.14 },
      { sp: 20, rr: 0.037, sg: 0.051, dd: -0.04 },
    ];
    for (const a of anchors) {
      const result = getInterpolatedData(a.sp);
      expect(result.returnRate).toBeCloseTo(a.rr, 4);
      expect(result.sigma).toBeCloseTo(a.sg, 4);
      expect(result.maxDrawdown).toBeCloseTo(a.dd, 2);
    }
  });

  it('linearly interpolates between 60% and 40% for returnRate at 50%', () => {
    // At 60%: returnRate = 0.061, at 40%: returnRate = 0.049
    // At 50%: ratio = (50-40)/(60-40) = 0.5
    // returnRate = 0.049 + 0.5 * (0.061 - 0.049) = 0.055
    const result = getInterpolatedData(50);
    expect(result.stockPercent).toBe(50);
    expect(result.returnRate).toBeCloseTo(0.055, 4);
  });

  it('linearly interpolates between 100% and 80% for sigma at 90%', () => {
    // At 100%: sigma = 0.162, at 80%: sigma = 0.131
    // At 90%: ratio = (90-80)/(100-80) = 0.5
    // sigma = 0.131 + 0.5 * (0.162 - 0.131) = 0.1465
    const result = getInterpolatedData(90);
    expect(result.sigma).toBeCloseTo(0.1465, 4);
  });
});

// ---------------------------------------------------------------------------
// calculateTargetAsset
// ---------------------------------------------------------------------------
describe('calculateTargetAsset', () => {
  it('calculates using 4% rule: (expMonth * 12) / 0.04', () => {
    const result = calculateTargetAsset(10000);
    // (10000 * 12) / 0.04 = 120000 / 0.04 = 3000000
    expect(result).toBe(3000000);
  });

  it('returns 0 for non-positive expense', () => {
    expect(calculateTargetAsset(0)).toBe(0);
    expect(calculateTargetAsset(-5000)).toBe(0);
  });

  it('scales linearly with monthly expense', () => {
    const a = calculateTargetAsset(10000);
    const b = calculateTargetAsset(20000);
    expect(b).toBe(a * 2);
  });
});

// ---------------------------------------------------------------------------
// calculateTargetAssetAnnuity
// ---------------------------------------------------------------------------
describe('calculateTargetAssetAnnuity', () => {
  it('returns 0 for non-positive expense or years', () => {
    expect(calculateTargetAssetAnnuity(0, 0.041, 30)).toBe(0);
    expect(calculateTargetAssetAnnuity(100000, 0.041, 0)).toBe(0);
    expect(calculateTargetAssetAnnuity(100000, 0.041, -5)).toBe(0);
  });

  it('returns expenseAnnual * years when rReal is near zero', () => {
    const result = calculateTargetAssetAnnuity(100000, 0.00001, 30);
    expect(result).toBeCloseTo(100000 * 30, 1);
  });

  it('calculates standard annuity formula correctly', () => {
    const expense = 100000;
    const r = 0.041;
    const years = 30;
    // Expected: 100000 * ((1 - (1.041)^(-30)) / 0.041)
    const expected = 100000 * ((1 - Math.pow(1.041, -30)) / 0.041);
    const result = calculateTargetAssetAnnuity(expense, r, years);
    expect(result).toBeCloseTo(expected, 1);
  });

  it('returns larger target for longer life expectancy', () => {
    const short = calculateTargetAssetAnnuity(100000, 0.041, 20);
    const long = calculateTargetAssetAnnuity(100000, 0.041, 40);
    expect(long).toBeGreaterThan(short);
  });
});

// ---------------------------------------------------------------------------
// calculateFutureValue
// ---------------------------------------------------------------------------
describe('calculateFutureValue', () => {
  it('returns PV when n <= 0', () => {
    expect(calculateFutureValue(100000, 120000, 0.061, 0)).toBe(100000);
    expect(calculateFutureValue(100000, 120000, 0.061, -1)).toBe(100000);
  });

  it('returns PV + PMT * n when r is near zero', () => {
    const result = calculateFutureValue(100000, 120000, 0.00001, 10);
    expect(result).toBeCloseTo(100000 + 120000 * 10, 1);
  });

  it('computes compound interest correctly', () => {
    const pv = 100000;
    const pmt = 120000;
    const r = 0.061;
    const n = 20;
    const expected = pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r);
    const result = calculateFutureValue(pv, pmt, r, n);
    expect(result).toBeCloseTo(expected, 1);
  });

  it('handles zero PMT', () => {
    const result = calculateFutureValue(100000, 0, 0.061, 10);
    const expected = 100000 * Math.pow(1.061, 10);
    expect(result).toBeCloseTo(expected, 1);
  });

  it('handles zero PV', () => {
    const result = calculateFutureValue(0, 120000, 0.061, 10);
    const expected = 120000 * ((Math.pow(1.061, 10) - 1) / 0.061);
    expect(result).toBeCloseTo(expected, 1);
  });
});

// ---------------------------------------------------------------------------
// calculateMaxLoss
// ---------------------------------------------------------------------------
describe('calculateMaxLoss', () => {
  it('returns fv * drawdown', () => {
    expect(calculateMaxLoss(1000000, -0.35)).toBe(-350000);
    expect(calculateMaxLoss(500000, -0.50)).toBe(-250000);
  });

  it('handles zero drawdown', () => {
    expect(calculateMaxLoss(1000000, 0)).toBe(0);
  });

  it('handles zero FV', () => {
    expect(calculateMaxLoss(0, -0.50)).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// calculateOrders
// ---------------------------------------------------------------------------
describe('calculateOrders', () => {
  it('returns empty array for non-positive amount or exchange rate', () => {
    expect(calculateOrders(0, 32, { VT: 1.0 }, { VT: 100 })).toEqual([]);
    expect(calculateOrders(10000, 0, { VT: 1.0 }, { VT: 100 })).toEqual([]);
    expect(calculateOrders(-1000, 32, { VT: 1.0 }, { VT: 100 })).toEqual([]);
  });

  it('sharesToBuy is floor of allocatedUSD / price', () => {
    const result = calculateOrders(6400, 32, { VT: 1.0 }, { VT: 100 });
    // totalUSD = 6400/32 = 200, VT target 100% → allocatedUSD = 200
    // sharesToBuy = floor(200/100) = 2
    expect(result).toHaveLength(1);
    expect(result[0].sharesToBuy).toBe(2);
    expect(result[0].remainingUSD).toBe(0);
  });

  it('remainingUSD < price for each symbol', () => {
    const result = calculateOrders(6500, 32, { VT: 1.0 }, { VT: 100 });
    // totalUSD = 6500/32 = 203.125, allocatedUSD = 203.125
    // sharesToBuy = floor(203.125/100) = 2
    // remainingUSD = 203.125 - 200 = 3.125
    expect(result[0].remainingUSD).toBeLessThan(result[0].price);
    expect(result[0].remainingUSD).toBeGreaterThanOrEqual(0);
  });

  it('handles multiple symbols with proportional allocation', () => {
    const result = calculateOrders(6400, 32, { VTI: 0.6, BND: 0.4 }, { VTI: 200, BND: 100 });
    // totalUSD = 200
    // VTI: allocatedUSD = 120, sharesToBuy = floor(120/200) = 0
    // BND: allocatedUSD = 80, sharesToBuy = floor(80/100) = 0
    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe('VTI');
    expect(result[1].symbol).toBe('BND');
  });

  it('falls back to price=1 when price is missing', () => {
    const result = calculateOrders(3200, 32, { FAKE: 1.0 }, {});
    // totalUSD = 100, price defaults to 1, sharesToBuy = floor(100/1) = 100
    expect(result[0].sharesToBuy).toBe(100);
  });

  it('allocatedUSD is totalUSD * targetPercent', () => {
    const result = calculateOrders(6400, 32, { VT: 0.6, BND: 0.4 }, { VT: 100, BND: 50 });
    // totalUSD = 200
    // VT: allocatedUSD = 120
    // BND: allocatedUSD = 80
    expect(result[0].allocatedUSD).toBeCloseTo(120, 2);
    expect(result[1].allocatedUSD).toBeCloseTo(80, 2);
  });
});

// ---------------------------------------------------------------------------
// calculateSpendingForDieToZero
// ---------------------------------------------------------------------------
describe('calculateSpendingForDieToZero', () => {
  it('returns { annual: 0, monthly: 0 } for non-positive asset or years', () => {
    expect(calculateSpendingForDieToZero(0, 0.041, 30)).toEqual({ annual: 0, monthly: 0 });
    expect(calculateSpendingForDieToZero(1000000, 0.041, 0)).toEqual({ annual: 0, monthly: 0 });
    expect(calculateSpendingForDieToZero(1000000, 0.041, -5)).toEqual({ annual: 0, monthly: 0 });
  });

  it('monthly = annual / 12', () => {
    const result = calculateSpendingForDieToZero(5000000, 0.041, 30);
    expect(result.monthly).toBeCloseTo(result.annual / 12, 2);
  });

  it('returns asset / years when rReal is near zero', () => {
    const result = calculateSpendingForDieToZero(3000000, 0.00001, 30);
    expect(result.annual).toBeCloseTo(3000000 / 30, 1);
    expect(result.monthly).toBeCloseTo(3000000 / 30 / 12, 1);
  });

  it('calculates standard annuity spending correctly', () => {
    const asset = 5000000;
    const r = 0.041;
    const years = 30;
    // annual = asset * (r / (1 - (1+r)^(-years)))
    const expectedAnnual = asset * (r / (1 - Math.pow(1 + r, -years)));
    const result = calculateSpendingForDieToZero(asset, r, years);
    expect(result.annual).toBeCloseTo(expectedAnnual, 1);
  });

  it('higher asset gives proportionally higher spending', () => {
    const a = calculateSpendingForDieToZero(3000000, 0.041, 30);
    const b = calculateSpendingForDieToZero(6000000, 0.041, 30);
    expect(b.annual).toBeCloseTo(a.annual * 2, 1);
  });
});
