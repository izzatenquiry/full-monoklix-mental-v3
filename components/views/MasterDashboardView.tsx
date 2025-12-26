import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ActivityIcon, AlertTriangleIcon, DownloadIcon, XIcon, ImageIcon, RefreshCwIcon, VideoIcon, PlayIcon, KeyIcon, CheckCircleIcon, UploadIcon } from '../Icons';
import Spinner from '../common/Spinner';
import ImageUpload from '../common/ImageUpload';
import { type User, type Language } from '../../types';
import { cropImageToAspectRatio } from '../../services/imageService';
import CreativeDirectionPanel from '../common/CreativeDirectionPanel';
import { getInitialCreativeDirectionState, type CreativeDirectionState } from '../../services/creativeDirectionService';
import { runComprehensiveTokenTest, type TokenTestResult } from '../../services/imagenV3Service';
import { addTokenToPool } from '../../services/userService';
import { UI_SERVER_LIST } from '../../services/serverConfig';

// --- CONFIG ---
const SERVERS = UI_SERVER_LIST;

type TestType = 'T2I' | 'I2I' | 'I2V';
type Status = 'idle' | 'uploading' | 'running' | 'success' | 'failed';

interface ServerStats {
    success: number;
    failed: number;
}

interface ServerState {
    status: Status;
    logs: string[];
    resultType?: 'image' | 'video';
    resultUrl?: string; // Base64 for image, URL for video
    error?: string;
    mediaId?: string; // For multi-step processes
    duration?: string;
}

interface MasterDashboardViewProps {
    currentUser: User;
    language: Language;
}

const PRESET_PROMPTS = {
    'English': "Modern Malay couple posing for a photo.",
    'Bahasa Malaysia': "Pasangan melayu moden sedang bergambar."
};

// Helper to safely parse JSON
const safeJson = async (res: Response) => {
    try {
        return await res.json();
    } catch {
        return { error: { message: await res.text() } };
    }
};

