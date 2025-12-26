
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateVideo } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { UploadIcon, PlayIcon, TrashIcon, CheckCircleIcon, XIcon, ClipboardListIcon } from '../Icons';
import { MODELS } from '../../services/aiConfig';
import { type BatchItem, type BatchProcessorPreset, type Language } from '../../types';
import { getTranslations } from '../../services/translations';

interface Log {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface BatchProcessorViewProps {
  preset: BatchProcessorPreset | null;
  clearPreset: () => void;
  language: Language;
}

const BatchProcessorView: React.FC<BatchProcessorViewProps> = ({ preset, clearPreset, language }) => {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const model = MODELS.videoGenerationDefault;
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [resolution, setResolution] = useState("720p");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<Log[]>([{ timestamp: new Date().toLocaleTimeString(), message: 'Engine ready. Upload a file to start.', type: 'info' }]);
  const [progress, setProgress] = useState({ completed: 0, failed: 0 });
  const isCancelledRef = useRef(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ timestamp: new Date().toLocaleTimeString(), message, type }, ...prev]);
  }, []);
  
  useEffect(() => {
    if (preset) {
        // Ensure prompts from storyboard are also editable and correctly formatted
        const formattedPreset = preset.map((item, index) => {
            const promptText = item.prompt.startsWith('**Scene') ? item.prompt : `**Scene ${index + 1}:** ${item.prompt}`;
            return {
                ...item,
                prompt: promptText
            };
        });
        setBatchItems(formattedPreset);
        setFileName(`${formattedPreset.length} prompts loaded from Storyboard.`);
        addLog(`${formattedPreset.length} prompts loaded from Storyboard.`, 'info');
        clearPreset();
    }
  }, [preset, clearPreset, addLog]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target?.result as string;
        
        // This regex splits the text right before a line that looks like a scene title.
        // A scene title is `**Scene <number>: <text>**`.
        // The positive lookahead `(?=...)` keeps the delimiter as part of the next chunk.
        const sceneDelimiter = /\s*(?=\n*\s*\*\*(?:Scene|Babak) \d+: [^*]+\*\*)/;
        
        let chunks = content.split(sceneDelimiter)
            .map(chunk => chunk.trim())
            .filter(chunk => chunk.length > 0);
        
        // The first chunk might be an intro. A real scene must start with the `**Scene...` pattern.
        // We also filter out any introductory text that might have slipped through.
        const finalChunks = chunks.filter(chunk => {
            const lowerChunk = chunk.toLowerCase();
            return (chunk.startsWith('**Scene') || chunk.startsWith('**Babak')) && !lowerChunk.includes('papan cerita') && !lowerChunk.includes('storyboard');
        });

        let items: BatchItem[];
        if (finalChunks.length > 0) {
            items = finalChunks.map(chunk => {
                // Clean up any rogue `**Scene X:**` markers that might be at the start of lines within the scene content.
                const cleanedPrompt = chunk.split('\n').map(line => line.trim().replace(/^\*\*(?:Scene|Babak) \d+:\*\*\s*/, '')).join('\n');
                return { prompt: cleanedPrompt.trim() };
            });
        } else {
            // Fallback for files that don't use the `**Scene X: Title**` format.
            const lines = content.split('\n').map(line => line.trim()).filter(line => line);
            items = lines.map(line => ({ prompt: line }));
        }

        setBatchItems(items);
        setFileName(file.name);
        addLog(`${items.length} prompts loaded from ${file.name}`, 'info');
    };
    reader.readAsText(file);
    if(e.target) e.target.value = '';
  };

  const clearItems = () => {
      setBatchItems([]);
      setFileName(null);
  }

  const handlePromptChange = (index: number, newPrompt: string) => {
    setBatchItems(prev => {
        const newItems = [...prev];
        newItems[index] = { ...newItems[index], prompt: newPrompt };
        return newItems;
    });
  };

  const handleStartProcess = async () => {
    if (batchItems.length === 0) return;

    const tokensJSON = sessionStorage.getItem('veoAuthTokens');
    if (!tokensJSON || tokensJSON === '[]') {
      addLog('Veo Authentication Token is required. Please set it using the Key icon in the header.', 'error');
      return;
    }

    setIsProcessing(true);
    isCancelledRef.current = false;
    setLogs([]);
    setProgress({ completed: 0, failed: 0 });
    addLog(`Starting batch process for ${batchItems.length} videos...`, 'info');

    for (let i = 0; i < batchItems.length; i++) {
        if (isCancelledRef.current) {
            addLog('Process cancelled by user.', 'info');
            break;
        }

        const item = batchItems[i];
        const prompt = item.prompt;
        addLog(`Processing [${i + 1}/${batchItems.length}]: ${prompt}`, 'info');

        try {
            const imagePayload = item.image ? { imageBytes: item.image.base64, mimeType: item.image.mimeType } : undefined;
            const { videoFile } = await generateVideo(prompt, model, aspectRatio, resolution, "", imagePayload);

            if (!videoFile) {
                throw new Error("Video generation did not return any output.");
            }
            
            await addHistoryItem({ type: 'Video', prompt: `Batch: ${prompt}`, result: videoFile });
            
            addLog(`Successfully generated video for: ${prompt}`, 'success');
            setProgress(p => ({ ...p, completed: p.completed + 1 }));
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Unknown error";
            addLog(`Failed to generate video for: ${prompt}. Error: ${errorMessage}`, 'error');
            setProgress(p => ({ ...p, failed: p.failed + 1 }));
        }
         // Add a small delay between requests to be polite to the API
        if (i < batchItems.length - 1) {
             await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    if (!isCancelledRef.current) {
        addLog('Batch process completed.', 'info');
    }
    setIsProcessing(false);
  };

  const handleStopProcess = () => {
    isCancelledRef.current = true;
  };

  const getLogIcon = (type: Log['type']) => {
      switch(type) {
          case 'success': return <CheckCircleIcon className="w-4 h-4 text-green-500"/>
          case 'error': return <XIcon className="w-4 h-4 text-red-500"/>
          default: return <ClipboardListIcon className="w-4 h-4 text-neutral-500"/>
      }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Panel: Controls */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        <div>
          <h1 className="text-xl font-bold sm:text-3xl">Batch Video Processor</h1>
          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">Generate multiple videos from a list of prompts.</p>
        </div>

        <div>
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-300 h-32 border-neutral-300 dark:border-neutral-700 hover:border-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50">
                <UploadIcon className="w-6 h-6 mb-2 text-neutral-500 dark:text-neutral-400" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Upload Prompts (.txt)</p>
                <input id="file-upload" type="file" accept=".txt" onChange={handleFileChange} className="hidden" disabled={isProcessing}/>
            </label>
            {fileName && (
                <div className="mt-2 text-center text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>{fileName}</span>
                </div>
            )}
        </div>

        <div className="flex-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-md p-3 space-y-3 overflow-y-auto min-h-[200px] custom-scrollbar">
            {batchItems.length > 0 ? (
                batchItems.map((item, i) => (
                  <div key={i} className="bg-white dark:bg-neutral-900 p-2 rounded-md flex flex-col gap-2">
                    {item.image && (
                        <div className="flex items-center gap-2">
                          <img src={`data:${item.image.mimeType};base64,${item.image.base64}`} alt={`Preview for prompt ${i+1}`} className="w-10 h-10 object-cover rounded-sm flex-shrink-0" />
                        </div>
                    )}
                    <textarea
                      value={item.prompt}
                      onChange={(e) => handlePromptChange(i, e.target.value)}
                      rows={item.image ? 3 : 4}
                      className="w-full text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 p-2 rounded-md resize-none custom-scrollbar focus:ring-1 focus:ring-primary-500 focus:outline-none"
                      disabled={isProcessing}
                    />
                  </div>
                ))
            ) : (
                <div className="text-center text-xs text-neutral-500 h-full flex items-center justify-center">Upload a .txt file with one prompt per line, or load prompts from a storyboard.</div>
            )}
        </div>
        {batchItems.length > 0 && <button onClick={clearItems} disabled={isProcessing} className="text-sm text-red-500 hover:underline disabled:opacity-50">Clear all prompts</button>}
        
        <div>
            <h3 className="text-lg font-semibold mb-2">Video Settings</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Aspect Ratio</label>
                         <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" disabled={isProcessing}>
                            {["9:16", "1:1", "16:9", "4:3", "3:4"].map(ar => <option key={ar} value={ar}>{ar}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Resolution</label>
                        <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" disabled={isProcessing}>
                            {["720p", "1080p"].map(res => <option key={res} value={res}>{res}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-4 mt-auto flex gap-4">
            <button onClick={handleStartProcess} disabled={isProcessing || batchItems.length === 0} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isProcessing ? <Spinner /> : <PlayIcon className="w-5 h-5"/>}
                Start Processing
            </button>
             <button onClick={handleStopProcess} disabled={!isProcessing} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Stop
            </button>
        </div>
      </div>

      {/* Right Panel: Logs & Progress */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-6 shadow-sm">
        <h3 className="text-xl font-bold mb-4 flex-shrink-0">Log & Progress</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 flex-shrink-0">
            <div className="bg-neutral-100 dark:bg-neutral-800/50 p-4 rounded-lg text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Prompts</p>
                <p className="text-2xl font-bold">{batchItems.length}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg text-center">
                <p className="text-sm text-green-800 dark:text-green-300">Generated</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-200">{progress.completed}</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg text-center">
                <p className="text-sm text-red-800 dark:text-red-300">Failed</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-200">{progress.failed}</p>
            </div>
        </div>
        
        <div className="flex-1 flex flex-col bg-neutral-100 dark:bg-neutral-950 rounded-lg p-2 min-h-0">
            <h4 className="text-lg font-semibold mb-2 px-2 flex-shrink-0">Activity Log</h4>
            <div ref={logContainerRef} className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar flex flex-col-reverse">
                {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 text-sm rounded-md bg-white dark:bg-neutral-900">
                        <span className="flex-shrink-0 mt-0.5">{getLogIcon(log.type)}</span>
                        <div className="flex-1">
                            <span className="font-mono text-xs text-neutral-500">{log.timestamp}</span>
                            <p className="text-neutral-700 dark:text-neutral-300">{log.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default BatchProcessorView;
