import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { LineChart } from '../components/LineChart';
import { StackedAreaChart } from '../components/StackedAreaChart';
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
  ArrowDownRight,
  Download,
  Upload,
  Database,
  CheckCircle,
  AlertCircle,
  CalendarPlus
} from 'lucide-react';

// 還原資料的欄位合法性校驗
const validateImportedState = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  if (!data.portfolio || !data.allocation_target || !data.retirement) return false;
  
  const { portfolio, allocation_target, retirement } = data;
  
  if (
    typeof portfolio.cash !== 'number' ||
    typeof portfolio.fund !== 'number' ||
    typeof portfolio.tw_stock !== 'number' ||
    typeof portfolio.us_stock !== 'number' ||
    typeof portfolio.crypto !== 'number' ||
    !Array.isArray(portfolio.history)
  ) return false;
  
  if (
    typeof allocation_target.tw_stock !== 'number' ||
    typeof allocation_target.us_stock !== 'number' ||
    typeof allocation_target.bond !== 'number' ||
    typeof allocation_target.cash !== 'number' ||
    typeof allocation_target.crypto !== 'number'
  ) return false;
  
  if (
    typeof retirement.age !== 'number' ||
    typeof retirement.monthly_spending !== 'number' ||
    typeof retirement.monthly_invest !== 'number' ||
    typeof retirement.expected_return !== 'number' ||
    typeof retirement.inflation !== 'number'
  ) return false;
  
  return true;
};

