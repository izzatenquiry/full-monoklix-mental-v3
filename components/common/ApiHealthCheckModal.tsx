import React, { useState, useEffect } from 'react';
import { runApiHealthCheck, type HealthCheckResult } from '../../services/geminiService';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, RefreshCwIcon } from '../Icons';
import Spinner from './Spinner';
import { type User, type Language } from '../../types';
import { getTranslations } from '../../services/translations';

interface ApiHealthCheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: User | null;
    language: Language;
}

const ApiHealthCheckModal: React.FC<ApiHealthCheckModalProps> = ({ isOpen, onClose, user, language }) => {
    const [isChecking, setIsChecking] = useState(true);
    const [results, setResults] = useState<HealthCheckResult[] | null>(null);
    const [activeApiKey, setActiveApiKey] = useState<string | null | undefined>(null);
    // FIX: Remove `language` argument from `getTranslations` call.
    const T = getTranslations().apiHealthCheckModal;

    const handleHealthCheck = async () => {
        setIsChecking(true);
        setResults(null);
        let keyToCheck: string | null | undefined;
        if (user) {
            // We are checking a specific user, so ONLY use their key.
            keyToCheck = user.apiKey;
        } else {
            // This is a general check for the currently active session key.
            keyToCheck = sessionStorage.getItem('monoklix_session_api_key');
        }
        setActiveApiKey(keyToCheck);
        
        try {
            const checkResults = await runApiHealthCheck({
                textKey: keyToCheck || undefined,
            });
            setResults(checkResults);
        } catch (error) {
            setResults([{ service: T.failed, model: 'N/A', status: 'error', message: error instanceof Error ? error.message : T.unknownError }]);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            handleHealthCheck();
        }
    }, [isOpen]);

    const getStatusUi = (status: HealthCheckResult['status']) => {
        switch (status) {
            case 'operational': return { icon: <CheckCircleIcon className="w-5 h-5 text-green-500"/>, text: 'text-green-700 dark:text-green-300' };
            case 'error': return { icon: <XIcon className="w-5 h-5 text-red-500"/>, text: 'text-red-700 dark:text-red-300' };
            case 'degraded': return { icon: <AlertTriangleIcon className="w-5 h-5 text-yellow-500"/>, text: 'text-yellow-700 dark:text-yellow-300' };
            default: return { icon: null, text: '' };
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-zoomIn" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg m-4 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg">{T.title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"><XIcon className="w-5 h-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {isChecking ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-4">
                            <Spinner />
                            <p className="text-neutral-500">{T.checking}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={handleHealthCheck}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors mb-4"
                            >
                                <RefreshCwIcon className="w-4 h-4" />
                                {T.rerun}
                            </button>
                            {user && (
                                <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-md text-sm border-l-4 border-primary-500">
                                    <p className="font-semibold text-neutral-800 dark:text-white">{T.userDetails}</p>
                                    <div className="mt-2 space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                                        <div className="flex justify-between"><span>{T.username}</span> <span className="font-medium">{user.username}</span></div>
                                        <div className="flex justify-between"><span>{T.email}</span> <span className="font-medium">{user.email}</span></div>
                                        <div className="flex justify-between"><span>{T.status}</span> <span className="font-semibold capitalize">{user.status}</span></div>
                                        <div className="flex justify-between">
                                            <span>{T.lastSeen}</span>
                                            <span className="font-medium">
                                                {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : T.never}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{T.appVersion}</span>
                                            <span className="font-medium">
                                                {user.appVersion || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-center p-2 bg-neutral-100 dark:bg-neutral-800 rounded-md text-sm">
                                <span className="font-semibold text-neutral-600 dark:text-neutral-300">{T.activeKey}</span>
                                {activeApiKey ? (
                                    <span className="font-mono text-green-600 dark:text-green-400">...{activeApiKey.slice(-4)}</span>
                                ) : (
                                    <span className="text-red-500 font-semibold">{user ? T.noKey : T.notSet}</span>
                                )}
                            </div>
                            {results && results.map((result, index) => {
                                const { icon, text } = getStatusUi(result.status);
                                const statusText = result.status === 'error' 
                                    ? 'Unavailable' 
                                    : result.status.charAt(0).toUpperCase() + result.status.slice(1);

                                return (
                                    <div key={index} className={`p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border-l-4 ${
                                        result.status === 'operational' ? 'border-green-500' :
                                        result.status === 'error' ? 'border-red-500' :
                                        result.status === 'degraded' ? 'border-yellow-500' : 'border-neutral-500'
                                    }`}>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="font-semibold text-neutral-800 dark:text-white text-sm">{result.service}</p>
                                                <p className="text-xs font-mono text-neutral-500 break-all">{result.model}</p>
                                            </div>
                                            <div className={`flex items-center gap-2 flex-shrink-0 font-semibold text-sm ${text}`}>
                                                {icon}
                                                <span>{statusText}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 whitespace-pre-wrap">
                                            {result.message}
                                            {result.details && <span className="block text-neutral-500 mt-1">{result.details}</span>}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApiHealthCheckModal;