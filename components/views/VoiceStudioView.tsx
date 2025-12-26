
import React, { useState, useEffect, useCallback } from 'react';
import { MicIcon, DownloadIcon, AlertTriangleIcon } from '../Icons';
import { generateVoiceOver } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import TwoColumnLayout from '../common/TwoColumnLayout';
// FIX: Import Language type.
import { type Language } from '../../types';
import { handleApiError } from '../../services/errorHandler';


const voiceActors = [
    { id: 'Kore', name: 'Adila', language: 'Malay', gender: 'Female' },
    { id: 'Zephyr', name: 'Adrin', language: 'Malay', gender: 'Female' },
    { id: 'Leda', name: 'Alya', language: 'Malay', gender: 'Female' },
    { id: 'Orus', name: 'Osman', language: 'Malay', gender: 'Male' },
    { id: 'erinome', name: 'Kore', language: 'English', gender: 'Female' },
    { id: 'vindemiatrix', name: 'Zephyr', language: 'English', gender: 'Male (Calm)' },
    { id: 'puck', name: 'Puck', language: 'English', gender: 'Male (Cheerful)' },
    { id: 'charon', name: 'Charon', language: 'English', gender: 'Male (Deep)' },
    { id: 'Fenrir', name: 'Fenrir', language: 'English', gender: 'Male (Strong)' },
];

const moodOptions = [
    'Normal', 
    'Cheerful', 
    'Energetic', 
    'Sales', 
    'Sad',
    'Whispering',
    'Angry',
    'Calm',
    'Formal',
    'Excited',
    'Storytelling',
    'Authoritative',
    'Friendly'
];

const musicStyleOptions = [
    'Pop', 
    'Ballad', 
    'Rock', 
    'Jazz', 
    'Folk', 
    'Kids Song',
    'Rap',
    'Traditional Malay'
];

const SESSION_KEY = 'voiceStudioState';

// FIX: Add props interface for the component.
interface VoiceStudioViewProps {
    language: Language;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
    </div>
);

const VoiceStudioView: React.FC<VoiceStudioViewProps> = ({ language }) => {
    const [script, setScript] = useState('');
    const [actor, setActor] = useState(voiceActors[0].id);
    const [mood, setMood] = useState('Normal');
    const [generationMode, setGenerationMode] = useState<'speak' | 'sing'>('speak');
    const [musicStyle, setMusicStyle] = useState(musicStyleOptions[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem(SESSION_KEY);
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.script) setScript(state.script);
                if (state.actor) setActor(state.actor);
                if (state.mood) setMood(state.mood);
                if (state.generationMode) setGenerationMode(state.generationMode);
                if (state.musicStyle) setMusicStyle(state.musicStyle);
            }
        } catch (e) { console.error("Failed to load state from session storage", e); }
    }, []);

    useEffect(() => {
        try {
            const stateToSave = { script, actor, mood, generationMode, musicStyle };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
        } catch (e) { console.error("Failed to save state to session storage", e); }
    }, [script, actor, mood, generationMode, musicStyle]);

    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const handleGenerate = useCallback(async () => {
        if (!script.trim()) {
            setError("Please write a script to generate audio.");
            return;
        }
        setIsLoading(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setAudioBlob(null);

        try {
            const selectedActor = voiceActors.find(va => va.id === actor);
            const language = selectedActor ? selectedActor.language : 'English';

            const blob = await generateVoiceOver(
                script, 
                actor, 
                language, 
                mood, 
                generationMode,
                musicStyle
            );

            if (!blob) {
                throw new Error("Audio generation failed and did not return any data.");
            }
            
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
            setAudioBlob(blob);
            await addHistoryItem({
                type: 'Audio',
                prompt: `Voice: ${actor}, Mood: ${mood}, Script: ${script.substring(0, 50)}...`,
                result: blob,
            });
        } catch (e) {
            handleApiError(e);
            setError("Failed");
        } finally {
            setIsLoading(false);
        }
    }, [script, actor, audioUrl, mood, generationMode, musicStyle]);
    
    const handleReset = useCallback(() => {
        setScript('');
        setActor(voiceActors[0].id);
        setMood('Normal');
        setGenerationMode('speak');
        setMusicStyle(musicStyleOptions[0]);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setAudioBlob(null);
        sessionStorage.removeItem(SESSION_KEY);
    }, [audioUrl]);

    const leftPanel = (
        <>
            <div>
                <h1 className="text-xl font-bold sm:text-3xl">AI Voice Studio</h1>
                <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">Turn text into high-quality, natural-sounding speech.</p>
            </div>

            <Section title="Write Your Script or Lyrics">
                <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Enter your text here..."
                    rows={8}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
                <p className="text-right text-xs text-gray-500">{script.length} characters</p>
            </Section>
            
            <Section title="Select a Voice Actor">
                <select value={actor} onChange={e => setActor(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                    {voiceActors.map(va => (
                        <option key={va.id} value={va.id}>
                            {va.name} - {va.gender} ({va.language})
                        </option>
                    ))}
                </select>
            </Section>

            <Section title="Generation Type">
                <div className="flex justify-center gap-4">
                     <button onClick={() => setGenerationMode('speak')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm w-full ${generationMode === 'speak' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Speak</button>
                    <button onClick={() => setGenerationMode('sing')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm w-full ${generationMode === 'sing' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Sing</button>
                </div>
            </Section>

            {generationMode === 'speak' ? (
                <Section title="Select a Voice Mood">
                    <select value={mood} onChange={e => setMood(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                        {moodOptions.map(m => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                </Section>
            ) : (
                 <Section title="Select a Music Style">
                    <select value={musicStyle} onChange={e => setMusicStyle(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                        {musicStyleOptions.map(style => (
                            <option key={style} value={style}>
                                {style}
                            </option>
                        ))}
                    </select>
                </Section>
            )}
            
            <div className="pt-4 mt-auto">
                <div className="flex gap-4">
                    <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {isLoading ? <Spinner /> : 'Generate Audio'}
                    </button>
                    <button onClick={handleReset} disabled={isLoading} className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50">
                        Reset
                    </button>
                </div>
            </div>
        </>
    );

    const rightPanel = (
        <>
            {isLoading && <div className="flex flex-col items-center justify-center h-full"><Spinner /><p className="mt-2 text-sm text-neutral-500">Generating audio, please wait...</p></div>}
            {error && (
                <div className="text-center text-red-500 dark:text-red-400 p-4">
                    <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4"/>
                    <p className="font-semibold">Generation Failed - Please Check Prompt.</p>
                    <p className="text-sm mt-2 max-w-md mx-auto text-neutral-500 dark:text-neutral-400">Check console for details.</p>
                </div>
            )}
            {audioUrl && audioBlob && (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                    <audio controls src={audioUrl} className="w-full max-w-sm">Your browser does not support the audio element.</audio>
                    <a href={audioUrl} download={`monoklix-voiceover-${Date.now()}.wav`} className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors">
                        <DownloadIcon className="w-4 h-4"/> Download Audio
                    </a>
                </div>
            )}
            {!isLoading && !error && !audioUrl && (
                <div className="text-center text-neutral-500 dark:text-neutral-600">
                    <MicIcon className="w-16 h-16 mx-auto" />
                    <p>Your generated audio will appear here.</p>
                </div>
            )}
        </>
    );
    
    // FIX: Pass the 'language' prop to the TwoColumnLayout component.
    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

export default VoiceStudioView;
