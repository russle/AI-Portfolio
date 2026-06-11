import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CRISIS_EVENTS, fetchHistoricalPrices, runBacktest } from '../backtest';
import type { PerformanceMetrics } from '../backtest';

// ---------------------------------------------------------------------------
// CRISIS_EVENTS
// ---------------------------------------------------------------------------
describe('CRISIS_EVENTS', () => {
  it('is an array with 3 crisis events', () => {
    expect(Array.isArray(CRISIS_EVENTS)).toBe(true);
    expect(CRISIS_EVENTS).toHaveLength(3);
  });

  it('each event has required fields', () => {
    for (const event of CRISIS_EVENTS) {
      expect(event).toHaveProperty('name');
      expect(event).toHaveProperty('period');
      expect(event).toHaveProperty('peakMonth');
      expect(event).toHaveProperty('bottomMonth');
      expect(event).toHaveProperty('description');
      expect(typeof event.name).toBe('string');
      expect(typeof event.period).toBe('string');
      expect(typeof event.peakMonth).toBe('string');
      expect(typeof event.bottomMonth).toBe('string');
      expect(typeof event.description).toBe('string');
    }
  });

  it('referenceMonth is a string when present', () => {
    for (const event of CRISIS_EVENTS) {
      expect(typeof event.referenceMonth).toBe('string');
    }
  });

  it('peakMonth and bottomMonth are in YYYY-MM format', () => {
    const yyyyMmRegex = /^\d{4}-\d{2}$/;
    for (const event of CRISIS_EVENTS) {
      expect(event.peakMonth).toMatch(yyyyMmRegex);
      expect(event.bottomMonth).toMatch(yyyyMmRegex);
    }
  });
});

