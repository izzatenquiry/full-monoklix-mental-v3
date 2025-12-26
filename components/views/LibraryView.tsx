
import React, { useState, useEffect, useMemo } from 'react';
import Spinner from '../common/Spinner';
import { LibraryIcon, ClipboardIcon, CheckCircleIcon } from '../Icons';
// FIX: Add missing Language type for component props.
import { type Language } from '../../types';

interface Case {
    title: string;
    inputImageUrl: string;
    outputImageUrl: string;
    inputDescription: string;
    prompt: string;
}

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/PicoTrex/Awesome-Nano-Banana-images/main/README_en.md';
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/PicoTrex/Awesome-Nano-Banana-images/main/';

const parseMarkdown = (markdown: string): Case[] => {
    const cases: Case[] = [];
    const sections = markdown.split(/\n### (?:Case|Example) /).slice(1);

    for (const section of sections) {
        try {
            const fullSection = `### ${section}`;

            const titleMatch = fullSection.match(/### (.*?)\n/);
            const title = titleMatch ? titleMatch[1].trim().replace(/\[(.*?)\]\(.*?\)/g, '$1') : 'Untitled Case';

            const imageMatches = [...fullSection.matchAll(/<img src="([^"]+)"/g)];
            const urls = imageMatches.map(m => new URL(m[1], GITHUB_BASE_URL).href);

            let inputImageUrl = '';
            let outputImageUrl = '';

            if (fullSection.includes('| Input | Output |')) {
                inputImageUrl = urls.shift() || '';
                outputImageUrl = urls.shift() || '';
            } else if (fullSection.includes('| Output |') || fullSection.includes('| Example |')) {
                outputImageUrl = urls.shift() || '';
            } else {
                inputImageUrl = urls.shift() || '';
                outputImageUrl = urls.shift() || '';
            }
            
            const inputDescMatch = fullSection.match(/(?:\*\*input:\*\*|\*\*Input:\*\*)\s*([\s\S]*?)(?=\n\*\*prompt:\*\*|\n\*\*Prompt:\*\*|<!--|###|$)/i);
            let inputDescription = inputDescMatch ? inputDescMatch[1].trim().replace(/<br\s*\/?>/gi, '\n') : 'N/A';
            inputDescription = inputDescription.replace(/> \[!(?:NOTE|CAUTION)\][\s\S]*/, '').trim();

            const promptMatch = fullSection.match(/(?:\*\*prompt:\*\*|\*\*Prompt:\*\*)\s*```([\s\S]*?)```/i);
            let prompt = promptMatch ? promptMatch[1].trim() : 'N/A';

            if (title && (inputImageUrl || outputImageUrl) && prompt !== 'N/A') {
                cases.push({ title, inputImageUrl, outputImageUrl, inputDescription, prompt });
            }
        } catch (e) {
            console.error("Error parsing a case section:", e, "\nSection content:\n", section);
        }
    }
    return cases;
};

interface CaseCardProps {
    caseItem: Case;
    onUsePrompt: (prompt: string) => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ caseItem, onUsePrompt }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(caseItem.prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-neutral-800 dark:text-white">{caseItem.title}</h3>
            
            <div className="grid grid-cols-2 border border-neutral-300 dark:border-neutral-700 rounded-md overflow-hidden">
                <div className="p-1">
                    <p className="font-semibold text-sm text-center mb-1">Input</p>
                    {caseItem.inputImageUrl ? (
                        <img src={caseItem.inputImageUrl} alt="Input" className="w-full aspect-square object-cover rounded-sm"/>
                    ) : (
                        <div className="w-full aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-sm flex items-center justify-center text-xs text-neutral-400">No Input Image</div>
                    )}
                </div>
                <div className="p-1">
                     <p className="font-semibold text-sm text-center mb-1">Output</p>
                    {caseItem.outputImageUrl ? (
                        <img src={caseItem.outputImageUrl} alt="Output" className="w-full aspect-square object-cover rounded-sm"/>
                    ) : (
                        <div className="w-full aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-sm flex items-center justify-center text-xs text-neutral-400">No Output Image</div>
                    )}
                </div>
            </div>

            <div>
                <p className="text-sm font-semibold mb-1">input:</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{caseItem.inputDescription}</p>
            </div>

            <div>
                <p className="text-sm font-semibold mb-1">prompt:</p>
                <div className="relative group">
                    <textarea
                        readOnly
                        value={caseItem.prompt}
                        rows={5}
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
                onClick={() => onUsePrompt(caseItem.prompt)}
                className="w-full mt-auto bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
            >
                Use This Prompt
            </button>
        </div>
    );
};

interface LibraryViewProps {
    onUsePrompt: (prompt: string) => void;
    // FIX: Add missing 'language' prop to satisfy component signature.
    language: Language;
}

const LibraryView: React.FC<LibraryViewProps> = ({ onUsePrompt }) => {
    const [cases, setCases] = useState<Case[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAndParseCases = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(GITHUB_RAW_URL);
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
                }
                const markdown = await response.text();
                const parsedCases = parseMarkdown(markdown);
                setCases(parsedCases);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(`Could not load prompt library. ${message}`);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndParseCases();
    }, []);

    const filteredCases = useMemo(() => {
        if (!searchTerm) return cases;
        const lowercasedTerm = searchTerm.toLowerCase();
        return cases.filter(c =>
            c.title.toLowerCase().includes(lowercasedTerm) ||
            c.prompt.toLowerCase().includes(lowercasedTerm) ||
            c.inputDescription.toLowerCase().includes(lowercasedTerm)
        );
    }, [cases, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold sm:text-3xl">Prompt Library</h1>
                    <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">A curated collection of prompts and cases to inspire your creations.</p>
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
                filteredCases.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {filteredCases.map((caseItem) => (
                            <CaseCard key={caseItem.title} caseItem={caseItem} onUsePrompt={onUsePrompt} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-neutral-500 dark:text-neutral-400">
                        <LibraryIcon className="w-16 h-16 mx-auto mb-4" />
                        <p className="font-semibold">No Results Found</p>
                        <p className="text-sm">{searchTerm ? `No cases match your search for "${searchTerm}".` : "This library is currently empty."}</p>
                    </div>
                )
            )}
        </div>
    );
};

export default LibraryView;
