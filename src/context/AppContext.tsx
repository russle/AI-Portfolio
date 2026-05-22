import React, { createContext, useContext, useState, useEffect } from 'react';

export type PortfolioHistoryPoint = {
  date: string;      // YYYY-MM-DD
  net_worth: number;
};

export type Portfolio = {
  cash: number;
  fund: number;
  tw_stock: number;
  us_stock: number;
  crypto: number;
  history: PortfolioHistoryPoint[];
};

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
};

export type AiPortfolioState = {
  portfolio: Portfolio;
  allocation_target: AllocationTarget;
  retirement: RetirementConfig;
};

export interface AppContextProps {
  state: AiPortfolioState;
  updatePortfolioAsset: (key: keyof Omit<Portfolio, 'history'>, value: number) => void;
  updateAllocationTarget: (target: Partial<AllocationTarget>) => void;
  updateRetirementConfig: (key: keyof RetirementConfig, value: number) => void;
  addHistoryPoint: (date: string, netWorth: number) => void;
  resetAll: () => void;
}

const LOCAL_STORAGE_KEY = 'aiPortfolio';

const DEFAULT_STATE: AiPortfolioState = {
  portfolio: {
    cash: 200000,
    fund: 150000,
    tw_stock: 400000,
    us_stock: 450000,
    crypto: 30000,
    history: [
      { date: '2025-11-22', net_worth: 800000 },
      { date: '2025-12-22', net_worth: 850000 },
      { date: '2026-01-22', net_worth: 890000 },
      { date: '2026-02-22', net_worth: 950000 },
      { date: '2026-03-22', net_worth: 1020000 },
      { date: '2026-04-22', net_worth: 1100000 },
      { date: '2026-05-22', net_worth: 1230000 }, // 等於 cash + fund + tw_stock + us_stock + crypto 總和
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
    inflation: 0.02
  }
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AiPortfolioState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 合併預設值防禦
        return {
          portfolio: {
            ...DEFAULT_STATE.portfolio,
            ...(parsed.portfolio || {})
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

  const updatePortfolioAsset = (key: keyof Omit<Portfolio, 'history'>, value: number) => {
    setState(prev => {
      const updatedPortfolio = {
        ...prev.portfolio,
        [key]: Math.max(0, value)
      };
      
      // 動態更新歷史紀錄中的最後一筆，使其對齊最新的資產加總
      const netWorthSum = 
        updatedPortfolio.cash + 
        updatedPortfolio.fund + 
        updatedPortfolio.tw_stock + 
        updatedPortfolio.us_stock + 
        updatedPortfolio.crypto;
        
      const newHistory = [...updatedPortfolio.history];
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

  const addHistoryPoint = (date: string, netWorth: number) => {
    setState(prev => {
      const updatedHistory = [...prev.portfolio.history];
      const existIndex = updatedHistory.findIndex(p => p.date === date);
      if (existIndex >= 0) {
        updatedHistory[existIndex].net_worth = netWorth;
      } else {
        updatedHistory.push({ date, net_worth: netWorth });
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

  return (
    <AppContext.Provider
      value={{
        state,
        updatePortfolioAsset,
        updateAllocationTarget,
        updateRetirementConfig,
        addHistoryPoint,
        resetAll
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