// Helper to download base64 or URL
const downloadContent = (url: string, type: 'image' | 'video', filenamePrefix: string) => {
    const link = document.createElement('a');
    link.href = type === 'image' && !url.startsWith('http') ? `data:image/png;base64,${url}` : url;
    link.download = `${filenamePrefix}-${Date.now()}.png`;
    if (type === 'video') link.download = `${filenamePrefix}-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const TokenHealthTester: React.FC = () => {
    const [token, setToken] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [results, setResults] = useState<TokenTestResult[] | null>(null);
    
    const [targetPool, setTargetPool] = useState<'veo' | 'imagen'>('veo');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleTest = async () => {
        if (!token.trim()) return;
        setIsTesting(true);
        setResults(null);
        try {
            const res = await runComprehensiveTokenTest(token.trim());
            setResults(res);
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async () => {
        if (!token.trim()) return;
        setIsSaving(true);
        setSaveMessage(null);
        
        const result = await addTokenToPool(token.trim(), targetPool);
        
        if (result.success) {
            setSaveMessage({ type: 'success', text: `Saved to ${targetPool === 'veo' ? 'Veo' : 'Imagen'} pool!` });
            setToken(''); // Clear input on success
        } else {
            setSaveMessage({ type: 'error', text: result.message || 'Failed to save.' });
        }
        setIsSaving(false);
        setTimeout(() => setSaveMessage(null), 3000);
    };

    const getStatusBadge = (result?: TokenTestResult) => {
        if (!result) return <span className="text-xs text-neutral-400">Waiting...</span>;
        return result.success 
            ? <span className="flex items-center gap-1 text-xs text-green-600 font-bold"><CheckCircleIcon className="w-3 h-3"/> OK</span>
            : <span className="flex items-center gap-1 text-xs text-red-600 font-bold"><XIcon className="w-3 h-3"/> FAIL</span>;
    };

    return (
        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-neutral-700 dark:text-neutral-300">
                <KeyIcon className="w-4 h-4 text-primary-500" /> Manual Token Tester & Saver
            </h3>
            <div className="flex gap-2 mb-3">
                <input 
                    type="text" 
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste __SESSION token here..."
                    className="flex-1 p-2 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                />
                <button 
                    onClick={handleTest} 
                    disabled={isTesting || !token.trim()}
                    className="px-3 py-2 bg-neutral-800 dark:bg-neutral-700 text-white text-xs font-bold rounded hover:bg-neutral-700 dark:hover:bg-neutral-600 disabled:opacity-50"
                >
                    {isTesting ? <Spinner /> : 'Test'}
                </button>
            </div>
            
            {results && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {['Imagen', 'Veo'].map(service => {
                        const res = results.find(r => r.service === service);
                        return (
                            <div key={service} className={`p-2 rounded border text-xs ${res?.success ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold uppercase">{service}</span>
                                    {getStatusBadge(res)}
                                </div>
                                {res && !res.success && (
                                    <p className="text-[10px] text-red-500 truncate" title={res.message}>{res.message}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Save to Database</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded border border-neutral-200 dark:border-neutral-700">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input 
                                type="radio" 
                                name="pool" 
                                checked={targetPool === 'veo'} 
                                onChange={() => setTargetPool('veo')}
                                className="text-primary-600 focus:ring-primary-500" 
                            /> 
                            <span className="text-neutral-700 dark:text-neutral-300">Veo Pool</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input 
                                type="radio" 
                                name="pool" 
                                checked={targetPool === 'imagen'} 
                                onChange={() => setTargetPool('imagen')}
                                className="text-primary-600 focus:ring-primary-500"
                            /> 
                            <span className="text-neutral-700 dark:text-neutral-300">Imagen Pool</span>
                        </label>
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || !token.trim()}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 h-full"
                    >
                        {isSaving ? <Spinner /> : <UploadIcon className="w-3 h-3" />}
                        Save
                    </button>
                </div>
                {saveMessage && (
                    <p className={`text-[10px] mt-1.5 ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                        {saveMessage.text}
                    </p>
                )}
            </div>
        </div>
    );
};

const MasterDashboardView: React.FC<MasterDashboardViewProps> = ({ currentUser, language }) => {
    const [promptLanguage, setPromptLanguage] = useState<'English' | 'Bahasa Malaysia'>('English');
    const [prompt, setPrompt] = useState(PRESET_PROMPTS['English']);
    const [targetServerId, setTargetServerId] = useState<string>('all'); 
    
    const [referenceImages, setReferenceImages] = useState<({ base64: string, mimeType: string } | null)[]>([null, null]);
    const [uploadKeys, setUploadKeys] = useState([Date.now(), Date.now() + 1]);
    const [previewItem, setPreviewItem] = useState<{ type: 'image' | 'video', url: string } | null>(null);
    
    // Creative Direction State
    const [creativeState, setCreativeState] = useState<CreativeDirectionState>(getInitialCreativeDirectionState());

    // Auto-Loop State
    const [isLooping, setIsLooping] = useState(false);
    const [lastTestType, setLastTestType] = useState<TestType | null>(null);
    const loopTimeoutRef = useRef<number | null>(null);
    const isProcessingRef = useRef(false);

    // Stats State
    const [serverStats, setServerStats] = useState<Record<string, ServerStats>>(
        SERVERS.reduce((acc, server) => ({ ...acc, [server.id]: { success: 0, failed: 0 } }), {})
    );
    
    // Initialize state for all 10 servers
    const [serverStates, setServerStates] = useState<Record<string, ServerState>>(
        SERVERS.reduce((acc, server) => ({ ...acc, [server.id]: { status: 'idle', logs: [] } }), {})
    );

    const updateServerState = (serverId: string, updates: Partial<ServerState>) => {
        setServerStates(prev => ({
            ...prev,
            [serverId]: { ...prev[serverId], ...updates }
        }));
    };
    
    const incrementStats = (serverId: string, isSuccess: boolean) => {
        setServerStats(prev => ({
            ...prev,
            [serverId]: {
                success: prev[serverId].success + (isSuccess ? 1 : 0),
                failed: prev[serverId].failed + (isSuccess ? 0 : 1)
            }
        }));
    };

    const appendLog = (serverId: string, message: string) => {
        setServerStates(prev => ({
            ...prev,
            [serverId]: { 
                ...prev[serverId], 
                logs: [...prev[serverId].logs, `[${new Date().toLocaleTimeString()}] ${message}`] 
            }
        }));
    };

    const handleResetServer = (serverId: string) => {
        setServerStates(prev => ({
            ...prev,
            [serverId]: { status: 'idle', logs: [], resultUrl: undefined, resultType: undefined, error: undefined, duration: undefined }
        }));
    };
  
    const handleCreateNewServer = (serverId: string) => {
         setServerStates(prev => ({
            ...prev,
            [serverId]: { ...prev[serverId], status: 'idle', resultUrl: undefined, resultType: undefined, error: undefined }
        }));
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang = e.target.value as 'English' | 'Bahasa Malaysia';
        setPromptLanguage(lang);
        setPrompt(PRESET_PROMPTS[lang]);
    };

    const handleImageUpdate = (index: number, data: { base64: string, mimeType: string } | null) => {
        setReferenceImages(prev => {
            const newImages = [...prev];
            newImages[index] = data;
            return newImages;
        });
    };

    const constructFullPrompt = () => {
        const creativeParts = [];
        if (creativeState.vibe !== 'Random') creativeParts.push(`Vibe: ${creativeState.vibe}`);
        if (creativeState.style !== 'Random') creativeParts.push(`Style: ${creativeState.style}`);
        if (creativeState.lighting !== 'Random') creativeParts.push(`Lighting: ${creativeState.lighting}`);
        if (creativeState.camera !== 'Random') creativeParts.push(`Camera: ${creativeState.camera}`);
        if (creativeState.composition !== 'Random') creativeParts.push(`Composition: ${creativeState.composition}`);
        if (creativeState.lensType !== 'Random') creativeParts.push(`Lens: ${creativeState.lensType}`);
        if (creativeState.filmSim !== 'Random') creativeParts.push(`Film Sim: ${creativeState.filmSim}`);
        if (creativeState.effect !== 'None' && creativeState.effect !== 'Random') creativeParts.push(`Effect: ${creativeState.effect}`);
        
        return creativeParts.length > 0 ? `${prompt}\n\nCreative Direction: ${creativeParts.join(', ')}` : prompt;
    };

    const runTestForServer = async (server: typeof SERVERS[0], type: TestType) => {
        // Reset state (but keep result for a moment if needed, though we clear it here)
        updateServerState(server.id, { status: 'running', logs: [], error: undefined, duration: undefined });
        appendLog(server.id, `Starting ${type} test on ${server.url}...`);
        
        const startTime = Date.now();
        const randomSeed = Math.floor(Math.random() * 2147483647);
        appendLog(server.id, `Random Seed: ${randomSeed}`);

        const authToken = currentUser.personalAuthToken;
        if (!authToken) {
            updateServerState(server.id, { status: 'failed', error: 'No Auth Token' });
            appendLog(server.id, 'Error: No Personal Auth Token found.');
            incrementStats(server.id, false);
            return;
        }
        
        const fullPrompt = constructFullPrompt();

        try {
            // --- T2I Test ---
            if (type === 'T2I') {
                appendLog(server.id, 'Sending generate request (Imagen)...');
                const payload = {
                    prompt: fullPrompt,
                    seed: randomSeed,
                    imageModelSettings: { imageModel: 'IMAGEN_3_5', aspectRatio: 'IMAGE_ASPECT_RATIO_PORTRAIT' }
                };
                
                const res = await fetch(`${server.url}/api/imagen/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify(payload)
                });

                const data = await safeJson(res);
                if (!res.ok) throw new Error(data.error?.message || data.message || 'Fetch failed');

                const imageBase64 = data.imagePanels?.[0]?.generatedImages?.[0]?.encodedImage;
                if (!imageBase64) throw new Error('No image returned');

                const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
                updateServerState(server.id, { status: 'success', resultType: 'image', resultUrl: imageBase64, duration });
                appendLog(server.id, 'Success: Image generated.');
                incrementStats(server.id, true);
            }

            // --- I2I Test ---
            else if (type === 'I2I') {
                const validImages = referenceImages.filter((img): img is { base64: string, mimeType: string } => img !== null);
                if (validImages.length === 0) throw new Error('No reference image provided');
                
                updateServerState(server.id, { status: 'uploading' });
                const mediaIds: string[] = [];

                // Step 1: Upload
                for (let i = 0; i < validImages.length; i++) {
                    const img = validImages[i];
                    appendLog(server.id, `Processing and Uploading image ${i + 1}/${validImages.length}...`);
                    
                    // Optimization: Resize/Crop image before upload to prevent mobile crash
                    let processedBase64 = img.base64;
                    try {
                        // Crop to portrait (9:16) to match the I2I prompt output expectation
                        processedBase64 = await cropImageToAspectRatio(img.base64, '9:16');
                    } catch (e) {
                        console.warn('Failed to crop image', e);
                    }

                    const uploadRes = await fetch(`${server.url}/api/imagen/upload`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                        body: JSON.stringify({ imageInput: { rawImageBytes: processedBase64, mimeType: img.mimeType } })
                    });
                    const uploadData = await safeJson(uploadRes);
                    if (!uploadRes.ok) throw new Error(uploadData.error?.message || `Upload failed`);
                    const mediaId = uploadData.result?.data?.json?.result?.uploadMediaGenerationId || uploadData.mediaGenerationId?.mediaGenerationId || uploadData.mediaId;
                    mediaIds.push(mediaId);
                }

                // Step 2: Recipe
                updateServerState(server.id, { status: 'running' });
                const recipeRes = await fetch(`${server.url}/api/imagen/run-recipe`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                     body: JSON.stringify({
                         userInstruction: fullPrompt,
                         seed: randomSeed,
                         imageModelSettings: { imageModel: 'R2I', aspectRatio: 'IMAGE_ASPECT_RATIO_PORTRAIT' },
                         recipeMediaInputs: mediaIds.map(id => ({ mediaInput: { mediaCategory: 'MEDIA_CATEGORY_SUBJECT', mediaGenerationId: id }, caption: 'reference' }))
                     })
                });
                const recipeData = await safeJson(recipeRes);
                if (!recipeRes.ok) throw new Error(recipeData.error?.message || 'Recipe failed');
                
                const imageBase64 = recipeData.imagePanels?.[0]?.generatedImages?.[0]?.encodedImage;
                if (!imageBase64) throw new Error('No image returned');

                const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
                updateServerState(server.id, { status: 'success', resultType: 'image', resultUrl: imageBase64, duration });
                appendLog(server.id, 'Success: Image edited.');
                incrementStats(server.id, true);
            }

            // --- I2V Test ---
            else if (type === 'I2V') {
                const validImage = referenceImages[0] || referenceImages[1];
                if (!validImage) throw new Error('No reference image provided');

                // Step 0: Crop
                appendLog(server.id, 'Cropping image to 9:16...');
                let croppedBase64 = validImage.base64;
                try {
                    croppedBase64 = await cropImageToAspectRatio(validImage.base64, '9:16');
                } catch (cropError) {
                    console.error(cropError);
                }

                // Step 1: Upload
                updateServerState(server.id, { status: 'uploading' });
                const uploadRes = await fetch(`${server.url}/api/veo/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({
                         imageInput: { rawImageBytes: croppedBase64, mimeType: validImage.mimeType, isUserUploaded: true, aspectRatio: 'IMAGE_ASPECT_RATIO_PORTRAIT' }
                    })
                });
                const uploadData = await safeJson(uploadRes);
                if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Upload failed');
                const mediaId = uploadData.mediaGenerationId?.mediaGenerationId || uploadData.mediaId;
                
                // Step 2: Generate
                updateServerState(server.id, { status: 'running' });
                const genRes = await fetch(`${server.url}/api/veo/generate-i2v`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({
                         requests: [{ aspectRatio: 'VIDEO_ASPECT_RATIO_PORTRAIT', textInput: { prompt: fullPrompt }, seed: randomSeed, videoModelKey: 'veo_3_1_i2v_s_fast_portrait_ultra', startImage: { mediaId } }]
                    })
                });
                const genData = await safeJson(genRes);
                if (!genRes.ok) throw new Error(genData.error?.message || 'Generation failed - Try Again @ Check Console Log.');
                let operations = genData.operations;
                if (!operations || operations.length === 0) throw new Error('No operations returned');
                
                // Step 3: Poll
                let finalUrl = null;
                for (let i = 0; i < 120; i++) {
                     await new Promise(r => setTimeout(r, 5000));
                     const statusRes = await fetch(`${server.url}/api/veo/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                        body: JSON.stringify({ operations })
                     });
                     const statusData = await safeJson(statusRes);
                     if (!statusRes.ok) continue;
                     operations = statusData.operations;
                     const op = operations[0];
                     
                     // FIX: Added strict check for FAILED status string to stop loop immediately
                     if (op.status === 'MEDIA_GENERATION_STATUS_FAILED') {
                         throw new Error('Generation Failed: MEDIA_GENERATION_STATUS_FAILED');
                     }

                     const isSuccess = op.done || ['MEDIA_GENERATION_STATUS_COMPLETED', 'MEDIA_GENERATION_STATUS_SUCCESS', 'MEDIA_GENERATION_STATUS_SUCCESSFUL'].includes(op.status);

                     if (isSuccess) {
                         finalUrl = op.operation?.metadata?.video?.fifeUrl || op.metadata?.video?.fifeUrl || op.result?.generatedVideo?.[0]?.fifeUrl || op.result?.generatedVideos?.[0]?.fifeUrl || op.video?.fifeUrl || op.fifeUrl;
                         if (finalUrl) break;
                     }
                     if (op.error) throw new Error(op.error.message || 'Generation error');
                     appendLog(server.id, `Status: ${op.status || 'Processing'}...`);
                }
                
                if (!finalUrl) throw new Error('Timeout or no URL returned');

                // Download blob
                const blobRes = await fetch(`${server.url}/api/veo/download-video?url=${encodeURIComponent(finalUrl)}`);
                if (!blobRes.ok) throw new Error('Failed to download video blob');
                const blob = await blobRes.blob();
                const objectUrl = URL.createObjectURL(blob);
                
                const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
                updateServerState(server.id, { status: 'success', resultType: 'video', resultUrl: objectUrl, duration });
                appendLog(server.id, 'Success: Video generated.');
                incrementStats(server.id, true);
            }

        } catch (e: any) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
            updateServerState(server.id, { status: 'failed', error: e.message, duration });
            appendLog(server.id, `Error: ${e.message}`);
            incrementStats(server.id, false);
        }
    };

    // Main execution orchestrator
    const handleRunTests = async (type: TestType) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setLastTestType(type);

        const serversToTest = targetServerId === 'all' 
            ? SERVERS 
            : SERVERS.filter(s => s.id === targetServerId);

        // Run servers with staggered delays to prevent network congestion (500ms between each)
        const promises: Promise<void>[] = [];
        for (let i = 0; i < serversToTest.length; i++) {
            // Stagger logic: Delay each subsequent request
            const delay = i * 500; 
            const p = new Promise<void>(resolve => {
                setTimeout(async () => {
                    await runTestForServer(serversToTest[i], type);
                    resolve();
                }, delay);
            });
            promises.push(p);
        }
        
        await Promise.all(promises);
        
        isProcessingRef.current = false;

        // Auto-Loop Logic
        if (isLooping) {
            loopTimeoutRef.current = window.setTimeout(() => {
                if (isLooping) {
                    handleRunTests(type);
                }
            }, 10000); // Wait 10 seconds before next batch
        }
    };

    const toggleLoop = () => {
        if (isLooping) {
            setIsLooping(false);
            if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
        } else {
            setIsLooping(true);
            // The actual loop trigger happens on the next button click or if already running
        }
    };

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
        };
    }, []);

    const hasRefImages = referenceImages.some(img => img !== null);

    return (
        <div className="h-full flex flex-col space-y-6">
             {/* Simple Fullscreen Preview Modal */}
             {previewItem && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}>
                    <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white" onClick={() => setPreviewItem(null)}>
                        <XIcon className="w-6 h-6" />
                    </button>
                    <div className="max-w-5xl max-h-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        {previewItem.type === 'image' ? (
                            <img src={`data:image/png;base64,${previewItem.url}`} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-md" />
                        ) : (
                            <video src={previewItem.url} controls autoPlay className="max-w-full max-h-[80vh] rounded-md" />
                        )}
                        <div className="mt-4">
                             <button 
                                onClick={() => downloadContent(previewItem.url, previewItem.type, 'monoklix-test')}
                                className="flex items-center gap-2 bg-white text-black font-bold py-2 px-6 rounded-full hover:bg-neutral-200 transition-colors"
                            >
                                <DownloadIcon className="w-5 h-5" /> Download Result
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
                    <ActivityIcon className="w-8 h-8 text-primary-500" />
                    Server Status <span className="text-sm font-normal text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">Admin Only</span>
                </h1>
                <div className="flex justify-between items-end">
                    <p className="text-neutral-500 dark:text-neutral-400">Monitor and test connectivity for all backend servers simultaneously.</p>
                    <div className="flex items-center gap-3 bg-white dark:bg-neutral-800 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox" checked={isLooping} onChange={toggleLoop} className="sr-only peer"/>
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Auto-Loop</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Control Panel */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN: INPUTS */}
                    <div className="lg:col-span-1 flex flex-col h-full">
                        <div>
                            <label className="block text-sm font-medium mb-2">Reference Images (For I2I/I2V)</label>
                            <div className="grid grid-cols-2 gap-2">
                                 <div className="flex flex-col h-full">
                                    <ImageUpload 
                                        id="master-upload-1" 
                                        key={uploadKeys[0]}
                                        onImageUpload={(base64, mimeType) => handleImageUpdate(0, { base64, mimeType })}
                                        onRemove={() => handleImageUpdate(0, null)}
                                        language={language}
                                        title="Upload Image 1 (Primary)"
                                    />
                                 </div>
                                 <div className="flex flex-col h-full">
                                    <ImageUpload 
                                        id="master-upload-2" 
                                        key={uploadKeys[1]}
                                        onImageUpload={(base64, mimeType) => handleImageUpdate(1, { base64, mimeType })}
                                        onRemove={() => handleImageUpdate(1, null)}
                                        language={language}
                                        title="Upload Image 2"
                                    />
                                 </div>
                            </div>
                        </div>
                        
                        {/* Prompt Input Moved Here */}
                        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium">Test Prompt</label>
                                 <select 
                                    value={promptLanguage} 
                                    onChange={handleLanguageChange}
                                    className="text-xs p-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                    <option value="English">English</option>
                                    <option value="Bahasa Malaysia">Bahasa Malaysia</option>
                                </select>
                            </div>
                            <textarea 
                                value={prompt} 
                                onChange={e => setPrompt(e.target.value)} 
                                rows={5}
                                className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-y text-sm"
                                placeholder="Enter your test prompt here..."
                            />
                        </div>

                        {/* Manual Token Tester */}
                        <TokenHealthTester />
                    </div>

                    {/* RIGHT COLUMN: SETTINGS & ACTIONS */}
                    <div className="lg:col-span-2 flex flex-col h-full">
                        {/* Creative Direction now at the top */}
                        <CreativeDirectionPanel
                            state={creativeState}
                            setState={setCreativeState}
                            language={language}
                            showPose={true}
                            showEffect={true}
                        />
                        
                        {/* Target Selection */}
                        <div className="mb-4 mt-4 flex gap-4 items-center bg-neutral-100 dark:bg-neutral-800 p-2 rounded-lg">
                             <label className="text-sm font-bold whitespace-nowrap ml-2">Target Server:</label>
                             <select 
                                value={targetServerId} 
                                onChange={(e) => setTargetServerId(e.target.value)}
                                className="flex-1 p-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                            >
                                <option value="all">All Servers (1-10)</option>
                                {SERVERS.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} Only</option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-auto space-y-2">
                            <div className="flex gap-4">
                                <button onClick={() => handleRunTests('T2I')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2">
                                    <ImageIcon className="w-5 h-5" /> {isLooping && lastTestType === 'T2I' ? 'Looping T2I...' : 'Test T2I'}
                                </button>
                                <button onClick={() => handleRunTests('I2I')} disabled={!hasRefImages} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <RefreshCwIcon className="w-5 h-5" /> {isLooping && lastTestType === 'I2I' ? 'Looping I2I...' : 'Test I2I'}
                                </button>
                                <button onClick={() => handleRunTests('I2V')} disabled={!hasRefImages} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <VideoIcon className="w-5 h-5" /> {isLooping && lastTestType === 'I2V' ? 'Looping I2V...' : 'Test I2V'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Server Grid */}
            <div className="flex-1 overflow-y-auto p-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {SERVERS.map(server => {
                        const state = serverStates[server.id];
                        const stats = serverStats[server.id];
                        return (
                            <div key={server.id} className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col h-auto">
                                {/* Header */}
                                <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
                                    <div>
                                        <h3 className="font-bold text-sm">{server.name}</h3>
                                        <p className="text-xs text-neutral-500 font-mono">{server.url}</p>
                                    </div>
                                    <StatusBadge status={state.status} />
                                </div>
                                
                                {/* Health Scorecard */}
                                <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-[10px] divide-x divide-neutral-200 dark:divide-neutral-800">
                                    <div className="flex-1 bg-green-50 dark:bg-green-900/20 p-1 text-center text-green-700 dark:text-green-300 font-bold">
                                        ✅ {stats.success}
                                    </div>
                                    <div className="flex-1 bg-red-50 dark:bg-red-900/20 p-1 text-center text-red-700 dark:text-red-300 font-bold">
                                        ❌ {stats.failed}
                                    </div>
                                </div>

                                {/* Result Area - 9:16 Aspect Ratio */}
                                <div className="relative w-full aspect-[9/16] bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center group border-b border-neutral-200 dark:border-neutral-800">
                                    {state.status === 'running' || state.status === 'uploading' ? (
                                        <div className="text-center">
                                            <Spinner />
                                            <p className="text-xs mt-2 text-neutral-500 animate-pulse">{state.status}...</p>
                                        </div>
                                    ) : state.resultUrl ? (
                                        <>
                                            {state.resultType === 'video' ? (
                                                <video src={state.resultUrl} controls autoPlay muted loop className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={`data:image/png;base64,${state.resultUrl}`} alt="Result" className="w-full h-full object-cover" />
                                            )}
                                            
                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <button 
                                                    onClick={() => setPreviewItem({ type: state.resultType || 'image', url: state.resultUrl! })}
                                                    className="p-2 bg-white text-black rounded-full hover:bg-neutral-200"
                                                    title="Expand"
                                                >
                                                    <ImageIcon className="w-5 h-5" />
                                                </button>
                                                {state.resultType === 'image' && (
                                                    <button
                                                        onClick={() => handleImageUpdate(0, { base64: state.resultUrl!, mimeType: 'image/png' })}
                                                        className="p-2 bg-white text-black rounded-full hover:bg-neutral-200"
                                                        title="Use as Input for I2V"
                                                    >
                                                        <VideoIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => downloadContent(state.resultUrl!, state.resultType || 'image', `server-${server.id}`)}
                                                    className="p-2 bg-white text-black rounded-full hover:bg-neutral-200"
                                                    title="Save"
                                                >
                                                    <DownloadIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </>
                                    ) : state.error ? (
                                        <div className="text-center p-4">
                                            <AlertTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                            <p className="text-xs text-red-600 break-words line-clamp-3">{state.error}</p>
                                        </div>
                                    ) : (
                                        <div className="text-neutral-400 text-xs">Ready</div>
                                    )}
                                </div>
                                
                                {/* Time & Actions Bar */}
                                <div className="flex items-center justify-between px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                                    <span className="text-[10px] font-mono text-neutral-500">
                                        Time: {state.duration || '--'}
                                    </span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => runTestForServer(server, 'T2I')} 
                                            className="text-[10px] font-semibold text-blue-600 hover:underline"
                                        >
                                            T2I
                                        </button>
                                        <button 
                                            onClick={() => runTestForServer(server, 'I2I')} 
                                            disabled={!hasRefImages}
                                            className="text-[10px] font-semibold text-purple-600 hover:underline disabled:opacity-50"
                                        >
                                            I2I
                                        </button>
                                        <button 
                                            onClick={() => runTestForServer(server, 'I2V')} 
                                            disabled={!hasRefImages}
                                            className="text-[10px] font-semibold text-pink-600 hover:underline disabled:opacity-50"
                                        >
                                            I2V
                                        </button>
                                    </div>
                                </div>

                                {/* Console Log */}
                                <div className="h-24 bg-black text-green-400 p-2 font-mono text-[10px] overflow-y-auto">
                                    {state.logs.length === 0 ? <span className="opacity-50">Waiting for logs...</span> : state.logs.map((log, i) => (
                                        <div key={i}>{log}</div>
                                    ))}
                                </div>

                                {/* Footer Controls: Reset / Create New */}
                                <div className="flex border-t border-neutral-200 dark:border-neutral-800 divide-x divide-neutral-200 dark:divide-neutral-800">
                                    <button 
                                        onClick={() => handleResetServer(server.id)} 
                                        className="flex-1 py-2 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button 
                                        onClick={() => handleCreateNewServer(server.id)} 
                                        className="flex-1 py-2 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                    >
                                        Create New
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
    const colors = {
        idle: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
        uploading: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        running: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
        success: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    };
    return (
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${colors[status]}`}>
            {status}
        </span>
    );
};

export default MasterDashboardView;