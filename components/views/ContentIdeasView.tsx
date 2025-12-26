
import React, { useState, useCallback, useEffect } from 'react';
import { generateContentWithGoogleSearch } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { type GenerateContentResponse } from '@google/genai';
import { TrendingUpIcon, DownloadIcon, ClipboardIcon, CheckCircleIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getContentIdeasPrompt } from '../../services/promptManager';
import { handleApiError } from '../../services/errorHandler';
import { type Language } from '../../types';


const downloadText = (text: string, fileName: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const languages = ["English", "Bahasa Malaysia"];
const SESSION_KEY = 'contentIdeasState';

interface ContentIdeasViewProps {
    language: Language;
}

const ContentIdeasView: React.FC<ContentIdeasViewProps> = ({ language }) => {
    const [topic, setTopic] = useState('');
    const [response, setResponse] = useState<GenerateContentResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState("English");
    
    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem(SESSION_KEY);
            if (savedState) {
                const { topic, response, selectedLanguage } = JSON.parse(savedState);
                if (topic) setTopic(topic);
                if (response) setResponse(response);
                if (selectedLanguage) setSelectedLanguage(selectedLanguage);
            }
        } catch (e) { console.error("Failed to load state from session storage", e); }
    }, []);

    useEffect(() => {
        try {
            const stateToSave = { topic, response, selectedLanguage };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
        } catch (e) { console.error("Failed to save state to session storage", e); }
    }, [topic, response, selectedLanguage]);


    const handleGenerate = useCallback(async () => {
        if (!topic.trim()) {
            setError("Please enter a topic to generate content ideas.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResponse(null);
        setCopied(false);

        const prompt = getContentIdeasPrompt(topic, selectedLanguage);

        try {
            const result = await generateContentWithGoogleSearch(prompt);
            setResponse(result);
            await addHistoryItem({
                type: 'Copy',
                prompt: `Content Ideas for: ${topic} (Lang: ${selectedLanguage})`,
                result: result.text ?? '',
            });
        } catch (e) {
            handleApiError(e);
            setError("Failed");
        } finally {
            setIsLoading(false);
        }
    }, [topic, selectedLanguage]);

    const handleCopy = () => {
        if (!response?.text) return;
        navigator.clipboard.writeText(response.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = useCallback(() => {
        setTopic('');
        setResponse(null);
        setError(null);
        setSelectedLanguage("English");
        sessionStorage.removeItem(SESSION_KEY);
    }, []);

    const leftPanel = (
        <>
            <div>
                <h1 className="text-xl font-bold sm:text-3xl">AI Content Idea Generator</h1>
                <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">Discover trending and engaging content ideas for any topic.</p>
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-4">
                <div>
                    <label htmlFor="topic-input" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Your Topic or Niche</label>
                    <textarea
                        id="topic-input"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={'e.g., "digital marketing for small business" or "healthy breakfast recipes"'}
                        rows={4}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    />
                </div>
                <div>
                    <label htmlFor="language-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Output Language</label>
                    <select
                        id="language-select"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    >
                        {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="pt-4 mt-auto">
                <div className="flex gap-4">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Spinner /> : "Generate Ideas"}
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={isLoading}
                        className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                    >
                        Reset
                    </button>
                </div>
                {error && error !== 'Failed' && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
            </div>
        </>
    );

    const groundingMetadata = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;

    const rightPanel = (
        <>
             {response && !isLoading && (
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                     <button 
                      onClick={handleCopy}
                      className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                      {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500"/> : <ClipboardIcon className="w-4 h-4"/>}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                        onClick={() => downloadText(response.text ?? '', `monoklix-content-ideas-${Date.now()}.txt`)}
                        className="flex items-center gap-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4" /> Download
                    </button>
                </div>
            )}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Spinner />
                    <p className="text-neutral-500 dark:text-neutral-400">Searching for ideas...</p>
                </div>
            ) : response ? (
                <div className="w-full h-full overflow-y-auto pr-2 custom-scrollbar">
                    <MarkdownRenderer content={response.text ?? ''} language={language} />
                     {groundingMetadata && groundingMetadata.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                            <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Sources:</h3>
                            <ul className="space-y-2">
                                {(groundingMetadata as any[]).map((chunk, index) => (
                                    <li key={index} className="text-xs">
                                        <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline truncate block">
                                            {chunk.web.title || chunk.web.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : (
                 <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600 p-4">
                    <div>
                        <TrendingUpIcon className="w-16 h-16 mx-auto" />
                        <p>Your generated content ideas will appear here.</p>
                    </div>
                </div>
            )}
        </>
    );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

export default ContentIdeasView;
