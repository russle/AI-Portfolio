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
  // D1 再平衡
  actualHoldings: { [symbol: string]: number };
  // 每日最新市價與匯率的自動更新日期
  lastMarketUpdateDate?: string;
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
  resetEtfPrices: () => void;
  setActualHolding: (symbol: string, shares: number) => void;
  resetAll: () => void;
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
          actualHoldings: parsed.actualHoldings ?? DEFAULT_ACTUAL_HOLDINGS,
          lastMarketUpdateDate: parsed.lastMarketUpdateDate ?? undefined
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
      actualHoldings: DEFAULT_ACTUAL_HOLDINGS
    };
  });

  // 2. 將任何狀態改變存入 localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // 3. 各項狀態 setter 封裝
  const setStockPercent = (percent: number) => {
    setState(prev => ({
      ...prev,
      stockPercent: percent,
      // 如果調整了股債比，如果當前是樂高配置，將其設為自訂配置 (因為目標比重與預設樂高不同了)
      selectedLegoType: prev.selectedLegoType !== 'custom' ? 'custom' : 'custom'
    }));
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

  const applyLegoPortfolio = (type: 'simple' | 'refined' | 'diverse') => {
    let weights: { [symbol: string]: number } = {};
    
    if (type === 'simple') {
      weights = { VT: 0.70, BNDW: 0.30 };
    } else if (type === 'refined') {
      weights = { VTI: 0.40, VXUS: 0.30, BND: 0.20, BNDX: 0.10 };
    } else if (type === 'diverse') {
      weights = { VTI: 0.35, VXUS: 0.25, BND: 0.20, VNQ: 0.10, DBC: 0.10 };
    }

    setState(prev => ({
      ...prev,
      selectedLegoType: type,
      targetWeights: weights,
      stockPercent: 70, // 樂高模組預設都是 70% 股票比重
    }));
  };

  const setTargetWeight = (symbol: string, weight: number) => {
    setState(prev => {
      const newWeights = { ...prev.targetWeights, [symbol]: Math.max(0, Math.min(1, weight)) };
      return {
        ...prev,
        targetWeights: newWeights,
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

  const resetEtfPrices = () => {
    setState(prev => ({
      ...prev,
      etfPrices: DEFAULT_ETF_PRICES
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
      actualHoldings: DEFAULT_ACTUAL_HOLDINGS,
      lastMarketUpdateDate: undefined
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
        resetEtfPrices,
        setActualHolding,
        resetAll,
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
