
import React from 'react';
import { getTranslations } from '../../services/translations';
import { type Language } from '../../types';

interface TwoColumnLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  language: Language;
}

const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({ leftPanel, rightPanel }) => {
  const T = getTranslations().common;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Panel: Controls */}
      {/* UPDATED: Removed lg:overflow-y-auto to allow panel to grow naturally */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-4">
        {leftPanel}
      </div>
      {/* Right Panel: Results */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm">
        <h2 className="text-xl font-bold mb-4">{T.output}</h2>
        <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800/50 rounded-md overflow-hidden relative group p-2 min-h-[300px]">
          {rightPanel}
        </div>
      </div>
    </div>
  );
};

export default TwoColumnLayout;
