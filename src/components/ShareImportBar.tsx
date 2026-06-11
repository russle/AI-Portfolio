import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { AiPortfolioState } from '../context/AppContext';
import {
  encodeStateToUrl,
  buildShareUrl,
  parseShareUrl,
  decodeStateFromUrl,
} from '../utils/shareUtils';
import { Card } from './Card';
import {
  Upload,
  Download,
  Database,
  CheckCircle,
  AlertCircle,
  Share2,
} from 'lucide-react';

// ── 還原資料的欄位合法性校驗 ──
const validateImportedState = (data: Record<string, unknown>): boolean => {
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

  // [NEW] 支持 holdings 明細陣列與持股模式欄位校驗
  if (portfolio.holdings !== undefined && !Array.isArray(portfolio.holdings)) return false;
  if (portfolio.isHoldingMode !== undefined && typeof portfolio.isHoldingMode !== 'boolean') return false;

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

// ── URL Import helper ──
function importStateFromUrl(stateStr: string, importState: (state: AiPortfolioState) => void): boolean {
  const decoded = decodeStateFromUrl(stateStr);
  if (!decoded) return false;
  // Build a complete AiPortfolioState from the partial decoded data
  // by merging with sensible defaults for missing fields
  const fullState: AiPortfolioState = {
    portfolio: {
      cash: decoded.portfolio?.cash ?? 0,
      fund: decoded.portfolio?.fund ?? 0,
      tw_stock: decoded.portfolio?.tw_stock ?? 0,
      us_stock: decoded.portfolio?.us_stock ?? 0,
      crypto: decoded.portfolio?.crypto ?? 0,
      history: decoded.portfolio?.history ?? [],
      holdings: decoded.portfolio?.holdings,
      isHoldingMode: decoded.portfolio?.isHoldingMode,
    },
    allocation_target: {
      tw_stock: decoded.allocation_target?.tw_stock ?? 0.3,
      us_stock: decoded.allocation_target?.us_stock ?? 0.3,
      bond: decoded.allocation_target?.bond ?? 0.2,
      cash: decoded.allocation_target?.cash ?? 0.1,
      crypto: decoded.allocation_target?.crypto ?? 0.1,
    },
    retirement: {
      age: decoded.retirement?.age ?? 30,
      monthly_spending: decoded.retirement?.monthly_spending ?? 50000,
      monthly_invest: decoded.retirement?.monthly_invest ?? 20000,
      expected_return: decoded.retirement?.expected_return ?? 0.06,
      inflation: decoded.retirement?.inflation ?? 0.02,
    },
  };
  importState(fullState);
  return true;
}

export const ShareImportBar: React.FC = () => {
  const { state, importState } = useApp();
  const { portfolio } = state;

  // ── Local states ──
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sharedState, setSharedState] = useState<Partial<AiPortfolioState> | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // URL Share Detection — check for ?share= parameter on mount
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const decoded = parseShareUrl();
    if (decoded) {
      setSharedState(decoded);
      setShareModalOpen(true);
    }
  }, []);

  // ── URL Import Handler ──
  const handleUrlImport = () => {
    try {
      const hash = window.location.hash;
      const stateStr = hash.split('?state=')[1];
      if (!stateStr) {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
        return;
      }
      const success = importStateFromUrl(stateStr, importState);
      if (success) {
        setImportStatus('success');
        setBackupMsg({ type: 'success', text: '🎉 URL 匯入成功！' });
        setTimeout(() => {
          setBackupMsg(null);
          setImportStatus('idle');
        }, 4000);
      } else {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    } catch {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    }
  };

  // ── 備份匯出 ──
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
    } catch {
      setBackupMsg({ type: 'error', text: '❌ 匯出備份失敗，請稍後再試。' });
      setTimeout(() => setBackupMsg(null), 4000);
    }
  };

  // ── 備份導入（檔案） ──
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      } catch {
        setBackupMsg({ type: 'error', text: '❌ 讀取備份檔案失敗，JSON 解析錯誤。' });
        setTimeout(() => setBackupMsg(null), 5000);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // ── URL Share Handler ──
  const handleShare = () => {
    try {
      const encoded = encodeStateToUrl(state);
      const url = buildShareUrl(encoded);

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(url).then(() => {
          setBackupMsg({ type: 'success', text: '🔗 分享連結已複製到剪貼簿！' });
          setTimeout(() => setBackupMsg(null), 4000);
        }).catch(() => {
          prompt('請複製此連結分享您的配置：', url);
          setBackupMsg({ type: 'success', text: '🔗 分享連結已產生！' });
          setTimeout(() => setBackupMsg(null), 4000);
        });
      } else {
        prompt('請複製此連結分享您的配置：', url);
        setBackupMsg({ type: 'success', text: '🔗 分享連結已產生！' });
        setTimeout(() => setBackupMsg(null), 4000);
      }
    } catch {
      setBackupMsg({ type: 'error', text: '❌ 產生分享連結失敗，請稍後再試。' });
      setTimeout(() => setBackupMsg(null), 5000);
    }
  };

  return (
    <>
      {/* 資料備份與還原 */}
      <Card hoverEffect={false} className="flex flex-col bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-md">
        <div className="flex items-center gap-3 mb-4 select-none">
          <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Database className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-800">資料備份控制台</h2>
            <p className="text-[10px] text-slate-400 font-bold">本地數據一鍵下載與備份還原</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-slate-500">
            數據安全儲存於瀏覽器本地空間，建議定期下載備份檔案以防資產歷史丟失。
          </p>

          {backupMsg && (
            <div className={`p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 select-none ${
              backupMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}>
              {backupMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
              <span>{backupMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1.5">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-black cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
            >
              <Download className="w-3.5 h-3.5" />
              匯出備份
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
            >
              <Share2 className="w-3.5 h-3.5" />
              分享我的配置
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-black cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500" />
              導入備份
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* ── URL Import Bar ── */}
          <div className="pt-2 border-t border-slate-100/80">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">URL 匯入</span>
              {importStatus === 'success' && (
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <CheckCircle className="w-3 h-3" /> 成功
                </span>
              )}
              {importStatus === 'error' && (
                <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> 失敗
                </span>
              )}
            </div>
            <button
              onClick={handleUrlImport}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-[11px] font-black cursor-pointer shadow-sm transition-all hover:scale-[1.01]"
            >
              <Upload className="w-3.5 h-3.5" />
              從 URL 匯入配置
            </button>
            <p className="text-[9px] text-slate-400 font-semibold mt-1.5 leading-relaxed">
              從瀏覽器網址列中的分享連結 (含 <code className="text-indigo-500 bg-indigo-50 px-1 rounded text-[9px]">?share=</code> 或 <code className="text-slate-500 bg-slate-50 px-1 rounded text-[9px]">?state=</code> 參數) 匯入他人配置。
            </p>
          </div>
        </div>
      </Card>

      {/* ── Share Comparison Active Banner ── */}
      {sharedState && !shareModalOpen && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
            <Share2 className="w-4 h-4" />
            分享配置對比模式已啟用
          </div>
          <button
            onClick={() => setSharedState(null)}
            className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 cursor-pointer"
          >
            清除對比
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          URL Share — Comparison Dialog
          ═══════════════════════════════════════════════════════════════ */}
      {shareModalOpen && sharedState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Share2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-800">偵測到分享的配置</h3>
                <p className="text-[10px] text-slate-400 font-bold">是否要載入作為對比？</p>
              </div>
            </div>

            {/* comparison table */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2 text-xs font-semibold">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">項目</span>
                <span className="text-slate-700">你的配置</span>
                <span className="text-indigo-700">分享的配置</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">現金</span>
                <span>${portfolio.cash.toLocaleString()}</span>
                <span className="text-indigo-600">${(sharedState.portfolio?.cash ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">基金</span>
                <span>${portfolio.fund.toLocaleString()}</span>
                <span className="text-indigo-600">${(sharedState.portfolio?.fund ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">台股</span>
                <span>${portfolio.tw_stock.toLocaleString()}</span>
                <span className="text-indigo-600">${(sharedState.portfolio?.tw_stock ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">美股</span>
                <span>${portfolio.us_stock.toLocaleString()}</span>
                <span className="text-indigo-600">${(sharedState.portfolio?.us_stock ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">加密貨幣</span>
                <span>${portfolio.crypto.toLocaleString()}</span>
                <span className="text-indigo-600">${(sharedState.portfolio?.crypto ?? 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShareModalOpen(false);
                  setSharedState(null);
                  window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash.split('?')[0]}`);
                }}
                className="flex-1 py-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer hover:bg-slate-50 transition-all"
              >
                略過
              </button>
              <button
                onClick={() => {
                  setShareModalOpen(false);
                  setBackupMsg({ type: 'success', text: '📊 已載入分享配置作為對比參考！' });
                  setTimeout(() => setBackupMsg(null), 4000);
                  window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash.split('?')[0]}`);
                }}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black cursor-pointer transition-all"
              >
                載入對比
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
