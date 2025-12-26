
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getHistory, deleteHistoryItem } from '../../services/historyService';
// FIX: Add missing Language import.
import { type HistoryItem, type AiLogItem, type Language } from '../../types';
import { ImageIcon, VideoIcon, DownloadIcon, TrashIcon, PlayIcon, AudioIcon, WandIcon, ClipboardListIcon, ChevronDownIcon, ClipboardIcon, CheckCircleIcon, AlertTriangleIcon } from '../Icons';
import Tabs, { type Tab } from '../common/Tabs';
import PreviewModal from '../common/PreviewModal'; // Import the new component
import { getLogs, clearLogs } from '../../services/aiLogService';
import Spinner from '../common/Spinner';
import { getTranslations } from '../../services/translations';

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface GalleryViewProps {
  onCreateVideo: (preset: VideoGenPreset) => void;
  onReEdit: (preset: ImageEditPreset) => void;
  // FIX: Add language to props.
  language: Language;
}

type GalleryTabId = 'images' | 'videos' | 'log';

const AiLogPanel: React.FC = () => {
    const [logs, setLogs] = useState<AiLogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const T = getTranslations().galleryView;
    const commonT = getTranslations().common;

    const refreshLogs = useCallback(async () => {
        setIsLoading(true);
        const fetchedLogs = await getLogs();
        setLogs(fetchedLogs);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        refreshLogs();
    }, [refreshLogs]);

    useEffect(() => {
        const newUrls = new Map<string, string>();
        logs.forEach(log => {
            if (log.mediaOutput instanceof Blob) {
                newUrls.set(log.id, URL.createObjectURL(log.mediaOutput));
            }
        });
        setBlobUrls(newUrls);
        return () => { newUrls.forEach(url => URL.revokeObjectURL(url)); };
    }, [logs]);

    const handleClearLogs = async () => {
        if (window.confirm(T.log.confirmClear || "Are you sure you want to clear all logs? This action cannot be undone.")) {
            await clearLogs();
            await refreshLogs();
        }
    };

    const handleToggleExpand = (logId: string) => {
        setExpandedLogId(prevId => (prevId === logId ? null : logId));
    };
    
    const renderPreview = (log: AiLogItem) => {
        const baseClasses = "w-10 h-10 object-cover rounded bg-neutral-200 dark:bg-neutral-800 flex-shrink-0";
        if (!log.mediaOutput) return <div className={`${baseClasses} flex items-center justify-center`}><ClipboardListIcon className="w-5 h-5 text-neutral-500"/></div>;
        if (typeof log.mediaOutput === 'string') return <img src={`data:image/png;base64,${log.mediaOutput}`} alt={T.log.preview || "Preview"} className={baseClasses} />;
        if (log.mediaOutput instanceof Blob) {
            const url = blobUrls.get(log.id);
            if (!url) return <div className={`${baseClasses} flex items-center justify-center`}><Spinner /></div>;
            if (log.mediaOutput.type.startsWith('video/')) return <video src={url} className={`${baseClasses} bg-black`} muted loop playsInline />;
            if (log.mediaOutput.type.startsWith('audio/')) return <div className={`${baseClasses} flex items-center justify-center`}><AudioIcon className="w-5 h-5 text-neutral-500" /></div>;
        }
        return <div className={baseClasses}></div>;
    };
    
    const LogDetailTabs: React.FC<{ log: AiLogItem }> = ({ log }) => {
        const [activeTab, setActiveTab] = useState<'prompt' | 'output' | 'details'>('prompt');
        const [copied, setCopied] = useState(false);

        const handleCopy = (text: string) => {
            if (!text) return;
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        const tabs = [
            { id: 'prompt', label: T.log.prompt || 'Prompt' },
            { id: 'output', label: T.log.output || 'Output' },
            { id: 'details', label: T.log.details || 'Details' }
        ];

        const renderContent = () => {
            const textToCopy = activeTab === 'prompt' ? log.prompt : log.output;
            switch (activeTab) {
                case 'prompt':
                case 'output':
                    return (
                        <div className="relative">
                            <pre className="text-sm whitespace-pre-wrap font-sans bg-neutral-100 dark:bg-neutral-900/80 p-3 rounded-md max-h-60 overflow-y-auto custom-scrollbar">
                                {textToCopy || T.log.noContent || 'No content.'}
                            </pre>
                            <button
                                onClick={() => handleCopy(textToCopy)}
                                className="absolute top-2 right-2 flex items-center gap-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-1 px-2 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors text-xs"
                            >
                                {copied ? <CheckCircleIcon className="w-3 h-3 text-green-500" /> : <ClipboardIcon className="w-3 h-3" />}
                                {copied ? commonT.copied : commonT.copy}
                            </button>
                        </div>
                    );
                case 'details':
                    return (
                        <ul className="text-sm space-y-2 text-neutral-700 dark:text-neutral-300">
                            <li className="flex justify-between items-center"><strong>{T.log.model || 'Model:'}</strong> <span className="font-mono text-xs bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded">{log.model}</span></li>
                            <li className="flex justify-between items-center"><strong>{T.log.status || 'Status:'}</strong> <span className={`font-semibold ${log.status === 'Error' ? 'text-red-500' : 'text-green-500'}`}>{log.status}</span></li>
                            <li className="flex justify-between items-center"><strong>{T.log.cost || 'Est. Cost / Tokens:'}</strong> {log.cost ? `$${log.cost.toFixed(4)}` : (log.tokenCount > 0 ? log.tokenCount.toLocaleString() : T.log.na || 'N/A')}</li>
                            {log.error && <li className="pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-700"><strong>{T.log.error || 'Error:'}</strong> <span className="text-red-500">{log.error}</span></li>}
                        </ul>
                    );
                default: return null;
            }
        };

        return (
            <div>
                <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-3">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div>{renderContent()}</div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold">{T.log.title || 'AI API Log'}</h2>
                {logs.length > 0 && <button onClick={handleClearLogs} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-semibold"><TrashIcon className="w-4 h-4" /> {T.log.clear || 'Clear Logs'}</button>}
            </div>
            {isLoading ? <div className="flex-1 flex justify-center items-center py-20"><Spinner /></div> : logs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center py-20 text-neutral-500">
                    <div>
                        <ClipboardListIcon className="w-16 h-16 mx-auto mb-4" />
                        <p className="font-semibold">{T.log.empty || 'No Log Entries Found'}</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                    {logs.map(log => (
                        <div key={log.id} className={`bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border transition-shadow hover:shadow-md ${expandedLogId === log.id ? 'border-primary-400 dark:border-primary-600' : 'border-neutral-200 dark:border-neutral-800'}`}>
                            <div
                                className="flex items-center gap-4 p-3 cursor-pointer"
                                onClick={() => handleToggleExpand(log.id)}
                                aria-expanded={expandedLogId === log.id}
                            >
                                {renderPreview(log)}
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-xs text-neutral-700 dark:text-neutral-300 truncate">{log.model}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.status === 'Error' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>{log.status}</span>
                                </div>
                                <ChevronDownIcon className={`w-5 h-5 text-neutral-400 flex-shrink-0 transition-transform ${expandedLogId === log.id ? 'rotate-180' : ''}`} />
                            </div>
                            {expandedLogId === log.id && (
                                <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 animate-zoomIn">
                                    <LogDetailTabs log={log} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const GalleryView: React.FC<GalleryViewProps> = ({ onCreateVideo, onReEdit, language }) => {
    const [allItems, setAllItems] = useState<HistoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<GalleryTabId>('images');
    const [blobUrls, setBlobUrls] = useState(new Map<string, string>());
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const blobUrlsRef = useRef(new Map<string, string>());
    const T = getTranslations().galleryView;

    const refreshHistory = useCallback(async () => {
        const history = await getHistory();
        setAllItems(history);
    }, []);

    useEffect(() => {
        refreshHistory();
    }, [refreshHistory]);

    // Robustly manage object URLs to prevent premature revocation
    useEffect(() => {
        const prevUrls = blobUrlsRef.current;
        const nextUrls = new Map<string, string>();

        for (const item of allItems) {
            if (item.result instanceof Blob) {
                // Check if a URL already exists. If so, reuse it to prevent flicker.
                if (prevUrls.has(item.id)) {
                    nextUrls.set(item.id, prevUrls.get(item.id)!);
                } else {
                    nextUrls.set(item.id, URL.createObjectURL(item.result));
                }
            }
        }
        
        // Revoke URLs that are no longer in use
        for (const [id, url] of prevUrls.entries()) {
            if (!nextUrls.has(id)) {
                URL.revokeObjectURL(url);
            }
        }

        blobUrlsRef.current = nextUrls;
        setBlobUrls(new Map(nextUrls));
    }, [allItems]);

    // Cleanup all remaining URLs on unmount
    useEffect(() => {
        return () => {
            for (const url of blobUrlsRef.current.values()) {
                URL.revokeObjectURL(url);
            }
        };
    }, []);
    
    const getDisplayUrl = (item: HistoryItem): string => {
        if (item.type === 'Image' || item.type === 'Canvas') {
            return `data:image/png;base64,${item.result as string}`;
        }
        return blobUrls.get(item.id) || '';
    };
    
    const downloadAsset = (item: HistoryItem) => {
        const link = document.createElement('a');
        let fileName: string;
        let href: string | null = null;
        let urlToRevoke: string | null = null;
    
        switch (item.type) {
            case 'Image':
            case 'Canvas':
                fileName = `monoklix-${item.type.toLowerCase()}-${item.id}.png`;
                href = `data:image/png;base64,${item.result}`;
                break;
            case 'Video':
            case 'Audio':
                const extension = item.type === 'Video' ? 'mp4' : 'wav';
                fileName = `monoklix-${item.type.toLowerCase()}-${item.id}.${extension}`;
                href = blobUrls.get(item.id) || null;
                break;
            case 'Storyboard':
            case 'Copy':
                fileName = `monoklix-${item.type.toLowerCase()}-${item.id}.txt`;
                const blob = new Blob([item.result as string], { type: 'text/plain;charset=utf-8' });
                href = URL.createObjectURL(blob);
                urlToRevoke = href;
                break;
            default:
                return;
        }
    
        if (!href) return;
    
        link.href = href;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        if (urlToRevoke) {
            URL.revokeObjectURL(urlToRevoke);
        }
    };

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(T.confirmDelete || "Are you sure you want to delete this item from your history?")) {
            await deleteHistoryItem(id);
            await refreshHistory();
        }
    };
    
    const imageItems = allItems.filter(item => item.type === 'Image' || item.type === 'Canvas');
    const videoItems = allItems.filter(item => item.type === 'Video');
    const itemsToDisplay = activeTab === 'images' ? imageItems : videoItems;

    const tabs: Tab<GalleryTabId>[] = [
        { id: 'images', label: T.tabs.images, count: imageItems.length },
        { id: 'videos', label: T.tabs.videos, count: videoItems.length },
        { id: 'log', label: T.tabs.log },
    ];


    const renderGridItem = (item: HistoryItem, index: number) => {
        const isImage = item.type === 'Image' || item.type === 'Canvas';
        const isVideo = item.type === 'Video';
        const isUnavailable = item.result === 'unavailable';
        const displayUrl = isUnavailable ? '' : getDisplayUrl(item);

        if (isUnavailable) {
            return (
                <div 
                    key={item.id} 
                    className="group relative aspect-square bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden shadow-md flex flex-col items-center justify-center text-center p-3"
                >
                    <AlertTriangleIcon className="w-8 h-8 text-yellow-500 mb-2"/>
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{T.unavailable}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{T.unavailableHelp}</p>
                     <button
                        onClick={(e) => handleActionClick(e, () => handleDelete(item.id))}
                        className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title={T.deleteEntry}
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            );
        }

        return (
            <div 
                key={item.id} 
                className="group relative aspect-square bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden shadow-md cursor-pointer"
                onClick={() => setPreviewIndex(index)}
            >
                {isImage && <img src={displayUrl} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                {isVideo && displayUrl && (
                    <div className="w-full h-full flex items-center justify-center">
                        <video src={displayUrl} className="w-full h-full object-cover" loop muted playsInline title={item.prompt}/>
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity">
                            <PlayIcon className="w-12 h-12 text-white/80" />
                        </div>
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <p className="text-white text-xs line-clamp-3 drop-shadow-md">{item.prompt}</p>
                    <div className="flex justify-end gap-2">
                        {isImage && (
                          <>
                            <button
                                onClick={(e) => handleActionClick(e, () => onReEdit({ base64: item.result as string, mimeType: 'image/png' }))}
                                className="p-2 bg-purple-600/80 text-white rounded-full hover:bg-purple-600 transition-colors transform hover:scale-110"
                                title={T.reEdit}
                            >
                                <WandIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => handleActionClick(e, () => onCreateVideo({ prompt: item.prompt, image: { base64: item.result as string, mimeType: 'image/png' } }))}
                                className="p-2 bg-primary-600/80 text-white rounded-full hover:bg-primary-600 transition-colors transform hover:scale-110"
                                title={T.createVideo}
                            >
                                <VideoIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                            onClick={(e) => handleActionClick(e, () => downloadAsset(item))}
                            className="p-2 bg-white/80 text-black rounded-full hover:bg-white transition-colors transform hover:scale-110"
                            title={T.download}
                        >
                            <DownloadIcon className="w-4 h-4" />
                        </button>
                         <button
                            onClick={(e) => handleActionClick(e, () => handleDelete(item.id))}
                            className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-500 transition-colors transform hover:scale-110"
                            title={T.delete}
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'images':
            case 'videos':
                if (itemsToDisplay.length > 0) {
                    return (
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {itemsToDisplay.map((item, index) => renderGridItem(item, index))}
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="flex-1 flex items-center justify-center text-center text-neutral-500 dark:text-neutral-400">
                        <div>
                            <div className="inline-block p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-full mb-4">
                                {activeTab === 'images' ? <ImageIcon className="w-10 h-10" /> : <VideoIcon className="w-10 h-10" />}
                            </div>
                            <p className="font-semibold">{T.emptyTitle.replace('{tab}', activeTab === 'images' ? T.tabs.images : T.tabs.videos)}</p>
                            <p className="text-sm">{T.emptySubtitle}</p>
                        </div>
                    </div>
                );
            case 'log':
                return <AiLogPanel />;
            default:
                return null;
        }
    };

    const itemToPreview = previewIndex !== null ? itemsToDisplay[previewIndex] : null;

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0">
                <h1 className="text-xl font-bold sm:text-3xl">{T.title}</h1>
                <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
            </div>
            
            <div className="flex-shrink-0 my-6 flex justify-center">
                <Tabs 
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>

            <div className="flex-1 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-0">
                {renderContent()}
            </div>
            
            {itemToPreview && (
                <PreviewModal
                    item={itemToPreview}
                    onClose={() => setPreviewIndex(null)}
                    getDisplayUrl={getDisplayUrl}
                    onNext={() => {
                        if (previewIndex !== null && previewIndex < itemsToDisplay.length - 1) {
                            setPreviewIndex(previewIndex + 1);
                        }
                    }}
                    onPrevious={() => {
                        if (previewIndex !== null && previewIndex > 0) {
                            setPreviewIndex(previewIndex - 1);
                        }
                    }}
                    hasNext={previewIndex !== null && previewIndex < itemsToDisplay.length - 1}
                    hasPrevious={previewIndex !== null && previewIndex > 0}
                    language={language}
                />
            )}
        </div>
    );
};

// FIX: Change to named export to match the import in App.tsx
export { GalleryView };
