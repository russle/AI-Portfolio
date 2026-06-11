/**
 * 智慧前端即時報價服務 (Price Fetcher)
 * 透過 Allorigins 免費 CORS 代理繞過瀏覽器限制，拉取 Yahoo Finance Chart API 報價
 */

// 自動優化代碼格式
export const formatSymbol = (symbol: string): string => {
  const clean = symbol.trim().toUpperCase();
  
  // 台股優化：如果全是數字，例如 "0050" -> 自動補上 ".TW"
  if (/^\d+$/.test(clean)) {
    return `${clean}.TW`;
  }
  
  // 加密貨幣優化：若輸入 "BTC" 或 "ETH" -> 可對應 Yahoo 報價 "BTC-USD", "ETH-USD"
  if (clean === 'BTC' || clean === 'ETH' || clean === 'SOL') {
    return `${clean}-USD`;
  }

  return clean;
};

const CACHE_KEY = 'ticker_prices_cache';
const TTL = 15 * 60 * 1000; // 15 分鐘快取 (毫秒)

// 取得快取資料
const getCachedPrices = (): Record<string, { price: number; timestamp: number }> => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// 儲存快取資料
const saveCachedPrices = (cache: Record<string, { price: number; timestamp: number }>) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save price cache to LocalStorage:', error);
  }
};

/**
 * 批次抓取多個標的的最新即時價格（具備 15 分鐘 TTL 本地快取）
 */
export const fetchLatestPrices = async (symbols: string[]): Promise<Record<string, number | null>> => {
  const result: Record<string, number | null> = {};
  
  // 初始化為 null
  symbols.forEach(sym => {
    result[sym] = null;
  });

  if (symbols.length === 0) return result;

  const now = Date.now();
  const cache = getCachedPrices();
  const missingSymbols: string[] = [];

  // 1. 優先從本地快取加載未過期價格
  symbols.forEach(sym => {
    const formatted = formatSymbol(sym);
    const cached = cache[formatted];
    if (cached && (now - cached.timestamp < TTL) && typeof cached.price === 'number') {
      result[sym] = cached.price;
    } else {
      missingSymbols.push(sym);
    }
  });

  // 2. 如果沒有缺失價格，直接返回
  if (missingSymbols.length === 0) {
    return result;
  }

  // 3. 發起批次網路請求抓取缺失價格
  try {
    const formattedSymbols = missingSymbols.map(sym => formatSymbol(sym));
    const targetUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${formattedSymbols.join(',')}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10秒超時防禦

    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(id);

    if (!res.ok) {
      console.warn(`Batch Price Fetch API responded with error for symbols:`, formattedSymbols);
      return result;
    }

    const data = await res.json();
    if (!data || !data.contents) {
      return result;
    }

    const contents = JSON.parse(data.contents);
    const newCache = getCachedPrices(); // 再次讀取快取以防並發覆寫

    if (contents && contents.quoteResponse && contents.quoteResponse.result) {
      const items = contents.quoteResponse.result;
      items.forEach((item: { symbol: string; regularMarketPrice?: number }) => {
        const price = item.regularMarketPrice;
        const origSymbol = missingSymbols.find(sym => formatSymbol(sym) === item.symbol);
        if (origSymbol && typeof price === 'number') {
          result[origSymbol] = price;
          const formatted = formatSymbol(origSymbol);
          newCache[formatted] = {
            price,
            timestamp: now
          };
        }
      });
      saveCachedPrices(newCache);
    }

    return result;
  } catch (error) {
    console.error(`Failed to batch fetch prices:`, error);
    return result;
  }
};

/**
 * 抓取單一標的的最新即時價格 (優先調用批次快取機制)
 */
export const fetchLatestPrice = async (symbol: string): Promise<number | null> => {
  try {
    const result = await fetchLatestPrices([symbol]);
    return result[symbol] ?? null;
  } catch (error) {
    console.error(`Failed to fetch price for symbol [${symbol}]:`, error);
    return null;
  }
};