export const OverviewPage: React.FC = () => {
  const { state, importState, addGranularHistoryPoint } = useApp();
  const navigate = useNavigate();
  const { portfolio, allocation_target, retirement } = state;

  const [chartView, setChartView] = useState<'line' | 'stacked'>('line');
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 補記快照相關 State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalCash, setModalCash] = useState(0);
  const [modalFund, setModalFund] = useState(0);
  const [modalTwStock, setModalTwStock] = useState(0);
  const [modalUsStock, setModalUsStock] = useState(0);
  const [modalCrypto, setModalCrypto] = useState(0);
  const [modalMsg, setModalMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 開啟 Modal 並智慧預填
  const openSnapshotModal = () => {
    const history = portfolio.history;
    const latestPoint = history.length > 0 ? history[history.length - 1] : null;

    setModalDate(new Date().toISOString().split('T')[0]);
    setModalCash(latestPoint?.cash ?? portfolio.cash ?? 0);
    setModalFund(latestPoint?.fund ?? portfolio.fund ?? 0);
    setModalTwStock(latestPoint?.tw_stock ?? portfolio.tw_stock ?? 0);
    setModalUsStock(latestPoint?.us_stock ?? portfolio.us_stock ?? 0);
    setModalCrypto(latestPoint?.crypto ?? portfolio.crypto ?? 0);
    setModalMsg(null);
    setIsModalOpen(true);
  };

  // 提交補記快照
  const handleModalSubmit = () => {
    if (!modalDate) {
      setModalMsg({ type: 'error', text: '❌ 請選擇正確的日期' });
      return;
    }

    if (modalCash < 0 || modalFund < 0 || modalTwStock < 0 || modalUsStock < 0 || modalCrypto < 0) {
      setModalMsg({ type: 'error', text: '❌ 資產金額不能為負數' });
      return;
    }

    // 檢查日期重疊
    const isDuplicate = portfolio.history.some(p => p.date === modalDate);
    if (isDuplicate) {
      const confirmOverwrite = window.confirm(`⚠️ 日期 [${modalDate}] 已存在歷史快照記錄。是否確定要覆寫該日期的細分資產數據？`);
      if (!confirmOverwrite) return;
    }

    // 呼叫 Context 方法
    addGranularHistoryPoint(modalDate, {
      cash: Math.round(modalCash),
      fund: Math.round(modalFund),
      tw_stock: Math.round(modalTwStock),
      us_stock: Math.round(modalUsStock),
      crypto: Math.round(modalCrypto)
    });

    // 成功通知
    setBackupMsg({ type: 'success', text: `🎉 歷史快照 [${modalDate}] 登錄成功！` });
    setIsModalOpen(false);
    setTimeout(() => setBackupMsg(null), 4000);
  };

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

  // 5. 偏離警示
  const deviationAlertMessage = useMemo(() => {
    if (totalNetWorth <= 0) return null;
    
    const actualPercents = {
      tw_stock: portfolio.tw_stock / totalNetWorth,
      us_stock: portfolio.us_stock / totalNetWorth,
      bond: portfolio.fund / totalNetWorth,
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

  // 備份匯出處理
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai_portfolio_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setBackupMsg({ type: 'success', text: '💾 備份檔案已成功匯出並下載！' });
      setTimeout(() => setBackupMsg(null), 4000);
    } catch (e) {
      setBackupMsg({ type: 'error', text: '❌ 匯出備份失敗，請稍後再試。' });
      setTimeout(() => setBackupMsg(null), 4000);
    }
  };

  // 備份導入還原處理
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') return;
        const parsed = JSON.parse(text);
        
        if (validateImportedState(parsed)) {
          const confirmRestore = window.confirm(
            '⚠️ 警告：還原此備份將會完全覆蓋您目前的資產資料、目標比例與退休規劃參數，此操作無法復原。是否確定繼續？'
          );
          if (confirmRestore) {
            importState(parsed);
            setBackupMsg({ type: 'success', text: '🎉 資料已成功還原！網頁將立即重新整理。' });
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          }
        } else {
          setBackupMsg({ type: 'error', text: '❌ 備份檔格式無效，請確保上傳的是正確的備份 JSON。' });
          setTimeout(() => setBackupMsg(null), 5000);
        }
      } catch (err) {
        setBackupMsg({ type: 'error', text: '❌ 讀取備份檔案失敗，JSON 解析錯誤。' });
        setTimeout(() => setBackupMsg(null), 5000);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

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
        
        {/* 左側：資產成長趨勢折線圖 / 堆疊面積圖 */}
        <div className="lg:col-span-2">
          <Card hoverEffect={false} className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">資產歷史趨勢</h2>
                <p className="text-xs font-semibold text-slate-400">
                  {chartView === 'line' ? '展示最近歷史記點的本金與複利累積實況' : '細分資產在各個歷史快照的消長結構'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* 📝 補記歷史快照按鈕 */}
                <button
                  onClick={openSnapshotModal}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[10px] font-black cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  補記快照
                </button>

                {/* 雙視角 Segmented Control */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 text-[10px] font-bold select-none">
                  <button
                    onClick={() => setChartView('line')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      chartView === 'line'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📈 淨資產趨勢
                  </button>
                  <button
                    onClick={() => setChartView('stacked')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      chartView === 'stacked'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📊 資產消長
                  </button>
                </div>
                
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </span>
              </div>
            </div>
            
            <div className="flex-1 min-h-[280px] flex items-center">
              {chartView === 'line' ? (
                <LineChart 
                  data={portfolio.history} 
                  xKey="date" 
                  lines={[{ key: 'net_worth', name: '淨資產淨值', stroke: '#3b82f6' }]} 
                />
              ) : (
                <StackedAreaChart 
                  data={portfolio.history} 
                  xKey="date" 
                />
              )}
            </div>
          </Card>
        </div>

        {/* 右側：被動投資宣導 + 數據備份與還原 */}
        <div className="flex flex-col gap-6">
          {/* 上部：宣導卡片 */}
          <Card hoverEffect={false} className="flex flex-col bg-slate-900 border-transparent text-slate-200">
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

          {/* 下部：資料安全與備份控制面板 */}
          <Card hoverEffect={false} className="flex flex-col bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-md">
            <div className="flex items-center gap-3 mb-4 select-none">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Database className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-black text-slate-800">資料安全與備份控制台</h2>
                <p className="text-[10px] text-slate-400 font-bold">本地數據一鍵下載與備份還原</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] leading-relaxed text-slate-500">
                由於目前數據安全儲存於您的瀏覽器本地空間，建議定期下載備份檔案以防資產歷史丟失。
              </p>

              {backupMsg && (
                <div className={`p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 select-none ${
                  backupMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                }`}>
                  {backupMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span>{backupMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1.5">
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-black cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                >
                  <Download className="w-3.5 h-3.5" />
                  匯出備份 (JSON)
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-black cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  導入備份檔案
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImport}
                  accept=".json"
                  className="hidden"
                />
              </div>
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

      {/* 補記歷史快照 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xl rounded-2xl max-w-md w-full overflow-hidden p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 select-none">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <CalendarPlus className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-black text-slate-800">📝 補記歷史快照</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {modalMsg && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{modalMsg.text}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* 日期欄位 */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">選擇快照日期</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* 資產明細欄位 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">💵 現金 (TWD)</label>
                  <input
                    type="number"
                    value={modalCash || ''}
                    onChange={(e) => setModalCash(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">📈 基金/債券 (TWD)</label>
                  <input
                    type="number"
                    value={modalFund || ''}
                    onChange={(e) => setModalFund(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">🇹🇼 台灣股票 (TWD)</label>
                  <input
                    type="number"
                    value={modalTwStock || ''}
                    onChange={(e) => setModalTwStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">🇺🇸 美國股票 (TWD)</label>
                  <input
                    type="number"
                    value={modalUsStock || ''}
                    onChange={(e) => setModalUsStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">🪙 加密貨幣 (TWD)</label>
                  <input
                    type="number"
                    value={modalCrypto || ''}
                    onChange={(e) => setModalCrypto(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* 智慧預填與防禦說明 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-[10px] text-slate-500 leading-relaxed space-y-1">
                <p className="font-bold text-slate-600">💡 系統智慧快照邏輯：</p>
                <ul className="list-disc pl-3.5 space-y-0.5 font-semibold">
                  <li>智慧預填：自動套用上一期歷史快照做為預填底稿。</li>
                  <li>最新同步：補記今天或新日期，會同步更新當前實際資產。</li>
                  <li>漏帳不污染：補記過去歷史漏帳時，僅寫入 history，不污染當前資產現值。</li>
                </ul>
              </div>

              {/* 按鈕操作區 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleModalSubmit}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer transition-all shadow-sm"
                >
                  確認儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
