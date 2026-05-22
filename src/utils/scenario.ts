import type { Portfolio, RetirementConfig, AiPortfolioState } from '../context/AppContext';

/**
 * 1. 情境：市場 -10%
 * 台股、美股資產 * 0.9
 */
export const applyMarketDropScenario = (portfolio: Portfolio): Portfolio => {
  const updatedPortfolio = {
    ...portfolio,
    tw_stock: Math.round(portfolio.tw_stock * 0.9),
    us_stock: Math.round(portfolio.us_stock * 0.9)
  };
  
  // 重新精算 history 最後一筆
  return updateLastHistoryPoint(updatedPortfolio);
};

/**
 * 2. 情境：美股 +20%
 * 美股資產 * 1.2
 */
export const applyUsStockBullScenario = (portfolio: Portfolio): Portfolio => {
  const updatedPortfolio = {
    ...portfolio,
    us_stock: Math.round(portfolio.us_stock * 1.2)
  };

  return updateLastHistoryPoint(updatedPortfolio);
};

/**
 * 3. 情境：匯率 35
 * 假設原本是以 30 匯率換算，等比例將美股資產乘上 (35 / 30)
 */
export const applyExchangeRateScenario = (portfolio: Portfolio, currentFx: number = 30): Portfolio => {
  const factor = 35 / currentFx;
  const updatedPortfolio = {
    ...portfolio,
    us_stock: Math.round(portfolio.us_stock * factor)
  };

  return updateLastHistoryPoint(updatedPortfolio);
};

/**
 * 4. 情境：通膨 5%
 * 將通膨率調整為 0.05
 */
export const applyInflationScenario = (retirement: RetirementConfig): RetirementConfig => {
  return {
    ...retirement,
    inflation: 0.05
  };
};

// 輔助函式：當資產數值改變時，同步更新 history 最後一筆的淨資產加總
const updateLastHistoryPoint = (portfolio: Portfolio): Portfolio => {
  const netWorthSum = portfolio.cash + portfolio.fund + portfolio.tw_stock + portfolio.us_stock + portfolio.crypto;
  const newHistory = [...portfolio.history];
  
  if (newHistory.length > 0) {
    newHistory[newHistory.length - 1] = {
      ...newHistory[newHistory.length - 1],
      net_worth: netWorthSum
    };
  } else {
    const todayStr = new Date().toISOString().split('T')[0];
    newHistory.push({ date: todayStr, net_worth: netWorthSum });
  }

  return {
    ...portfolio,
    history: newHistory
  };
};

/**
 * 套用單一情境到整個狀態的預演函式
 */
export const runScenarioProjection = (
  state: AiPortfolioState,
  scenarioId: 'market_drop' | 'us_bull' | 'fx_35' | 'inflation_5'
): AiPortfolioState => {
  switch (scenarioId) {
    case 'market_drop':
      return {
        ...state,
        portfolio: applyMarketDropScenario(state.portfolio)
      };
    case 'us_bull':
      return {
        ...state,
        portfolio: applyUsStockBullScenario(state.portfolio)
      };
    case 'fx_35':
      return {
        ...state,
        portfolio: applyExchangeRateScenario(state.portfolio, 30) // 假設 currentFx 為 30
      };
    case 'inflation_5':
      return {
        ...state,
        retirement: applyInflationScenario(state.retirement)
      };
    default:
      return state;
  }
};
