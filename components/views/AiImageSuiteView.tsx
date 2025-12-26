
import React, { useState, useEffect } from 'react';
import ImageEnhancerView from './ImageEnhancerView';
import ImageGenerationView from './ImageGenerationView';
import BackgroundRemoverView from './BackgroundRemoverView';
import ProductPhotoView from './ProductPhotoView';
import TiktokAffiliateView from './TiktokAffiliateView';
import Tabs, { type Tab } from '../common/Tabs';
import { type Language, type User } from '../../types';

type TabId = 'generation' | 'enhancer' | 'remover' | 'product' | 'model';

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface AiImageSuiteViewProps {
  onCreateVideo: (preset: VideoGenPreset) => void;
  onReEdit: (preset: ImageEditPreset) => void;
  imageToReEdit: ImageEditPreset | null;
  clearReEdit: () => void;
  presetPrompt: string | null;
  clearPresetPrompt: () => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  language: Language;
}

const AiImageSuiteView: React.FC<AiImageSuiteViewProps> = ({ onCreateVideo, onReEdit, imageToReEdit, clearReEdit, presetPrompt, clearPresetPrompt, currentUser, onUserUpdate, language }) => {
    const [activeTab, setActiveTab] = useState<TabId>('generation');

    const tabs: Tab<TabId>[] = [
        { id: 'generation', label: "Image Generation" },
        { id: 'product', label: "Product Photos" },
        { id: 'model', label: "Model Photos" },
        { id: 'enhancer', label: "Enhancer" },
        { id: 'remover', label: "Background Remover" },
    ];

    useEffect(() => {
        if (imageToReEdit) {
            setActiveTab('generation');
        }
    }, [imageToReEdit]);

    useEffect(() => {
        if (presetPrompt) {
            setActiveTab('generation');
        }
    }, [presetPrompt]);

    const renderActiveTabContent = () => {
        const commonProps = { onReEdit, onCreateVideo, currentUser, onUserUpdate, language };
        switch (activeTab) {
            case 'generation':
                return <ImageGenerationView 
                          {...commonProps} 
                          imageToReEdit={imageToReEdit} 
                          clearReEdit={clearReEdit}
                          presetPrompt={presetPrompt}
                          clearPresetPrompt={clearPresetPrompt} 
                        />;
            case 'enhancer':
                return <ImageEnhancerView {...commonProps} />;
            case 'remover':
                return <BackgroundRemoverView {...commonProps} />;
            case 'product':
                return <ProductPhotoView {...commonProps} />;
            case 'model':
                return <TiktokAffiliateView {...commonProps} />;
            default:
                return <ImageGenerationView 
                          {...commonProps} 
                          imageToReEdit={imageToReEdit} 
                          clearReEdit={clearReEdit}
                          presetPrompt={presetPrompt}
                          clearPresetPrompt={clearPresetPrompt} 
                        />;
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
            <div className="flex-1 min-h-0">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default AiImageSuiteView;