// ---------------------------------------------------------------------------
// PerformanceMetrics shape
// ---------------------------------------------------------------------------
describe('PerformanceMetrics interface', () => {
  it('has all required numeric fields when constructed', () => {
    const metrics: PerformanceMetrics = {
      finalValue: 1000000,
      totalInvested: 500000,
      cumulativeReturn: 100.00,
      cagr: 7.20,
      maxDrawdown: -25.50,
      volatility: 12.80,
      sharpeRatio: 0.45,
    };
    expect(typeof metrics.finalValue).toBe('number');
    expect(typeof metrics.totalInvested).toBe('number');
    expect(typeof metrics.cumulativeReturn).toBe('number');
    expect(typeof metrics.cagr).toBe('number');
    expect(typeof metrics.maxDrawdown).toBe('number');
    expect(typeof metrics.volatility).toBe('number');
    expect(typeof metrics.sharpeRatio).toBe('number');
    expect(Number.isFinite(metrics.finalValue)).toBe(true);
    expect(Number.isFinite(metrics.totalInvested)).toBe(true);
    expect(Number.isFinite(metrics.cumulativeReturn)).toBe(true);
    expect(Number.isFinite(metrics.cagr)).toBe(true);
    expect(Number.isFinite(metrics.maxDrawdown)).toBe(true);
    expect(Number.isFinite(metrics.volatility)).toBe(true);
    expect(Number.isFinite(metrics.sharpeRatio)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fetchHistoricalPrices
// ---------------------------------------------------------------------------
describe('fetchHistoricalPrices', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to offline data when fetch fails for known symbol 0050.TW', async () => {
    const prices = await fetchHistoricalPrices('0050.TW', '10y');
    expect(prices).not.toBeNull();
    expect(typeof prices).toBe('object');
    expect(Object.keys(prices!).length).toBeGreaterThan(0);
    // Should contain 2016-01
    expect(prices!['2016-01']).toBeDefined();
  });

  it('falls back to offline data for VT', async () => {
    const prices = await fetchHistoricalPrices('VT', '10y');
    expect(prices).not.toBeNull();
    expect(prices!['2016-01']).toBeDefined();
  });

  it('returns null for unknown symbols with no fallback', async () => {
    const prices = await fetchHistoricalPrices('UNKNOWN_SYMBOL_XYZ', '1y');
    expect(prices).toBeNull();
  });

  it('auto-appends .TW for numeric symbols', async () => {
    const prices = await fetchHistoricalPrices('0050', '10y');
    expect(prices).not.toBeNull();
    expect(prices!['2016-01']).toBeDefined();
  });

  it('trims and uppercases symbol', async () => {
    const prices = await fetchHistoricalPrices('  vt  ', '5y');
    expect(prices).not.toBeNull();
    expect(prices!['2021-01']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// runBacktest (with mocked fetch to force fallback data)
// ---------------------------------------------------------------------------
describe('runBacktest', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const allocation = {
    tw_stock: 0.30,
    us_stock: 0.30,
    bond: 0.20,
    cash: 0.10,
    crypto: 0.10,
  };

  const symbols = {
    tw_stock: '0050.TW',
    us_stock: 'VT',
    fund: 'BND',
    crypto: 'BTC-USD',
  };

  it('returns history, metrics, and crisisMetrics', async () => {
    const result = await runBacktest(allocation, symbols, '5y', 1000000, 10000, 'monthly');
    expect(result).toHaveProperty('history');
    expect(result).toHaveProperty('metrics');
    expect(result).toHaveProperty('crisisMetrics');
    expect(Array.isArray(result.history)).toBe(true);
    expect(result.history.length).toBeGreaterThan(0);
  });

  it('metrics.portfolio has all PerformanceMetrics fields as numbers', async () => {
    const result = await runBacktest(allocation, symbols, '5y', 1000000, 10000, 'yearly');
    const m = result.metrics.portfolio;
    expect(typeof m.finalValue).toBe('number');
    expect(typeof m.totalInvested).toBe('number');
    expect(typeof m.cumulativeReturn).toBe('number');
    expect(typeof m.cagr).toBe('number');
    expect(typeof m.maxDrawdown).toBe('number');
    expect(typeof m.volatility).toBe('number');
    expect(typeof m.sharpeRatio).toBe('number');
  });

  it('metrics.benchmark has all PerformanceMetrics fields', async () => {
    const result = await runBacktest(allocation, symbols, '3y', 500000, 5000, 'none');
    const b = result.metrics.benchmark;
    expect(typeof b.finalValue).toBe('number');
    expect(typeof b.totalInvested).toBe('number');
    expect(typeof b.cumulativeReturn).toBe('number');
    expect(typeof b.cagr).toBe('number');
  });

  it('includes crisisMetrics with correct structure', async () => {
    const result = await runBacktest(allocation, symbols, '10y', 1000000, 10000, 'monthly');
    expect(result.crisisMetrics).toHaveLength(3);
    for (const crisis of result.crisisMetrics) {
      expect(crisis).toHaveProperty('name');
      expect(crisis).toHaveProperty('period');
      expect(crisis).toHaveProperty('portfolioDrop');
      expect(crisis).toHaveProperty('benchmarkDrop');
      expect(crisis).toHaveProperty('portfolioRecovery');
      expect(crisis).toHaveProperty('benchmarkRecovery');
      expect(crisis).toHaveProperty('isAvailable');
      expect(typeof crisis.isAvailable).toBe('boolean');
    }
  });

  it('actual metrics are present when actualAllocation is provided', async () => {
    const actualAlloc = {
      tw_stock: 0.40,
      us_stock: 0.25,
      bond: 0.15,
      cash: 0.10,
      crypto: 0.10,
    };
    const result = await runBacktest(allocation, symbols, '5y', 1000000, 10000, 'monthly', actualAlloc);
    expect(result.metrics.actual).toBeDefined();
    expect(typeof result.metrics.actual!.finalValue).toBe('number');
  });

  it('actual metrics is undefined when actualAllocation is omitted', async () => {
    const result = await runBacktest(allocation, symbols, '5y', 1000000, 10000, 'monthly');
    expect(result.metrics.actual).toBeUndefined();
  });

  it('history points contain portfolioValue, benchmarkValue, totalInvested', async () => {
    const result = await runBacktest(allocation, symbols, '3y', 1000000, 10000, 'none');
    const point = result.history[0];
    expect(point).toHaveProperty('date');
    expect(point).toHaveProperty('portfolioValue');
    expect(point).toHaveProperty('benchmarkValue');
    expect(point).toHaveProperty('totalInvested');
  });
});
