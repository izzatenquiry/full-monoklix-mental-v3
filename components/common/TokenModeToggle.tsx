import React, { useState, useEffect } from 'react';
import { KeyIcon, ShieldCheckIcon } from '../Icons';
import eventBus from '../../services/eventBus';

const TokenModeToggle: React.FC = () => {
    // FIX: Default mode is now 'hybrid' to ensure reliability for all users.
    const [mode, setMode] = useState<'hybrid' | 'personal_only'>(
        () => (sessionStorage.getItem('monoklix_token_mode') as 'hybrid' | 'personal_only') || 'hybrid'
    );

    useEffect(() => {
        const handleTokenModeChange = (newMode: 'hybrid' | 'personal_only') => {
            setMode(newMode);
        };
        eventBus.on('tokenModeChanged', handleTokenModeChange);
        return () => {
            eventBus.remove('tokenModeChanged', handleTokenModeChange);
        };
    }, []);

    const handleToggle = (newMode: 'hybrid' | 'personal_only') => {
        setMode(newMode);
        sessionStorage.setItem('monoklix_token_mode', newMode);
        eventBus.dispatch('tokenModeChanged', newMode);
    };

    return (
        <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 mt-2">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Connection Mode</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${mode === 'hybrid' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                    {mode === 'hybrid' ? 'Hybrid' : 'Personal'}
                </span>
            </div>
            <div className="flex bg-white dark:bg-neutral-900 rounded-md p-1 border border-neutral-200 dark:border-neutral-700">
                <button
                    onClick={() => handleToggle('personal_only')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-all ${
                        mode === 'personal_only'
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                            : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                >
                    <KeyIcon className="w-3 h-3" />
                    Personal Only
                </button>
                <button
                    onClick={() => handleToggle('hybrid')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-all ${
                        mode === 'hybrid'
                            ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                            : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                >
                    <ShieldCheckIcon className="w-3 h-3" />
                    Hybrid Mode
                </button>
            </div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                {mode === 'personal_only' 
                    ? "Strictly uses your Personal Token. Fails if quota exceeded. Recommended for specific key usage."
                    : "Uses Personal Token first. Automatically switches to Shared Pool if failed (Recommended for reliability)."}
            </p>
        </div>
    );
};

export default TokenModeToggle;