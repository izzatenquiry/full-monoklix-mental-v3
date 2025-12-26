
import React, { useState, useCallback, useEffect } from 'react';
import { generateText } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { MegaphoneIcon, DownloadIcon, ClipboardIcon, CheckCircleIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getMarketingCopyPrompt } from '../../services/promptManager';
import { handleApiError } from '../../services/errorHandler';
import { type Language } from '../../types';


const tones = ["Professional", "Casual", "Witty", "Persuasive", "Empathetic", "Bold"];
const languages = ["English", "Bahasa Malaysia"];

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

const SESSION_KEY = 'marketingCopyState';

interface MarketingCopyViewProps {
    language: Language;
}

const MarketingCopyView: React.FC<MarketingCopyViewProps> = ({ language }) => {
    const [productDetails, setProductDetails] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [keywords, setKeywords] = useState('');
    const [selectedTone, setSelectedTone] = useState(tones[0]);
    const [selectedLanguage, setSelectedLanguage] = useState("English");
    const [generatedCopy, setGeneratedCopy] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem(SESSION_KEY);
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.productDetails) setProductDetails(state.productDetails);
                if (state.targetAudience) setTargetAudience(state.targetAudience);
                if (state.keywords) setKeywords(state.keywords);
                if (state.selectedTone) setSelectedTone(state.selectedTone);
                if (state.selectedLanguage) setSelectedLanguage(state.selectedLanguage);
                if (state.generatedCopy) setGeneratedCopy(state.generatedCopy);
            }
        } catch (e) { console.error("Failed to load state from session storage", e); }
    }, []);

    useEffect(() => {
        try {
            const stateToSave = { productDetails, targetAudience, keywords, selectedTone, selectedLanguage, generatedCopy };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
        } catch (e) { console.error("Failed to save state to session storage", e); }
    }, [productDetails, targetAudience, keywords, selectedTone, selectedLanguage, generatedCopy]);

    const handleGenerate = useCallback(async () => {
        if (!productDetails.trim()) {
            setError("Product/Service details are required to generate marketing copy.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedCopy('');
        setCopied(false);

        const prompt = getMarketingCopyPrompt({
            productDetails,
            targetAudience,
            keywords,
            selectedTone,
            selectedLanguage
        });

        try {
            const result = await generateText(prompt);
            setGeneratedCopy(result);
            await addHistoryItem({
                type: 'Copy',
                prompt: `Marketing Copy for: ${productDetails.substring(0, 50)}... (Lang: ${selectedLanguage})`,
                result: result,
            });
        } catch (e) {
            handleApiError(e);
            setError("Failed");
        } finally {
            setIsLoading(false);
        }
    }, [productDetails, targetAudience, keywords, selectedTone, selectedLanguage]);
    
    const handleCopy = () => {
        if (!generatedCopy) return;
        navigator.clipboard.writeText(generatedCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const handleReset = useCallback(() => {
        setProductDetails('');
        setTargetAudience('');
        setKeywords('');
        setSelectedTone(tones[0]);
        setSelectedLanguage("English");
        setGeneratedCopy('');
        setError(null);
        sessionStorage.removeItem(SESSION_KEY);
    }, []);

    const leftPanel = (
        <>
            <div>
                <h1 className="text-xl font-bold sm:text-3xl">AI Marketing Copywriter</h1>
                <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">Generate persuasive copy for ads, posts, and websites.</p>
            </div>

            <div>
                <label htmlFor="product-details" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Product/Service Details</label>
                <textarea
                    id="product-details"
                    value={productDetails}
                    onChange={(e) => setProductDetails(e.target.value)}
                    placeholder="e.g., A high-end coffee maker that brews in 30 seconds..."
                    rows={5}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>

            <div>
                <label htmlFor="target-audience" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Target Audience (Optional)</label>
                <input
                    id="target-audience"
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Busy professionals, coffee lovers..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>

            <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Keywords to Include (Optional)</label>
                <input
                    id="keywords"
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g., quick, premium, morning coffee"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>

            <div>
                <label htmlFor="tone" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Tone of Voice</label>
                <select
                    id="tone"
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {tones.map(tone => <option key={tone} value={tone}>{tone}</option>)}
                </select>
            </div>
            
            <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Output Language</label>
                <select
                    id="language"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
            </div>

            <div className="pt-4 mt-auto">
                <div className="flex gap-4">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Spinner /> : "Generate Copy"}
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

    const rightPanel = (
        <>
             {generatedCopy && !isLoading && (
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                      {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500"/> : <ClipboardIcon className="w-4 h-4"/>}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                        onClick={() => downloadText(generatedCopy, `monoklix-marketing-copy-${Date.now()}.txt`)}
                        className="flex items-center gap-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4" /> Download
                    </button>
                </div>
            )}
             {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Spinner />
                    <p className="text-neutral-500 dark:text-neutral-400">Generating your copy...</p>
                </div>
            ) : generatedCopy ? (
                <div className="prose dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap w-full h-full overflow-y-auto pr-2">
                    {generatedCopy}
                </div>
            ) : (
                 <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600 p-4">
                    <div>
                        <MegaphoneIcon className="w-16 h-16 mx-auto" />
                        <p>Your generated marketing copy will appear here.</p>
                    </div>
                </div>
            )}
        </>
    );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

export default MarketingCopyView;
