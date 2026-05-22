import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-slate-200/60 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 font-semibold text-slate-700 bg-slate-50/50 hover:bg-slate-100/50 transition-colors duration-200 cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-blue-500">{icon}</span>}
          <span>{title}</span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} 
        />
      </button>
      <div 
        className={`
          transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? 'max-h-[1000px] border-t border-slate-100 opacity-100 p-4' : 'max-h-0 opacity-0 p-0'}
        `}
      >
        {children}
      </div>
    </div>
  );
};
