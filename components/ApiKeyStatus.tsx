
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KeyIcon, CheckCircleIcon, XIcon, AlertTriangleIcon, RefreshCwIcon, SparklesIcon, TelegramIcon, ServerIcon, ImageIcon, VideoIcon, EyeIcon, EyeOffIcon } from './Icons';
import Spinner from './common/Spinner';
import { runApiHealthCheck, type HealthCheckResult } from '../services/geminiService';
import { type User, type Language } from '../types';
import { saveUserPersonalAuthToken, assignPersonalTokenAndIncrementUsage, getUserProfile } from '../services/userService';
import { runComprehensiveTokenTest, type TokenTestResult } from '../services/imagenV3Service';
import { getTranslations } from '../services/translations';
import eventBus from '../services/eventBus';

// --- NEW: Token Selection Modal ---
interface TokenSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onUserUpdate: (user: User) => void;
    assignTokenProcess: () => Promise<{ success: boolean; error: string | null; }>;
    language: Language;
}

const TokenSelectionModal: React.FC<TokenSelectionModalProps> = ({ isOpen, onClose, currentUser, onUserUpdate, assignTokenProcess, language }) => {
    const [tokens, setTokens] = useState<{ token: string; createdAt: string; totalUser?: number }[]>([]);
    // State to store individual service results for each token
    const [testResults, setTestResults] = useState<Map<string, { status: 'idle' | 'testing' | 'complete', results?: TokenTestResult[] }>>(new Map());
    const [claimingToken, setClaimingToken] = useState<string | null>(null);
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);
    const [autoMessage, setAutoMessage] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            const tokensJSON = sessionStorage.getItem('veoAuthTokens');
            if (tokensJSON) {
                try {
                    const parsed = JSON.parse(tokensJSON);
                    setTokens(Array.isArray(parsed) ? parsed : []);
                } catch (e) {
                    console.error("Failed to parse tokens", e);
                }
            }
        }
    }, [isOpen]);

    const handleTestToken = async (token: string) => {
        setTestResults(prev => new Map(prev).set(token, { status: 'testing' }));
        
        try {
            // This runs individual tests for Imagen and Veo specifically for this token
            // Because we updated apiClient.ts, this will NOT retry with other tokens if it fails.
            const results = await runComprehensiveTokenTest(token);
            
            setTestResults(prev => new Map(prev).set(token, { 
                status: 'complete', 
                results
            }));
        } catch (e) {
            // Fallback if the test function itself crashes
            setTestResults(prev => new Map(prev).set(token, { status: 'complete', results: [
                { service: 'Imagen', success: false, message: 'Error' },
                { service: 'Veo', success: false, message: 'Error' }
            ] }));
        }
    };

    const handleClaimToken = async (token: string) => {
        setClaimingToken(token);
        // First clear existing token
        await saveUserPersonalAuthToken(currentUser.id, null);
        
        const result = await assignPersonalTokenAndIncrementUsage(currentUser.id, token);
        
        setClaimingToken(null); // Stop spinner regardless of result

        // FIX: Inverted the if/else block to check for the failure case first.
        // This explicitly narrows the type for the 'else' branch, resolving the type error where `result.message` was not accessible.
        if (result.success === false) {
            alert(`Failed to claim: ${result.message}`);
        } else {
            onUserUpdate(result.user);
            // Close modal after a short delay to show the success tick
            setTimeout(onClose, 1000);
        }
    };

    const handleAutoAssign = async () => {
        setIsAutoAssigning(true);
        setAutoMessage('Scanning for optimal token...');
        
        // First clear existing token to ensure clean state
        await saveUserPersonalAuthToken(currentUser.id, null);

        const result = await assignTokenProcess();
        
        if (result.success) {
            setAutoMessage('Success! Token assigned.');
            setTimeout(onClose, 1500);
        } else {
            setAutoMessage(result.error || 'Auto-assignment failed.');
            setTimeout(() => {
                setIsAutoAssigning(false);
                setAutoMessage('');
            }, 3000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-zoomIn" onClick={onClose}>
            <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 relative border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors">
                    <XIcon className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold mb-2">Select Access Token</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">Choose a token from the pool or let AI auto-assign one for you.</p>
                </div>

                {/* Auto Assign Button */}
                <button
                    onClick={handleAutoAssign}
                    disabled={isAutoAssigning}
                    className="w-full flex items-center justify-center gap-3 p-4 mb-6 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-primary-500/25 hover:scale-[1.01] transition-all group disabled:opacity-70 disabled:cursor-not-allowed shrink-0"
                >
                    {isAutoAssigning ? <Spinner /> : <SparklesIcon className="w-6 h-6" />}
                    <div className="text-left">
                        <p className="font-bold text-base">{isAutoAssigning ? 'Auto-Assigning...' : 'Auto Assign Best Token'}</p>
                        <p className="text-xs opacity-80 font-normal">{isAutoAssigning ? autoMessage : 'Recommended: Automatically finds a working token.'}</p>
                    </div>
                </button>

                <div className="border-b border-neutral-200 dark:border-neutral-800 mb-4 shrink-0"></div>

                <h3 className="text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-3 shrink-0">Available Tokens in Pool ({tokens.length})</h3>

                {/* Token List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 min-h-0">
                    {tokens.length === 0 ? (
                         <p className="text-center text-neutral-500 py-10">No tokens available in the pool.</p>
                    ) : (
                        tokens.map((t, idx) => {
                            const testState = testResults.get(t.token);
                            const isCurrent = currentUser.personalAuthToken === t.token;
                            const status = testState?.status || 'idle';
                            const results = testState?.results;
                            
                            const imagenResult = results?.find(r => r.service === 'Imagen');
                            const veoResult = results?.find(r => r.service === 'Veo');
                            
                            // Determine overall success for enabling the claim button
                            const isClaimable = results?.some(r => r.success) || false;

                            return (
                                <div key={idx} className={`p-3 rounded-xl border transition-all ${isCurrent ? 'bg-green-50 border-green-500 dark:bg-green-900/20' : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <div className="bg-neutral-200 dark:bg-neutral-700 p-1.5 rounded-md shrink-0">
                                                <KeyIcon className="w-4 h-4 text-neutral-600 dark:text-neutral-300"/>
                                            </div>
                                            <span className="font-mono text-sm font-semibold whitespace-nowrap">Token #{idx + 1}</span>
                                            <span className="text-xs font-normal opacity-50 font-mono whitespace-nowrap">(...{t.token.slice(-6)})</span>
                                            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800 ml-2">
                                                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">
                                                    {t.totalUser ?? 0} Users
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-neutral-400 font-mono whitespace-nowrap border-l border-neutral-300 dark:border-neutral-600 pl-2">
                                                {new Date(t.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button 
                                                onClick={() => handleTestToken(t.token)}
                                                disabled={status === 'testing'}
                                                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors shadow-sm"
                                            >
                                                {status === 'testing' ? <Spinner/> : 'Test'}
                                            </button>
                                            <button 
                                                onClick={() => handleClaimToken(t.token)}
                                                disabled={isCurrent || claimingToken !== null || (status !== 'idle' && !isClaimable)} 
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors text-white flex items-center justify-center gap-1.5 min-w-[80px] ${isCurrent ? 'bg-green-600 opacity-100 shadow-md cursor-default' : isClaimable ? 'bg-green-600 hover:bg-green-700 shadow-md hover:scale-105' : 'bg-neutral-400 hover:bg-neutral-500'}`}
                                                title={!isClaimable && status !== 'idle' ? "Token failed validation" : "Claim this token"}
                                            >
                                                {isCurrent ? (
                                                    <>
                                                        <CheckCircleIcon className="w-4 h-4 text-white" />
                                                        <span>Active</span>
                                                    </>
                                                ) : claimingToken === t.token ? (
                                                    <Spinner/> 
                                                ) : (
                                                    'Claim'
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Status Indicators - No Spinners here, just icons/text */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* Imagen Status */}
                                        <div className={`flex items-center justify-between p-2 rounded-lg border ${imagenResult ? (imagenResult.success ? 'bg-green-100/50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-100/50 border-red-200 dark:bg-red-900/20 dark:border-red-800') : 'bg-neutral-100 dark:bg-neutral-800 border-transparent'}`}>
                                            <div className="flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4 opacity-70"/>
                                                <span className="text-xs font-medium">Imagen</span>
                                            </div>
                                            {status === 'testing' ? (
                                                <span className="text-[10px] text-neutral-500 animate-pulse">Checking...</span>
                                            ) : imagenResult ? (
                                                imagenResult.success ? <CheckCircleIcon className="w-4 h-4 text-green-600"/> : <XIcon className="w-4 h-4 text-red-500"/>
                                            ) : (
                                                <span className="text-[10px] text-neutral-400">Untested</span>
                                            )}
                                        </div>

                                        {/* Veo Status */}
                                        <div className={`flex items-center justify-between p-2 rounded-lg border ${veoResult ? (veoResult.success ? 'bg-green-100/50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-100/50 border-red-200 dark:bg-red-900/20 dark:border-red-800') : 'bg-neutral-100 dark:bg-neutral-800 border-transparent'}`}>
                                            <div className="flex items-center gap-2">
                                                <VideoIcon className="w-4 h-4 opacity-70"/>
                                                <span className="text-xs font-medium">Veo 3</span>
                                            </div>
                                            {status === 'testing' ? (
                                                <span className="text-[10px] text-neutral-500 animate-pulse">Checking...</span>
                                            ) : veoResult ? (
                                                veoResult.success ? <CheckCircleIcon className="w-4 h-4 text-green-600"/> : <XIcon className="w-4 h-4 text-red-500"/>
                                            ) : (
                                                <span className="text-[10px] text-neutral-400">Untested</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};


interface ApiKeyStatusProps {
    activeApiKey: string | null;
    veoTokenRefreshedAt: string | null;
    currentUser: User;
    assignTokenProcess: () => Promise<{ success: boolean; error: string | null; }>;
    onUserUpdate: (user: User) => void;
    onOpenChangeServerModal: () => void;
    language: Language;
}

const ApiKeyStatus: React.FC<ApiKeyStatusProps> = ({ activeApiKey, currentUser, assignTokenProcess, onUserUpdate, onOpenChangeServerModal, language }) => {
    // FIX: Removed the 'language' argument from getTranslations as it's not expected.
    const T = getTranslations().apiKeyStatus;
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [results, setResults] = useState<HealthCheckResult[] | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    
    // New state for the robust token selection modal
    const [isTokenSelectionOpen, setIsTokenSelectionOpen] = useState(false);

    const [isEditingToken, setIsEditingToken] = useState(false);
    const [tokenInput, setTokenInput] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [currentServer, setCurrentServer] = useState<string | null>(null);
    const [showPersonalToken, setShowPersonalToken] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    useEffect(() => {
        if (isPopoverOpen) {
            const server = sessionStorage.getItem('selectedProxyServer');
            setCurrentServer(server);
        }
    }, [isPopoverOpen]);

    const handleHealthCheck = async () => {
        setIsChecking(true);
        setResults(null);
        
        const tokenToCheck = currentUser.personalAuthToken;

        if (!tokenToCheck) {
            setResults([
                { service: T.personalToken, model: 'N/A', status: 'degraded', message: T.noPersonalToken }
            ]);
            setIsChecking(false);
            return;
        }

        try {
            const testResults = await runComprehensiveTokenTest(tokenToCheck);
            
            const formattedResults: HealthCheckResult[] = testResults.map(res => ({
                service: `${res.service} Service`,
                model: `${T.personalToken} (...${tokenToCheck.slice(-6)})`,
                status: res.success ? 'operational' : 'error',
                message: res.message
            }));
            
            setResults(formattedResults);
        } catch (error) {
            setResults([{ service: T.healthCheckFailed, model: 'N/A', status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }]);
        } finally {
            setIsChecking(false);
        }
    };

    const handleSaveToken = async () => {
        setSaveStatus('saving');
        const result = await saveUserPersonalAuthToken(currentUser.id, tokenInput.trim() || null);
        if (result.success) {
            onUserUpdate(result.user);
            setSaveStatus('success');
            setTimeout(() => {
                setIsEditingToken(false);
                setSaveStatus('idle');
            }, 1500);
        } else {
            setSaveStatus('error');
        }
    };

    const handleRefreshToken = async () => {
        setIsRefreshing(true);
        try {
            // Fetch fresh user profile from server
            const freshUser = await getUserProfile(currentUser.id);
            if (freshUser) {
                // Update local input state (if editing) - though this function is called from the non-editing view usually
                setTokenInput(freshUser.personalAuthToken || '');
                // Update global app state
                onUserUpdate(freshUser);
            }
        } catch (e) {
            console.error("Failed to refresh token:", e);
        } finally {
            // Minimal delay to show spinner
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getStatusUi = (status: HealthCheckResult['status']) => {
        switch (status) {
            case 'operational': return { icon: <CheckCircleIcon className="w-5 h-5 text-green-500"/>, text: 'text-green-700 dark:text-green-300' };
            case 'error': return { icon: <XIcon className="w-5 h-5 text-red-500"/>, text: 'text-red-700 dark:text-red-300' };
            case 'degraded': return { icon: <AlertTriangleIcon className="w-5 h-5 text-yellow-500"/>, text: 'text-yellow-700 dark:text-yellow-300' };
            default: return { icon: null, text: '' };
        }
    };

    return (
        <div className="relative" ref={popoverRef}>
            {/* Replaced the old ClaimTokenModal with the new TokenSelectionModal */}
            <TokenSelectionModal
                isOpen={isTokenSelectionOpen}
                onClose={() => setIsTokenSelectionOpen(false)}
                currentUser={currentUser}
                onUserUpdate={onUserUpdate}
                assignTokenProcess={assignTokenProcess}
                language={language}
            />

            <button
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label={T.ariaLabel}
            >
                <KeyIcon className={`w-5 h-5 ${activeApiKey ? 'text-green-500' : 'text-red-500'}`} />
            </button>

            {isPopoverOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl z-20 animate-zoomIn p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">{T.title}</h3>
                        <button onClick={() => setIsPopoverOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"><XIcon className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-2 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                            <span className="font-semibold text-neutral-600 dark:text-neutral-300">{T.sharedApiKey}:</span>
                            {activeApiKey ? (
                                <span className="font-mono text-green-600 dark:text-green-400">...{activeApiKey.slice(-4)}</span>
                            ) : (
                                <span className="text-red-500 font-semibold">{T.notLoaded}</span>
                            )}
                        </div>
                        
                        {/* Current Server Row - Restored "Change Server" Button */}
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-md flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-neutral-600 dark:text-neutral-300 whitespace-nowrap">{T.currentServer}:</span>
                                {currentServer ? (
                                    <span className="font-mono text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-1 rounded">
                                        {currentServer.replace('https://', '').replace('.monoklix.com', '').toUpperCase()}
                                    </span>
                                ) : (
                                    <span className="text-yellow-500 font-semibold text-xs">{T.notSet}</span>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    onOpenChangeServerModal();
                                    setIsPopoverOpen(false);
                                }}
                                className="text-xs font-semibold bg-primary-600 text-white px-3 py-1.5 rounded-md hover:bg-primary-700 transition-colors"
                            >
                                {T.changeServer.replace(' Server', '')}
                            </button>
                        </div>

                        {/* Auth Token Row */}
                         <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                            {isEditingToken ? (
                                <div className="space-y-2">
                                    <span className="font-semibold text-neutral-600 dark:text-neutral-300">{T.authToken}:</span>
                                    <div className="relative">
                                        <input 
                                            type={showPersonalToken ? "text" : "password"}
                                            value={tokenInput} 
                                            onChange={(e) => setTokenInput(e.target.value)} 
                                            className="w-full text-xs font-mono bg-white dark:bg-neutral-700 rounded p-1 pr-8 border border-neutral-300 dark:border-neutral-600 focus:ring-1 focus:ring-primary-500"
                                            placeholder={T.enterToken}
                                            autoFocus
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPersonalToken(!showPersonalToken)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 p-1"
                                        >
                                            {showPersonalToken ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <button onClick={handleSaveToken} disabled={saveStatus === 'saving'} className="text-xs font-semibold py-1 px-3 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 w-16 text-center">
                                            {saveStatus === 'saving' ? <Spinner/> : T.save}
                                        </button>
                                        <button onClick={() => setIsEditingToken(false)} className="text-xs font-semibold py-1 px-3 rounded bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500">
                                            {T.cancel}
                                        </button>
                                        {saveStatus === 'success' && <span className="text-xs text-green-600 font-bold">{T.saved}</span>}
                                        {saveStatus === 'error' && <span className="text-xs text-red-500 font-bold">{T.saveError}</span>}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                        <span className="font-semibold text-neutral-600 dark:text-neutral-300 whitespace-nowrap">{T.authToken}:</span>
                                        {currentUser.personalAuthToken ? (
                                            <span className="font-mono text-neutral-700 dark:text-neutral-300 text-xs truncate">...{currentUser.personalAuthToken.slice(-6)}</span>
                                        ) : (
                                            <span className="text-yellow-500 font-semibold text-xs whitespace-nowrap">{T.notAssigned}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button 
                                            onClick={handleRefreshToken}
                                            className="p-1.5 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-md transition-colors"
                                            title="Refresh token from database"
                                        >
                                            <RefreshCwIcon className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary-600' : ''}`} />
                                        </button>
                                        <button 
                                            onClick={() => { setIsEditingToken(true); setTokenInput(currentUser.personalAuthToken || ''); setSaveStatus('idle'); }} 
                                            className="text-xs font-semibold bg-primary-600 text-white px-3 py-1.5 rounded-md hover:bg-primary-700 transition-colors"
                                        >
                                            {T.update}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="grid grid-cols-2 gap-3">
                             <button
                                onClick={handleHealthCheck}
                                disabled={isChecking || !activeApiKey}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                            >
                                {isChecking ? <Spinner /> : <RefreshCwIcon className="w-4 h-4" />}
                                {T.healthCheck}
                            </button>
                             <a
                                href="https://t.me/MKAITokenBot"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors text-sm"
                            >
                                <TelegramIcon className="w-4 h-4" />
                                Request Token
                            </a>
                        </div>
                    </div>

                    {results && (
                        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                            {results.map((result, index) => {
                                const { icon, text } = getStatusUi(result.status);
                                const statusText = result.status === 'error' 
                                    ? T.unavailable 
                                    : result.status.charAt(0).toUpperCase() + result.status.slice(1);

                                return (
                                    <div key={index} className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-md">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="font-semibold text-xs">{result.service}</p>
                                                <p className="text-xs text-neutral-500 font-mono truncate">{result.model}</p>
                                            </div>
                                            <div className={`flex items-center gap-1.5 font-semibold text-xs capitalize ${text}`}>
                                                {icon}
                                                <span>{statusText}</span>
                                            </div>
                                        </div>
                                         {(result.message !== 'OK' || result.details) && (
                                            <div className="text-xs mt-1 pt-1 border-t border-neutral-200 dark:border-neutral-700/50">
                                                <p className={`${result.status === 'error' ? 'text-red-500' : 'text-neutral-500'}`}>{result.message}</p>
                                                {result.details && <p className="text-neutral-500">{result.details}</p>}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ApiKeyStatus;
