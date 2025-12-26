import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UsersIcon, AlertTriangleIcon, DownloadIcon, XIcon, ImageIcon, RefreshCwIcon, VideoIcon, PlayIcon, KeyIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '../Icons';
import Spinner from '../common/Spinner';
import ImageUpload from '../common/ImageUpload';
import { type User, type Language } from '../../types';
import { cropImageToAspectRatio } from '../../services/imageService';
import CreativeDirectionPanel from '../common/CreativeDirectionPanel';
import { getInitialCreativeDirectionState, type CreativeDirectionState } from '../../services/creativeDirectionService';
import { runComprehensiveTokenTest, type TokenTestResult } from '../../services/imagenV3Service';
import { assignPersonalTokenAndIncrementUsage } from '../../services/userService';
import TwoColumnLayout from '../common/TwoColumnLayout';


// --- CONFIG ---
const SERVERS = Array.from({ length: 10 }, (_, i) => ({
    id: `s${i + 1}`,
    name: `Server S${i + 1}`,
    url: `https://s${i + 1}.monoklix.com`
}));

type TestType = 'T2I' | 'I2I';
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

interface UgcGeneratorViewProps {
    currentUser: User;
    language: Language;
    onUserUpdate: (user: User) => void;
}

const PRESET_PROMPTS = {
    'English': "Enter your prompt here.",
    'Bahasa Malaysia': "Masukkan prompt anda disini."
};

