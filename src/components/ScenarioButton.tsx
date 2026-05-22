import React from 'react';

interface ScenarioButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

export const ScenarioButton: React.FC<ScenarioButtonProps> = ({
  label,
  icon,
  isActive = false,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`
        flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-bold text-sm
        transition-all duration-300 transform select-none cursor-pointer border
        ${isActive
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/20 scale-[1.03] ring-2 ring-blue-400/40 animate-pulse'
          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/20 hover:scale-[1.01]'
        }
        ${className}
      `}
      {...props}
    >
      {icon && <span className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`}>{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
