import React, { createContext, useContext, useState, useEffect } from 'react';

// 推薦 ETF 地圖的區域定義
export type RegionType = 'global' | 'us' | 'europe' | 'asia' | 'emerging';

export interface AppState {
  stockPercent: number;
  selectedRegion: RegionType;
  // B1 財務規劃
  currentAge: number;
  retireAge: number;
  monthlyExpense: number;
  initialPV: number;
  annualPMT: number;
  // B2 心理壓力確認狀態
  isStressConfirmed: boolean;
  // C1 & C2 樂高配置與下單
  selectedLegoType: 'simple' | 'refined' | 'diverse' | 'custom';
  targetWeights: { [symbol: string]: number };
  investAmtTWD: number;
  exchangeRate: number;
  etfPrices: { [symbol: string]: number };
  etfCurrencies: { [symbol: string]: 'USD' | 'TWD' }; // 新增計價幣別地圖
  etfAssetClasses: { [symbol: string]: 'stock' | 'bond' }; // 新增資產類型地圖
  // D1 再平衡
  actualHoldings: { [symbol: string]: number };
  // 每日最新市價與匯率的自動更新日期
  lastMarketUpdateDate?: string;
  // B1 多元提領法則
  withdrawalStrategy: 'trinity' | 'guyton_klinger' | 'die_to_zero';
  retirementYears: number;
}

interface AppContextProps extends AppState {
  setStockPercent: (percent: number) => void;
  setSelectedRegion: (region: RegionType) => void;
  setCurrentAge: (age: number) => void;
  setRetireAge: (age: number) => void;
  setMonthlyExpense: (expense: number) => void;
  setInitialPV: (pv: number) => void;
  setAnnualPMT: (pmt: number) => void;
  setIsStressConfirmed: (confirmed: boolean) => void;
  applyLegoPortfolio: (type: 'simple' | 'refined' | 'diverse') => void;
  setTargetWeight: (symbol: string, weight: number) => void;
  setInvestAmtTWD: (amt: number) => void;
  setExchangeRate: (rate: number) => void;
  setEtfPrice: (symbol: string, price: number) => void;
  setEtfCurrency: (symbol: string, currency: 'USD' | 'TWD') => void; // 新增設定標的幣別
  setEtfAssetClass: (symbol: string, assetClass: 'stock' | 'bond') => void; // 新增設定資產類型
  removeCustomEtf: (symbol: string) => void; // 新增移除自訂標的
  resetEtfPrices: () => void;
  setActualHolding: (symbol: string, shares: number) => void;
  resetAll: () => void;
  setWithdrawalStrategy: (strategy: 'trinity' | 'guyton_klinger' | 'die_to_zero') => void;
  setRetirementYears: (years: number) => void;
  // 背景更新價格狀態與函式
  isMarketUpdating: boolean;
  fetchLatestMarketData: (force?: boolean) => Promise<boolean>;
}


const DEFAULT_ETF_PRICES = {
  VT: 120.5,
  BNDW: 74.2,
  VTI: 260.8,
  VXUS: 62.4,
  BND: 72.5,
  BNDX: 48.9,
  VNQ: 85.3,
  DBC: 22.1
};

const DEFAULT_ETF_CURRENCIES: { [symbol: string]: 'USD' | 'TWD' } = {
  VT: 'USD',
  BNDW: 'USD',
  VTI: 'USD',
  VXUS: 'USD',
  BND: 'USD',
  BNDX: 'USD',
  VNQ: 'USD',
  DBC: 'USD'
};

const DEFAULT_ETF_ASSET_CLASSES: { [symbol: string]: 'stock' | 'bond' } = {
  VT: 'stock',
  BNDW: 'bond',
  VTI: 'stock',
  VXUS: 'stock',
  BND: 'bond',
  BNDX: 'bond',
  VNQ: 'stock',
  DBC: 'stock'
};

const DEFAULT_TARGET_WEIGHTS = {
  VT: 0.70,
  BNDW: 0.30
};

