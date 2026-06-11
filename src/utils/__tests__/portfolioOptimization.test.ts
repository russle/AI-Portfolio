import { describe, it, expect } from 'vitest';
import { computeEfficientFrontier, computeCurrentPosition } from '../portfolioOptimization';
import type { AllocationTarget } from '../../context/AppContext';

const TEST_TIMEOUT = 30000;

// ---------------------------------------------------------------------------
// computeEfficientFrontier
// ---------------------------------------------------------------------------
describe('computeEfficientFrontier', () => {
  it('returns 100 frontier points', () => {
    const result = computeEfficientFrontier(100, 5000);
    expect(result.frontier).toHaveLength(100);
  }, TEST_TIMEOUT);

  it('frontier points have non-decreasing volatility', () => {
    const result = computeEfficientFrontier(100, 5000);
    for (let i = 1; i < result.frontier.length; i++) {
      expect(result.frontier[i].volatility).toBeGreaterThanOrEqual(result.frontier[i - 1].volatility);
    }
  }, TEST_TIMEOUT);

  it('maxSharpe has the highest sharpeRatio among all frontier points', () => {
    const result = computeEfficientFrontier(100, 5000);
    for (const point of result.frontier) {
      expect(result.maxSharpe.sharpeRatio).toBeGreaterThanOrEqual(point.sharpeRatio - 0.0001);
    }
  }, TEST_TIMEOUT);

  it('minVolatility has the lowest volatility among all frontier points', () => {
    const result = computeEfficientFrontier(100, 5000);
    for (const point of result.frontier) {
      expect(result.minVolatility.volatility).toBeLessThanOrEqual(point.volatility + 0.0001);
    }
  }, TEST_TIMEOUT);

  it('frontier points have weights summing to 1', () => {
    const result = computeEfficientFrontier(100, 5000);
    for (const point of result.frontier) {
      const sum = point.weights.tw_stock + point.weights.us_stock + point.weights.bond + point.weights.crypto + point.weights.cash;
      expect(sum).toBeCloseTo(1, 5);
    }
  }, TEST_TIMEOUT);

  it('minVolatility weights sum to 1', () => {
    const result = computeEfficientFrontier(100, 5000);
    const w = result.minVolatility.weights;
    const sum = w.tw_stock + w.us_stock + w.bond + w.crypto + w.cash;
    expect(sum).toBeCloseTo(1, 5);
  }, TEST_TIMEOUT);

  it('returns current position as part of result', () => {
    const result = computeEfficientFrontier(100, 5000);
    expect(result.current).toHaveProperty('volatility');
    expect(result.current).toHaveProperty('expectedReturn');
    expect(result.current).toHaveProperty('sharpeRatio');
    expect(result.current).toHaveProperty('weights');
  }, TEST_TIMEOUT);
});

// ---------------------------------------------------------------------------
// computeCurrentPosition
// ---------------------------------------------------------------------------
describe('computeCurrentPosition', () => {
  const equalWeights: AllocationTarget = {
    tw_stock: 0.2,
    us_stock: 0.2,
    bond: 0.2,
    crypto: 0.2,
    cash: 0.2,
  };

  it('computes correctly for equal weights', () => {
    const point = computeCurrentPosition(equalWeights);
    expect(point.weights.tw_stock).toBe(0.2);
    expect(point.weights.us_stock).toBe(0.2);
    expect(point.weights.bond).toBe(0.2);
    expect(point.weights.crypto).toBe(0.2);
    expect(point.weights.cash).toBe(0.2);
    // Expected return = weighted avg of asset returns = 0.2*(0.09+0.08+0.03+0.15+0.015) = 7.3%
    expect(point.expectedReturn).toBeCloseTo(7.3, 2);
    expect(point.sharpeRatio).toBeGreaterThan(0);
  });

  it('computes 100% cash with low return and low volatility', () => {
    const cashWeights: AllocationTarget = {
      tw_stock: 0, us_stock: 0, bond: 0, crypto: 0, cash: 1,
    };
    const point = computeCurrentPosition(cashWeights);
    expect(point.expectedReturn).toBeCloseTo(1.5, 2);
    expect(point.volatility).toBeCloseTo(0.5, 2);
    // Sharpe = (0.015 - 0.015) / 0.005 = 0
    expect(point.sharpeRatio).toBeCloseTo(0, 5);
  });

  it('computes 100% crypto with high return and high volatility', () => {
    const cryptoWeights: AllocationTarget = {
      tw_stock: 0, us_stock: 0, bond: 0, crypto: 1, cash: 0,
    };
    const point = computeCurrentPosition(cryptoWeights);
    expect(point.expectedReturn).toBeCloseTo(15.0, 2);
    expect(point.volatility).toBeCloseTo(60.0, 2);
    // Sharpe = (0.15 - 0.015) / 0.6 = 0.225
    expect(point.sharpeRatio).toBeCloseTo(0.225, 3);
  });

  it('expectedReturn is weighted average of asset returns', () => {
    const weights: AllocationTarget = {
      tw_stock: 0.5, us_stock: 0.3, bond: 0.1, crypto: 0.05, cash: 0.05,
    };
    const point = computeCurrentPosition(weights);
    const expected = (0.5 * 0.09 + 0.3 * 0.08 + 0.1 * 0.03 + 0.05 * 0.15 + 0.05 * 0.015) * 100;
    expect(point.expectedReturn).toBeCloseTo(expected, 5);
  });

  it('handles zero weights gracefully', () => {
    const zeroWeights: AllocationTarget = {
      tw_stock: 0, us_stock: 0, bond: 0, crypto: 0, cash: 0,
    };
    const point = computeCurrentPosition(zeroWeights);
    expect(point.expectedReturn).toBeCloseTo(0, 5);
    expect(point.volatility).toBeCloseTo(0, 5);
    expect(point.sharpeRatio).toBe(0);
  });

  it('weights in the returned point are a copy (not mutated)', () => {
    const input: AllocationTarget = { tw_stock: 0.3, us_stock: 0.4, bond: 0.15, crypto: 0.05, cash: 0.1 };
    const point = computeCurrentPosition(input);
    expect(point.weights).toEqual(input);
    // Modifying the input should not affect the point
    input.tw_stock = 0;
    expect(point.weights.tw_stock).toBe(0.3);
  });
});
