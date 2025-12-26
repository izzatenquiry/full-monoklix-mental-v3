import React, { useState } from 'react';
import {
    RobotIcon, CheckCircleIcon, XIcon, AlertTriangleIcon
} from '../Icons';
import { type Language, type User } from '../../types';
import Spinner from '../common/Spinner';
import { getAvailableApiKeys, claimApiKey, saveUserApiKey, type AvailableApiKey } from '../../services/userService';
import { runApiHealthCheck, type HealthCheckResult } from '../../services/geminiService';


interface ApiGeneratorViewProps {
  language: Language;
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

const servicesToCheck = [
    { label: 'Text', model: 'gemini-2.5-flash' },
    { label: 'Image Gen', model: 'imagen-4.0-generate-001' },
    { label: 'Image Edit', model: 'gemini-2.5-flash-image' },
    { label: 'VEO 3', model: 'veo-3.0' }
];

const ApiGeneratorView: React.FC<ApiGeneratorViewProps> = ({ language, currentUser, onUserUpdate }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [availableKeys, setAvailableKeys] = useState<AvailableApiKey[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
    const [healthCheckResults, setHealthCheckResults] = useState<Map<number, HealthCheckResult[] | null>>(new Map());
    const [checkingKeyId, setCheckingKeyId] = useState<number | null>(null);

    const handleFetchKeys = async () => {
        setIsLoading(true);
        setError(null);
        setAvailableKeys([]);
        setStatusMessage(null);
        setHealthCheckResults(new Map());
        try {
            const keys = await getAvailableApiKeys();
            setAvailableKeys(keys);
            if (keys.length === 0) {
                setStatusMessage('There are no unclaimed API keys available at this time.');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to fetch API key: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClaimKey = async (key: AvailableApiKey) => {
        setIsLoading(true);
        setError(null);
        setStatusMessage(null);

        const saveResult = await saveUserApiKey(currentUser.id, key.apiKey);
        if (saveResult.success === false) {
            setError(`Failed to apply API key to your profile: ${saveResult.message}`);
            setIsLoading(false);
            return;
        }

        const claimResult = await claimApiKey(key.id, currentUser.id, currentUser.username);
        if (!claimResult.success) {
            setError(`Failed to claim API key in the database: ${claimResult.message || 'Unknown error'}`);
            setIsLoading(false);
            return;
        }
        
        onUserUpdate(saveResult.user);
        
        setCopiedKeyId(key.id);
        navigator.clipboard.writeText(key.apiKey);
        setStatusMessage('Key successfully applied to your account and copied to clipboard!');
        
        setAvailableKeys([]);
        setIsLoading(false);
        setTimeout(() => setCopiedKeyId(null), 3000);
    };

    const handleHealthCheck = async (key: AvailableApiKey) => {
        setCheckingKeyId(key.id);
        setHealthCheckResults(prev => new Map(prev).set(key.id, null));
        try {
            const results = await runApiHealthCheck({ textKey: key.apiKey });
            setHealthCheckResults(prev => new Map(prev).set(key.id, results));
        } catch (error: any) {
            const errorResult: HealthCheckResult = { service: 'Health Check', model: 'N/A', status: 'error', message: error.message };
            setHealthCheckResults(prev => new Map(prev).set(key.id, [errorResult]));
        } finally {
            setCheckingKeyId(null);
        }
    };
    
    const getStatusUi = (status?: HealthCheckResult['status']) => {
        switch (status) {
            case 'operational': return { icon: <CheckCircleIcon className="w-4 h-4 text-green-500"/>, text: 'text-green-700 dark:text-green-300' };
            case 'error': return { icon: <XIcon className="w-4 h-4 text-red-500"/>, text: 'text-red-700 dark:text-red-300' };
            case 'degraded': return { icon: <AlertTriangleIcon className="w-4 h-4 text-yellow-500"/>, text: 'text-yellow-700 dark:text-yellow-300' };
            default: return { icon: <XIcon className="w-4 h-4 text-red-500"/>, text: 'text-red-700 dark:text-red-300' };
        }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">API Key Generator (Admin)</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">For admin use only. Generate and manage temporary API keys.</p>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
            <div className="flex flex-col items-center text-center">
                <RobotIcon className="w-16 h-16 text-primary-500 mb-4"/>
                <h2 className="text-xl font-bold">Request a Temporary API Key</h2>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2 max-w-md">
                    Click the button below to fetch an unclaimed API key from the database. This key can be used to grant temporary access to a user.
                </p>
                <button 
                    onClick={handleFetchKeys} 
                    disabled={isLoading}
                    className="mt-6 bg-primary-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isLoading ? <Spinner/> : 'Request Key'}
                </button>

                {error && <p className="mt-4 text-red-500">{error}</p>}
                {statusMessage && <p className="mt-4 text-green-600">{statusMessage}</p>}
            </div>

            {availableKeys.length > 0 && !isLoading && (
                <div className="mt-8 border-t border-neutral-200 dark:border-neutral-700 pt-6">
                    <h3 className="font-semibold text-center mb-4">Available API Keys</h3>
                    <div className="space-y-3 max-w-2xl mx-auto">
                        {availableKeys.map(key => {
                            const results = healthCheckResults.get(key.id);
                            return (
                                <div key={key.id} className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 transition-shadow hover:shadow-md">
                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
                                                {key.apiKey.substring(0, 8)}...{key.apiKey.slice(-4)}
                                            </p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-500">
                                                Created: {new Date(key.createdAt).toLocaleString(language === 'ms' ? 'ms-MY' : 'en-US')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button 
                                                onClick={() => handleHealthCheck(key)} 
                                                disabled={checkingKeyId === key.id}
                                                className="w-28 flex justify-center text-xs font-semibold py-1.5 px-3 rounded-full bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                                            >
                                                {checkingKeyId === key.id ? <Spinner /> : 'Health Check'}
                                            </button>
                                            <button 
                                                onClick={() => handleClaimKey(key)}
                                                className="w-28 text-xs font-semibold py-1.5 px-3 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                                            >
                                                {copiedKeyId === key.id ? 'Claimed!' : 'Claim'}
                                            </button>
                                        </div>
                                    </div>
                                    {results === null ? <div className="flex justify-center pt-4"><Spinner/></div> : results && (
                                        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-2 animate-zoomIn">
                                            {servicesToCheck.map(service => {
                                                const result = results.find(r => r.model.includes(service.model));
                                                const status = result ? result.status : 'error';
                                                const { icon, text } = getStatusUi(status);
                                                return (
                                                    <div key={service.label} className="flex justify-between items-center text-xs p-1 bg-neutral-50 dark:bg-neutral-800/50 rounded">
                                                        <span className="font-medium text-neutral-600 dark:text-neutral-300">{service.label}</span>
                                                        <span className={`flex items-center gap-1 font-semibold capitalize ${text}`}>{icon} {status}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
      </div>
    );
};

export default ApiGeneratorView;