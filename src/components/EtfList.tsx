import React from 'react';
import { Accordion } from './Accordion';
import { Globe, Flag, Landmark, ShieldCheck, Coins } from 'lucide-react';

export const EtfList: React.FC = () => {
  return (
    <div className="space-y-3.5">
      <div className="flex flex-col mb-1 select-none">
        <h3 className="text-sm font-bold text-slate-800">指數化投資經典標的參考</h3>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">本清單純為學術探討，不構成具體投資建議。</p>
      </div>

      <Accordion title="全球股市 (Global Equity)" icon={<Globe className="w-4 h-4" />}>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">VT</span>
            <span className="text-[10px] font-bold text-slate-500">Vanguard 全球股票 ETF (追蹤 FTSE Global All Cap)</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">ACWI</span>
            <span className="text-[10px] font-bold text-slate-500">iShares MSCI ACWI ETF (全球所有國家指數)</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">VWRA</span>
            <span className="text-[10px] font-bold text-slate-500">Vanguard FTSE All-World UCITS ETF (愛爾蘭註冊，自動再投資)</span>
          </div>
        </div>
      </Accordion>

      <Accordion title="美國股市 (US Equity)" icon={<Flag className="w-4 h-4" />}>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">VTI</span>
            <span className="text-[10px] font-bold text-slate-500">Vanguard 整體股市 ETF (涵蓋美股全市場)</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">VOO</span>
            <span className="text-[10px] font-bold text-slate-500">Vanguard S&P 500 ETF (追蹤標普 500 強)</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">QQQM</span>
            <span className="text-[10px] font-bold text-slate-500">Invesco NASDAQ 100 Index ETF (那斯達克 100 指數)</span>
          </div>
        </div>
      </Accordion>

      <Accordion title="台灣股市 (Taiwan Equity)" icon={<Landmark className="w-4 h-4" />}>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">0050</span>
            <span className="text-[10px] font-bold text-slate-500">元大台灣卓越 50 ETF (代表台灣前 50 大藍籌股)</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">006208</span>
            <span className="text-[10px] font-bold text-slate-500">富邦台灣采吉 50 ETF (低管理費台灣 50 強代表)</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">00878</span>
            <span className="text-[10px] font-bold text-slate-500">國泰永續高股息 ETF (永續與高股息代表)</span>
          </div>
        </div>
      </Accordion>

      <Accordion title="全球債券 (Bonds & Fix-Income)" icon={<ShieldCheck className="w-4 h-4" />}>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">BND</span>
            <span className="text-[10px] font-bold text-slate-500">Vanguard 整體債券市場 ETF (追蹤美國投資級債)</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">BNDW</span>
            <span className="text-[10px] font-bold text-slate-500">Vanguard 整體世界債券 ETF (涵蓋全球多元債券配置)</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">AGG</span>
            <span className="text-[10px] font-bold text-slate-500">iShares 核心綜合債券 ETF (美國投資級綜合固定收益)</span>
          </div>
        </div>
      </Accordion>

      <Accordion title="加密貨幣 (Alternative Cryptos)" icon={<Coins className="w-4 h-4" />}>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">BTC</span>
            <span className="text-[10px] font-bold text-slate-500">比特幣 (Bitcoin) - 數位黃金與新興另類價值儲存</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-bold text-xs text-blue-600">ETH</span>
            <span className="text-[10px] font-bold text-slate-500">乙太幣 (Ethereum) - 去中心化智能合約龍頭代幣</span>
          </div>
        </div>
      </Accordion>
    </div>
  );
};
