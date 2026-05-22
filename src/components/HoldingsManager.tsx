import React, { useState } from 'react';
import { useApp, type HoldingItem } from '../context/AppContext';
import { Card } from './Card';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  Lock, 
  Unlock, 
  AlertCircle, 
  Edit3, 
  CheckCircle2,
} from 'lucide-react';

export const HoldingsManager: React.FC = () => {
  const { state, toggleHoldingMode, addHolding, deleteHolding, updateHolding, refreshAllPrices, updateUsdRate } = useApp();
  const { portfolio } = state;
  const holdings = portfolio.holdings || [];
  const isHoldingMode = portfolio.isHoldingMode || false;

  // UI 控制狀態
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 新增/編輯表單狀態
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [shares, setShares] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<'TWD' | 'USD'>('TWD');
  const [assetType, setAssetType] = useState<HoldingItem['assetType']>('tw_stock');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 美金對台幣最新匯率 (前端輔助計算，已全域化)
  const usdRate = portfolio.usdRate ?? 32.2;

  // 開啟新增表單
  const handleOpenAdd = () => {
    setSymbol('');
    setName('');
    setShares(0);
    setCurrentPrice(0);
    setCurrency('TWD');
    setAssetType('tw_stock');
    setEditingId(null);
    setIsAdding(true);
  };

  // 開啟編輯表單
  const handleOpenEdit = (h: HoldingItem) => {
    setSymbol(h.symbol);
    setName(h.name);
    setShares(h.shares);
    setCurrentPrice(h.currentPrice);
    setCurrency(h.currency);
    setAssetType(h.assetType);
    setEditingId(h.id);
    setIsAdding(true);
  };

  // 送出新增或修改
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !name || shares <= 0 || currentPrice < 0) {
      alert('請填入完整且大於零的數據！');
      return;
    }

    const payload = {
      symbol: symbol.trim(),
      name: name.trim(),
      shares,
      currentPrice,
      currency,
      assetType
    };

    if (editingId) {
      updateHolding(editingId, payload);
    } else {
      addHolding(payload);
    }
    
    setIsAdding(false);
  };

  // 自動同步定價 API
  const handleRefreshPrices = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshMsg(null);

    const success = await refreshAllPrices(usdRate);
    setIsRefreshing(false);
    
    if (success) {
      setRefreshMsg({ type: 'success', text: '🎉 全體持股最新價格同步成功！' });
    } else {
      setRefreshMsg({ type: 'error', text: '❌ 自動同步失敗，請檢查網絡或個股代碼是否正確。' });
    }
    setTimeout(() => setRefreshMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. 雙軌模式切換卡片 */}
      <Card hoverEffect={false} className="p-6 bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-xl ${isHoldingMode ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
              {isHoldingMode ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-800">資產帳目模式控制</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                {isHoldingMode ? '📊 當前運行：【精細持股模式】各大類資產已鎖定為明細乘算' : '📝 當前運行：【宏觀沙盒模式】支援大類金額隨意填寫試算'}
              </p>
            </div>
          </div>

          {/* 切換 Segment Control */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 text-xs font-bold w-full md:w-auto">
            <button
              onClick={() => toggleHoldingMode(false)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 ${
                !isHoldingMode
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Unlock className="w-3.5 h-3.5" />
              宏觀沙盒模式
            </button>
            <button
              onClick={() => toggleHoldingMode(true)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isHoldingMode
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              精細持股模式
            </button>
          </div>
        </div>
      </Card>

      {/* 2. 持股明細控制台 (僅在 isHoldingMode 下解鎖或顯示) */}
      {isHoldingMode && (
        <Card hoverEffect={false} className="p-6 bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-md">
          
          {/* 控制台頂部 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4 select-none">
            <div>
              <h3 className="text-base font-black text-slate-800">📋 我的真實投資持股明細</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">系統將自動按照「股數 * 即時單價 (以美金匯率折算)」即時同步大類資產值</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* 匯率微調 */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-600">
                <span>美金匯率 USD/TWD</span>
                <input
                  type="number"
                  value={usdRate}
                  onChange={(e) => updateUsdRate(parseFloat(e.target.value) || 32)}
                  className="w-12 bg-transparent text-center border-b border-slate-300 focus:outline-none text-indigo-600 font-black"
                  step="0.1"
                />
              </div>

              {/* 一鍵更新報價 */}
              <button
                onClick={handleRefreshPrices}
                disabled={isRefreshing || holdings.length === 0}
                className="flex items-center gap-1.5 py-1.5 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-black cursor-pointer shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? '定價同步中...' : '自動同步最新市價'}
              </button>

              {/* 新增個股 */}
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1 py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                登記新標的
              </button>
            </div>
          </div>

          {/* 成功/失敗通知氣泡 */}
          {refreshMsg && (
            <div className={`mb-4 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 select-none ${
              refreshMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}>
              {refreshMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{refreshMsg.text}</span>
            </div>
          )}

          {/* 持股表單抽屜 */}
          {isAdding && (
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 mb-6 animate-scale-in">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
                {editingId ? '✏️ 編輯個股持股資訊' : '➕ 登記全新個股/ETF 持股'}
              </h4>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">標的大類</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="tw_stock">🇹🇼 台灣股票</option>
                    <option value="us_stock">🇺🇸 美國股票</option>
                    <option value="fund">📈 基金/債券</option>
                    <option value="crypto">🪙 加密貨幣</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">標的代號 (例如 0050.TW 或 VT)</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    placeholder="e.g. 0050.TW"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">標的簡稱或全稱</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    placeholder="e.g. 元大台灣50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">目前持股股數 / 單位數</label>
                  <input
                    type="number"
                    value={shares || ''}
                    onChange={(e) => setShares(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    placeholder="e.g. 1500"
                    step="0.0001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">當前每股價格 (單價)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={currentPrice || ''}
                      onChange={(e) => setCurrentPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                      placeholder="e.g. 165"
                      step="0.01"
                      required
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none"
                    >
                      <option value="TWD">TWD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                {/* 按鈕 */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    確認保存
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 持股明細表格 */}
          {holdings.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl select-none">
              <p className="text-sm font-bold text-slate-400">目前暫無任何持股標的明細</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">點擊右上角「登記新標的」開啟細分資產管理！</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase bg-slate-50/50 select-none">
                    <th className="px-4 py-3">板塊</th>
                    <th className="px-4 py-3">標的</th>
                    <th className="px-4 py-3 text-right">持股數量</th>
                    <th className="px-4 py-3 text-right">即時單價</th>
                    <th className="px-4 py-3 text-right">當前現值 (TWD)</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-600">
                  {holdings.map(h => {
                    const priceTwd = h.currency === 'USD' ? h.currentPrice * usdRate : h.currentPrice;
                    const valueTwd = Math.round(h.shares * priceTwd);
                    
                    let badgeColor = 'bg-slate-100 text-slate-600';
                    let typeName = '台灣股票';
                    if (h.assetType === 'tw_stock') {
                      badgeColor = 'bg-blue-50 text-blue-600';
                      typeName = '🇹🇼 台股';
                    } else if (h.assetType === 'us_stock') {
                      badgeColor = 'bg-indigo-50 text-indigo-600';
                      typeName = '🇺🇸 美股';
                    } else if (h.assetType === 'fund') {
                      badgeColor = 'bg-slate-100 text-slate-500';
                      typeName = '📈 基金';
                    } else if (h.assetType === 'crypto') {
                      badgeColor = 'bg-purple-50 text-purple-600';
                      typeName = '🪙 加密幣';
                    }

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3.5 select-none">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${badgeColor}`}>
                            {typeName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{h.symbol}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{h.name}</div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-700">
                          {h.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-700">
                          {h.currency === 'USD' && <span className="text-[10px] text-slate-400 font-semibold">USD </span>}
                          {h.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-indigo-600">
                          ${valueTwd.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(h)}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
                              title="編輯標的"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`確定要刪除持股標的 [${h.symbol}] 嗎？`)) {
                                  deleteHolding(h.id);
                                }
                              }}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                              title="刪除標的"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </Card>
      )}

    </div>
  );
};
