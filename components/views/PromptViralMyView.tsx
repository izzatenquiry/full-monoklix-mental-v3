
import React, { useState, useEffect, useMemo } from 'react';
import Spinner from '../common/Spinner';
import { SparklesIcon, ClipboardIcon, CheckCircleIcon } from '../Icons';
import { type ViralPrompt } from '../../types';
import { getViralPrompts } from '../../services/contentService';

interface ViralPromptCardProps {
    promptItem: ViralPrompt;
    onUsePrompt: (prompt: string) => void;
}

const ViralPromptCard: React.FC<ViralPromptCardProps> = ({ promptItem, onUsePrompt }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(promptItem.prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-white">{promptItem.title}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">By: {promptItem.author}</p>
              </div>
            </div>
            
            {promptItem.imageUrl && (
                <img src={promptItem.imageUrl} alt={promptItem.title} className="w-full aspect-square object-cover rounded-md bg-neutral-100 dark:bg-neutral-800"/>
            )}

            <div>
                <p className="text-sm font-semibold mb-1">Prompt:</p>
                <div className="relative group">
                    <textarea
                        readOnly
                        value={promptItem.prompt}
                        rows={6}
                        className="w-full text-sm font-mono text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/50 p-3 rounded-md custom-scrollbar resize-none border-none"
                    />
                     <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 flex items-center gap-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-1 px-2 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors text-xs opacity-0 group-hover:opacity-100"
                    >
                        {copied ? <CheckCircleIcon className="w-3 h-3 text-green-500" /> : <ClipboardIcon className="w-3 h-3" />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>

            <button
                onClick={() => onUsePrompt(promptItem.prompt)}
                className="w-full mt-auto bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
            >
                Use This Prompt
            </button>
        </div>
    );
};


interface PromptViralMyViewProps {
    onUsePrompt: (prompt: string) => void;
}

const PromptViralMyView: React.FC<PromptViralMyViewProps> = ({ onUsePrompt }) => {
    const [prompts, setPrompts] = useState<ViralPrompt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPrompts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const fetchedPrompts = await getViralPrompts();
                setPrompts(fetchedPrompts);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(`Could not load prompt library. ${message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPrompts();
    }, []);

    const filteredPrompts = useMemo(() => {
        if (!searchTerm) return prompts;
        const lowercasedTerm = searchTerm.toLowerCase();
        return prompts.filter(p =>
            p.title.toLowerCase().includes(lowercasedTerm) ||
            p.prompt.toLowerCase().includes(lowercasedTerm) ||
            p.author.toLowerCase().includes(lowercasedTerm)
        );
    }, [prompts, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold sm:text-3xl">Viral Prompts (MY)</h1>
                    <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">A list of prompts specially curated for the Malaysian market.</p>
                </div>
                 <input
                    type="text"
                    placeholder="Search library..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 bg-white dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>

            {isLoading && (
                <div className="flex justify-center items-center py-20">
                    <Spinner />
                </div>
            )}

            {error && (
                <div className="text-center py-20 text-red-500 dark:text-red-400">
                    <p className="font-semibold">Error Loading Library</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!isLoading && !error && (
                filteredPrompts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {filteredPrompts.map((promptItem) => (
                            <ViralPromptCard key={promptItem.id} promptItem={promptItem} onUsePrompt={onUsePrompt} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
                        <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-primary-500" />
                        <p className="font-semibold text-xl">No Prompts Found</p>
                        <p className="text-base mt-2">{searchTerm ? `No prompts match your search for "${searchTerm}".` : "This library is currently empty. Data will appear once added to the Supabase table."}</p>
                    </div>
                )
            )}
        </div>
    );
};

export default PromptViralMyView;
