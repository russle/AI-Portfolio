import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchLatestPrice } from '../utils/priceFetcher';

export type PortfolioHistoryPoint = {
  date: string;      // YYYY-MM-DD
  net_worth: number;
  cash?: number;
  fund?: number;
  tw_stock?: number;
  us_stock?: number;
  crypto?: number;
  cumulative_investment?: number; // [NEW] 累計投入本金
};

export type HoldingItem = {
  id: string;          // 唯一識別碼
  symbol: string;      // 標的代號，如 "0050.TW", "VT"
  name: string;        // 標的名稱
  shares: number;      // 股數
  currentPrice: number;// 最新報價
  currency: 'TWD' | 'USD';
  assetType: 'tw_stock' | 'us_stock' | 'fund' | 'crypto';
};

export type Portfolio = {
  cash: number;
  fund: number;
  tw_stock: number;
  us_stock: number;
  crypto: number;
  holdings?: HoldingItem[];    // [NEW] 持股明細
  isHoldingMode?: boolean;     // [NEW] 是否啟用持股模式
  usdRate?: number;            // [NEW] 美元匯率
  history: PortfolioHistoryPoint[];
};

export type AssetClassKey = 'cash' | 'fund' | 'tw_stock' | 'us_stock' | 'crypto';

export type AllocationTarget = {
  tw_stock: number;  // 0~1 比例
  us_stock: number;
  bond: number;
  cash: number;
  crypto: number;
};

export type RetirementConfig = {
  age: number;
  monthly_spending: number;
  monthly_invest: number;
  expected_return: number; // 年化報酬率，例如 0.065
  inflation: number;       // 年通膨率，例如 0.02
  life_expectancy: number; // [NEW] 預估壽命設定
  cape_ratio: number;      // [NEW] 市場席勒本益比 (CAPE Ratio)，例如 30
  spending_smile: boolean; // [NEW] 是否啟用退休支出微笑曲線 (Spending Smile)
};

export type AiPortfolioState = {
  portfolio: Portfolio;
  allocation_target: AllocationTarget;
  retirement: RetirementConfig;
};

export interface AppContextProps {
  state: AiPortfolioState;
  updatePortfolioAsset: (key: AssetClassKey, value: number) => void;
  updateAllocationTarget: (target: Partial<AllocationTarget>) => void;
  updateRetirementConfig: (key: keyof RetirementConfig, value: number) => void;
  addHistoryPoint: (date: string, netWorth: number, cumulativeInvestment?: number) => void;
  resetAll: () => void;
  importState: (newState: AiPortfolioState) => void;
  addGranularHistoryPoint: (
    date: string,
    detail: { cash: number; fund: number; tw_stock: number; us_stock: number; crypto: number },
    cumulativeInvestment?: number
  ) => void;
  deleteHistoryPoint: (date: string) => void;
  // [NEW] 持股管理 API
  toggleHoldingMode: (enabled: boolean) => void;
  addHolding: (holding: Omit<HoldingItem, 'id'>) => void;
  deleteHolding: (id: string) => void;
  updateHolding: (id: string, updates: Partial<HoldingItem>) => void;
  refreshAllPrices: (usdRate?: number) => Promise<boolean>;
  updateUsdRate: (rate: number) => void; // [NEW] 更新匯率
}

const LOCAL_STORAGE_KEY = 'aiPortfolio';

