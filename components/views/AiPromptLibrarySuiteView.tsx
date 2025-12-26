
import React, { useState } from 'react';
import LibraryView from './LibraryView';
import PromptViralMyView from './PromptViralMyView';
import Tabs, { type Tab } from '../common/Tabs';
import { type Language } from '../../types';

interface AiPromptLibrarySuiteViewProps {
    onUsePrompt: (prompt: string) => void;
    language: Language;
}

type TabId = 'library' | 'viral-my';

const AiPromptLibrarySuiteView: React.FC<AiPromptLibrarySuiteViewProps> = ({ onUsePrompt, language }) => {
    const [activeTab, setActiveTab] = useState<TabId>('viral-my');

    const tabs: Tab<TabId>[] = [
        { id: 'viral-my', label: "Viral Prompts (MY)" },
        { id: 'library', label: "Prompt Library" },
        
    ];

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'library':
                return <LibraryView onUsePrompt={onUsePrompt} language={language} />;
            case 'viral-my':
                // PromptViralMyView does not require a language prop as its content is curated.
                return <PromptViralMyView onUsePrompt={onUsePrompt} />;
            default:
                return <LibraryView onUsePrompt={onUsePrompt} language={language} />;
        }
    };

    return (
        <div className="h-auto lg:h-full flex flex-col">
            <div className="flex-shrink-0 mb-6 flex justify-center">
                <Tabs 
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default AiPromptLibrarySuiteView;
