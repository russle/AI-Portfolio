import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { LearningModule } from './components/LearningModule';
import { FinancialPlanner } from './components/FinancialPlanner';
import { PortfolioExecutor } from './components/PortfolioExecutor';
import { HealthCheck } from './components/HealthCheck';
import { MarketConsole } from './components/MarketConsole';
import { Landmark, Calculator, Layers, ShieldCheck } from 'lucide-react';

function Dashboard() {
  const scrollToAnchor = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0b0f19] to-slate-950 text-slate-100 flex flex-col font-sans pb-16 selection:bg-emerald-500/30 selection:text-emerald-300">
      <Header />

      {/* 快速錨點導航條 */}
      <div className="sticky top-[73px] z-40 w-full backdrop-blur-md bg-slate-950/50 border-b border-slate-900/50 py-3 px-6 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-6 text-xs font-bold text-slate-400">
          <button
            onClick={() => scrollToAnchor('learning')}
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-all cursor-pointer py-1"
          >
            <Landmark className="w-3.5 h-3.5" />
            股債模擬 (模組 A)
          </button>
          <span className="text-slate-800">|</span>
          <button
            onClick={() => scrollToAnchor('planner')}
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-all cursor-pointer py-1"
          >
            <Calculator className="w-3.5 h-3.5" />
            財務逆推 (模組 B)
          </button>
          <span className="text-slate-800">|</span>
          <button
            onClick={() => scrollToAnchor('executor')}
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-all cursor-pointer py-1"
          >
            <Layers className="w-3.5 h-3.5" />
            樂高下單 (模組 C)
          </button>
          <span className="text-slate-800">|</span>
          <button
            onClick={() => scrollToAnchor('health')}
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-all cursor-pointer py-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            資產健檢再平衡 (模組 D)
          </button>
        </div>
      </div>

      {/* 主面板區域 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* 模擬市場控制台（置頂於內容區以便隨時調整股價） */}
        <section className="animate-fade-in duration-500">
          <MarketConsole />
        </section>

        {/* 模組 A */}
        <section id="learning" className="scroll-mt-36 animate-fade-in duration-500">
          <LearningModule />
        </section>

        {/* 模組 B */}
        <section id="planner" className="scroll-mt-36">
          <FinancialPlanner />
        </section>

        {/* 模組 C */}
        <section id="executor" className="scroll-mt-36">
          <PortfolioExecutor />
        </section>

        {/* 模組 D */}
        <section id="health" className="scroll-mt-36">
          <HealthCheck />
        </section>

      </main>

      {/* 頁尾 */}
      <footer className="max-w-7xl w-full mx-auto px-4 text-center mt-12 border-t border-slate-900/60 pt-6 text-[10px] text-slate-500 font-semibold tracking-wide space-y-1">
        <p>綠角資產配置戰略總覽互動式 Web App • 本專案所提供之所有數據及公式均參考長期歷史大數據，不構成具體投資建議。</p>
        <p>© 2026. Built with React + Tailwind CSS. Designed for Long-Term Disciplined Passive Investors.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  );
}

export default App;