const DEFAULT_STATE: AiPortfolioState = {
  portfolio: {
    cash: 200000,
    fund: 150000,
    tw_stock: 400000,
    us_stock: 450000,
    crypto: 30000,
    holdings: [
      { id: '1', symbol: '0050.TW', name: '元大台灣50', shares: 2424, currentPrice: 165, currency: 'TWD', assetType: 'tw_stock' },
      { id: '2', symbol: 'VT', name: '先鋒全球股票 ETF', shares: 125, currentPrice: 112, currency: 'USD', assetType: 'us_stock' },
      { id: '3', symbol: 'BTC-USD', name: '比特幣', shares: 0.0139, currentPrice: 67000, currency: 'USD', assetType: 'crypto' }
    ],
    isHoldingMode: false,
    usdRate: 32.2,
    history: [
      { date: '2025-11-22', net_worth: 800000, cash: 150000, fund: 100000, tw_stock: 250000, us_stock: 280000, crypto: 20000, cumulative_investment: 780000 },
      { date: '2025-12-22', net_worth: 850000, cash: 160000, fund: 110000, tw_stock: 270000, us_stock: 290000, crypto: 20000, cumulative_investment: 800000 },
      { date: '2026-01-22', net_worth: 890000, cash: 170000, fund: 120000, tw_stock: 280000, us_stock: 300000, crypto: 20000, cumulative_investment: 810000 },
      { date: '2026-02-22', net_worth: 950000, cash: 180000, fund: 130000, tw_stock: 300000, us_stock: 310000, crypto: 30000, cumulative_investment: 830000 },
      { date: '2026-03-22', net_worth: 1020000, cash: 190000, fund: 140000, tw_stock: 320000, us_stock: 340000, crypto: 30000, cumulative_investment: 850000 },
      { date: '2026-04-22', net_worth: 1100000, cash: 195000, fund: 145000, tw_stock: 350000, us_stock: 380000, crypto: 30000, cumulative_investment: 870000 },
      { date: '2026-05-22', net_worth: 1230000, cash: 200000, fund: 150000, tw_stock: 400000, us_stock: 450000, crypto: 30000, cumulative_investment: 890000 },
    ]
  },
  allocation_target: {
    tw_stock: 0.3,
    us_stock: 0.4,
    bond: 0.15,
    cash: 0.1,
    crypto: 0.05
  },
  retirement: {
    age: 30,
    monthly_spending: 50000,
    monthly_invest: 20000,
    expected_return: 0.07,
    inflation: 0.02,
    life_expectancy: 85,
    cape_ratio: 30,
    spending_smile: false
  }
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

const migrateHistory = (history: any[], currentPortfolio: Omit<Portfolio, 'history'>): PortfolioHistoryPoint[] => {
  const currentSum = 
    currentPortfolio.cash + 
    currentPortfolio.fund + 
    currentPortfolio.tw_stock + 
    currentPortfolio.us_stock + 
    currentPortfolio.crypto;

  return history.map(point => {
    if (
      point.cash !== undefined &&
      point.fund !== undefined &&
      point.tw_stock !== undefined &&
      point.us_stock !== undefined &&
      point.crypto !== undefined
    ) {
      return point as PortfolioHistoryPoint;
    }

    const total = point.net_worth;
    if (currentSum === 0) {
      return {
        ...point,
        cash: Math.round(total * 0.1),
        fund: Math.round(total * 0.15),
        tw_stock: Math.round(total * 0.3),
        us_stock: Math.round(total * 0.4),
        crypto: Math.round(total * 0.05)
      };
    }

    const ratio = total / currentSum;
    return {
      ...point,
      cash: Math.round(currentPortfolio.cash * ratio),
      fund: Math.round(currentPortfolio.fund * ratio),
      tw_stock: Math.round(currentPortfolio.tw_stock * ratio),
      us_stock: Math.round(currentPortfolio.us_stock * ratio),
      crypto: Math.round(currentPortfolio.crypto * ratio)
    };
  });
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AiPortfolioState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const portfolio = parsed.portfolio || {};
        const history = portfolio.history || [];
        const migratedHistory = migrateHistory(history, {
          cash: portfolio.cash !== undefined ? portfolio.cash : DEFAULT_STATE.portfolio.cash,
          fund: portfolio.fund !== undefined ? portfolio.fund : DEFAULT_STATE.portfolio.fund,
          tw_stock: portfolio.tw_stock !== undefined ? portfolio.tw_stock : DEFAULT_STATE.portfolio.tw_stock,
          us_stock: portfolio.us_stock !== undefined ? portfolio.us_stock : DEFAULT_STATE.portfolio.us_stock,
          crypto: portfolio.crypto !== undefined ? portfolio.crypto : DEFAULT_STATE.portfolio.crypto,
        });

        return {
          portfolio: {
            ...DEFAULT_STATE.portfolio,
            ...portfolio,
            holdings: portfolio.holdings || [],
            isHoldingMode: portfolio.isHoldingMode || false,
            usdRate: portfolio.usdRate !== undefined ? portfolio.usdRate : DEFAULT_STATE.portfolio.usdRate,
            history: migratedHistory
          },
          allocation_target: {
            ...DEFAULT_STATE.allocation_target,
            ...(parsed.allocation_target || {})
          },
          retirement: {
            ...DEFAULT_STATE.retirement,
            ...(parsed.retirement || {})
          }
        };
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
    return DEFAULT_STATE;
  });

  // 同步寫入 localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updatePortfolioAsset = (key: AssetClassKey, value: number) => {
    setState(prev => {
      const updatedPortfolio = {
        ...prev.portfolio,
        [key]: Math.max(0, value)
      };
      
      const netWorthSum = 
        updatedPortfolio.cash + 
        updatedPortfolio.fund + 
        updatedPortfolio.tw_stock + 
        updatedPortfolio.us_stock + 
        updatedPortfolio.crypto;
        
      const newHistory = [...updatedPortfolio.history];
      const newPoint: PortfolioHistoryPoint = {
        date: newHistory.length > 0 ? newHistory[newHistory.length - 1].date : new Date().toISOString().split('T')[0],
        net_worth: netWorthSum,
        cash: updatedPortfolio.cash,
        fund: updatedPortfolio.fund,
        tw_stock: updatedPortfolio.tw_stock,
        us_stock: updatedPortfolio.us_stock,
        crypto: updatedPortfolio.crypto
      };

      if (newHistory.length > 0) {
        newHistory[newHistory.length - 1] = newPoint;
      } else {
        newHistory.push(newPoint);
      }

      return {
        ...prev,
        portfolio: {
          ...updatedPortfolio,
          history: newHistory
        }
      };
    });
  };

  const updateAllocationTarget = (target: Partial<AllocationTarget>) => {
    setState(prev => ({
      ...prev,
      allocation_target: {
        ...prev.allocation_target,
        ...target
      }
    }));
  };

  const updateRetirementConfig = (key: keyof RetirementConfig, value: number) => {
    setState(prev => ({
      ...prev,
      retirement: {
        ...prev.retirement,
        [key]: Math.max(0, value)
      }
    }));
  };

  const addHistoryPoint = (date: string, netWorth: number, cumulativeInvestment?: number) => {
    setState(prev => {
      const updatedHistory = [...prev.portfolio.history];
      const existIndex = updatedHistory.findIndex(p => p.date === date);
      
      const currentDetail = {
        cash: prev.portfolio.cash,
        fund: prev.portfolio.fund,
        tw_stock: prev.portfolio.tw_stock,
        us_stock: prev.portfolio.us_stock,
        crypto: prev.portfolio.crypto
      };
      
      const currentSum = currentDetail.cash + currentDetail.fund + currentDetail.tw_stock + currentDetail.us_stock + currentDetail.crypto;
      
      const getProportionalDetail = (targetNetWorth: number) => {
        if (currentSum === 0) {
          return {
            cash: Math.round(targetNetWorth * 0.1),
            fund: Math.round(targetNetWorth * 0.15),
            tw_stock: Math.round(targetNetWorth * 0.3),
            us_stock: Math.round(targetNetWorth * 0.4),
            crypto: Math.round(targetNetWorth * 0.05)
          };
        }
        const ratio = targetNetWorth / currentSum;
        return {
          cash: Math.round(currentDetail.cash * ratio),
          fund: Math.round(currentDetail.fund * ratio),
          tw_stock: Math.round(currentDetail.tw_stock * ratio),
          us_stock: Math.round(currentDetail.us_stock * ratio),
          crypto: Math.round(currentDetail.crypto * ratio)
        };
      };

      const detail = getProportionalDetail(netWorth);

      const defaultInvest = (() => {
        if (cumulativeInvestment !== undefined) return cumulativeInvestment;
        // 尋找最接近該日期之前的點
        const sortedBefore = [...updatedHistory]
          .filter(p => p.date < date && p.cumulative_investment !== undefined)
          .sort((a, b) => b.date.localeCompare(a.date));
        if (sortedBefore.length > 0) return sortedBefore[0].cumulative_investment;
        return netWorth;
      })();

      const newPoint: PortfolioHistoryPoint = {
        date,
        net_worth: netWorth,
        ...detail,
        cumulative_investment: defaultInvest
      };

      if (existIndex >= 0) {
        updatedHistory[existIndex] = newPoint;
      } else {
        updatedHistory.push(newPoint);
        // 按日期排序
        updatedHistory.sort((a, b) => a.date.localeCompare(b.date));
      }
      return {
        ...prev,
        portfolio: {
          ...prev.portfolio,
          history: updatedHistory
        }
      };
    });
  };

  const resetAll = () => {
    setState(DEFAULT_STATE);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
  };

  const importState = (newState: AiPortfolioState) => {
    setState(newState);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
  };

  // [NEW] 持股模式與累算同步
  const toggleHoldingMode = (enabled: boolean) => {
    setState(prev => {
      const updatedPortfolio = {
        ...prev.portfolio,
        isHoldingMode: enabled
      };

      if (enabled) {
        const holdingsList = updatedPortfolio.holdings || [];
        const rate = updatedPortfolio.usdRate ?? 32.2;
        
        const sumByType = (type: HoldingItem['assetType']) => {
          return holdingsList
            .filter(h => h.assetType === type)
            .reduce((sum, h) => {
              const priceTwd = h.currency === 'USD' ? h.currentPrice * rate : h.currentPrice;
              return sum + Math.round(h.shares * priceTwd);
            }, 0);
        };

        updatedPortfolio.tw_stock = sumByType('tw_stock');
        updatedPortfolio.us_stock = sumByType('us_stock');
        updatedPortfolio.fund = sumByType('fund');
        updatedPortfolio.crypto = sumByType('crypto');

        const netWorthSum = 
          updatedPortfolio.cash + 
          updatedPortfolio.fund + 
          updatedPortfolio.tw_stock + 
          updatedPortfolio.us_stock + 
          updatedPortfolio.crypto;

        const newHistory = [...updatedPortfolio.history];
        const newPoint = {
          date: newHistory.length > 0 ? newHistory[newHistory.length - 1].date : new Date().toISOString().split('T')[0],
          net_worth: netWorthSum,
          cash: updatedPortfolio.cash,
          fund: updatedPortfolio.fund,
          tw_stock: updatedPortfolio.tw_stock,
          us_stock: updatedPortfolio.us_stock,
          crypto: updatedPortfolio.crypto
        };

        if (newHistory.length > 0) {
          newHistory[newHistory.length - 1] = newPoint;
        } else {
          newHistory.push(newPoint);
        }
        updatedPortfolio.history = newHistory;
      }

      return {
        ...prev,
        portfolio: updatedPortfolio
      };
    });
  };

  const syncHoldingsToState = (
    holdingsList: HoldingItem[], 
    cashVal: number, 
    usdRate?: number
  ) => {
    setState(prev => {
      const rate = usdRate !== undefined ? usdRate : (prev.portfolio.usdRate ?? 32.2);
      const sumByType = (type: HoldingItem['assetType']) => {
        return holdingsList
          .filter(h => h.assetType === type)
          .reduce((sum, h) => {
            const priceTwd = h.currency === 'USD' ? h.currentPrice * rate : h.currentPrice;
            return sum + Math.round(h.shares * priceTwd);
          }, 0);
      };

      const tw_stock = sumByType('tw_stock');
      const us_stock = sumByType('us_stock');
      const fund = sumByType('fund');
      const crypto = sumByType('crypto');

      const netWorthSum = cashVal + fund + tw_stock + us_stock + crypto;

      const newHistory = [...prev.portfolio.history];
      const newPoint = {
        date: newHistory.length > 0 ? newHistory[newHistory.length - 1].date : new Date().toISOString().split('T')[0],
        net_worth: netWorthSum,
        cash: cashVal,
        fund,
        tw_stock,
        us_stock,
        crypto
      };

      if (newHistory.length > 0) {
        newHistory[newHistory.length - 1] = newPoint;
      } else {
        newHistory.push(newPoint);
      }

      return {
        ...prev,
        portfolio: {
          ...prev.portfolio,
          cash: cashVal,
          tw_stock,
          us_stock,
          fund,
          crypto,
          holdings: holdingsList,
          history: newHistory
        }
      };
    });
  };

  const addHolding = (holding: Omit<HoldingItem, 'id'>) => {
    setState(prev => {
      const currentHoldings = prev.portfolio.holdings || [];
      const newHolding: HoldingItem = {
        ...holding,
        id: Math.random().toString(36).substring(2, 9)
      };
      const updatedHoldings = [...currentHoldings, newHolding];

      if (prev.portfolio.isHoldingMode) {
        setTimeout(() => syncHoldingsToState(updatedHoldings, prev.portfolio.cash), 0);
        return prev;
      }

      return {
        ...prev,
        portfolio: {
          ...prev.portfolio,
          holdings: updatedHoldings
        }
      };
    });
  };

  const deleteHolding = (id: string) => {
    setState(prev => {
      const currentHoldings = prev.portfolio.holdings || [];
      const updatedHoldings = currentHoldings.filter(h => h.id !== id);

      if (prev.portfolio.isHoldingMode) {
        setTimeout(() => syncHoldingsToState(updatedHoldings, prev.portfolio.cash), 0);
        return prev;
      }

      return {
        ...prev,
        portfolio: {
          ...prev.portfolio,
          holdings: updatedHoldings
        }
      };
    });
  };

  const updateHolding = (id: string, updates: Partial<HoldingItem>) => {
    setState(prev => {
      const currentHoldings = prev.portfolio.holdings || [];
      const updatedHoldings = currentHoldings.map(h => 
        h.id === id ? { ...h, ...updates } : h
      );

      if (prev.portfolio.isHoldingMode) {
        setTimeout(() => syncHoldingsToState(updatedHoldings, prev.portfolio.cash), 0);
        return prev;
      }

      return {
        ...prev,
        portfolio: {
          ...prev.portfolio,
          holdings: updatedHoldings
        }
      };
    });
  };

  const refreshAllPrices = async (usdRate?: number): Promise<boolean> => {
    try {
      let currentHoldings: HoldingItem[] = [];
      let currentCash = 200000;
      let currentRate = 32.2;
      
      setState(prev => {
        currentHoldings = prev.portfolio.holdings || [];
        currentCash = prev.portfolio.cash;
        currentRate = prev.portfolio.usdRate ?? 32.2;
        return prev;
      });

      if (currentHoldings.length === 0) return true;

      const updatedHoldings = [...currentHoldings];
      let hasAnyUpdate = false;

      for (let i = 0; i < updatedHoldings.length; i++) {
        const h = updatedHoldings[i];
        const latestPrice = await fetchLatestPrice(h.symbol);
        if (latestPrice !== null) {
          updatedHoldings[i] = {
            ...h,
            currentPrice: latestPrice
          };
          hasAnyUpdate = true;
        }
      }

      if (hasAnyUpdate) {
        const rateToUse = usdRate !== undefined ? usdRate : currentRate;
        syncHoldingsToState(updatedHoldings, currentCash, rateToUse);
      }
      return true;
    } catch (e) {
      console.error('Failed to refresh prices', e);
      return false;
    }
  };

  // [NEW] 更新全域匯率並進行持股重估
  const updateUsdRate = (rate: number) => {
    if (rate <= 20 || rate >= 50 || isNaN(rate)) {
      console.warn(`[FX Update] Ignored abnormal rate: ${rate}`);
      return;
    }

    setState(prev => {
      const updatedPortfolio = {
        ...prev.portfolio,
        usdRate: rate
      };

      if (prev.portfolio.isHoldingMode) {
        const holdingsList = updatedPortfolio.holdings || [];
        const sumByType = (type: HoldingItem['assetType']) => {
          return holdingsList
            .filter(h => h.assetType === type)
            .reduce((sum, h) => {
              const priceTwd = h.currency === 'USD' ? h.currentPrice * rate : h.currentPrice;
              return sum + Math.round(h.shares * priceTwd);
            }, 0);
        };

        updatedPortfolio.tw_stock = sumByType('tw_stock');
        updatedPortfolio.us_stock = sumByType('us_stock');
        updatedPortfolio.fund = sumByType('fund');
        updatedPortfolio.crypto = sumByType('crypto');

        const netWorthSum = 
          updatedPortfolio.cash + 
          updatedPortfolio.fund + 
          updatedPortfolio.tw_stock + 
          updatedPortfolio.us_stock + 
          updatedPortfolio.crypto;

        const newHistory = [...updatedPortfolio.history];
        const newPoint = {
          date: newHistory.length > 0 ? newHistory[newHistory.length - 1].date : new Date().toISOString().split('T')[0],
          net_worth: netWorthSum,
          cash: updatedPortfolio.cash,
          fund: updatedPortfolio.fund,
          tw_stock: updatedPortfolio.tw_stock,
          us_stock: updatedPortfolio.us_stock,
          crypto: updatedPortfolio.crypto
        };

        if (newHistory.length > 0) {
          newHistory[newHistory.length - 1] = newPoint;
        } else {
          newHistory.push(newPoint);
        }
        updatedPortfolio.history = newHistory;
      }

      return {
        ...prev,
        portfolio: updatedPortfolio
      };
    });
  };

  // [NEW] 登入初始化時自動抓取最新匯率 (Auto FX Fetcher)
  useEffect(() => {
    const fetchFxRate = async () => {
      try {
        console.log('[FX Auto Fetch] Starting auto USD rate fetch...');
        const rate = await fetchLatestPrice('USDTWD=X');
        if (rate !== null && rate > 20 && rate < 50) {
          console.log(`[FX Auto Fetch] Successfully loaded USD rate from Yahoo Finance: ${rate}`);
          updateUsdRate(rate);
        } else {
          console.warn(`[FX Auto Fetch] API returned invalid or no rate: ${rate}. Using fallback.`);
        }
      } catch (err) {
        console.error('[FX Auto Fetch] Error during FX rate fetch:', err);
      }
    };

    // 延遲 1 秒執行以防止阻塞首屏渲染，確保極致的高級感體驗
    const timer = setTimeout(fetchFxRate, 1000);
    return () => clearTimeout(timer);
  }, []);

  const addGranularHistoryPoint = (
    date: string,
    detail: { cash: number; fund: number; tw_stock: number; us_stock: number; crypto: number },
    cumulativeInvestment?: number
  ) => {
    setState(prev => {
      const updatedHistory = [...prev.portfolio.history];
      const existIndex = updatedHistory.findIndex(p => p.date === date);
      
      const netWorthSum = detail.cash + detail.fund + detail.tw_stock + detail.us_stock + detail.crypto;
      
      const defaultInvest = (() => {
        if (cumulativeInvestment !== undefined) return cumulativeInvestment;
        // 尋找最接近該日期之前的點
        const sortedBefore = [...updatedHistory]
          .filter(p => p.date < date && p.cumulative_investment !== undefined)
          .sort((a, b) => b.date.localeCompare(a.date));
        if (sortedBefore.length > 0) return sortedBefore[0].cumulative_investment;
        return netWorthSum;
      })();

      const newPoint: PortfolioHistoryPoint = {
        date,
        net_worth: netWorthSum,
        ...detail,
        cumulative_investment: defaultInvest
      };

      if (existIndex >= 0) {
        updatedHistory[existIndex] = newPoint;
      } else {
        updatedHistory.push(newPoint);
        updatedHistory.sort((a, b) => a.date.localeCompare(b.date));
      }

      // 日期決定論：比對是不是最新或更晚的日期
      const latestDateInHistory = updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1].date : date;
      const isLatestOrNewer = date >= latestDateInHistory;

      const updatedPortfolio = isLatestOrNewer
        ? {
            ...prev.portfolio,
            cash: detail.cash,
            fund: detail.fund,
            tw_stock: detail.tw_stock,
            us_stock: detail.us_stock,
            crypto: detail.crypto,
            history: updatedHistory
          }
        : {
            ...prev.portfolio,
            history: updatedHistory
          };

      return {
        ...prev,
        portfolio: updatedPortfolio
      };
    });
  };

  const deleteHistoryPoint = (date: string) => {
    setState(prev => {
      const updatedHistory = prev.portfolio.history.filter(p => p.date !== date);
      return {
        ...prev,
        portfolio: {
          ...prev.portfolio,
          history: updatedHistory
        }
      };
    });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        updatePortfolioAsset,
        updateAllocationTarget,
        updateRetirementConfig,
        addHistoryPoint,
        resetAll,
        importState,
        addGranularHistoryPoint,
        deleteHistoryPoint,
        toggleHoldingMode,
        addHolding,
        deleteHolding,
        updateHolding,
        refreshAllPrices,
        updateUsdRate
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
