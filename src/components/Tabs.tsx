import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  activeTab, 
  onChange, 
  className = '' 
}) => {
  return (
    <div className={`flex border-b border-slate-200/80 gap-2 p-1 bg-slate-100/50 rounded-xl max-w-fit ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer
              transition-all duration-200 ease-out select-none
              ${isActive 
                ? 'bg-white text-blue-600 shadow-md shadow-slate-200/60 scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
              }
            `}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

interface TabPanelProps {
  children: React.ReactNode;
  id: string;
  activeTab: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({ 
  children, 
  id, 
  activeTab 
}) => {
  if (id !== activeTab) return null;
  return (
    <div className="animate-fade-in duration-300 py-4">
      {children}
    </div>
  );
};
