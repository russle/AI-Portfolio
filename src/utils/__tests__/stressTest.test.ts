import { describe, it, expect } from 'vitest';
import type { Portfolio, RetirementConfig } from '../../context/AppContext';
import { runStressTestScenario, runAllStressTests } from '../stressTest';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockPortfolio: Portfolio = {
  cash: 500000,
  fund: 200000,
  tw_stock: 300000,
  us_stock: 400000,
  crypto: 100000,
  history: [],
};

const mockRetirement: RetirementConfig = {
  age: 60,
  monthly_spending: 50000,
  monthly_invest: 20000,
  expected_return: 0.065,
  inflation: 0.02,
  life_expectancy: 85,
  cape_ratio: 30,
  spending_smile: false,
};

// ---------------------------------------------------------------------------
// runStressTestScenario
// ---------------------------------------------------------------------------
describe('runStressTestScenario', () => {
  it('returns correct structure with all result properties', () => {
    const result = runStressTestScenario(mockPortfolio, mockRetirement, 'us_stagflation', 60, 30);
    expect(result).toHaveProperty('scenarioId');
    expect(result).toHaveProperty('scenarioName');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('initialAsset');
    expect(result).toHaveProperty('finalAsset');
    expect(result).toHaveProperty('assetTrajectory');
    expect(result).toHaveProperty('maxDrawdown');
    expect(result).toHaveProperty('isDepleted');
    expect(result).toHaveProperty('depletionYear');
    expect(result).toHaveProperty('yearsSurvived');
    expect(result).toHaveProperty('annualSpending');
  });

  it('japan_lost_decade scenario depletes a small portfolio', () => {
    const smallPortfolio: Portfolio = {
      cash: 50000,
      fund: 50000,
      tw_stock: 0,
      us_stock: 0,
      crypto: 0,
      history: [],
    };
    const result = runStressTestScenario(smallPortfolio, mockRetirement, 'japan_lost_decade', 60, 65);
    expect(result.isDepleted).toBe(true);
    expect(result.depletionYear).not.toBeNull();
  });

  it('us_stagflation scenario with high inflation returns reasonable values', () => {
    const result = runStressTestScenario(mockPortfolio, mockRetirement, 'us_stagflation', 60, 30);
    expect(result.assetTrajectory.length).toBeGreaterThan(0);
    expect(Number.isFinite(result.finalAsset)).toBe(true);
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it('zero_interest_rate scenario with large portfolio survives full period', () => {
    const result = runStressTestScenario(mockPortfolio, mockRetirement, 'zero_interest_rate', 60, 30);
    expect(result.isDepleted).toBe(false);
    expect(result.depletionYear).toBeNull();
    expect(result.yearsSurvived).toBeGreaterThan(0);
  });

  it('withdrawal phase reduces assets faster than accumulation phase', () => {
    const accumulating = runStressTestScenario(mockPortfolio, mockRetirement, 'zero_interest_rate', 60, 30);
    const withdrawing = runStressTestScenario(mockPortfolio, mockRetirement, 'zero_interest_rate', 60, 65);
    // Withdrawing should have lower (or equal) final asset than accumulating
    expect(withdrawing.finalAsset).toBeLessThanOrEqual(accumulating.finalAsset);
  });

  it('empty portfolio returns zero asset result', () => {
    const emptyPortfolio: Portfolio = {
      cash: 0, fund: 0, tw_stock: 0, us_stock: 0, crypto: 0, history: [],
    };
    const result = runStressTestScenario(emptyPortfolio, mockRetirement, 'japan_lost_decade', 60, 30);
    expect(result.initialAsset).toBe(0);
    expect(result.finalAsset).toBe(0);
    expect(result.isDepleted).toBe(true);
    expect(result.assetTrajectory).toEqual([]);
  });

  it('maxDrawdown is non-negative (drawdown magnitude)', () => {
    const result = runStressTestScenario(mockPortfolio, mockRetirement, 'us_stagflation', 60, 65);
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it('trajectory has length = regime years + 1 (including year 0)', () => {
    // japan_lost_decade has 10 years → trajectory should have 11 points
    const result = runStressTestScenario(mockPortfolio, mockRetirement, 'japan_lost_decade', 60, 30);
    expect(result.assetTrajectory).toHaveLength(11);
  });

  it('depletionYear is correct when portfolio gets depleted', () => {
    const tinyPortfolio: Portfolio = {
      cash: 1000, fund: 0, tw_stock: 0, us_stock: 0, crypto: 0, history: [],
    };
    const result = runStressTestScenario(tinyPortfolio, mockRetirement, 'japan_lost_decade', 60, 65);
    expect(result.isDepleted).toBe(true);
    expect(result.depletionYear).toBeGreaterThan(0);
    expect(result.depletionYear).toBeLessThanOrEqual(10);
  });

  it('initialAsset matches total portfolio value', () => {
    const result = runStressTestScenario(mockPortfolio, mockRetirement, 'us_stagflation', 60, 30);
    const total = mockPortfolio.cash + mockPortfolio.fund + mockPortfolio.tw_stock + mockPortfolio.us_stock + mockPortfolio.crypto;
    expect(result.initialAsset).toBe(total);
  });

  it('yearsSurvived equals regime years when not depleted', () => {
    const result = runStressTestScenario(mockPortfolio, mockRetirement, 'zero_interest_rate', 60, 30);
    // zero_interest_rate has 8 years; with large portfolio it should not deplete
    expect(result.isDepleted).toBe(false);
    expect(result.yearsSurvived).toBe(8);
  });

  it('annualSpending is positive', () => {
    const result = runStressTestScenario(mockPortfolio, mockRetirement, 'us_stagflation', 60, 30);
    expect(result.annualSpending).toBeGreaterThan(0);
  });

  it('scenarioId matches the input scenario', () => {
    const result = runStressTestScenario(mockPortfolio, mockRetirement, 'japan_lost_decade', 60, 30);
    expect(result.scenarioId).toBe('japan_lost_decade');
  });
});

// ---------------------------------------------------------------------------
// runAllStressTests
// ---------------------------------------------------------------------------
describe('runAllStressTests', () => {
  it('returns 3 results (one per regime)', () => {
    const results = runAllStressTests(mockPortfolio, mockRetirement, 60, 30);
    expect(results).toHaveLength(3);
  });

  it('each result has a distinct scenarioId', () => {
    const results = runAllStressTests(mockPortfolio, mockRetirement, 60, 30);
    const ids = results.map(r => r.scenarioId);
    expect(new Set(ids).size).toBe(3);
  });

  it('all results have valid numeric initialAsset', () => {
    const results = runAllStressTests(mockPortfolio, mockRetirement, 60, 30);
    results.forEach(r => {
      expect(Number.isFinite(r.initialAsset)).toBe(true);
      expect(r.initialAsset).toBeGreaterThan(0);
    });
  });
});
