import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { LineChart } from '../components/LineChart';
import { AlertBanner } from '../components/AlertBanner';
import { calculateTotalPortfolioValue } from '../utils/rebalance';
import { 
  TrendingUp, 
  Layers, 
  RefreshCw, 
  Calculator, 
  Eye, 
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  const { portfolio, allocation_target, retirement } = state;

  // 1. 淨資產計算
  const totalNetWorth = useMemo(() => {
    return calculateTotalPortfolioValue(portfolio);
  }, [portfolio]);

  // 2. 月增減計算 (與 history 倒數第二筆比對)
  const monthlyChange = useMemo(() => {
    const history = portfolio.history;
    if (history.length < 2) return { amount: 0, percent: 0 };
    const latest = history[history.length - 1].net_worth;
    const prev = history[history.length - 2].net_worth;
    const amount = latest - prev;
    const percent = prev > 0 ? (amount / prev) * 100 : 0;
    return { amount, percent };
  }, [portfolio.history]);

  // 3. 年化報酬率 (CAGR 粗略估算)
  const cagrReturn = useMemo(() => {
    const history = portfolio.history;
    if (history.length < 2) return 0;
    
    const startPoint = history[0];
    const endPoint = history[history.length - 1];
    
    const startDate = new Date(startPoint.date);
    const endDate = new Date(endPoint.date);
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    if (diffYears < 0.05 || startPoint.net_worth <= 0) {
      // 時間太短，改算簡單收益率
      return ((endPoint.net_worth - startPoint.net_worth) / startPoint.net_worth);
    }
    
    const cagr = Math.pow(endPoint.net_worth / startPoint.net_worth, 1 / diffYears) - 1;
    return cagr;
  }, [portfolio.history]);

  // 4. FIRE 進度計算 (FIRE 目標 = monthly_spending * 12 * 25)
  const fireTarget = useMemo(() => {
    return retirement.monthly_spending * 12 * 25;
  }, [retirement.monthly_spending]);

  const firePercent = useMemo(() => {
    if (fireTarget <= 0) return 0;
    return (totalNetWorth / fireTarget) * 100;
  }, [totalNetWorth, fireTarget]);

  // 5. 偏離警示：檢查當前資產佔比與目標配置是否有大於 5% (0.05) 的偏離
  const deviationAlertMessage = useMemo(() => {
    if (totalNetWorth <= 0) return null;
    
    const actualPercents = {
      tw_stock: portfolio.tw_stock / totalNetWorth,
      us_stock: portfolio.us_stock / totalNetWorth,
      bond: portfolio.fund / totalNetWorth, // 基金/債券映射至目標 bond
      cash: portfolio.cash / totalNetWorth,
      crypto: portfolio.crypto / totalNetWorth
    };

    const deviations = [
      { name: '台灣股票', diff: actualPercents.tw_stock - allocation_target.tw_stock },
      { name: '美國股票', diff: actualPercents.us_stock - allocation_target.us_stock },
      { name: '基金/債券', diff: actualPercents.bond - allocation_target.bond },
      { name: '現金', diff: actualPercents.cash - allocation_target.cash },
      { name: '加密貨幣', diff: actualPercents.crypto - allocation_target.crypto }
    ];

    // 篩選出偏差絕對值 >= 5% 的項目
    const highDeviations = deviations.filter(d => Math.abs(d.diff) >= 0.05);
    
    if (highDeviations.length > 0) {
      const itemsStr = highDeviations.map(d => {
        const sign = d.diff > 0 ? '+' : '';
        return `${d.name}偏離了 ${sign}${(d.diff * 100).toFixed(1)}%`;
      }).join('、');
      return `⚠️ 配置偏離提示：您的實際配置中 ${itemsStr}。偏離幅度已達 5% 門檻，建議前往「再平衡」頁面進行優化調整。`;
    }

    return null;
  }, [portfolio, allocation_target, totalNetWorth]);

  return (
    <div className="space-y-8 animate-fade-in duration-300">
      
      {/* 財務摘要列 (Overview Bar) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 select-none">
        
        {/* 淨資產 */}
        <Card hoverEffect={false} className="flex flex-col justify-center border-l-4 border-l-blue-500">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">最新淨資產 (TWD)</span>
          <span className="text-2xl font-black text-slate-800 tracking-tight mt-1">
            ${totalNetWorth.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 font-bold mt-1">即時資產市值加總</span>
        </Card>

        {/* 月增減 */}
        <Card hoverEffect={false} className="flex flex-col justify-center border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">本月資產增減</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-2xl font-black tracking-tight ${monthlyChange.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {monthlyChange.amount >= 0 ? '+' : ''}${monthlyChange.amount.toLocaleString()}
            </span>
            <span className={`text-xs font-bold flex items-center ${monthlyChange.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {monthlyChange.amount >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {monthlyChange.percent.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold mt-1">與上一次淨值歷史比較</span>
        </Card>

        {/* 年化報酬率 */}
        <Card hoverEffect={false} className="flex flex-col justify-center border-l-4 border-l-indigo-500">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CAGR 歷史年化報酬</span>
          <span className="text-2xl font-black text-indigo-600 tracking-tight mt-1">
            {(cagrReturn * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 font-bold mt-1">由歷史首尾淨值點幾何精算</span>
        </Card>

        {/* FIRE 進度 */}
        <Card hoverEffect={false} className="flex flex-col justify-center lg:col-span-2 border-l-4 border-l-teal-500">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">FIRE 目標進度</span>
          <div className="mt-2.5">
            <ProgressBar value={firePercent} showText={true} />
          </div>
          <span className="text-[10px] text-slate-400 font-bold mt-1">目標資產：${fireTarget.toLocaleString()} 元</span>
        </Card>

      </div>

      {/* 偏離警告橫幅 */}
      {deviationAlertMessage && (
        <AlertBanner type="warning" message={deviationAlertMessage} />
      )}

      {/* 中間主要圖表區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左側：資產成長趨勢折線圖 */}
        <div className="lg:col-span-2">
          <Card hoverEffect={false} className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">淨資產成長軌跡</h2>
                <p className="text-xs font-semibold text-slate-400">展示最近歷史記點的本金與複利累積實況</p>
              </div>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </span>
            </div>
            
            <div className="flex-1 min-h-[280px] flex items-center">
              <LineChart 
                data={portfolio.history} 
                xKey="date" 
                lines={[{ key: 'net_worth', name: '淨資產淨值', stroke: '#3b82f6' }]} 
              />
            </div>
          </Card>
        </div>

        {/* 右側：被動投資哲學宣導與概覽說明 */}
        <div>
          <Card hoverEffect={false} className="flex flex-col h-full bg-slate-900 border-transparent text-slate-200">
            <div className="mb-6">
              <h2 className="text-base font-bold text-white">經典指數化配置戰略</h2>
              <p className="text-xs text-slate-400 mt-1">傳承長期持有與鐵律再平衡的資產防禦板塊</p>
            </div>
            
            <div className="space-y-4 flex-1 text-xs leading-relaxed text-slate-300">
              <p>
                本系統將您的總體淨資產細分為五大核心投資類別，並依照您的風險屬性要求嚴格實施「目標比例追蹤」。
              </p>
              <p>
                指數化被動投資成功的基石，並非尋求超額報酬，而是透過將資金分佈於全球股市與避險載體中，依靠**低成本的 ETF 樂高式套用**以及**定期定量的紀律再平衡**，抹平波動，實現家庭資產長期穩定增值。
              </p>
              <p className="border-t border-slate-800 pt-4 text-[10px] text-slate-500 font-semibold">
                提示：如當前財務指標出現「偏離警示」，代表個別資產已產生漂移，請前往平衡控制台調整以規避過度風險。
              </p>
            </div>
          </Card>
        </div>

      </div>

      {/* 四大入口卡片區 */}
      <div>
        <div className="flex flex-col mb-4 select-none">
          <h2 className="text-base font-bold text-slate-800">資產戰情室入口</h2>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">點擊下方卡片即可直接跳轉至各功能模組進行精算</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. 資產配置 */}
          <Card 
            onClick={() => navigate('/allocation')}
            className="group cursor-pointer hover:border-blue-300/80"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Layers className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">ALLOCATION</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">資產配置比例盤</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">
              對照當前實際資產與目標比例的偏離，一鍵調整風險模式 (保守/穩健/積極/進取)。
            </p>
          </Card>

          {/* 2. 再平衡 */}
          <Card 
            onClick={() => navigate('/rebalance')}
            className="group cursor-pointer hover:border-emerald-300/80"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <RefreshCw className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-full group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">REBALANCE</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">三軌再平衡控制台</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">
              實作精準平衡、新資金只買不賣、以及偏離門檻三種智慧再平衡模型，生成買賣指引。
            </p>
          </Card>

          {/* 3. 退休規劃 */}
          <Card 
            onClick={() => navigate('/retirement')}
            className="group cursor-pointer hover:border-indigo-300/80"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <Calculator className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">RETIREMENT</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">蒙地卡羅退休財務</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">
              透過 1000 次 Box-Muller 隨機複利模擬，精算各年齡退休可行度及成功率。
            </p>
          </Card>

          {/* 4. 情境模擬 */}
          <Card 
            onClick={() => navigate('/scenario')}
            className="group cursor-pointer hover:border-purple-300/80"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <Eye className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-full group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">SCENARIO</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors">黑天鵝極端情境預演</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">
              即時預演市場暴跌、美股暴漲、匯率劇烈波動及惡性通膨對您的資產版圖之影響。
            </p>
          </Card>

        </div>
      </div>

      {/* 底部輔助工具入口 */}
      <div className="flex justify-center select-none pt-4">
        <button
          onClick={() => navigate('/order')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-[1.01]"
        >
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          開啟「即時下單股數計算輔助器」
        </button>
      </div>

    </div>
  );
};
