
import React, { useState, useEffect, useRef } from 'react';
import eventBus from '../services/eventBus';
import { XIcon, TrashIcon, TerminalIcon } from './Icons';
import { getTranslations } from '../services/translations';

interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
}

interface ConsoleLogSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConsoleLogSidebar: React.FC<ConsoleLogSidebarProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const T = getTranslations().consoleLogSidebar;

  useEffect(() => {
    const handleLog = (data: LogEntry) => {
      setLogs(prevLogs => [...prevLogs, data].slice(-200));
    };
    eventBus.on('consoleLog', handleLog);
    return () => {
      eventBus.remove('consoleLog', handleLog);
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const clearLogs = () => setLogs([]);

  const getLevelColor = (level: LogEntry['level']) => {
      switch(level) {
          case 'error': return 'text-red-400 bg-red-900/10 border-red-900/30';
          case 'warn': return 'text-yellow-400 bg-yellow-900/10 border-yellow-900/30';
          case 'debug': return 'text-blue-400 bg-blue-900/10 border-blue-900/30';
          default: return 'text-neutral-300 bg-white/5 border-white/5';
      }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar Panel - Higher Z-Index to overlap Mobile Dock */}
      <aside
        className={`fixed inset-y-4 right-4 z-[80] w-80 lg:w-96
                   bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl
                   flex flex-col overflow-hidden transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1)
                   ${isOpen ? 'translate-x-0' : 'translate-x-[120%]'}
                   `}
      >
        {/* Header Decoration */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-start to-transparent opacity-50"></div>

        <div className="flex flex-col h-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-3 text-white">
                    <div className="p-2 bg-brand-start/10 rounded-lg">
                        <TerminalIcon className="w-5 h-5 text-brand-start" />
                    </div>
                    
                </h2>
                <div className="flex gap-2">
                    <button 
                        onClick={clearLogs} 
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        title="Clear"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Description Area (Matching the screenshot "Gallery & History" style but for logs) */}
            <div className="mb-4">
                <h3 className="text-sm font-bold text-white mb-1">System Activity Log</h3>
                <p className="text-xs text-neutral-500">Real-time status updates from the AI engine.</p>
            </div>

            {/* Log Container */}
            <div 
                ref={logContainerRef} 
                className="flex-1 overflow-y-auto custom-scrollbar bg-black/40 rounded-2xl border border-white/5 p-2 space-y-2"
            >
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-neutral-600">
                        <TerminalIcon className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-xs italic">Console output will appear here.</p>
                    </div>
                ) : (
                    logs.map((log, index) => (
                        <div key={index} className={`p-3 rounded-xl border text-[10px] sm:text-xs font-mono break-words ${getLevelColor(log.level)}`}>
                            <div className="flex justify-between items-center opacity-50 mb-1">
                                <span className="font-bold uppercase tracking-wider">{log.level}</span>
                                <span>{log.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <div className="whitespace-pre-wrap leading-relaxed">{log.message}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </aside>
    </>
  );
};

export default ConsoleLogSidebar;
