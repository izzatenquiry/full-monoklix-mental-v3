
import React, { useState, useEffect, useMemo } from 'react';
import VideoGenerationView from './VideoGenerationView';
import { VideoCombinerView } from './VideoCombinerView';
import VoiceStudioView from './VoiceStudioView';
import ProductReviewView from './ProductReviewView';
import Tabs, { type Tab } from '../common/Tabs';
import { type BatchProcessorPreset, type User, type Language } from '../../types';
import BatchProcessorView from './BatchProcessorView';


type TabId = 'generation' | 'storyboard' | 'batch' | 'combiner' | 'voice';

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface AiVideoSuiteViewProps {
  preset: VideoGenPreset | null;
  clearPreset: () => void;
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  language: Language;
}

const AiVideoSuiteView: React.FC<AiVideoSuiteViewProps> = ({ preset, clearPreset, onReEdit, onCreateVideo, currentUser, onUserUpdate, language }) => {
    const [activeTab, setActiveTab] = useState<TabId>('generation');

    const tabs: Tab<TabId>[] = [
        { id: 'generation', label: "Video Generation" },
        { id: 'storyboard', label: "Video Storyboard" },
        { id: 'batch', label: "Batch Processing", adminOnly: true },
        { id: 'combiner', label: "Video Combiner", adminOnly: true },
        { id: 'voice', label: "Voice Studio" }
    ];

    useEffect(() => {
        if (preset) {
            setActiveTab('generation');
        }
    }, [preset]);
    
    useEffect(() => {
        if (currentUser.role !== 'admin' && (activeTab === 'batch' || activeTab === 'combiner')) {
            setActiveTab('generation');
        }
    }, [currentUser.role, activeTab]);

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'generation':
                return <VideoGenerationView 
                            preset={preset} 
                            clearPreset={clearPreset} 
                            currentUser={currentUser}
                            onUserUpdate={onUserUpdate}
                            language={language}
                        />;
            case 'storyboard':
                return <ProductReviewView 
                            onReEdit={onReEdit} 
                            onCreateVideo={onCreateVideo} 
                            currentUser={currentUser}
                            onUserUpdate={onUserUpdate}
                            language={language}
                        />;
            case 'batch':
                return <BatchProcessorView preset={null} clearPreset={() => {}} language={language} />;
            case 'combiner':
                return <VideoCombinerView language={language} />;
            case 'voice':
                return <VoiceStudioView language={language} />;
            default:
                return <VideoGenerationView 
                            preset={preset} 
                            clearPreset={clearPreset} 
                            currentUser={currentUser}
                            onUserUpdate={onUserUpdate}
                            language={language}
                        />;
        }
    };

    // 'storyboard' (ProductReviewView) is the only view that is NOT a fixed-height layout and needs external scrolling.
    const isScrollableTab = activeTab === 'storyboard';

    return (
        <div className="h-auto lg:h-full flex flex-col">
            <div className="flex-shrink-0 mb-6 flex justify-center">
                <Tabs 
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isAdmin={currentUser.role === 'admin'}
                />
            </div>
            <div className={`flex-1 min-h-0 ${isScrollableTab ? 'overflow-y-auto' : ''}`}>
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default AiVideoSuiteView;
