import React from 'react';

interface GaugeProps {
  value: number; // 成功率，0 ~ 1 之間
  title?: string;
}

export const Gauge: React.FC<GaugeProps> = ({ 
  value, 
  title = '退休成功率' 
}) => {
  const rate = Math.max(0, Math.min(1, value));
  const percent = rate * 100;
  
  // 決定狀態顏色與標籤
  let strokeColor = 'stroke-rose-500';
  let textColor = 'text-rose-600';
  let ratingText = '❌ 不可行';
  let ratingBg = 'bg-rose-50 border-rose-200';

  if (rate >= 0.90) {
    strokeColor = 'stroke-emerald-500';
    textColor = 'text-emerald-600';
    ratingText = '🟢 非常可行';
    ratingBg = 'bg-emerald-50 border-emerald-200';
  } else if (rate >= 0.70) {
    strokeColor = 'stroke-blue-500';
    textColor = 'text-blue-600';
    ratingText = '✅ 可行';
    ratingBg = 'bg-blue-50 border-blue-200';
  } else if (rate >= 0.40) {
    strokeColor = 'stroke-amber-500';
    textColor = 'text-amber-600';
    ratingText = '⚠️ 勉強可行';
    ratingBg = 'bg-amber-50 border-amber-200';
  }

  // 指針旋轉角度：從 -90deg (0% 成功率，朝左) 到 +90deg (100% 成功率，朝右)
  const rotationAngle = -90 + rate * 180;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {title && <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</span>}
      
      <div className="relative w-48 h-28 flex items-center justify-center">
        {/* SVG 半圓形軌跡 */}
        <svg className="w-full h-full" viewBox="0 0 200 120">
          <defs>
            {/* 定義漸層 */}
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" /> {/* 紅色 */}
              <stop offset="40%" stopColor="#f59e0b" /> {/* 黃色 */}
              <stop offset="75%" stopColor="#3b82f6" /> {/* 藍色 */}
              <stop offset="100%" stopColor="#10b981" /> {/* 翡翠綠 */}
            </linearGradient>
          </defs>

          {/* 灰色背景半圓弧 */}
          <path
            d="M 20,100 A 80,80 0 0,1 180,100"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* 彩色漸層弧線段作為底色引導 */}
          <path
            d="M 20,100 A 80,80 0 0,1 180,100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.15"
          />

          {/* 動態成功率覆蓋弧度線 (用 dasharray 控制長度) */}
          {/* 半圓周長為 PI * 80 ≈ 251.3 */}
          <path
            d="M 20,100 A 80,80 0 0,1 180,100"
            fill="none"
            className={`${strokeColor} transition-all duration-1000 ease-out`}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${251.3 * rate} 251.3`}
          />

          {/* 刻度文字 */}
          <text x="12" y="116" className="text-[10px] font-bold fill-slate-400 text-center">0%</text>
          <text x="94" y="16" className="text-[10px] font-bold fill-slate-400 text-center">50%</text>
          <text x="172" y="116" className="text-[10px] font-bold fill-slate-400 text-center">100%</text>

          {/* 指針針腳中心軸 */}
          <circle cx="100" cy="100" r="8" className="fill-slate-700 stroke-white stroke-2" />

          {/* 指針 (Pointer) */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="30"
            className="stroke-slate-700 stroke-[3.5]"
            strokeLinecap="round"
            style={{
              transform: `rotate(${rotationAngle}deg)`,
              transformOrigin: '100px 100px',
              transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        </svg>

        {/* 數值浮層 */}
        <div className="absolute bottom-0 flex flex-col items-center select-none translate-y-1">
          <span className={`text-2xl font-black tracking-tight ${textColor}`}>{percent.toFixed(0)}%</span>
        </div>
      </div>

      {/* 可行性評級 Badge */}
      <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-300 shadow-sm ${ratingBg}`}>
        {ratingText}
      </div>
    </div>
  );
};