const aspectRatioMap: { [key: string]: string } = {
  '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
  '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
  '1:1': 'IMAGE_ASPECT_RATIO_SQUARE'
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
    link.download = `${filenamePrefix}-${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

interface TokenHealthTesterProps {
    currentUser: User;
    onUserUpdate: (user: User) => void;
    tokenPool: { token: string; createdAt: string }[];
    selectedToken: string;
    setSelectedToken: (token: string) => void;
}

const TokenHealthTester: React.FC<TokenHealthTesterProps> = ({ currentUser, onUserUpdate, tokenPool, selectedToken, setSelectedToken }) => {
    const [isTestingPool, setIsTestingPool] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [poolResults, setPoolResults] = useState<TokenTestResult[] | null>(null);
    const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    
    const [manualToken, setManualToken] = useState('');
    const [isTestingManual, setIsTestingManual] = useState(false);
    const [manualResults, setManualResults] = useState<TokenTestResult[] | null>(null);

    const handleTokenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedToken(e.target.value);
        setPoolResults(null);
        setClaimMessage(null);
    };

    const handleTestPool = async () => {
        if (!selectedToken || selectedToken === 'random') return;
        setIsTestingPool(true);
        setPoolResults(null);
        try {
            const res = await runComprehensiveTokenTest(selectedToken);
            setPoolResults(res);
        } finally {
            setIsTestingPool(false);
        }
    };
    
    const handleManualTest = async () => {
        if (!manualToken.trim()) return;
        setIsTestingManual(true);
        setManualResults(null);
        try {
            const res = await runComprehensiveTokenTest(manualToken.trim());
            setManualResults(res);
        } finally {
            setIsTestingManual(false);
        }
    };
    
    const handleClaim = async () => {
        if (!selectedToken || selectedToken === 'random') return;
        if (currentUser.personalAuthToken === selectedToken) {
            setClaimMessage({ type: 'error', text: 'This token is already assigned to you.' });
            setTimeout(() => setClaimMessage(null), 3000);
            return;
        }
        setIsClaiming(true);
        setClaimMessage(null);
        try {
            const result = await assignPersonalTokenAndIncrementUsage(currentUser.id, selectedToken);
            if (result.success === false) {
                 setClaimMessage({ type: 'error', text: result.message || 'Failed to claim token. It might have been taken.' });
            } else {
                 onUserUpdate(result.user);
                 setClaimMessage({ type: 'success', text: 'Token claimed successfully!' });
            }
        } catch (e) {
            setClaimMessage({ type: 'error', text: e instanceof Error ? e.message : 'An unexpected error occurred.' });
        } finally {
            setIsClaiming(false);
            setTimeout(() => setClaimMessage(null), 5000);
        }
    };

    const getStatusBadge = (result?: TokenTestResult) => {
        if (!result) return <span className="text-xs text-neutral-400">Waiting...</span>;
        if (result.success === false) {
            return <span className="flex items-center gap-1 text-xs text-red-600 font-bold"><XIcon className="w-3 h-3"/> FAIL</span>;
        }
        return <span className="flex items-center gap-1 text-xs text-green-600 font-bold"><CheckCircleIcon className="w-3 h-3"/> OK</span>;
    };

    const renderResults = (results: TokenTestResult[] | null) => {
        if (!results) return null;
        return (
            <div className="grid grid-cols-2 gap-2 mt-2">
                {['Imagen', 'Veo'].map(service => {
                    const res = results.find(r => r.service === service);
                    return (
                        <div key={service} className={`p-2 rounded border text-xs ${res?.success ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold uppercase">{service}</span>
                                {getStatusBadge(res)}
                            </div>
                            {res && res.success === false && (
                                <p className="text-[10px] text-red-500 truncate" title={res.message}>{res.message}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-neutral-700 dark:text-neutral-300">
                <KeyIcon className="w-4 h-4 text-primary-500" /> Token Pool Tester
            </h3>
            {tokenPool.length > 0 ? (
                <>
                    <div className="flex gap-2 mb-3">
                        <select
                            value={selectedToken}
                            onChange={handleTokenChange}
                            className="flex-1 p-2 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                        >
                            <option value="random">-- Random Token --</option>
                            {tokenPool.map(({ token, createdAt }) => (
                                <option key={token} value={token}>
                                    ...{token.slice(-10)} ({new Date(createdAt).toLocaleTimeString()})
                                </option>
                            ))}
                        </select>
                        <button 
                            onClick={handleTestPool} 
                            disabled={isTestingPool || !selectedToken || selectedToken === 'random'}
                            className="w-20 flex justify-center items-center px-3 py-2 bg-neutral-800 dark:bg-neutral-700 text-white text-xs font-bold rounded hover:bg-neutral-700 dark:hover:bg-neutral-600 disabled:opacity-50"
                        >
                            {isTestingPool ? <Spinner /> : 'Test'}
                        </button>
                         <button 
                            onClick={handleClaim} 
                            disabled={isClaiming || !selectedToken || selectedToken === 'random'}
                            className="w-20 flex justify-center items-center px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isClaiming ? <Spinner /> : 'Claim'}
                        </button>
                    </div>
                    {claimMessage && (
                        <div className={`text-xs p-2 rounded mb-2 ${claimMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {claimMessage.text}
                        </div>
                    )}
                    {renderResults(poolResults)}
                </>
            ) : (
                 <p className="text-xs text-neutral-500 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                    No shared tokens found in session storage. Refresh the session from the header or check the Supabase `token_new_active` table.
                </p>
            )}

            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-xs font-semibold mb-2 text-neutral-600 dark:text-neutral-400">Or test a different token manually:</p>
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        placeholder="Paste another __SESSION token here..."
                        className="flex-1 p-2 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                    <button
                        onClick={handleManualTest}
                        disabled={isTestingManual || !manualToken.trim()}
                        className="w-20 flex justify-center items-center px-3 py-2 bg-neutral-800 dark:bg-neutral-700 text-white text-xs font-bold rounded hover:bg-neutral-700 dark:hover:bg-neutral-600 disabled:opacity-50"
                    >
                        {isTestingManual ? <Spinner /> : 'Test'}
                    </button>
                </div>
                {renderResults(manualResults)}
            </div>
        </div>
    );
};

const UgcGeneratorView: React.FC<UgcGeneratorViewProps> = ({ currentUser, language, onUserUpdate }) => {
    const [promptLanguage, setPromptLanguage] = useState<'English' | 'Bahasa Malaysia'>('English');
    const [prompt, setPrompt] = useState(PRESET_PROMPTS['English']);
    const [targetServerId, setTargetServerId] = useState<string>('all'); 
    
    const [referenceImages, setReferenceImages] = useState<({ base64: string, mimeType: string } | null)[]>([null, null]);
    const [uploadKeys, setUploadKeys] = useState([Date.now(), Date.now() + 1]);
    const [previewItem, setPreviewItem] = useState<{ type: 'image' | 'video', url: string } | null>(null);
    
    const [creativeState, setCreativeState] = useState<CreativeDirectionState>(getInitialCreativeDirectionState());
    const isProcessingRef = useRef(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [serverStats, setServerStats] = useState<Record<string, ServerStats>>(
        SERVERS.reduce((acc, server) => ({ ...acc, [server.id]: { success: 0, failed: 0 } }), {})
    );
    
    const [serverStates, setServerStates] = useState<Record<string, ServerState>>(
        SERVERS.reduce((acc, server) => ({ ...acc, [server.id]: { status: 'idle', logs: [] } }), {})
    );
    
    const [tokenPool, setTokenPool] = useState<{ token: string; createdAt: string }[]>([]);
    const [selectedToken, setSelectedToken] = useState('random');
    
    const [viewState, setViewState] = useState<'idle' | 'processing' | 'results'>('idle');
    const [processingProgress, setProcessingProgress] = useState({ completed: 0, total: 0 });

    useEffect(() => {
        const tokensJSON = sessionStorage.getItem('veoAuthTokens');
        if (tokensJSON) {
            try {
                const parsed = JSON.parse(tokensJSON);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setTokenPool(parsed);
                }
            } catch (e) { console.error("Could not parse token pool", e); }
        }
    }, [currentUser.personalAuthToken]);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { clientWidth } = scrollContainerRef.current;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -clientWidth : clientWidth,
                behavior: 'smooth'
            });
        }
    };

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
                logs: [...(prev[serverId].logs || []), `[${new Date().toLocaleTimeString()}] ${message}`] 
            }
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
        setServerStates(prev => ({
            ...prev,
            [server.id]: { status: 'running', logs: [], error: undefined, duration: undefined }
        }));
        appendLog(server.id, `Starting ${type} test on ${server.url}...`);
        
        const startTime = Date.now();
        const randomSeed = Math.floor(Math.random() * 2147483647);
        appendLog(server.id, `Random Seed: ${randomSeed}`);

        let authToken: string | null | undefined = null;

        if (selectedToken === 'random') {
            if (tokenPool.length > 0) {
                const randomIndex = Math.floor(Math.random() * tokenPool.length);
                authToken = tokenPool[randomIndex].token;
                appendLog(server.id, `Using random token: ...${authToken.slice(-6)}`);
            } else {
                authToken = currentUser.personalAuthToken;
                 if (authToken) {
                    appendLog(server.id, `Token pool empty. Falling back to personal token.`);
                 }
            }
        } else {
            authToken = selectedToken || currentUser.personalAuthToken;
        }

        if (!authToken) {
            updateServerState(server.id, { status: 'failed', error: 'No Auth Token available. Please claim one from the pool.' });
            appendLog(server.id, 'Error: No Auth Token available.');
            incrementStats(server.id, false);
            return;
        }
        
        const fullPrompt = constructFullPrompt();

        try {
            const payload = {
                prompt: fullPrompt,
                seed: randomSeed,
                imageModelSettings: { 
                    imageModel: type === 'T2I' ? 'IMAGEN_3_5' : 'R2I', 
                    aspectRatio: aspectRatioMap[creativeState.aspectRatio] || 'IMAGE_ASPECT_RATIO_PORTRAIT' 
                }
            };
            
            if (type === 'T2I') {
                appendLog(server.id, 'Sending generate request (Imagen)...');
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
            } else if (type === 'I2I') {
                const validImages = referenceImages.filter((img): img is { base64: string, mimeType: string } => img !== null);
                if (validImages.length === 0) throw new Error('No reference image provided');
                updateServerState(server.id, { status: 'uploading' }); 
                const mediaIds: string[] = [];
                for (let i = 0; i < validImages.length; i++) {
                    const img = validImages[i];
                    appendLog(server.id, `Processing and Uploading image ${i + 1}/${validImages.length}...`);
                    
                    // Optimization: Resize/Crop image before upload to prevent mobile crash
                    let processedBase64 = img.base64;
                    try {
                        // Use user's selected aspect ratio for cropping to ensure consistency
                        // creativeState.aspectRatio is typically '9:16', '16:9', or '1:1'
                        processedBase64 = await cropImageToAspectRatio(img.base64, creativeState.aspectRatio);
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
                updateServerState(server.id, { status: 'running' }); 
                const recipeRes = await fetch(`${server.url}/api/imagen/run-recipe`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                     body: JSON.stringify({
                         userInstruction: fullPrompt,
                         seed: randomSeed,
                         imageModelSettings: payload.imageModelSettings,
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
        } catch (e: any) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
            updateServerState(server.id, { status: 'failed', error: e.message, duration });
            appendLog(server.id, `Error: ${e.message}`);
            incrementStats(server.id, false);
        } finally {
            setProcessingProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        }
    };

    const handleRunTests = async (type: TestType) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
       
        const serversToTest = targetServerId === 'all' 
            ? SERVERS 
            : SERVERS.filter(s => s.id === targetServerId);
        
        setViewState('processing');
        setProcessingProgress({ completed: 0, total: serversToTest.length });

        serversToTest.forEach(server => {
            setServerStates(prev => ({
                ...prev,
                [server.id]: { status: 'idle', logs: [] }
            }));
        });
        
        const promises = serversToTest.map((server, index) => 
            new Promise<void>(resolve => {
                setTimeout(async () => {
                    await runTestForServer(server, type);
                    resolve();
                }, index * 500); // 500ms stagger
            })
        );

        await Promise.all(promises);

        setViewState('results');
        isProcessingRef.current = false;
    };
    
    const handleStartNewGeneration = () => {
        setViewState('idle');
        setProcessingProgress({ completed: 0, total: 0 });
        setServerStates(SERVERS.reduce((acc, server) => ({ ...acc, [server.id]: { status: 'idle', logs: [] } }), {}));
    };

    const hasRefImages = referenceImages.some(img => img !== null);
    
    const renderResultsArea = () => {
        if (viewState === 'idle') {
            return (
                <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600 p-4">
                    <div>
                        <ImageIcon className="w-16 h-16 mx-auto" />
                        <p className="mt-2 font-semibold">Ready to Generate</p>
                        <p className="text-sm">Your generated images will appear here after processing.</p>
                    </div>
                </div>
            );
        }

        if (viewState === 'processing') {
            const progressPercentage = processingProgress.total > 0 ? (processingProgress.completed / processingProgress.total) * 100 : 0;
            return (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-4">
                    <Spinner />
                    <h3 className="text-xl font-semibold">Processing your request...</h3>
                    <div className="w-full max-w-md">
                        <div className="flex justify-between mb-1 text-sm">
                            <span className="text-neutral-600 dark:text-neutral-400">Progress</span>
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">{processingProgress.completed} / {processingProgress.total}</span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5">
                            <div className="bg-primary-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                    </div>
                    <p className="text-sm text-neutral-500">Please wait, this may take a few moments.</p>
                </div>
            );
        }

        if (viewState === 'results') {
            const successfulServers = SERVERS.filter(server => serverStates[server.id]?.status === 'success' && serverStates[server.id]?.resultUrl);

            return (
                <div className="flex flex-col h-full">
                    <div className="p-4 flex-shrink-0 flex justify-center">
                        <button 
                            onClick={handleStartNewGeneration}
                            className="bg-primary-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-700 transition-colors shadow-md"
                        >
                            Start New Generation
                        </button>
                    </div>
                    <div className="flex-1 relative group flex items-center min-h-0">
                        {successfulServers.length > 0 ? (
                            <div className="w-full h-full flex items-center justify-center">
                                {successfulServers.length > 1 && (
                                    <>
                                        <button onClick={() => handleScroll('left')} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/30 text-white rounded-full hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100">
                                            <ChevronLeftIcon className="w-6 h-6"/>
                                        </button>
                                        <button onClick={() => handleScroll('right')} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/30 text-white rounded-full hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100">
                                            <ChevronRightIcon className="w-6 h-6"/>
                                        </button>
                                    </>
                                )}
                                <div ref={scrollContainerRef} className="flex items-center gap-4 overflow-x-auto p-4 custom-scrollbar snap-x snap-mandatory">
                                    {successfulServers.map(server => {
                                        const state = serverStates[server.id];
                                        const stats = serverStats[server.id];
                                        return (
                                            <div key={server.id} className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col h-[85vh] w-72 flex-shrink-0 snap-center">
                                                <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
                                                    <div>
                                                        <h3 className="font-bold text-sm">{server.name}</h3>
                                                        <p className="text-xs text-neutral-500 font-mono">{server.url}</p>
                                                    </div>
                                                    <StatusBadge status={state.status} />
                                                </div>
                                                <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-[10px] divide-x divide-neutral-200 dark:divide-neutral-800">
                                                    <div className="flex-1 bg-green-50 dark:bg-green-900/20 p-1 text-center text-green-700 dark:text-green-300 font-bold">✅ {stats.success}</div>
                                                    <div className="flex-1 bg-red-50 dark:bg-red-900/20 p-1 text-center text-red-700 dark:text-red-300 font-bold">❌ {stats.failed}</div>
                                                </div>
                                                <div className="relative w-full aspect-[9/16] bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center group border-b border-neutral-200 dark:border-neutral-800">
                                                    <img src={`data:image/png;base64,${state.resultUrl}`} alt="Result" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3"><button onClick={() => setPreviewItem({ type: 'image', url: state.resultUrl! })} className="p-2 bg-white text-black rounded-full hover:bg-neutral-200" title="Expand"><ImageIcon className="w-5 h-5" /></button><button onClick={() => handleImageUpdate(0, { base64: state.resultUrl!, mimeType: 'image/png' })} className="p-2 bg-white text-black rounded-full hover:bg-neutral-200" title="Use as Input"><RefreshCwIcon className="w-5 h-5" /></button><button onClick={() => downloadContent(state.resultUrl!, 'image', `server-${server.id}`)} className="p-2 bg-white text-black rounded-full hover:bg-neutral-200" title="Save"><DownloadIcon className="w-5 h-5" /></button></div>
                                                </div>
                                                <div className="flex items-center justify-between px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                                                    <span className="text-[10px] font-mono text-neutral-500">Time: {state.duration || '--'}</span>
                                                </div>
                                                <div className="h-24 bg-black text-green-400 p-2 font-mono text-[10px] overflow-y-auto">{state.logs.map((log, i) => (<div key={i}>{log}</div>))}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full text-center text-neutral-500">
                                <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4 text-yellow-500"/>
                                <p className="font-semibold">No images were generated successfully.</p>
                                <p className="text-sm">Please try adjusting your prompt or try again.</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
    };

    const leftPanel = (
        <>
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-neutral-900 dark:text-white"><UsersIcon className="w-8 h-8 text-primary-500" />UGC Generator</h1>
                <div className="flex justify-between items-end"><p className="text-neutral-500 dark:text-neutral-400">Generate multiple variations of your UGC content by testing against different servers.</p></div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">Reference Images (For I2I)</label>
                    <div className="grid grid-cols-2 gap-2">
                         <div className="flex flex-col h-full"><ImageUpload id="master-upload-1" key={uploadKeys[0]} onImageUpload={(base64, mimeType) => handleImageUpdate(0, { base64, mimeType })} onRemove={() => handleImageUpdate(0, null)} language={language} title="Upload Image 1 (Primary)" /></div>
                         <div className="flex flex-col h-full"><ImageUpload id="master-upload-2" key={uploadKeys[1]} onImageUpload={(base64, mimeType) => handleImageUpdate(1, { base64, mimeType })} onRemove={() => handleImageUpdate(1, null)} language={language} title="Upload Image 2" /></div>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex justify-between items-center mb-2"><label className="block text-sm font-medium">Test Prompt</label><select value={promptLanguage} onChange={handleLanguageChange} className="text-xs p-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded focus:ring-2 focus:ring-primary-500 outline-none"><option value="English">English</option><option value="Bahasa Malaysia">Bahasa Malaysia</option></select></div>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5} className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-y text-sm" placeholder="Enter your test prompt here..."/>
                </div>
                 <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800"><CreativeDirectionPanel state={creativeState} setState={setCreativeState} language={language} showPose={true} showEffect={true} showAspectRatio={true} /></div>
                
                <div className="mt-auto space-y-2"><div className="flex gap-4"><button onClick={() => handleRunTests('T2I')} disabled={hasRefImages} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><ImageIcon className="w-5 h-5" /> Create T2I</button><button onClick={() => handleRunTests('I2I')} disabled={!hasRefImages} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><RefreshCwIcon className="w-5 h-5" /> Create I2I</button></div></div>
            </div>
        </>
    );

    const rightPanel = (
        <>
             {previewItem && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}><button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white" onClick={() => setPreviewItem(null)}><XIcon className="w-6 h-6" /></button><div className="max-w-5xl max-h-full flex flex-col items-center" onClick={e => e.stopPropagation()}>{previewItem.type === 'image' ? <img src={`data:image/png;base64,${previewItem.url}`} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-md" /> : <video src={previewItem.url} controls autoPlay className="max-w-full max-h-[80vh] rounded-md" />}<div className="mt-4"><button onClick={() => downloadContent(previewItem.url, previewItem.type, 'monoklix-test')} className="flex items-center gap-2 bg-white text-black font-bold py-2 px-6 rounded-full hover:bg-neutral-200 transition-colors"><DownloadIcon className="w-5 h-5" /> Download Result</button></div></div></div>
            )}
            {renderResultsArea()}
        </>
    );

    return (
        <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />
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

export default UgcGeneratorView;