import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PieChart, Database, RefreshCw } from 'lucide-react';

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
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/85 border-b border-slate-200/80 shadow-sm px-6 py-4 flex items-center justify-between transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/10">
          <PieChart className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            AI資產配置戰略總覽
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-gradient-to-r from-blue-600/10 to-sky-500/10 border border-blue-500/20 rounded text-blue-600 font-mono">
              Beta
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5 hidden md:block">
            AI低成本指數化投資策略 (VT / VTI / BNDW) 戰術實踐工具
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* 自動儲存指示燈 */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold">
          <span className={`w-1.5 h-1.5 rounded-full ${
            saveStatus === 'saved' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
          }`}></span>
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-600">
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
          className="p-2 border border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer flex items-center justify-center group shadow-sm"
          title="重設所有資料"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </div>
    </header>
  );
};
