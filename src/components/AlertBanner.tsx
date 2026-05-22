import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

interface AlertBannerProps {
  message: string;
  type?: 'success' | 'warning' | 'error';
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  message,
  type = 'warning',
  className = ''
}) => {
  let bgStyles = 'bg-amber-500/10 border-amber-500/30 text-amber-800';
  let Icon = AlertTriangle;

  if (type === 'success') {
    bgStyles = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800';
    Icon = CheckCircle;
  } else if (type === 'error') {
    bgStyles = 'bg-rose-500/10 border-rose-500/30 text-rose-800';
    Icon = AlertCircle;
  }

  return (
    <div className={`
      flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md 
      text-sm font-semibold select-none animate-pulse-glow
      ${bgStyles} ${className}
    `}>
      <Icon className="w-4.5 h-4.5 flex-shrink-0" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
};
