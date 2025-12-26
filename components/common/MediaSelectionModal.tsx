import React, { useState, useEffect, useCallback } from 'react';
import { getHistory } from '../../services/historyService';
import { type HistoryItem } from '../../types';
import { ImageIcon, VideoIcon, XIcon, CheckCircleIcon } from '../Icons';
import Spinner from './Spinner';
import Tabs from './Tabs';

interface MediaSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selected: HistoryItem[]) => void;
}

type ModalTabId = 'images' | 'videos';

const MediaSelectionModal: React.FC<MediaSelectionModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [allItems, setAllItems] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ModalTabId>('images');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());

    const imageItems = allItems.filter(item => (item.type === 'Image' || item.type === 'Canvas') && item.result !== 'unavailable');
    const videoItems = allItems.filter(item => item.type === 'Video' && item.result !== 'unavailable');

    const tabs: {id: ModalTabId, label: string, count: number}[] = [
        { id: 'images', label: 'Images', count: imageItems.length },
        { id: 'videos', label: 'Videos', count: videoItems.length },
    ];

    const getDisplayUrl = useCallback((item: HistoryItem): string => {
        if (item.type === 'Image' || item.type === 'Canvas') {
            return `data:image/png;base64,${item.result as string}`;
        }
        if (item.result instanceof Blob) {
            return blobUrls.get(item.id) || '';
        }
        return item.result as string;
    }, [blobUrls]);

    useEffect(() => {
        if (isOpen) {
            const fetchAndPrepareData = async () => {
                setIsLoading(true);
                const history = await getHistory();
                setAllItems(history);
                
                const newUrls = new Map<string, string>();
                history.forEach(item => {
                    if (item.result instanceof Blob) {
                        newUrls.set(item.id, URL.createObjectURL(item.result));
                    }
                });
                setBlobUrls(newUrls);
                setIsLoading(false);
            };
            fetchAndPrepareData();
        } else {
            // Reset selection when closing
            setSelectedIds([]);
        }

        // Cleanup blob URLs on close or unmount
        return () => {
            blobUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [isOpen]);

    const handleSelect = (item: HistoryItem) => {
        const isVideo = item.type === 'Video';
        const isSelected = selectedIds.includes(item.id);

        if (isSelected) {
            setSelectedIds(prev => prev.filter(id => id !== item.id));
            return;
        }

        if (isVideo) {
            // If a video is selected, deselect everything else and select only this video
            setSelectedIds([item.id]);
        } else { // It's an image
            const hasVideoSelected = selectedIds.some(id => allItems.find(i => i.id === id)?.type === 'Video');
            if (hasVideoSelected) return; // Don't allow image selection if video is selected
            
            const imageSelectionsCount = selectedIds.filter(id => allItems.find(i => i.id === id)?.type !== 'Video').length;
            if (imageSelectionsCount < 4) {
                 setSelectedIds(prev => [...prev, item.id]);
            }
        }
    };
    
    const handleConfirm = () => {
        const selectedItems = allItems.filter(item => selectedIds.includes(item.id));
        onConfirm(selectedItems);
        onClose();
    };

    if (!isOpen) return null;
    
    const itemsToDisplay = activeTab === 'images' ? imageItems : videoItems;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-zoomIn p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Select Media from Gallery</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"><XIcon className="w-6 h-6"/></button>
                </div>
                
                <div className="flex justify-center">
                    <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 my-3">You can select up to 4 images OR 1 video.</p>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {isLoading ? <div className="flex h-full items-center justify-center"><Spinner /></div> : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {itemsToDisplay.map(item => {
                                const isSelected = selectedIds.includes(item.id);
                                return (
                                    <div key={item.id} className="relative aspect-square cursor-pointer group" onClick={() => handleSelect(item)}>
                                        {item.type === 'Video' ? (
                                            <video src={getDisplayUrl(item)} className="w-full h-full object-cover rounded-md bg-black" muted loop playsInline/>
                                        ) : (
                                            <img src={getDisplayUrl(item)} alt={item.prompt} className="w-full h-full object-cover rounded-md bg-neutral-200 dark:bg-neutral-800"/>
                                        )}
                                        <div className={`absolute inset-0 rounded-md transition-all ${isSelected ? 'ring-4 ring-primary-500 bg-black/40' : 'group-hover:bg-black/20'}`}>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full p-1">
                                                    <CheckCircleIcon className="w-5 h-5"/>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="mt-6 flex justify-end">
                    <button onClick={handleConfirm} className="bg-primary-600 text-white font-semibold py-2 px-8 rounded-lg hover:bg-primary-700 transition-colors">
                        Confirm Selection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MediaSelectionModal;