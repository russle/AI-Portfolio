import React from 'react';

interface ProgressBarProps {
  value: number; // 0 ~ 100
  className?: string;
  showText?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  className = '',
  showText = true
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={`w-full ${className}`}>
      {showText && (
        <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-slate-500">
          <span>FIRE 進度累積</span>
          <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{clampedValue.toFixed(1)}%</span>
        </div>
      )}
      <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40 p-0.5">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};
