import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hoverEffect = true,
  ...props 
}) => {
  return (
    <div 
      className={`
        backdrop-blur-md bg-white/70 border border-slate-200/60 rounded-2xl p-6
        shadow-xl shadow-slate-100/40 
        transition-all duration-300
        ${hoverEffect ? 'hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
