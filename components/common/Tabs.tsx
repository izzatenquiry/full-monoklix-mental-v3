
import React from 'react';

export interface Tab<T extends string> {
  id: T;
  label: string;
  adminOnly?: boolean;
  count?: number;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  activeTab: T;
  // FIX: Correctly typed the `setActiveTab` prop to be compatible with React's `useState` dispatcher (`React.Dispatch<React.SetStateAction<T>>`).
  setActiveTab: React.Dispatch<React.SetStateAction<T>>;
  isAdmin?: boolean;
}

const Tabs = <T extends string>({ tabs, activeTab, setActiveTab, isAdmin = false }: TabsProps<T>) => {
  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);
  
  return (
    <div className="p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center gap-1 overflow-x-auto border border-neutral-200 dark:border-neutral-700 shadow-inner">
        {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 whitespace-nowrap relative z-10 ${
                    activeTab === tab.id
                        ? 'bg-white dark:bg-neutral-700 text-brand-start shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-600'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }`}>
                {tab.label}
                {tab.count !== undefined && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-brand-start/10 text-brand-start' : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400'}`}>{tab.count}</span>
                )}
            </button>
        ))}
    </div>
  );
};

export default Tabs;