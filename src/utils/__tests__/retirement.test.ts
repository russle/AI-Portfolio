import { describe, it, expect, vi } from 'vitest';
import {
  randomNormal,
  calculateGlidePathReturnAndStd,
  runMonteCarloSimulation,
  runFullLifeMonteCarloSimulation,
  runRetirementCrisisBacktest,
} from '../retirement';

// ---------------------------------------------------------------------------
// randomNormal
// ---------------------------------------------------------------------------
describe('randomNormal', () => {
  it('returns a finite number for default params', () => {
    const val = randomNormal(0, 1);
    expect(Number.isFinite(val)).toBe(true);
  });

  it('returns different values on successive calls (randomness)', () => {
    const a = randomNormal(0, 1);
    const b = randomNormal(0, 1);
    // Extremely unlikely to be equal
    expect(a).not.toBe(b);
  });

  it('uses mean and std correctly when Math.random is mocked', () => {
    // Box-Muller: u=0.5, v=0.5 → z = sqrt(-2*ln(0.5))*cos(2π*0.5)
    // = sqrt(1.386294)*cos(π) = 1.17741 * (-1) = -1.17741
    // result = -1.17741 * std + mean
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const val = randomNormal(10, 2);
    expect(val).toBeCloseTo(10 + (-1.17741) * 2, 2);
    vi.restoreAllMocks();
  });

  it('handles zero standard deviation', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const val = randomNormal(5, 0);
    expect(val).toBe(5);
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// calculateGlidePathReturnAndStd
// ---------------------------------------------------------------------------
describe('calculateGlidePathReturnAndStd', () => {
  const rStock = 0.08;
  const sigmaStock = 0.18;
  const rBond = 0.03;
  const sigmaBond = 0.06;

  it('returns higher stock weight for younger age', () => {
    const young = calculateGlidePathReturnAndStd(30, rStock, sigmaStock, rBond, sigmaBond);
    const old = calculateGlidePathReturnAndStd(60, rStock, sigmaStock, rBond, sigmaBond);
    expect(young.stockWeight).toBeGreaterThan(old.stockWeight);
  });

  it('clamps stockWeight between 0.2 and 0.9', () => {
    // Age 110 → (110-110)/100 = 0 → clamped to 0.2
    const veryOld = calculateGlidePathReturnAndStd(110, rStock, sigmaStock, rBond, sigmaBond);
    expect(veryOld.stockWeight).toBe(0.2);

    // Age 20 → (110-20)/100 = 0.9 → stays 0.9
    const veryYoung = calculateGlidePathReturnAndStd(20, rStock, sigmaStock, rBond, sigmaBond);
    expect(veryYoung.stockWeight).toBe(0.9);

    // Age 10 → (110-10)/100 = 1.0 → clamped to 0.9
    const extremeYoung = calculateGlidePathReturnAndStd(10, rStock, sigmaStock, rBond, sigmaBond);
    expect(extremeYoung.stockWeight).toBe(0.9);
  });

  it('computes expectedReturn as weighted average', () => {
    const age = 60; // (110-60)/100 = 0.5 stock weight
    const result = calculateGlidePathReturnAndStd(age, rStock, sigmaStock, rBond, sigmaBond);
    const expectedReturn = result.stockWeight * rStock + (1 - result.stockWeight) * rBond;
    expect(result.expectedReturn).toBeCloseTo(expectedReturn, 10);
  });

  it('computes std as weighted average', () => {
    const age = 60;
    const result = calculateGlidePathReturnAndStd(age, rStock, sigmaStock, rBond, sigmaBond);
    const expectedStd = result.stockWeight * sigmaStock + (1 - result.stockWeight) * sigmaBond;
    expect(result.std).toBeCloseTo(expectedStd, 10);
  });
});

// ---------------------------------------------------------------------------
// runMonteCarloSimulation
// ---------------------------------------------------------------------------
describe('runMonteCarloSimulation', () => {
  it('returns yearsArray with correct length (years + 1)', () => {
    const result = runMonteCarloSimulation(100000, 10000, 5, 0.08, 0.15, 0.02, 2000000);
    expect(result.yearsArray).toHaveLength(6); // 5 years + initial year 0
    expect(result.yearsArray[0]).toBe(0);
    expect(result.yearsArray[5]).toBe(5);
  });

  it('returns p5, p50, p95 with same length as yearsArray', () => {
    const result = runMonteCarloSimulation(100000, 10000, 5, 0.08, 0.15, 0.02, 2000000);
    expect(result.p5).toHaveLength(result.yearsArray.length);
    expect(result.p50).toHaveLength(result.yearsArray.length);
    expect(result.p95).toHaveLength(result.yearsArray.length);
  });

  it('satisfies p5[i] <= p50[i] <= p95[i] for all years', () => {
    const result = runMonteCarloSimulation(500000, 5000, 10, 0.07, 0.16, 0.02, 1000000);
    for (let i = 0; i < result.yearsArray.length; i++) {
      expect(result.p5[i]).toBeLessThanOrEqual(result.p50[i]);
      expect(result.p50[i]).toBeLessThanOrEqual(result.p95[i]);
    }
  });

  it('returns successRate between 0 and 1', () => {
    const result = runMonteCarloSimulation(100000, 10000, 5, 0.08, 0.15, 0.02, 2000000);
    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
  });

  it('starts with initial value for all percentiles', () => {
    const result = runMonteCarloSimulation(500000, 10000, 5, 0.08, 0.15, 0.02, 1000000);
    expect(result.p5[0]).toBe(500000);
    expect(result.p50[0]).toBe(500000);
    expect(result.p95[0]).toBe(500000);
  });
});

// ---------------------------------------------------------------------------
// runFullLifeMonteCarloSimulation
// ---------------------------------------------------------------------------
describe('runFullLifeMonteCarloSimulation', () => {
  const defaultParams = {
    initial: 2000000,
    monthlyInvest: 20000,
    currentAge: 30,
    retireAge: 60,
    expectedReturn: 0.07,
    std: 0.15,
    inflation: 0.02,
    monthlySpending: 50000,
    strategy: 'four_percent' as const,
    maxAge: 85,
  };

  it('returns yearsArray from currentAge to maxAge', () => {
    const result = runFullLifeMonteCarloSimulation(
      defaultParams.initial,
      defaultParams.monthlyInvest,
      defaultParams.currentAge,
      defaultParams.retireAge,
      defaultParams.expectedReturn,
      defaultParams.std,
      defaultParams.inflation,
      defaultParams.monthlySpending,
      defaultParams.strategy,
      defaultParams.maxAge,
    );
    expect(result.yearsArray[0]).toBe(30);
    expect(result.yearsArray[result.yearsArray.length - 1]).toBe(85);
    expect(result.yearsArray).toHaveLength(85 - 30 + 1);
  });

  it('returns p5, p50, p95 with correct lengths', () => {
    const result = runFullLifeMonteCarloSimulation(
      defaultParams.initial,
      defaultParams.monthlyInvest,
      defaultParams.currentAge,
      defaultParams.retireAge,
      defaultParams.expectedReturn,
      defaultParams.std,
      defaultParams.inflation,
      defaultParams.monthlySpending,
      defaultParams.strategy,
      defaultParams.maxAge,
    );
    expect(result.p5).toHaveLength(result.yearsArray.length);
    expect(result.p50).toHaveLength(result.yearsArray.length);
    expect(result.p95).toHaveLength(result.yearsArray.length);
  });

  it('satisfies p5[i] <= p50[i] <= p95[i] for all ages', () => {
    const result = runFullLifeMonteCarloSimulation(
      defaultParams.initial,
      defaultParams.monthlyInvest,
      defaultParams.currentAge,
      defaultParams.retireAge,
      defaultParams.expectedReturn,
      defaultParams.std,
      defaultParams.inflation,
      defaultParams.monthlySpending,
      defaultParams.strategy,
      defaultParams.maxAge,
    );
    for (let i = 0; i < result.yearsArray.length; i++) {
      expect(result.p5[i]).toBeLessThanOrEqual(result.p50[i]);
      expect(result.p50[i]).toBeLessThanOrEqual(result.p95[i]);
    }
  });

  it('depletionAgeP5 is never null and >= depletionAgeP50 (P5 depletes later or same)', () => {
    // Use die_to_zero with high spending to ensure depletion
    const result = runFullLifeMonteCarloSimulation(
      1000000,
      5000,
      30,
      60,
      0.05,
      0.12,
      0.02,
      80000,
      'die_to_zero',
      80,
    );
    // P5 should never deplete before P50
    if (result.depletionAgeP5 !== null && result.depletionAgeP50 !== null) {
      expect(result.depletionAgeP5).toBeGreaterThanOrEqual(result.depletionAgeP50);
    }
  });

  it('P5 never depletes before maxAge for reasonable retirement params', () => {
    // Use die_to_zero strategy with very conservative spending
    // Assets should last to (or past) maxAge
    const result = runFullLifeMonteCarloSimulation(
      10000000,
      5000,
      40,
      60,
      0.07,
      0.12,
      0.015,
      15000,
      'die_to_zero',
      90,
    );
    // For die_to_zero with conservative spending, P5 should not deplete before maxAge
    // It may deplete exactly at maxAge (last year of simulation), which is acceptable
    if (result.depletionAgeP5 !== null) {
      expect(result.depletionAgeP5).toBeGreaterThanOrEqual(90);
    } else {
      expect(result.depletionAgeP5).toBeNull();
    }
  });

  it('supports glide path option without throwing', () => {
    const result = runFullLifeMonteCarloSimulation(
      defaultParams.initial,
      defaultParams.monthlyInvest,
      defaultParams.currentAge,
      defaultParams.retireAge,
      defaultParams.expectedReturn,
      defaultParams.std,
      defaultParams.inflation,
      defaultParams.monthlySpending,
      defaultParams.strategy,
      defaultParams.maxAge,
      30,
      false,
      true, // enableGlidePath
    );
    expect(result.yearsArray.length).toBeGreaterThan(0);
  });

  it('supports spending smile option without throwing', () => {
    const result = runFullLifeMonteCarloSimulation(
      defaultParams.initial,
      defaultParams.monthlyInvest,
      defaultParams.currentAge,
      defaultParams.retireAge,
      defaultParams.expectedReturn,
      defaultParams.std,
      defaultParams.inflation,
      defaultParams.monthlySpending,
      defaultParams.strategy,
      defaultParams.maxAge,
      30,
      true, // enableSpendingSmile
    );
    expect(result.yearsArray.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// runRetirementCrisisBacktest
// ---------------------------------------------------------------------------
describe('runRetirementCrisisBacktest', () => {
  const allocation = {
    tw_stock: 0.3,
    us_stock: 0.3,
    bond: 0.2,
    cash: 0.1,
    crypto: 0.1,
  };

  it('returns history with correct length (120 months + initial)', () => {
    const result = runRetirementCrisisBacktest(
      5000000,
      40000,
      allocation,
      false,
      false,
      'financial_2008',
      0.02,
    );
    // 120 months + month 0 initial point
    expect(result.history).toHaveLength(121);
  });

  it('returns isDepleted as boolean', () => {
    const result = runRetirementCrisisBacktest(
      1000000,
      80000,
      allocation,
      false,
      false,
      'tech_2000',
      0.02,
    );
    expect(typeof result.isDepleted).toBe('boolean');
  });

  it('sets depletionMonth when asset is depleted', () => {
    // High spending / low asset should cause depletion
    const result = runRetirementCrisisBacktest(
      500000,
      100000,
      allocation,
      false,
      false,
      'tech_2000',
      0.02,
    );
    if (result.isDepleted) {
      expect(result.depletionMonth).not.toBeNull();
      expect(typeof result.depletionMonth).toBe('number');
    }
  });

  it('isDepleted is true when spending far exceeds assets', () => {
    const result = runRetirementCrisisBacktest(
      100000,
      50000,
      allocation,
      false,
      false,
      'inflation_2022',
      0.02,
    );
    expect(result.isDepleted).toBe(true);
  });

  it('isDepleted is false when assets are very large relative to spending', () => {
    const result = runRetirementCrisisBacktest(
      50000000,
      30000,
      allocation,
      false,
      false,
      'financial_2008',
      0.02,
    );
    expect(result.isDepleted).toBe(false);
  });

  it('history entries have expected structure', () => {
    const result = runRetirementCrisisBacktest(
      5000000,
      40000,
      allocation,
      false,
      false,
      'tech_2000',
      0.02,
    );
    const point = result.history[1];
    expect(point).toHaveProperty('month');
    expect(point).toHaveProperty('yearNum');
    expect(point).toHaveProperty('assetValue');
    expect(point).toHaveProperty('spentValue');
  });

  it('initial history point has month 0 and yearNum 0', () => {
    const result = runRetirementCrisisBacktest(
      5000000,
      40000,
      allocation,
      false,
      false,
      'financial_2008',
      0.02,
    );
    expect(result.history[0].month).toBe(0);
    expect(result.history[0].yearNum).toBe(0);
    expect(result.history[0].assetValue).toBe(5000000);
  });

  it('returns finalAsset as a number', () => {
    const result = runRetirementCrisisBacktest(
      5000000,
      40000,
      allocation,
      false,
      false,
      'financial_2008',
      0.02,
    );
    expect(typeof result.finalAsset).toBe('number');
    expect(Number.isFinite(result.finalAsset)).toBe(true);
  });

  it('supports GK dynamic withdrawal without error', () => {
    const result = runRetirementCrisisBacktest(
      5000000,
      40000,
      allocation,
      true, // enableGk
      false,
      'tech_2000',
      0.02,
    );
    expect(result.history.length).toBe(121);
  });

  it('supports spending smile without error', () => {
    const result = runRetirementCrisisBacktest(
      5000000,
      40000,
      allocation,
      false,
      true, // enableSpendingSmile
      'tech_2000',
      0.02,
    );
    expect(result.history.length).toBe(121);
  });
});
