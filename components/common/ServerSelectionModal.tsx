
import React, { useState, useEffect } from 'react';
import { XIcon, ServerIcon, CheckCircleIcon } from '../Icons';
import { getAvailableServersForUser } from '../../services/userService';
import { type User } from '../../types';

interface ServerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onServerChanged: () => void;
}

const ServerSelectionModal: React.FC<ServerSelectionModalProps> = ({ isOpen, onClose, currentUser, onServerChanged }) => {
    const [servers, setServers] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(sessionStorage.getItem('selectedProxyServer'));

    useEffect(() => {
        if (isOpen) {
            getAvailableServersForUser(currentUser).then(setServers);
            setSelected(sessionStorage.getItem('selectedProxyServer'));
        }
    }, [isOpen, currentUser]);

    const handleSelect = (url: string) => {
        sessionStorage.setItem('selectedProxyServer', url);
        setSelected(url);
        onServerChanged();
        onClose();
        // Removed window.location.reload() to prevent redirection to login
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-zoomIn" onClick={onClose}>
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-neutral-200 dark:border-neutral-800" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <ServerIcon className="w-6 h-6 text-primary-500" />
                        Select Generation Server
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"><XIcon className="w-5 h-5" /></button>
                </div>
                
                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {servers.map((server, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(server)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                                selected === server 
                                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 ring-1 ring-primary-500' 
                                : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'
                            }`}
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-sm">Server {idx + 1}</span>
                                <span className="text-xs text-neutral-500 font-mono">{server.replace('https://', '').replace('.monoklix.com', '')}</span>
                            </div>
                            {selected === server && <CheckCircleIcon className="w-5 h-5 text-primary-500" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ServerSelectionModal;
