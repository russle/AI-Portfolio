import React from 'react';
import { useApp } from '../context/AppContext';
import type { RegionType } from '../context/AppContext';
import { getInterpolatedData } from '../utils/formulas';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Info, TrendingUp, AlertTriangle, Shield, Globe, Landmark, MapPin } from 'lucide-react';

interface ETFDetail {
  symbol: string;
  name: string;
  role: string;
  desc: string;
  weightSuggestion: string;
}

const REGION_ETFS: Record<RegionType, ETFDetail[]> = {
  global: [
    {
      symbol: 'VT',
      name: 'Vanguard Total World Stock ETF',
      role: '全球股票核心',
      desc: '一檔追蹤富時全球全市場指數之 ETF，涵蓋全球成熟與新興市場超過 9,000 檔大中小型股，實現真正的一鍵全球化配置。',
      weightSuggestion: '建議佔權益類資產的 70% ~ 100%'
    },
    {
      symbol: 'BNDW',
      name: 'Vanguard Total World Bond ETF',
      role: '全球債券核心',
      desc: '投資美國與非美國的投資等級政府及公司債券，並針對美金進行匯率避險，是平衡整體投資組合波動度的黃金基石。',
      weightSuggestion: '建議佔固定收益類資產的 100%'
    }
  ],
  us: [
    {
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      role: '美股全市場核心',
      desc: '全面網羅美國股市所有大、中、小、微型股，完美代表美國整體經濟與商業活力的被動式指數旗艦工具。',
      weightSuggestion: '建議佔權益類資產的 40% ~ 60%'
    },
    {
      symbol: 'BND',
      name: 'Vanguard Total Bond Market ETF',
      role: '美國整體債券核心',
      desc: '廣泛追蹤美國應稅投資級債券市場，包含政府公債與優質企業債，提供穩健的現金流與資產防禦盾牌。',
      weightSuggestion: '建議佔固定收益類資產的 50% ~ 70%'
    }
  ],
  europe: [
    {
      symbol: 'VGK',
      name: 'Vanguard FTSE Europe ETF',
      role: '歐洲成熟市場權益',
      desc: '聚焦英國、法國、德國、瑞士等歐洲主要發達國家的權益資產，囊括眾多具有全球競爭力的百年老店。',
      weightSuggestion: '建議佔權益類資產的 15% ~ 25%'
    },
    {
      symbol: 'BNDX',
      name: 'Vanguard Total International Bond ETF',
      role: '國際債券防禦（美金避險）',
      desc: '投資排除美國以外的非美元投資級債券，進行美金匯率避險，用以分散單一國家利率變動帶來的極端風險。',
      weightSuggestion: '建議佔固定收益類資產的 30% ~ 50%'
    }
  ],
  asia: [
    {
      symbol: 'VPL',
      name: 'Vanguard FTSE Pacific ETF',
      role: '亞太成熟市場權益',
      desc: '主要投資日本、澳洲、南韓、香港、新加坡等成熟太平洋市場股票，是全球資產配置中不可或缺的亞洲板塊。',
      weightSuggestion: '建議佔權益類資產的 10% ~ 15%'
    }
  ],
  emerging: [
    {
      symbol: 'VWO',
      name: 'Vanguard FTSE Emerging Markets ETF',
      role: '新興市場高成長配置',
      desc: '投資中國、台灣、印度、巴西、南非等高速發展中經濟體的企業，承擔較高波動以追求長期的超額成長潛力。',
      weightSuggestion: '建議佔權益類資產的 10% ~ 20%'
    }
  ]
};

