import React, { useState, useEffect, useRef } from 'react';
import { RefreshCwIcon, CheckCircleIcon, XIcon, DatabaseIcon, UsersIcon, TrashIcon, PlayIcon, KeyIcon } from '../Icons';
import { UI_SERVER_LIST } from '../../services/serverConfig';
import { runComprehensiveTokenTest } from '../../services/imagenV3Service';
import { deleteTokenFromPool } from '../../services/userService';
import Spinner from '../common/Spinner';

// --- TYPES ---
type TestStatus = 'idle' | 'testing' | 'complete' | 'error';

interface TokenData {
    token: string;
    createdAt: string;
    shortToken: string;
    totalUser: number;
}

interface MatrixCell {
    status: TestStatus;
    imagen: boolean | null; // null = untested
    veo: boolean | null;    // null = untested
    message?: string;
}

interface TokenMasterViewProps {
    // No specific props needed for this admin view
}

const TokenMasterView: React.FC<TokenMasterViewProps> = () => {
    const [tokens, setTokens] = useState<TokenData[]>([]);
    const [results, setResults] = useState<Record<string, Record<string, MatrixCell>>>({});
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const abortControllerRef = useRef<AbortController | null>(null);
    const [manualToken, setManualToken] = useState('');

    const loadTokens = () => {
        const tokensJSON = sessionStorage.getItem('veoAuthTokens');
        if (tokensJSON) {
            try {
                const parsed = JSON.parse(tokensJSON);
                if (Array.isArray(parsed)) {
                    const formatted = parsed.map((t: any) => ({
                        token: t.token,
                        createdAt: t.createdAt,
                        shortToken: `...${t.token.slice(-10)}`, // Updated: Show last 10 chars
                        totalUser: t.totalUser || 0
                    }));
                    setTokens(formatted);
                    
                    // Initialize results grid for loaded tokens
                    // Only overwrite if not exists to preserve manual additions if reload happens without full page refresh logic interfering (though loadTokens usually runs once)
                    setResults(prev => {
                        const next = { ...prev };
                        formatted.forEach((t: TokenData) => {
                            if (!next[t.token]) {
                                next[t.token] = {};
                                UI_SERVER_LIST.forEach(s => {
                                    next[t.token][s.id] = { status: 'idle', imagen: null, veo: null };
                                });
                            }
                        });
                        return next;
                    });
                }
            } catch (e) {
                console.error("Failed to parse tokens", e);
            }
        }
    };

    // Load tokens from session (shared pool)
    useEffect(() => {
        loadTokens();
    }, []);

    // Update cell status helper
    const updateCell = (token: string, serverId: string, updates: Partial<MatrixCell>) => {
        setResults(prev => ({
            ...prev,
            [token]: {
                ...prev[token],
                [serverId]: { ...prev[token][serverId], ...updates }
            }
        }));
    };

    const handleDeleteToken = async (tokenStr: string) => {
        if (!window.confirm(`Are you sure you want to delete token ${tokenStr.slice(-10)}? This action is permanent.`)) {
            return;
        }

        const result = await deleteTokenFromPool(tokenStr);
        if (result.success) {
            // Remove from local state immediately
            setTokens(prev => prev.filter(t => t.token !== tokenStr));
            
            // Also update session storage so a refresh doesn't bring it back immediately (until next sync)
            const currentSessionTokens = sessionStorage.getItem('veoAuthTokens');
            if (currentSessionTokens) {
                try {
                    const parsed = JSON.parse(currentSessionTokens);
                    const updated = parsed.filter((t: any) => t.token !== tokenStr);
                    sessionStorage.setItem('veoAuthTokens', JSON.stringify(updated));
                } catch (e) { /* ignore */ }
            }
            alert('Token deleted successfully.');
        } else {
            alert(`Failed to delete token: ${result.message}`);
        }
    };

    const handleAddManual = () => {
        const tokenStr = manualToken.trim();
        if (!tokenStr) return;
        
        // Check if exists
        if (tokens.some(t => t.token === tokenStr)) {
            alert('Token already displayed in list.');
            return;
        }

        const newTokenObj: TokenData = {
            token: tokenStr,
            createdAt: new Date().toISOString(),
            shortToken: `(Manual) ...${tokenStr.slice(-6)}`,
            totalUser: 0
        };

        setTokens(prev => [newTokenObj, ...prev]);
        
        // Init results
        setResults(prev => ({
            ...prev,
            [tokenStr]: UI_SERVER_LIST.reduce((acc, s) => ({
                ...acc,
                [s.id]: { status: 'idle', imagen: null, veo: null }
            }), {} as Record<string, MatrixCell>)
        }));
        
        setManualToken('');
    };

    // Test a single cell (Token + Server)
    const testCell = async (token: string, serverUrl: string, serverId: string, signal?: AbortSignal) => {
        if (signal?.aborted) return false;
        
        updateCell(token, serverId, { status: 'testing' });
        try {
            // Run check for BOTH services ('all') against specific serverUrl
            const res = await runComprehensiveTokenTest(token, 'all', serverUrl);
            
            const imagenResult = res.find(r => r.service === 'Imagen');
            const veoResult = res.find(r => r.service === 'Veo');

            const isImagenOk = imagenResult?.success ?? false;
            const isVeoOk = veoResult?.success ?? false;
            
            // Determine message
            let msg = '';
            if (!isImagenOk) msg += `Img: ${imagenResult?.message || 'Fail'} `;
            if (!isVeoOk) msg += `Veo: ${veoResult?.message || 'Fail'}`;
            if (isImagenOk && isVeoOk) msg = 'All Systems Operational';

            updateCell(token, serverId, { 
                status: 'complete', 
                imagen: isImagenOk,
                veo: isVeoOk,
                message: msg.trim()
            });
            
            return isImagenOk && isVeoOk;
        } catch (e: any) {
            updateCell(token, serverId, { status: 'error', imagen: false, veo: false, message: e.message });
            return false;
        }
    };

    // Handle manual click on a cell
    const handleCellClick = (token: string, server: typeof UI_SERVER_LIST[0]) => {
        if (isScanning) return;
        testCell(token, server.url, server.id);
    };

    // Scan Single Row (Specific Token across ALL Servers)
    const handleScanRow = async (token: string) => {
        if (isScanning) return;
        setIsScanning(true);
        abortControllerRef.current = new AbortController();
        
        const total = UI_SERVER_LIST.length;
        setProgress({ current: 0, total });
        let count = 0;

        const promises = UI_SERVER_LIST.map(async (server) => {
            await testCell(token, server.url, server.id, abortControllerRef.current?.signal);
            count++;
            setProgress(prev => ({ ...prev, current: count }));
        });

        await Promise.all(promises);
        setIsScanning(false);
    };

    // Scan All Logic
    const handleScanAll = async () => {
        if (isScanning) {
            // Stop
            if (abortControllerRef.current) abortControllerRef.current.abort();
            setIsScanning(false);
            return;
        }

        setIsScanning(true);
        abortControllerRef.current = new AbortController();
        const total = tokens.length * UI_SERVER_LIST.length;
        setProgress({ current: 0, total });
        
        let count = 0;

        // Iterate token by token (Row by Row)
        for (const t of tokens) {
            if (abortControllerRef.current.signal.aborted) break;

            const promises: Promise<void>[] = [];

            // Test all servers for this token with stagger
            for (const server of UI_SERVER_LIST) {
                if (abortControllerRef.current.signal.aborted) break;

                const p = testCell(t.token, server.url, server.id, abortControllerRef.current?.signal).then(() => {
                    count++;
                    setProgress(prev => ({ ...prev, current: count }));
                });
                promises.push(p);

                // Stagger delay: 300ms between firing requests
                await new Promise(r => setTimeout(r, 300));
            }
            
            await Promise.all(promises);
            
            // Additional delay between rows to let network breathe
            await new Promise(r => setTimeout(r, 500));
        }

        setIsScanning(false);
    };

    // Calculate Health Score per Token (Average of Imagen + Veo success rate across all servers)
    const getTokenScore = (token: string) => {
        const row = results[token];
        if (!row) return 0;
        const resultsArr = Object.values(row);
        
        let totalPoints = 0;
        const maxPoints = UI_SERVER_LIST.length * 2; // 2 points per server (1 for imagen, 1 for veo)

        // Explicitly type 'cell' to avoid implicit 'any' error
        (resultsArr as MatrixCell[]).forEach((cell: MatrixCell) => {
            if (cell.imagen) totalPoints++;
            if (cell.veo) totalPoints++;
        });

        if (maxPoints === 0) return 0;
        return Math.round((totalPoints / maxPoints) * 100);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
                    <DatabaseIcon className="w-8 h-8 text-purple-500" />
                    Token Matrix <span className="text-sm font-normal text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">Admin Only</span>
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Real-time health check of all shared tokens. Testing both <strong className="text-blue-500">Imagen</strong> and <strong className="text-pink-500">Veo 3</strong> services.</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col flex-1 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col gap-4 bg-neutral-50 dark:bg-neutral-800/30">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                             <div className="text-sm font-semibold">
                                 Tokens: {tokens.length} | Servers: {UI_SERVER_LIST.length}
                             </div>
                             {isScanning && (
                                 <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-2">
                                     <Spinner /> Scanning... {Math.round((progress.current / progress.total) * 100)}%
                                 </div>
                             )}
                             <div className="flex gap-3 text-xs ml-4 border-l border-neutral-300 dark:border-neutral-700 pl-4">
                                 <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Imagen</div>
                                 <div className="flex items-center gap-1"><div className="w-2 h-2 bg-pink-500 rounded-full"></div> Veo 3</div>
                             </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadTokens}
                                className="px-3 py-2 bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold transition-colors"
                                title="Reload tokens from session"
                            >
                                <RefreshCwIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleScanAll}
                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${
                                    isScanning 
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                }`}
                            >
                                {isScanning ? 'Stop Scan' : 'Scan Matrix'}
                            </button>
                        </div>
                    </div>
                    
                    {/* Manual Input Area */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <KeyIcon className="h-4 w-4 text-neutral-400" />
                            </div>
                            <input 
                                type="text" 
                                value={manualToken}
                                onChange={(e) => setManualToken(e.target.value)}
                                placeholder="Paste manual token to test..."
                                className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <button 
                            onClick={handleAddManual}
                            disabled={!manualToken.trim()}
                            className="px-4 py-2 bg-neutral-800 dark:bg-neutral-700 text-white text-xs font-bold rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-600 disabled:opacity-50 whitespace-nowrap transition-colors"
                        >
                            Add & Test
                        </button>
                    </div>
                </div>

                {/* Matrix Grid */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-neutral-700 uppercase bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[200px]">Token ID</th>
                                <th className="px-2 py-3 text-center w-16 border-r border-neutral-200 dark:border-neutral-700">Users</th>
                                <th className="px-2 py-3 text-center w-16 border-r border-neutral-200 dark:border-neutral-700">Score</th>
                                <th className="px-2 py-3 text-center w-24 border-r border-neutral-200 dark:border-neutral-700">Actions</th>
                                {UI_SERVER_LIST.map(s => (
                                    <th key={s.id} className="px-2 py-3 text-center min-w-[70px]" title={s.url}>
                                        {s.id.toUpperCase()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {tokens.map((token, i) => {
                                const score = getTokenScore(token.token);
                                let scoreColor = 'text-neutral-400';
                                if (score > 80) scoreColor = 'text-green-500';
                                else if (score > 40) scoreColor = 'text-yellow-500';
                                else if (score > 0) scoreColor = 'text-red-500';

                                const createdDate = new Date(token.createdAt);

                                return (
                                    <tr key={token.token} className="bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                        <td className="px-4 py-2 font-mono text-xs sticky left-0 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 z-10 border-r border-neutral-200 dark:border-neutral-800">
                                            <div className="flex items-center gap-2">
                                                <span className="text-neutral-400 w-5 text-right">{i + 1}.</span>
                                                <span className="font-bold text-neutral-700 dark:text-neutral-300">{token.shortToken}</span>
                                            </div>
                                            <div className="text-[10px] text-neutral-400 ml-8 mt-0.5">
                                                {createdDate.toLocaleDateString()} • {createdDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-center border-r border-neutral-200 dark:border-neutral-700">
                                            <div className="flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                <UsersIcon className="w-3 h-3" /> {token.totalUser}
                                            </div>
                                        </td>
                                        <td className={`px-2 py-2 text-center font-bold border-r border-neutral-200 dark:border-neutral-700 ${scoreColor}`}>
                                            {score}%
                                        </td>
                                        <td className="px-2 py-2 text-center border-r border-neutral-200 dark:border-neutral-700">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleScanRow(token.token)}
                                                    className="p-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-neutral-500 hover:text-primary-600 rounded-full transition-colors"
                                                    title="Test this token across all servers"
                                                >
                                                    <PlayIcon className="w-3 h-3" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteToken(token.token)}
                                                    className="p-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-neutral-500 hover:text-red-600 rounded-full transition-colors"
                                                    title="Delete Token from DB"
                                                >
                                                    <TrashIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                        {UI_SERVER_LIST.map(server => {
                                            const cell = results[token.token]?.[server.id];
                                            return (
                                                <td 
                                                    key={`${token.token}-${server.id}`} 
                                                    className="px-2 py-2 text-center border-l border-dashed border-neutral-100 dark:border-neutral-800 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                    onClick={() => handleCellClick(token.token, server)}
                                                    title={cell?.message || "Click to test"}
                                                >
                                                    <div className="flex justify-center items-center h-full">
                                                        {cell?.status === 'testing' ? (
                                                            <Spinner />
                                                        ) : cell?.status === 'idle' ? (
                                                            <div className="w-8 h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700"></div>
                                                        ) : (
                                                            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-md border border-neutral-200 dark:border-neutral-700">
                                                                {/* Imagen Indicator */}
                                                                <div className={`w-3 h-3 rounded-full ${cell?.imagen ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)]' : 'bg-neutral-300 dark:bg-neutral-600 opacity-30'}`} title={`Imagen: ${cell?.imagen ? 'OK' : 'FAIL'}`}></div>
                                                                {/* Veo Indicator */}
                                                                <div className={`w-3 h-3 rounded-full ${cell?.veo ? 'bg-pink-500 shadow-[0_0_5px_rgba(236,72,153,0.6)]' : 'bg-neutral-300 dark:bg-neutral-600 opacity-30'}`} title={`Veo: ${cell?.veo ? 'OK' : 'FAIL'}`}></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TokenMasterView;