const DEFAULT_ACTUAL_HOLDINGS = {
  VT: 1200,
  BNDW: 600,
  VTI: 0,
  VXUS: 0,
  BND: 0,
  BNDX: 0,
  VNQ: 0,
  DBC: 0
};

const LOCAL_STORAGE_KEY = 'green角_portfolio_state';

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. 初始化狀態（優先從 localStorage 讀取）
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 合併預設值以防新欄位缺失
        return {
          stockPercent: parsed.stockPercent ?? 60,
          selectedRegion: parsed.selectedRegion ?? 'global',
          currentAge: parsed.currentAge ?? 30,
          retireAge: parsed.retireAge ?? 60,
          monthlyExpense: parsed.monthlyExpense ?? 50000,
          initialPV: parsed.initialPV ?? 1000000,
          annualPMT: parsed.annualPMT ?? 240000,
          isStressConfirmed: parsed.isStressConfirmed ?? false,
          selectedLegoType: parsed.selectedLegoType ?? 'simple',
          targetWeights: parsed.targetWeights ?? DEFAULT_TARGET_WEIGHTS,
          investAmtTWD: parsed.investAmtTWD ?? 300000,
          exchangeRate: parsed.exchangeRate ?? 32.2,
          etfPrices: parsed.etfPrices ?? DEFAULT_ETF_PRICES,
          etfCurrencies: parsed.etfCurrencies ?? DEFAULT_ETF_CURRENCIES, // 自訂幣別初始化
          etfAssetClasses: parsed.etfAssetClasses ?? DEFAULT_ETF_ASSET_CLASSES, // 自訂資產類型初始化
          actualHoldings: parsed.actualHoldings ?? DEFAULT_ACTUAL_HOLDINGS,
          lastMarketUpdateDate: parsed.lastMarketUpdateDate ?? undefined,
          withdrawalStrategy: parsed.withdrawalStrategy ?? 'trinity',
          retirementYears: parsed.retirementYears ?? 30
        };
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }

    return {
      stockPercent: 60,
      selectedRegion: 'global',
      currentAge: 30,
      retireAge: 60,
      monthlyExpense: 50000,
      initialPV: 1000000,
      annualPMT: 240000,
      isStressConfirmed: false,
      selectedLegoType: 'simple',
      targetWeights: DEFAULT_TARGET_WEIGHTS,
      investAmtTWD: 300000,
      exchangeRate: 32.2,
      etfPrices: DEFAULT_ETF_PRICES,
      etfCurrencies: DEFAULT_ETF_CURRENCIES,
      etfAssetClasses: DEFAULT_ETF_ASSET_CLASSES,
      actualHoldings: DEFAULT_ACTUAL_HOLDINGS,
      withdrawalStrategy: 'trinity',
      retirementYears: 30
    };
  });


  // 2. 將任何狀態改變存入 localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // 3. 各項狀態 setter 封裝
  const setStockPercent = (percent: number) => {
    setState(prev => {
      const newStockPercent = percent;
      const newBondPercent = 100 - percent;
      
      // 計算目前配置的總目標權重
      const totalWeight = Object.values(prev.targetWeights).reduce((sum, w) => sum + w, 0);
      let newWeights = { ...prev.targetWeights };
      
      // 如果總目標權重剛好為 100% (容許極小誤差)
      if (Math.abs(totalWeight - 1.0) < 0.001) {
        let currentStockWeightSum = 0;
        let currentBondWeightSum = 0;
        
        Object.entries(prev.targetWeights).forEach(([symbol, weight]) => {
          const assetClass = prev.etfAssetClasses[symbol] || 'stock';
          if (assetClass === 'stock') {
            currentStockWeightSum += weight;
          } else {
            currentBondWeightSum += weight;
          }
        });
        
        const targetStockWeight = newStockPercent / 100;
        const targetBondWeight = newBondPercent / 100;
        
        Object.keys(prev.targetWeights).forEach((symbol) => {
          const weight = prev.targetWeights[symbol];
          const assetClass = prev.etfAssetClasses[symbol] || 'stock';
          
          if (assetClass === 'stock') {
            if (currentStockWeightSum > 0) {
              newWeights[symbol] = parseFloat(((weight / currentStockWeightSum) * targetStockWeight).toFixed(4));
            } else if (symbol === 'VT' || symbol === 'VTI') {
              newWeights[symbol] = targetStockWeight;
            }
          } else {
            if (currentBondWeightSum > 0) {
              newWeights[symbol] = parseFloat(((weight / currentBondWeightSum) * targetBondWeight).toFixed(4));
            } else if (symbol === 'BNDW' || symbol === 'BND') {
              newWeights[symbol] = targetBondWeight;
            }
          }
        });
      }
      
      return {
        ...prev,
        stockPercent: percent,
        targetWeights: newWeights,
        selectedLegoType: 'custom' // 調整滑桿後均設為自訂配置
      };
    });
  };

  const setSelectedRegion = (region: RegionType) => {
    setState(prev => ({ ...prev, selectedRegion: region }));
  };

  const setCurrentAge = (age: number) => {
    setState(prev => ({ ...prev, currentAge: Math.max(0, age) }));
  };

  const setRetireAge = (age: number) => {
    setState(prev => ({ ...prev, retireAge: Math.max(prev.currentAge, age) }));
  };

  const setMonthlyExpense = (expense: number) => {
    setState(prev => ({ ...prev, monthlyExpense: Math.max(0, expense) }));
  };

  const setInitialPV = (pv: number) => {
    setState(prev => ({ ...prev, initialPV: Math.max(0, pv) }));
  };

  const setAnnualPMT = (pmt: number) => {
    setState(prev => ({ ...prev, annualPMT: Math.max(0, pmt) }));
  };

  const setIsStressConfirmed = (confirmed: boolean) => {
    setState(prev => ({ ...prev, isStressConfirmed: confirmed }));
  };

  const setWithdrawalStrategy = (strategy: 'trinity' | 'guyton_klinger' | 'die_to_zero') => {
    setState(prev => ({ ...prev, withdrawalStrategy: strategy }));
  };

  const setRetirementYears = (years: number) => {
    setState(prev => ({ ...prev, retirementYears: Math.max(1, years) }));
  };

  const applyLegoPortfolio = (type: 'simple' | 'refined' | 'diverse') => {
    let weights: { [symbol: string]: number } = {};
    let stockPercent = 70;
    
    if (type === 'simple') {
      weights = { VT: 0.70, BNDW: 0.30 };
      stockPercent = 70;
    } else if (type === 'refined') {
      weights = { VTI: 0.40, VXUS: 0.30, BND: 0.20, BNDX: 0.10 };
      stockPercent = 70;
    } else if (type === 'diverse') {
      weights = { VTI: 0.35, VXUS: 0.25, BND: 0.20, VNQ: 0.10, DBC: 0.10 };
      stockPercent = 80; // VTI(35) + VXUS(25) + VNQ(10) + DBC(10) = 80
    }

    setState(prev => ({
      ...prev,
      selectedLegoType: type,
      targetWeights: weights,
      stockPercent: stockPercent,
    }));
  };

  const setTargetWeight = (symbol: string, weight: number) => {
    setState(prev => {
      const newWeights = { ...prev.targetWeights, [symbol]: Math.max(0, Math.min(1, weight)) };
      
      // 計算所有目標權重的總和
      const totalWeight = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
      let updatedStockPercent = prev.stockPercent;
      
      // 只有在加總剛好等於 100% 時，才更新股債比連動
      if (Math.abs(totalWeight - 1.0) < 0.001) {
        let stockWeightSum = 0;
        Object.entries(newWeights).forEach(([sym, w]) => {
          const assetClass = prev.etfAssetClasses[sym] || 'stock';
          if (assetClass === 'stock') {
            stockWeightSum += w;
          }
        });
        updatedStockPercent = Math.round(stockWeightSum * 100);
      }
      
      return {
        ...prev,
        targetWeights: newWeights,
        stockPercent: updatedStockPercent,
        selectedLegoType: 'custom'
      };
    });
  };

  const setInvestAmtTWD = (amt: number) => {
    setState(prev => ({ ...prev, investAmtTWD: Math.max(0, amt) }));
  };

  const setExchangeRate = (rate: number) => {
    setState(prev => ({ ...prev, exchangeRate: Math.max(0.1, rate) }));
  };

  const setEtfPrice = (symbol: string, price: number) => {
    setState(prev => ({
      ...prev,
      etfPrices: { ...prev.etfPrices, [symbol]: Math.max(0.01, price) }
    }));
  };

  const setEtfCurrency = (symbol: string, currency: 'USD' | 'TWD') => {
    setState(prev => ({
      ...prev,
      etfCurrencies: { ...prev.etfCurrencies, [symbol]: currency }
    }));
  };

  const setEtfAssetClass = (symbol: string, assetClass: 'stock' | 'bond') => {
    setState(prev => {
      const newClasses = { ...prev.etfAssetClasses, [symbol]: assetClass };
      
      // 屬性改變後，如果目前權重加總剛好等於 100%，也需要重新計算並連動 stockPercent
      const totalWeight = Object.values(prev.targetWeights).reduce((sum, w) => sum + w, 0);
      let updatedStockPercent = prev.stockPercent;
      
      if (Math.abs(totalWeight - 1.0) < 0.001) {
        let stockWeightSum = 0;
        Object.entries(prev.targetWeights).forEach(([sym, w]) => {
          const currentClass = newClasses[sym] || 'stock';
          if (currentClass === 'stock') {
            stockWeightSum += w;
          }
        });
        updatedStockPercent = Math.round(stockWeightSum * 100);
      }
      
      return {
        ...prev,
        etfAssetClasses: newClasses,
        stockPercent: updatedStockPercent
      };
    });
  };

  const removeCustomEtf = (symbol: string) => {
    setState(prev => {
      const newPrices = { ...prev.etfPrices };
      const newCurrencies = { ...prev.etfCurrencies };
      const newClasses = { ...prev.etfAssetClasses };
      const newHoldings = { ...prev.actualHoldings };
      const newTargetWeights = { ...prev.targetWeights };
      
      delete newPrices[symbol];
      delete newCurrencies[symbol];
      delete newClasses[symbol];
      delete newHoldings[symbol];
      delete newTargetWeights[symbol];

      // 重新計算剩下的目標權重總和與連動
      const totalWeight = Object.values(newTargetWeights).reduce((sum, w) => sum + w, 0);
      let updatedStockPercent = prev.stockPercent;
      
      if (Math.abs(totalWeight - 1.0) < 0.001) {
        let stockWeightSum = 0;
        Object.entries(newTargetWeights).forEach(([sym, w]) => {
          const assetClass = newClasses[sym] || 'stock';
          if (assetClass === 'stock') {
            stockWeightSum += w;
          }
        });
        updatedStockPercent = Math.round(stockWeightSum * 100);
      }

      return {
        ...prev,
        etfPrices: newPrices,
        etfCurrencies: newCurrencies,
        etfAssetClasses: newClasses,
        actualHoldings: newHoldings,
        targetWeights: newTargetWeights,
        stockPercent: updatedStockPercent
      };
    });
  };

  const resetEtfPrices = () => {
    setState(prev => ({
      ...prev,
      etfPrices: DEFAULT_ETF_PRICES,
      etfCurrencies: DEFAULT_ETF_CURRENCIES
    }));
  };

  const setActualHolding = (symbol: string, shares: number) => {
    setState(prev => ({
      ...prev,
      actualHoldings: { ...prev.actualHoldings, [symbol]: Math.max(0, shares) }
    }));
  };


  const [isMarketUpdating, setIsMarketUpdating] = useState(false);

  // 每日最新市場價格與匯率抓取實作 (Yahoo Finance & ER-API via CORS Proxy)
  const fetchLatestMarketData = async (force: boolean = false): Promise<boolean> => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 如果不是強制更新，且今天已經更新過了，就直接返回
    if (!force && state.lastMarketUpdateDate === todayStr) {
      console.log('Market data is already up-to-date for today:', todayStr);
      return false;
    }
    
    setIsMarketUpdating(true);
    let updatedExchangeRate = state.exchangeRate;
    const newPrices = { ...state.etfPrices };
    let updatedPriceCount = 0;

    try {
      // 1. 抓取最新匯率 (USD/TWD) - 每日更新一次，支持 CORS
      try {
        const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (rateRes.ok) {
          const rateData = await rateRes.json();
          if (rateData?.rates?.TWD) {
            updatedExchangeRate = parseFloat(parseFloat(rateData.rates.TWD).toFixed(2));
          }
        }
      } catch (err) {
        console.warn('Failed to fetch latest exchange rate, using current rate.', err);
      }

      // 2. 抓取各 ETF 最新價格 (利用 Yahoo Finance + AllOrigins CORS proxy)
      const symbols = Object.keys(newPrices);
      await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
            
            const res = await fetch(proxyUrl);
            if (res.ok) {
              const proxyData = await res.json();
              if (proxyData?.contents) {
                const parsed = JSON.parse(proxyData.contents);
                const price = parsed?.chart?.result?.[0]?.meta?.regularMarketPrice;
                if (price && typeof price === 'number') {
                  newPrices[symbol] = parseFloat(price.toFixed(2));
                  updatedPriceCount++;
                }
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch price for ${symbol}, using current price.`, err);
          }
        })
      );

      // 更新狀態與日期戳記
      setState(prev => ({
        ...prev,
        exchangeRate: updatedExchangeRate,
        etfPrices: newPrices,
        lastMarketUpdateDate: todayStr
      }));
      
      setIsMarketUpdating(false);
      return true;
    } catch (err) {
      console.error('Error in fetchLatestMarketData:', err);
      setIsMarketUpdating(false);
      return false;
    }
  };

  // 當 App 加載後，在背景延遲執行自動更新（僅在今天尚未更新過時觸發）
  useEffect(() => {
    const autoUpdate = async () => {
      // 延遲 3.5 秒背景執行，確保全站首頁渲染流暢
      await new Promise(resolve => setTimeout(resolve, 3500));
      fetchLatestMarketData(false);
    };
    autoUpdate();
  }, []);

  const resetAll = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setState({
      stockPercent: 60,
      selectedRegion: 'global',
      currentAge: 30,
      retireAge: 60,
      monthlyExpense: 50000,
      initialPV: 1000000,
      annualPMT: 240000,
      isStressConfirmed: false,
      selectedLegoType: 'simple',
      targetWeights: DEFAULT_TARGET_WEIGHTS,
      investAmtTWD: 300000,
      exchangeRate: 32.2,
      etfPrices: DEFAULT_ETF_PRICES,
      etfCurrencies: DEFAULT_ETF_CURRENCIES,
      etfAssetClasses: DEFAULT_ETF_ASSET_CLASSES,
      actualHoldings: DEFAULT_ACTUAL_HOLDINGS,
      lastMarketUpdateDate: undefined,
      withdrawalStrategy: 'trinity',
      retirementYears: 30
    });
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        setStockPercent,
        setSelectedRegion,
        setCurrentAge,
        setRetireAge,
        setMonthlyExpense,
        setInitialPV,
        setAnnualPMT,
        setIsStressConfirmed,
        applyLegoPortfolio,
        setTargetWeight,
        setInvestAmtTWD,
        setExchangeRate,
        setEtfPrice,
        setEtfCurrency,
        setEtfAssetClass,
        removeCustomEtf,
        resetEtfPrices,
        setActualHolding,
        resetAll,
        setWithdrawalStrategy,
        setRetirementYears,
        isMarketUpdating,
        fetchLatestMarketData
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
