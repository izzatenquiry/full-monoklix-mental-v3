
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateVideo } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { DownloadIcon, TrashIcon, StarIcon, AlertTriangleIcon, RefreshCwIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import ImageUpload from '../common/ImageUpload';
import { MODELS } from '../../services/aiConfig';
import { addLogEntry } from '../../services/aiLogService';
import { triggerUserWebhook } from '../../services/webhookService';
import { handleApiError } from '../../services/errorHandler';
// FIX: Add missing Language import.
import { type User, type Language } from '../../types';
import { incrementVideoUsage } from '../../services/userService';
import CreativeDirectionPanel from '../common/CreativeDirectionPanel';
import { getInitialCreativeDirectionState, type CreativeDirectionState } from '../../services/creativeDirectionService';


interface ImageData {
  base64: string;
  mimeType: string;
}

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface VideoGenerationViewProps {
  preset: VideoGenPreset | null;
  clearPreset: () => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  // FIX: Add language to props.
  language: Language;
}

const resolutions = ["720p", "1080p"];
const moodOptions = [
    'Normal', 
    'Cheerful - Fast', 
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
const languages = ["English", "Bahasa Malaysia", "Chinese"];
const voiceActorOptions = ["Male", "Female", "Mix Actor"];

const musicStyleOptions = [
    'Pop', 'Ballad', 'Rock', 'Jazz', 'Folk', 'Kids Song',
    'Rap', 'Traditional Malay'
];


const SESSION_KEY = 'videoGenerationState';

const VideoGenerationView: React.FC<VideoGenerationViewProps> = ({ preset, clearPreset, currentUser, onUserUpdate, language }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [dialogueAudio, setDialogueAudio] = useState('');
  
  // Creative Direction State
  const [creativeState, setCreativeState] = useState<CreativeDirectionState>(getInitialCreativeDirectionState());

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoUrlRef = useRef<string | null>(null);
  const [videoFilename, setVideoFilename] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState("720p");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());

  const [includeCaptions, setIncludeCaptions] = useState<'Yes' | 'No'>('No');
  const [includeVoiceover, setIncludeVoiceover] = useState<'Yes' | 'No'>('No');
  
  // Audio Settings
  const [voiceoverMode, setVoiceoverMode] = useState<'speak' | 'sing'>('speak');
  const [voiceoverLanguage, setVoiceoverLanguage] = useState('Bahasa Malaysia');
  const [voiceoverMood, setVoiceoverMood] = useState('Energetic');
  const [voiceoverActor, setVoiceoverActor] = useState('Male');
  const [musicStyle, setMusicStyle] = useState('Pop');


  const model = MODELS.videoGenerationDefault;
  const isVeo3 = model.startsWith('veo-3');

  const allStates = {
    prompt, negativePrompt, dialogue, dialogueAudio,
    creativeState,
    referenceImage, previewUrl, resolution, aspectRatio, 
    includeCaptions, includeVoiceover, voiceoverLanguage, voiceoverMood, voiceoverActor,
    voiceoverMode, musicStyle
  };

  useEffect(() => {
    try {
        const savedState = sessionStorage.getItem(SESSION_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);
            Object.keys(state).forEach(key => {
                if (key === 'prompt') setPrompt(state[key]);
                if (key === 'negativePrompt') setNegativePrompt(state[key]);
                if (key === 'dialogue') setDialogue(state[key]);
                if (key === 'dialogueAudio') setDialogueAudio(state[key]);
                if (key === 'creativeState') setCreativeState(state[key]);
                if (key === 'referenceImage') setReferenceImage(state[key]);
                if (key === 'previewUrl') setPreviewUrl(state[key]);
                if (key === 'resolution') setResolution(state[key]);
                if (key === 'aspectRatio') setAspectRatio(state[key]);
                if (key === 'includeCaptions') setIncludeCaptions(state[key]);
                if (key === 'includeVoiceover') setIncludeVoiceover(state[key]);
                if (key === 'voiceoverLanguage') setVoiceoverLanguage(state[key]);
                if (key === 'voiceoverMood') setVoiceoverMood(state[key]);
                if (key === 'voiceoverActor') setVoiceoverActor(state[key]);
                if (key === 'voiceoverMode') setVoiceoverMode(state[key]);
                if (key === 'musicStyle') setMusicStyle(state[key]);
            });
        }
    } catch (e) { console.error("Failed to load state from session storage", e); }
  }, []);
  
  useEffect(() => {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(allStates));
    } catch (e) { console.error("Failed to save state to session storage", e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    prompt, negativePrompt, dialogue, dialogueAudio,
    creativeState,
    referenceImage, previewUrl, resolution, aspectRatio,
    includeCaptions, includeVoiceover, voiceoverLanguage, voiceoverMood, voiceoverActor,
    voiceoverMode, musicStyle
  ]);

  const loadingMessages = [
    "Warming up the AI director...",
    "Scouting digital locations...",
    "Casting virtual actors...",
    "Adjusting cameras and lighting...",
    "Action! Rendering the scene...",
    "This may take a few minutes. Please be patient.",
    "The AI is working hard on your masterpiece...",
    "Adding the final cinematic touches...",
    "Almost ready for the premiere...",
  ];

  useEffect(() => {
      let interval: ReturnType<typeof setInterval> | null = null;
      if (isLoading) {
        interval = setInterval(() => {
          setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
        }, 3000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
  }, [isLoading, loadingMessages.length]);

  useEffect(() => {
      if (preset) {
          const sceneText = preset.prompt;
          let voiceover = '';
          let caption = '';
          let visualDescription = sceneText;

          const voiceoverRegex = /\*\*(?:Voiceover|Skrip Suara Latar):\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i;
          const voiceoverMatch = sceneText.match(voiceoverRegex);
          if (voiceoverMatch) {
              voiceover = voiceoverMatch[1].trim().replace(/"/g, "'");
              visualDescription = visualDescription.replace(voiceoverRegex, '');
          }

          const captionRegex = /\*\*(?:Captions?|Kapsyen):\*\*([\s\S]*?)(?=\n\*\*|$)/i;
          const captionMatch = sceneText.match(captionRegex);
          if (captionMatch) {
              caption = captionMatch[1].trim().replace(/"/g, "'");
              visualDescription = visualDescription.replace(captionRegex, '');
          }

          visualDescription = visualDescription.replace(/\*\*(.*?):\*\*/g, '').replace(/[\*\-]/g, '').replace(/\s+/g, ' ').trim();

          setPrompt(visualDescription);
          if (voiceover) {
              setIncludeVoiceover('Yes');
              setDialogueAudio(voiceover);
          }
          if (caption) {
              setIncludeCaptions('Yes');
              setDialogue(caption);
          }
          setReferenceImage(preset.image);
          setPreviewUrl(`data:${preset.image.mimeType};base64,${preset.image.base64}`);
          
          clearPreset();
          window.scrollTo(0, 0);
      }
  }, [preset, clearPreset]);

  // Cleanup blob URL on component unmount to prevent memory leaks
  useEffect(() => {
    // The ref holds the latest URL. The function captures the ref itself.
    return () => {
      if (videoUrlRef.current && videoUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
    };
  }, []); // Empty array ensures it only runs on mount/unmount


  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
      setReferenceImage({ base64, mimeType });
      const reader = new FileReader();
      reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
      if (!prompt.trim() && !referenceImage) {
          setError("Please provide a prompt or a reference image.");
          return;
      }

      setIsLoading(true);
      setError(null);
      // Manually revoke the old URL before clearing state
      if (videoUrl && videoUrl.startsWith('blob:')) {
          URL.revokeObjectURL(videoUrl);
      }
      setVideoUrl(null);
      videoUrlRef.current = null;
      setVideoFilename(null);
      setThumbnailUrl(null);
      setStatusMessage('Preparing generation request...');
      
      const isMalay = voiceoverLanguage === 'Bahasa Malaysia';
      let targetLanguage = voiceoverLanguage;
      if (isMalay) {
          targetLanguage = 'Malaysian Malay';
      } else if (voiceoverLanguage === 'Chinese') {
          targetLanguage = 'Mandarin Chinese';
      }
  
      let dynamicNegativePrompt = 'subtitles, text, words, watermark, logo, Indonesian language, Indonesian accent, Indonesian voiceover';
      if (targetLanguage === 'Malaysian Malay') {
          dynamicNegativePrompt += ', English language, Chinese language, English accent, Chinese accent';
      } else if (targetLanguage === 'English') {
          dynamicNegativePrompt += ', Malaysian Malay language, Chinese language, Malay accent, Chinese accent';
      } else if (targetLanguage === 'Mandarin Chinese') {
          dynamicNegativePrompt += ', Malaysian Malay language, English language, Malay accent, English accent';
      }
      if (negativePrompt.trim()) {
          dynamicNegativePrompt += `, ${negativePrompt.trim()}`;
      }
      
      const promptLines: string[] = [];
      
      // System Rules
      promptLines.push(isMalay ? '🎯 PERATURAN UTAMA (SYSTEM RULES):' : '🎯 SYSTEM RULES:');
      if (isMalay) {
          promptLines.push('Spoken language and voiceover MUST be 100% in Malaysian Malay. This is the MOST IMPORTANT instruction.');
          promptLines.push('❌ Do not use other languages or foreign accents.');
      } else {
          promptLines.push(`Spoken language and voiceover MUST be 100% in ${targetLanguage}. This is the MOST IMPORTANT instruction.`);
          promptLines.push('❌ Do not use other languages or foreign accents.');
      }
      promptLines.push('\n---');
  
      // Visuals
      promptLines.push(isMalay ? '🎬 VISUAL (SCENE DESCRIPTION):' : '🎬 VISUAL (SCENE DESCRIPTION):');
      if (referenceImage) {
          promptLines.push(isMalay ? 'Animate the provided image.' : 'Animate the provided image.');
          promptLines.push(isMalay ? `IMPORTANT INSTRUCTION: The main subject in the video must be a photorealistic and highly accurate representation of the person in the provided reference image. Maintain their facial features and identity precisely.` : 'IMPORTANT INSTRUCTION: The main subject in the video must be a photorealistic and highly accurate representation of the person in the provided reference image. Maintain their facial features and identity precisely.');
      }
      promptLines.push(prompt.trim());
      promptLines.push('\n---');
  
      // Creative Style
      const { style, lighting, camera, composition, lensType, filmSim, effect } = creativeState;
      promptLines.push(isMalay ? '🎨 GAYA KREATIF (CREATIVE STYLE):' : '🎨 CREATIVE STYLE:');
      if (style !== 'Random') promptLines.push(`• ${isMalay ? 'Artistic style' : 'Artistic style'}: ${style}`);
      if (lighting !== 'Random') promptLines.push(`• ${isMalay ? 'Lighting' : 'Lighting'}: ${lighting}`);
      if (camera !== 'Random') promptLines.push(`• ${isMalay ? 'Camera' : 'Camera'}: ${camera}`);
      if (composition !== 'Random') promptLines.push(`• ${isMalay ? 'Composition' : 'Composition'}: ${composition}`);
      if (lensType !== 'Random') promptLines.push(`• ${isMalay ? 'Lens Type' : 'Lens Type'}: ${lensType}`);
      if (filmSim !== 'Random') promptLines.push(`• ${isMalay ? 'Film Simulation' : 'Film Simulation'}: ${filmSim}`);
      if (effect !== 'None' && effect !== 'Random') promptLines.push(`• ${isMalay ? 'Additional Effect' : 'Additional Effect'}: ${effect}`);
      promptLines.push('\n---');
  
      // Audio
      if (includeVoiceover === 'Yes' && dialogueAudio.trim() && isVeo3) {
          promptLines.push(isMalay ? '🔊 AUDIO (DIALOGUE):' : '🔊 AUDIO (DIALOGUE):');
          
          if (voiceoverMode === 'sing') {
               promptLines.push(isMalay
                  ? `Nyanyikan lirik berikut dalam gaya muzik ${musicStyle}:`
                  : `Sing the following lyrics in a ${musicStyle} music style:`);
          } else {
               promptLines.push(isMalay
                  ? `Gunakan hanya dialog berikut dalam Bahasa Melayu Malaysia:`
                  : `Use only the following dialogue in ${targetLanguage}:`);
          }
          
          promptLines.push(`"${dialogueAudio.trim()}"`);
          promptLines.push(isMalay ? 'ARAHAN PENTING: Sebutkan skrip ini dengan lengkap, perkataan demi perkataan. Jangan ubah atau ringkaskan ayat.' : 'CRITICAL INSTRUCTION: Speak this script completely, word for word. Do not change or shorten the sentences.');
          
          if (voiceoverMode === 'speak') {
               promptLines.push(isMalay 
                  ? `Pelakon suara: ${voiceoverActor}. Nada suara: ${voiceoverMood}.` 
                  : `Voice actor preference: ${voiceoverActor}. Voice tone: ${voiceoverMood}.`);
          } else {
               promptLines.push(isMalay 
                  ? `Pelakon suara: ${voiceoverActor}.` 
                  : `Voice actor preference: ${voiceoverActor}.`);
          }
          promptLines.push('\n---');
      }
  
      // Additional Reminders
      promptLines.push(isMalay ? '🚫 ADDITIONAL REMINDERS:' : '🚫 ADDITIONAL REMINDERS:');
      if (includeCaptions === 'Yes' && dialogue.trim()) {
          promptLines.push(isMalay ? `• Paparkan teks pada skrin ini sahaja: "${dialogue.trim()}".` : `• Display this exact on-screen text: "${dialogue.trim()}".`);
      } else {
          promptLines.push(isMalay ? '• Jangan sertakan teks, kapsyen, atau sari kata pada skrin.' : '• Do not include any on-screen text, captions, or subtitles.');
      }
      promptLines.push(isMalay ? '• Jangan ubah bahasa.' : '• Do not change the language.');
      
      const fullPrompt = promptLines.join('\n');

      try {
          const image = referenceImage ? { imageBytes: referenceImage.base64, mimeType: referenceImage.mimeType } : undefined;
          
          const { videoFile, thumbnailUrl: newThumbnailUrl } = await generateVideo(fullPrompt, model, aspectRatio, resolution, dynamicNegativePrompt, image, setStatusMessage);

          if (videoFile) {
              const objectUrl = URL.createObjectURL(videoFile);
              console.log('✅ Video file received and object URL created:', objectUrl);
              setVideoUrl(objectUrl);
              videoUrlRef.current = objectUrl; // Keep ref in sync for cleanup
              setVideoFilename(videoFile.name);
              setThumbnailUrl(newThumbnailUrl);
              
              // Save to history in the background
              addHistoryItem({
                  type: 'Video',
                  prompt: `Video Generation: ${prompt.trim().substring(0, 100)}...`,
                  result: videoFile,
              }).then(async () => {
                  const updateResult = await incrementVideoUsage(currentUser);
                  if (updateResult.success && updateResult.user) {
                      onUserUpdate(updateResult.user);
                  }
              }).catch(err => {
                  console.error("Failed to save video to history:", err);
                  setError("Video generated but failed to save to gallery. Please download it now.");
              });
          }
      } catch (e) {
          handleApiError(e);
          setError("Failed");
      } finally {
          setIsLoading(false);
          setStatusMessage('');
      }
  }, [prompt, creativeState, dialogue, dialogueAudio, isVeo3, referenceImage, model, aspectRatio, resolution, negativePrompt, voiceoverLanguage, voiceoverMood, currentUser, onUserUpdate, videoUrl, includeCaptions, includeVoiceover, voiceoverActor, voiceoverMode, musicStyle]);

  const handleDownloadVideo = async () => {
    if (!videoUrl || !videoFilename) return;
    setIsDownloading(true);
    try {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = videoFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Download error:", error);
        setError(error instanceof Error ? error.message : "Failed to download video.");
    } finally {
        setIsDownloading(false);
    }
  };

  const removeReferenceImage = () => {
      setReferenceImage(null);
      setPreviewUrl(null);
      setImageUploadKey(Date.now());
  };

  const handleReset = useCallback(() => {
    setPrompt('');
    setNegativePrompt('');
    setDialogue('');
    setDialogueAudio('');
    
    setCreativeState(getInitialCreativeDirectionState());
    
    if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
    }
    setVideoUrl(null);
    videoUrlRef.current = null;
    setVideoFilename(null);
    setThumbnailUrl(null);
    setError(null);
    setReferenceImage(null);
    setPreviewUrl(null);
    setResolution("1080p");
    setAspectRatio("9:16");
    setIncludeCaptions('No');
    setIncludeVoiceover('No');
    setVoiceoverLanguage('English');
    setVoiceoverMood('Normal');
    setVoiceoverActor('Male');
    setVoiceoverMode('speak');
    setMusicStyle('Pop');
    setImageUploadKey(Date.now());
    setStatusMessage('');
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const leftPanel = (
    <>
        <div>
            <h1 className="text-xl font-bold sm:text-3xl">AI Video Generator</h1>
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">Create high-quality videos from text or images.</p>
        </div>
        
        <div>
            <h2 className="text-lg font-semibold mb-2">Model & Format</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                     <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Aspect Ratio</label>
                     <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        <option value="9:16">9:16 (Portrait)</option>
                        <option value="16:9">16:9 (Landscape)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Resolution</label>
                    <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        {resolutions.map(res => <option key={res} value={res}>{res}</option>)}
                    </select>
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold mb-2">Reference Image (Optional)</h2>
            {previewUrl ? (
                 <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    <img src={previewUrl} alt="Reference Preview" className="w-full h-full object-contain bg-neutral-100 dark:bg-neutral-800" />
                    <button onClick={removeReferenceImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                // FIX: Add missing 'language' prop to ImageUpload component.
                <ImageUpload id="video-ref-upload" key={imageUploadKey} onImageUpload={handleImageUpload} title="Upload Starting Image" language={language}/>
            )}
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-md">
                The AI will use this image as the starting point for the video.
            </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Main Prompt</h2>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., A futuristic city with flying cars at dusk..." rows={5} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
        </div>
        
        <CreativeDirectionPanel 
          state={creativeState}
          setState={setCreativeState}
          language={language}
          showVibe={false}
          showPose={false}
        />

        <div className="space-y-4 pt-4 mt-4 border-t border-gray-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold mb-2">Advanced Settings</h2>
            <div>
                <label className="block text-sm font-medium mb-1">Negative Prompt (What to avoid)</label>
                <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} placeholder="e.g., blurry, shaky, watermark" rows={1} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold mb-2">Dialogue & Text</h2>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">On-Screen Text (Captions)</label>
                    <div className="flex gap-2 mb-2">
                        <button onClick={() => setIncludeCaptions('Yes')} className={`px-4 py-1 rounded-full text-sm font-semibold ${includeCaptions === 'Yes' ? 'bg-primary-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>Yes</button>
                        <button onClick={() => setIncludeCaptions('No')} className={`px-4 py-1 rounded-full text-sm font-semibold ${includeCaptions === 'No' ? 'bg-primary-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>No</button>
                    </div>
                    {includeCaptions === 'Yes' && (
                        <textarea id="on-screen-text" value={dialogue} onChange={e => setDialogue(e.target.value)} placeholder="Enter any text you want to appear on the video." rows={2} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Spoken Dialogue (Voiceover)</label>
                    <div className="flex gap-2 mb-2">
                        <button onClick={() => setIncludeVoiceover('Yes')} disabled={!isVeo3} className={`px-4 py-1 rounded-full text-sm font-semibold disabled:opacity-50 ${includeVoiceover === 'Yes' ? 'bg-primary-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>Yes</button>
                        <button onClick={() => setIncludeVoiceover('No')} disabled={!isVeo3} className={`px-4 py-1 rounded-full text-sm font-semibold disabled:opacity-50 ${includeVoiceover === 'No' ? 'bg-primary-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>No</button>
                    </div>
                    {includeVoiceover === 'Yes' && isVeo3 && (
                        <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700/50">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="voiceover-language" className="block text-sm font-medium mb-1">Voiceover Language</label>
                                    <select id="voiceover-language" value={voiceoverLanguage} onChange={(e) => setVoiceoverLanguage(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                                        {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="voiceover-actor" className="block text-sm font-medium mb-1">Voiceover Actor</label>
                                    <select id="voiceover-actor" value={voiceoverActor} onChange={(e) => setVoiceoverActor(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                                        {voiceActorOptions.map(actor => <option key={actor} value={actor}>{actor}</option>)}
                                    </select>
                                </div>
                             </div>
                             
                             {/* Voiceover Mode Selection */}
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Voiceover Mode</label>
                                    <div className="flex bg-white dark:bg-neutral-800 rounded-lg border border-neutral-300 dark:border-neutral-700 p-1">
                                        <button
                                            onClick={() => setVoiceoverMode('speak')}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${voiceoverMode === 'speak' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                                        >
                                            Speak
                                        </button>
                                        <button
                                            onClick={() => setVoiceoverMode('sing')}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${voiceoverMode === 'sing' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                                        >
                                            Sing
                                        </button>
                                    </div>
                                </div>
                                
                                {voiceoverMode === 'speak' ? (
                                     <div>
                                         <label htmlFor="voiceover-mood" className="block text-sm font-medium mb-1">Voiceover Mood</label>
                                         <select id="voiceover-mood" value={voiceoverMood} onChange={(e) => setVoiceoverMood(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                                             {moodOptions.map(mood => <option key={mood} value={mood}>{mood}</option>)}
                                         </select>
                                     </div>
                                ) : (
                                     <div>
                                         <label htmlFor="music-style" className="block text-sm font-medium mb-1">Music Style</label>
                                         <select id="music-style" value={musicStyle} onChange={(e) => setMusicStyle(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                                             {musicStyleOptions.map(style => <option key={style} value={style}>{style}</option>)}
                                         </select>
                                     </div>
                                )}
                             </div>

                             <div>
                                <label htmlFor="spoken-dialogue" className="block text-sm font-medium mb-1">Spoken Dialogue Script</label>
                                <textarea id="spoken-dialogue" value={dialogueAudio} onChange={e => setDialogueAudio(e.target.value)} placeholder="Enter the exact dialogue for the AI to speak." rows={3} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-md space-y-1">
                <p dangerouslySetInnerHTML={{ __html: 'Voiceover is only supported by the <strong>Veo 3 model</strong> and works best with English.' }}/>
                <p>Please note: Voiceover language may be inconsistent. If you are not satisfied, you can regenerate the video by pressing the 'Generate Video' button again.</p>
            </div>
        </div>
        
        <div className="pt-4 mt-auto">
            <div className="flex gap-4">
                <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? <Spinner /> : 'Generate Video'}
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
          {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Spinner />
                  <p className="mt-4 text-neutral-500 dark:text-neutral-400">{statusMessage || 'Generating...'}</p>
                  <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">{loadingMessages[loadingMessageIndex]}</p>
              </div>
          ) : error && !videoUrl ? ( // Only show error if there's no video to display
               <div className="text-center text-red-500 dark:text-red-400 p-4">
                   <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4" />
                   <p className="font-semibold">Generation Failed - Try Again @ Check Console Log.</p>
                   <p className="text-sm mt-2 max-w-md mx-auto text-neutral-500 dark:text-neutral-400">Please check the console for details.</p>
                   <button
                       onClick={handleGenerate}
                       className="mt-6 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 mx-auto"
                   >
                       <RefreshCwIcon className="w-4 h-4" />
                       Try Again
                   </button>
              </div>
          ) : videoUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <video 
                      key={videoUrl}
                      src={videoUrl}
                      poster={thumbnailUrl || undefined}
                      controls 
                      autoPlay 
                      playsInline
                      muted
                      className="max-h-full max-w-full rounded-md"
                  >
                      Your browser does not support the video tag.
                  </video>
                  
                  {error && <p className="text-red-500 dark:text-red-400 text-center text-sm">{error}</p>}

                  <button
                    onClick={handleDownloadVideo}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? <Spinner /> : <DownloadIcon className="w-4 h-4" />}
                    {isDownloading ? 'Downloading...' : 'Download Video'}
                  </button>
              </div>
          ) : (
              <div className="text-center text-neutral-500 dark:text-neutral-600">
                  <StarIcon className="w-16 h-16 mx-auto" />
                  <p>Your generated video will appear here.</p>
              </div>
          )}
      </>
  );

  // FIX: Pass the 'language' prop to the TwoColumnLayout component.
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

export default VideoGenerationView;
