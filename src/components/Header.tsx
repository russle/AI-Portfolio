import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Database, RefreshCw } from 'lucide-react';

export const Header: React.FC = () => {
  const { resetAll } = useApp();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // 監聽 localStorage 的變化以模擬自動儲存狀態
  useEffect(() => {
    const handleSave = () => {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        setSaveStatus('saved');
      }, 500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('storage', handleSave);
    
    // 每次狀態發生變化時，自動模擬儲存燈
    handleSave();

    return () => window.removeEventListener('storage', handleSave);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-900/80 px-6 py-4 flex items-center justify-between transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/10">
          <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            AI資產配置戰略總覽
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-gradient-to-r from-emerald-500/20 to-sky-500/20 border border-emerald-500/20 rounded text-emerald-400 font-mono">
              Beta
            </span>
          </h1>
          <p className="text-[10px] text-slate-500 font-semibold tracking-wide mt-0.5 hidden md:block">
            AI低成本指數化投資策略 (VT / VTI / BNDW) 戰術實踐工具
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* 自動儲存指示燈 */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-full text-[10px] font-bold">
          <span className={`w-1.5 h-1.5 rounded-full ${
            saveStatus === 'saved' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
          }`}></span>
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-400">
            {saveStatus === 'saved' ? '已自動儲存至本地' : '自動儲存中...'}
          </span>
        </div>

        {/* 一鍵重置按鈕 */}
        <button
          onClick={() => {
            if (window.confirm('確定要清除所有自訂輸入並還原至預設設定嗎？')) {
              resetAll();
              window.location.reload();
            }
          }}
          className="p-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center group"
          title="重設所有資料"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </div>
    </header>
  );
};
