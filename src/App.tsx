import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { OverviewPage } from './pages/OverviewPage';
import { AllocationPage } from './pages/AllocationPage';
import { RebalancePage } from './pages/RebalancePage';
import { RetirementPage } from './pages/RetirementPage';
import { OrderPage } from './pages/OrderPage';
import { ScenarioPage } from './pages/ScenarioPage';
import { 
  PieChart, 
  Database, 
  RefreshCw, 
  TrendingUp, 
  Scale, 
  Percent, 
  ShieldAlert, 
  Compass, 
  Menu, 
  X,
  DollarSign
} from 'lucide-react';

// 全站 Navbar 導航與狀態燈元件
const Navbar: React.FC = () => {
  const { resetAll } = useApp();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 監聽 localStorage 改變，模擬儲存成功
  useEffect(() => {
    const handleSave = () => {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        setSaveStatus('saved');
      }, 500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('storage', handleSave);
    handleSave();
    return () => window.removeEventListener('storage', handleSave);
  }, []);

  const handleReset = () => {
    if (window.confirm('確定要清除所有自訂輸入並還原至預設設定嗎？')) {
      resetAll();
      window.location.reload();
    }
  };

  const menuItems = [
    { to: '/', label: '資產總覽', icon: <Compass className="w-4 h-4" /> },
    { to: '/allocation', label: '目標配置', icon: <Percent className="w-4 h-4" /> },
    { to: '/rebalance', label: '配置平衡', icon: <Scale className="w-4 h-4" /> },
    { to: '/retirement', label: '退休規劃', icon: <TrendingUp className="w-4 h-4" /> },
    { to: '/order', label: '下單股數', icon: <DollarSign className="w-4 h-4" /> },
    { to: '/scenario', label: '壓力測試', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/85 border-b border-slate-200/80 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo 與標題 */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/10">
              <PieChart className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-800 flex items-center gap-1.5">
                AI資產配置戰略總覽
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 bg-gradient-to-r from-blue-600/10 to-sky-500/10 border border-blue-500/20 rounded text-blue-600 font-mono">
                  SPA
                </span>
              </h1>
            </div>
          </div>

          {/* 桌面端導航選單 */}
          <div className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 select-none
                  ${isActive 
                    ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50 scale-[1.02]' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* 右側自動儲存狀態與重設 */}
          <div className="hidden sm:flex items-center gap-3">
            {/* 自動儲存指示燈 */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-full text-[10px] font-bold">
              <span className={`w-1.5 h-1.5 rounded-full ${
                saveStatus === 'saved' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
              }`}></span>
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">
                {saveStatus === 'saved' ? '已儲存至本地' : '自動儲存中...'}
              </span>
            </div>

            {/* 一鍵重置 */}
            <button
              onClick={handleReset}
              className="p-1.5 border border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer flex items-center justify-center group shadow-sm"
              title="還原所有預設值"
            >
              <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>

          {/* 行動端漢堡選單按鈕 */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={handleReset}
              className="p-1.5 border border-slate-200 text-slate-400 hover:bg-slate-50 rounded-lg"
              title="還原預設"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* 行動端下拉選單 */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white/95 px-4 pt-2 pb-4 space-y-1 shadow-lg animate-fade-in">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all
                ${isActive 
                  ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                  : 'text-slate-500 hover:bg-slate-50'
                }
              `}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 px-4 font-bold">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                saveStatus === 'saved' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
              雲端狀態：{saveStatus === 'saved' ? '本地持久化鎖定' : '儲存中'}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
};

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-sky-50/20 via-white to-slate-50/40 text-slate-800 flex flex-col font-sans selection:bg-blue-500/20 selection:text-blue-800">
      <Navbar />

      {/* 核心多路由頁面渲染區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/allocation" element={<AllocationPage />} />
          <Route path="/rebalance" element={<RebalancePage />} />
          <Route path="/retirement" element={<RetirementPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/scenario" element={<ScenarioPage />} />
        </Routes>
      </main>

      {/* 頁尾 */}
      <footer className="max-w-7xl w-full mx-auto px-4 text-center mt-12 border-t border-slate-200/50 py-6 text-[10px] text-slate-400 font-semibold tracking-wide space-y-1">
        <p>AI資產配置戰略總覽互動式多頁 Web App • 所有計算均參考長期歷史大數據，不構成具體投資建議。</p>
        <p>© 2026. Built with React + React Router + Recharts + Tailwind CSS. Designed for Long-Term Passive Investors.</p>
      </footer>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}

export default App;
