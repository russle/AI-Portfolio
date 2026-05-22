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

/**
 * 抓取單一標的的最新即時價格 (TWD 或 USD，依標的本身而定)
 */
export const fetchLatestPrice = async (symbol: string): Promise<number | null> => {
  try {
    const formatted = formatSymbol(symbol);
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${formatted}`;
    
    // 使用 allorigins 作為免費、無須憑證的 CORS 代理
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    // 設置 8 秒超時防禦
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(id);

    if (!res.ok) {
      console.warn(`Price Fetch API responded with error for ${formatted}`);
      return null;
    }

    const data = await res.json();
    if (!data || !data.contents) {
      return null;
    }

    // 解析 contents 中包裝的 Yahoo Finance 真實 JSON
    const contents = JSON.parse(data.contents);
    
    if (
      contents &&
      contents.chart &&
      contents.chart.result &&
      contents.chart.result.length > 0
    ) {
      const meta = contents.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      
      if (typeof price === 'number') {
        return price;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to fetch price for symbol [${symbol}]:`, error);
    return null;
  }
};
