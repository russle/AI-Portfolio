import { describe, it, expect } from 'vitest';
import type { Portfolio, RetirementConfig, AiPortfolioState } from '../../context/AppContext';
import {
  applyMarketDropScenario,
  applyUsStockBullScenario,
  applyExchangeRateScenario,
  applyInflationScenario,
  runScenarioProjection,
} from '../scenario';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makePortfolio = (overrides: Partial<Portfolio> = {}): Portfolio => ({
  cash: 100000,
  fund: 200000,
  tw_stock: 500000,
  us_stock: 300000,
  crypto: 100000,
  history: [
    { date: '2026-01-01', net_worth: 1200000 },
    { date: '2026-02-01', net_worth: 1250000 },
  ],
  ...overrides,
});

const makeRetirement = (overrides: Partial<RetirementConfig> = {}): RetirementConfig => ({
  age: 35,
  monthly_spending: 40000,
  monthly_invest: 20000,
  expected_return: 0.065,
  inflation: 0.02,
  life_expectancy: 85,
  cape_ratio: 30,
  spending_smile: false,
  ...overrides,
});

const makeState = (overrides: Partial<AiPortfolioState> = {}): AiPortfolioState => ({
  portfolio: makePortfolio(),
  allocation_target: { tw_stock: 0.30, us_stock: 0.30, bond: 0.20, cash: 0.10, crypto: 0.10 },
  retirement: makeRetirement(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// applyMarketDropScenario
// ---------------------------------------------------------------------------
describe('applyMarketDropScenario', () => {
  it('multiplies tw_stock and us_stock by 0.9', () => {
    const p = makePortfolio({ tw_stock: 500000, us_stock: 300000 });
    const result = applyMarketDropScenario(p);
    expect(result.tw_stock).toBe(Math.round(500000 * 0.9));
    expect(result.us_stock).toBe(Math.round(300000 * 0.9));
  });

  it('does not modify fund, cash, or crypto', () => {
    const p = makePortfolio({ cash: 100000, fund: 200000, tw_stock: 500000, us_stock: 300000, crypto: 100000 });
    const result = applyMarketDropScenario(p);
    expect(result.cash).toBe(100000);
    expect(result.fund).toBe(200000);
    expect(result.crypto).toBe(100000);
  });

  it('returns a new portfolio object (immutable)', () => {
    const p = makePortfolio();
    const result = applyMarketDropScenario(p);
    expect(result).not.toBe(p);
  });

  it('updates the last history point net_worth', () => {
    const p = makePortfolio({ history: [{ date: '2026-01-01', net_worth: 1200000 }] });
    const result = applyMarketDropScenario(p);
    const expectedNetWorth = result.cash + result.fund + result.tw_stock + result.us_stock + result.crypto;
    expect(result.history[result.history.length - 1].net_worth).toBe(expectedNetWorth);
  });
});

// ---------------------------------------------------------------------------
// applyUsStockBullScenario
// ---------------------------------------------------------------------------
describe('applyUsStockBullScenario', () => {
  it('multiplies us_stock by 1.2', () => {
    const p = makePortfolio({ us_stock: 300000 });
    const result = applyUsStockBullScenario(p);
    expect(result.us_stock).toBe(Math.round(300000 * 1.2));
  });

  it('does not modify other asset classes', () => {
    const p = makePortfolio({ cash: 100000, fund: 200000, tw_stock: 500000, us_stock: 300000, crypto: 100000 });
    const result = applyUsStockBullScenario(p);
    expect(result.cash).toBe(100000);
    expect(result.fund).toBe(200000);
    expect(result.tw_stock).toBe(500000);
    expect(result.crypto).toBe(100000);
  });

  it('returns a new portfolio object', () => {
    const p = makePortfolio();
    const result = applyUsStockBullScenario(p);
    expect(result).not.toBe(p);
  });
});

// ---------------------------------------------------------------------------
// applyExchangeRateScenario
// ---------------------------------------------------------------------------
describe('applyExchangeRateScenario', () => {
  it('multiplies us_stock by 35/currentFx', () => {
    const p = makePortfolio({ us_stock: 300000 });
    const result = applyExchangeRateScenario(p);
    // Default currentFx = 30, factor = 35/30
    expect(result.us_stock).toBe(Math.round(300000 * (35 / 30)));
  });

  it('uses provided currentFx parameter', () => {
    const p = makePortfolio({ us_stock: 300000 });
    const result = applyExchangeRateScenario(p, 35);
    // factor = 35/35 = 1, us_stock unchanged
    expect(result.us_stock).toBe(300000);
  });

  it('does not modify other asset classes', () => {
    const p = makePortfolio({ cash: 100000, fund: 200000, tw_stock: 500000, us_stock: 300000, crypto: 100000 });
    const result = applyExchangeRateScenario(p, 30);
    expect(result.cash).toBe(100000);
    expect(result.fund).toBe(200000);
    expect(result.tw_stock).toBe(500000);
    expect(result.crypto).toBe(100000);
  });

  it('returns a new portfolio object', () => {
    const p = makePortfolio();
    const result = applyExchangeRateScenario(p);
    expect(result).not.toBe(p);
  });
});

// ---------------------------------------------------------------------------
// applyInflationScenario
// ---------------------------------------------------------------------------
describe('applyInflationScenario', () => {
  it('sets inflation to 0.05', () => {
    const r = makeRetirement({ inflation: 0.02 });
    const result = applyInflationScenario(r);
    expect(result.inflation).toBe(0.05);
  });

  it('preserves other retirement config fields', () => {
    const r = makeRetirement({ age: 40, monthly_spending: 50000, expected_return: 0.07 });
    const result = applyInflationScenario(r);
    expect(result.age).toBe(40);
    expect(result.monthly_spending).toBe(50000);
    expect(result.expected_return).toBe(0.07);
  });

  it('returns a new retirement config object', () => {
    const r = makeRetirement();
    const result = applyInflationScenario(r);
    expect(result).not.toBe(r);
  });
});

// ---------------------------------------------------------------------------
// runScenarioProjection
// ---------------------------------------------------------------------------
describe('runScenarioProjection', () => {
  it('dispatches market_drop correctly', () => {
    const state = makeState();
    const result = runScenarioProjection(state, 'market_drop');
    const expectedTw = Math.round(state.portfolio.tw_stock * 0.9);
    const expectedUs = Math.round(state.portfolio.us_stock * 0.9);
    expect(result.portfolio.tw_stock).toBe(expectedTw);
    expect(result.portfolio.us_stock).toBe(expectedUs);
  });

  it('dispatches us_bull correctly', () => {
    const state = makeState();
    const result = runScenarioProjection(state, 'us_bull');
    expect(result.portfolio.us_stock).toBe(Math.round(state.portfolio.us_stock * 1.2));
  });

  it('dispatches fx_35 correctly', () => {
    const state = makeState();
    const result = runScenarioProjection(state, 'fx_35');
    expect(result.portfolio.us_stock).toBe(Math.round(state.portfolio.us_stock * (35 / 30)));
  });

  it('dispatches inflation_5 correctly', () => {
    const state = makeState();
    const result = runScenarioProjection(state, 'inflation_5');
    expect(result.retirement.inflation).toBe(0.05);
  });

  it('returns a new state object and does not mutate the original', () => {
    const state = makeState();
    const originalTw = state.portfolio.tw_stock;
    const result = runScenarioProjection(state, 'market_drop');
    expect(result).not.toBe(state);
    expect(state.portfolio.tw_stock).toBe(originalTw);
  });

  it('preserves unrelated state fields', () => {
    const state = makeState();
    const result = runScenarioProjection(state, 'inflation_5');
    expect(result.allocation_target).toEqual(state.allocation_target);
  });

  it('handles default case gracefully for unknown scenarioId', () => {
    const state = makeState();
    // @ts-expect-error testing unknown scenario id
    const result = runScenarioProjection(state, 'unknown_scenario');
    expect(result).toEqual(state);
  });
});