export const LearningModule: React.FC = () => {
  const { stockPercent, setStockPercent, selectedRegion, setSelectedRegion } = useApp();

  const bondPercent = 100 - stockPercent;
  const interpolated = getInterpolatedData(stockPercent);

  // Recharts 圓餅圖數據
  const pieData = [
    { name: '股票 (Equity)', value: stockPercent, color: '#10B981' }, // 翡翠綠
    { name: '債券 (Bonds)', value: bondPercent, color: '#1E3A8A' }   // 深海藍
  ].filter(d => d.value > 0);

  const formatPercent = (val: number) => {
    return (val * 100).toFixed(2) + '%';
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStockPercent(Number(e.target.value));
  };

  return (
    <div className="space-y-8 bg-slate-900 text-slate-100 rounded-3xl p-6 lg:p-8 border border-slate-800 shadow-2xl">
      {/* 標題與簡介 */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">
          <Landmark className="w-7 h-7 text-emerald-400" />
          模組 A：互動式觀念學習區
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          調整滑桿以模擬不同「股債比例」在歷史大數據下的真實表現，體會「長期持有」與「風險分散」的核心哲學。
        </p>
      </div>

      {/* 股債搭配歷史模擬器 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* 左側：滑桿與指標 */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold tracking-wide text-slate-300">當前資產配置比例</span>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs rounded-full font-bold">
                  股票: {stockPercent}%
                </span>
                <span className="px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs rounded-full font-bold">
                  債券: {bondPercent}%
                </span>
              </div>
            </div>

            {/* Slider */}
            <div className="relative pt-2">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={stockPercent}
                onChange={handleSliderChange}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none transition-all"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                <span>0% 股票 (極保守)</span>
                <span>50% 股 50% 債</span>
                <span>100% 股票 (極進取)</span>
              </div>
            </div>
          </div>

          {/* 指標卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 年化報酬率 */}
            <div className="bg-slate-800/40 rounded-2xl border border-slate-800 p-4 space-y-2 hover:border-emerald-500/30 transition-all group">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">預估年化報酬率</span>
                <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {formatPercent(interpolated.returnRate)}
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                長期持有下的平均複利年報酬。股票比重越高，長期報酬看俏。
              </p>
            </div>

            {/* 標準差 */}
            <div className="bg-slate-800/40 rounded-2xl border border-slate-800 p-4 space-y-2 hover:border-blue-500/30 transition-all group">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">資產標準差 (波動度)</span>
                <Shield className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold font-mono text-sky-400">
                {formatPercent(interpolated.sigma)}
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                衡量資產報酬的震盪幅度。數值越低，持有體驗越安穩。
              </p>
            </div>

            {/* 金融海嘯最大跌幅 */}
            <div className="bg-slate-800/40 rounded-2xl border border-slate-800 p-4 space-y-2 hover:border-red-500/30 transition-all group">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">2008模擬極端跌幅</span>
                <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400">
                {formatPercent(interpolated.maxDrawdown)}
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                若遭遇 2008 金融海嘯般的黑天鵝，預估可能產生的最大帳面回撤。
              </p>
            </div>
          </div>
        </div>

        {/* 右側：圓餅圖 */}
        <div className="bg-slate-800/30 border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px] relative">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 absolute top-4 left-4">
            資產比例分佈
          </h3>
          <div className="w-full h-56 flex items-center justify-center">
            {stockPercent === 0 && bondPercent === 0 ? (
              <p className="text-slate-500">暫無配置數據</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={600}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#f1f5f9', fontFamily: 'monospace' }}
                    formatter={(value) => [`${value}%`, '比例']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* 圖例說明 */}
          <div className="flex gap-6 mt-2 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-300">股票 ({stockPercent}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-900"></div>
              <span className="text-slate-300">債券 ({bondPercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 全球股市與資產權重地圖 */}
      <div className="bg-slate-800/20 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
          <h3 className="text-md font-bold flex items-center gap-2 text-slate-200">
            <Globe className="w-5 h-5 text-sky-400" />
            全球股市與資產權重地圖
          </h3>
          {/* 區域切換按鈕 */}
          <div className="flex flex-wrap gap-1 bg-slate-850 p-1 rounded-xl border border-slate-800">
            {(['global', 'us', 'europe', 'asia', 'emerging'] as RegionType[]).map((region) => {
              const regionNames: Record<RegionType, string> = {
                global: '全球市場',
                us: '美國市場',
                europe: '歐洲市場',
                asia: '亞太成熟',
                emerging: '新興市場'
              };
              const active = selectedRegion === region;
              return (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {regionNames[region]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 代表性 ETF 清單 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REGION_ETFS[selectedRegion].map((etf) => (
            <div
              key={etf.symbol}
              className="bg-slate-850/80 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-md font-bold text-emerald-400 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded font-mono">
                      {etf.symbol}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold px-2 py-0.5 bg-slate-800 rounded-full border border-slate-800">
                      {etf.role}
                    </span>
                  </div>
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 tracking-tight leading-normal">
                  {etf.name}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  {etf.desc}
                </p>
              </div>
              <div className="border-t border-slate-800/60 pt-2 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/30 -mx-4 -mb-4 px-4 py-2 rounded-b-xl">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  {etf.weightSuggestion}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
