
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ImageUpload from '../common/ImageUpload';
import { type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { StarIcon, DownloadIcon, ImageIcon, VideoIcon, WandIcon, AlertTriangleIcon, RefreshCwIcon, XIcon, UserIcon, TikTokIcon, UsersIcon } from '../Icons';
import { getTiktokAffiliatePrompt } from '../../services/promptManager';
import { type User, type Language } from '../../types';
import { incrementImageUsage } from '../../services/userService';
import { handleApiError } from '../../services/errorHandler';
import { editOrComposeWithImagen } from '../../services/imagenV3Service';
import { getTranslations } from '../../services/translations';
import TwoColumnLayout from '../common/TwoColumnLayout';
import CreativeDirectionPanel from '../common/CreativeDirectionPanel';
import { getInitialCreativeDirectionState, type CreativeDirectionState } from '../../services/creativeDirectionService';
import { UI_SERVER_LIST } from '../../services/serverConfig';

// --- CONFIG FOR PARALLEL GENERATION ---
const SERVERS = UI_SERVER_LIST;

const CreativeButton: React.FC<{
  label: string;
  isSelected: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}> = ({ label, isSelected, onClick, icon: Icon, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 w-full
      ${isSelected && !disabled
        ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
        : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-700/50 hover:border-neutral-400 dark:hover:border-neutral-500'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
    <span className="font-semibold text-sm flex-1 text-center">{label}</span>
  </button>
);

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface TiktokAffiliateViewProps {
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
  language: Language;
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

const modelFaceOptions = ["Random", "Malaysian", "Vietnamese", "English", "American", "Arabic", "Russian", "Japanese", "Korean", "Thai"];

const SESSION_KEY = 'tiktokAffiliateState';

type ImageSlot = string | { error: string } | null;

const SelectControl: React.FC<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: (string|number)[];
  disabled?: boolean;
}> = ({ id, value, onChange, options, disabled }) => (
    <select 
        id={id} 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const triggerDownload = (data: string, fileNameBase: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${data}`;
    link.download = `${fileNameBase}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const TiktokAffiliateView: React.FC<TiktokAffiliateViewProps> = ({ onReEdit, onCreateVideo, language, currentUser, onUserUpdate }) => {
    const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
    const [faceImage, setFaceImage] = useState<MultimodalContent | null>(null);
    const [images, setImages] = useState<ImageSlot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const [gender, setGender] = useState('Female');
    const [modelFace, setModelFace] = useState('Random');
    const [creativeState, setCreativeState] = useState<CreativeDirectionState>(getInitialCreativeDirectionState());
    
    const [customPrompt, setCustomPrompt] = useState('');
    const [numberOfImages, setNumberOfImages] = useState(1);
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('9:16');
    const [productImageUploadKey, setProductImageUploadKey] = useState(Date.now());
    const [faceImageUploadKey, setFaceImageUploadKey] = useState(Date.now() + 1);
    const [progress, setProgress] = useState(0);
    
    const T = getTranslations().tiktokAffiliateView;
    const commonT = getTranslations().common;

    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem(SESSION_KEY);
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.gender) setGender(state.gender);
                if (state.modelFace) setModelFace(state.modelFace);
                if (state.creativeState) setCreativeState(state.creativeState);
                if (state.customPrompt) setCustomPrompt(state.customPrompt);
                if (state.numberOfImages) setNumberOfImages(state.numberOfImages);
                if (state.aspectRatio) setAspectRatio(state.aspectRatio);
            }
        } catch (e) { console.error("Failed to load state from session storage", e); }
    }, []);

    useEffect(() => {
        try {
            const stateToSave = {
                gender, modelFace, creativeState, customPrompt, numberOfImages, aspectRatio
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
        } catch (e) { console.error("Failed to save state to session storage", e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        gender, modelFace, creativeState, customPrompt, numberOfImages, aspectRatio
    ]);

    const performGeneration = async () => {
        if (!productImage) throw new Error("No product image provided");

        const prompt = getTiktokAffiliatePrompt({
            gender,
            modelFace,
            customPrompt,
            hasFaceImage: !!faceImage,
            creativeDirection: creativeState
        });
        
        const imagesToCompose: { base64: string, mimeType: string, category: string, caption: string }[] = [
            { ...productImage, category: 'MEDIA_CATEGORY_SUBJECT', caption: 'product' }
        ];

        if (faceImage) {
            imagesToCompose.push({ ...faceImage, category: 'MEDIA_CATEGORY_SUBJECT', caption: 'model face' });
        }

        const result = await editOrComposeWithImagen({
            prompt,
            images: imagesToCompose,
            config: { aspectRatio }
        });
        const imageBase64 = result.imagePanels[0]?.generatedImages[0]?.encodedImage;

        if (!imageBase64) {
            throw new Error("The AI did not return an image. Please try a different prompt.");
        }
        
        return { imageBase64, prompt };
    };

    const generateOneImage = useCallback(async (index: number) => {
        if (!productImage) return;
    
        try {
            const { imageBase64, prompt } = await performGeneration();
            
            await addHistoryItem({ type: 'Image', prompt: `TikTok Affiliate: Vibe - ${creativeState.vibe}, Model - ${gender}`, result: imageBase64 });
    
            const updateResult = await incrementImageUsage(currentUser);
            if (updateResult.success && updateResult.user) {
                onUserUpdate(updateResult.user);
            }

            setImages(prev => {
                const newImages = [...prev];
                newImages[index] = imageBase64;
                return newImages;
            });
            setProgress(prev => prev + 1);

        } catch (e) {
            const userFriendlyMessage = handleApiError(e);
            setImages(prev => {
                const newImages = [...prev];
                newImages[index] = { error: userFriendlyMessage };
                return newImages;
            });
            setProgress(prev => prev + 1);
        }
    }, [productImage, faceImage, gender, modelFace, customPrompt, creativeState, aspectRatio, currentUser, onUserUpdate]);
    
    const handleGenerate = useCallback(async () => {
        if (!productImage) {
            setError("Please upload a product image first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setImages(Array(numberOfImages).fill(null));
        setSelectedImageIndex(0);
        setProgress(0);

        const promises = [];
        for (let i = 0; i < numberOfImages; i++) {
            promises.push(new Promise<void>(resolve => {
                setTimeout(async () => {
                    await generateOneImage(i);
                    resolve();
                }, i * 1200);
            }));
        }

        await Promise.all(promises);

        setIsLoading(false);
    }, [numberOfImages, productImage, generateOneImage]);
    
    const handleRetry = useCallback(async (index: number) => {
        setImages(prev => {
            const newImages = [...prev];
            newImages[index] = null;
            return newImages;
        });
        await generateOneImage(index);
    }, [generateOneImage]);
    
    const handleReset = useCallback(() => {
        setProductImage(null);
        setFaceImage(null);
        setImages([]);
        setError(null);
        setGender('Female');
        setModelFace('Random');
        setCreativeState(getInitialCreativeDirectionState());
        setCustomPrompt('');
        setNumberOfImages(1);
        setAspectRatio('9:16');
        setProductImageUploadKey(Date.now());
        setFaceImageUploadKey(Date.now() + 1);
        setProgress(0);
        sessionStorage.removeItem(SESSION_KEY);
    }, []);

    const leftPanel = (
      <>
          <div>
            <h1 className="text-xl font-bold sm:text-3xl">{T.title}</h1>
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
          </div>
          
          <Section title={T.assetAndModel}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageUpload key={productImageUploadKey} id="tiktok-product-upload" onImageUpload={(base64, mimeType) => setProductImage({base64, mimeType})} onRemove={() => setProductImage(null)} title={T.productPhoto} description={T.productPhotoDesc} language={language}/>
                  <ImageUpload key={faceImageUploadKey} id="tiktok-face-upload" onImageUpload={(base64, mimeType) => setFaceImage({base64, mimeType})} onRemove={() => setFaceImage(null)} title={T.facePhoto} description={T.facePhotoDesc} language={language}/>
              </div>
          </Section>

          <Section title={T.customPrompt}>
              <textarea id="custom-prompt-model" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder={T.customPromptPlaceholder} rows={3} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-sm text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{T.customPromptHelp}</p>
          </Section>
          
          <Section title={T.creativeDirection}>
            <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 transition-colors ${!!faceImage ? 'text-gray-400 dark:text-gray-500' : ''}`}>{T.gender}</label>
                        <div className="grid grid-cols-2 gap-3">
                            <CreativeButton label={T.female} isSelected={gender === 'Female'} onClick={() => setGender('Female')} icon={UserIcon} disabled={!!faceImage} />
                            <CreativeButton label={T.male} isSelected={gender === 'Male'} onClick={() => setGender('Male')} icon={UserIcon} disabled={!!faceImage} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="model-face-select" className={`block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 transition-colors ${!!faceImage ? 'text-gray-400 dark:text-gray-500' : ''}`}>{T.modelFace}</label>
                        <SelectControl id="model-face-select" value={modelFace} onChange={setModelFace} options={modelFaceOptions} disabled={!!faceImage} />
                    </div>
                </div>
                <CreativeDirectionPanel
                  state={creativeState}
                  setState={setCreativeState}
                  language={language}
                  showPose={true}
                  showEffect={false}
                  numberOfImages={numberOfImages}
                  setNumberOfImages={setNumberOfImages}
                  aspectRatio={aspectRatio}
                  setAspectRatio={setAspectRatio}
                />
            </div>
          </Section>

           <div className="pt-4 mt-auto">
                <div className="flex gap-4">
                    <button onClick={handleGenerate} disabled={isLoading} className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                        {isLoading ? <Spinner /> : T.generateButton}
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={isLoading}
                        className="flex-shrink-0 mt-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                    >
                        {T.resetButton}
                    </button>
                </div>
                {error && !isLoading && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
          </div>
      </>
    );

    const ActionButtons: React.FC<{ imageBase64: string; mimeType: string }> = ({ imageBase64, mimeType }) => (
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button onClick={() => onReEdit({ base64: imageBase64, mimeType })} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><WandIcon className="w-4 h-4" /></button>
            <button onClick={() => onCreateVideo({ prompt: getTiktokAffiliatePrompt({ gender, modelFace, customPrompt, hasFaceImage: !!faceImage, creativeDirection: creativeState }), image: { base64: imageBase64, mimeType } })} title="Create Video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><VideoIcon className="w-4 h-4" /></button>
            <button onClick={() => triggerDownload(imageBase64, 'monoklix-model-photo')} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><DownloadIcon className="w-4 h-4" /></button>
        </div>
    );
    
    const rightPanel = (
      <>
          {images.length > 0 ? (
               <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                <div className="flex-1 flex items-center justify-center min-h-0 w-full relative group">
                    {(() => {
                        const selectedImage = images[selectedImageIndex];
                        if (typeof selectedImage === 'string') {
                            return (
                                <>
                                    <img src={`data:image/png;base64,${selectedImage}`} alt={`Generated image ${selectedImageIndex + 1}`} className="rounded-md max-h-full max-w-full object-contain" />
                                    <ActionButtons imageBase64={selectedImage} mimeType="image/png" />
                                </>
                            );
                        } else if (selectedImage && typeof selectedImage === 'object') {
                            return (
                                <div className="text-center text-red-500 dark:text-red-400 p-4">
                                    <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4" />
                                    <p className="font-semibold">Generation Failed - Try Again @ Check Console Log.</p>
                                    <p className="text-sm mt-2 max-w-md mx-auto text-neutral-500 dark:text-neutral-400">All attempts failed. Please try again.</p>
                                    <button
                                        onClick={() => handleRetry(selectedImageIndex)}
                                        className="mt-6 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
                                    >
                                        <RefreshCwIcon className="w-4 h-4" />
                                        Try Again
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <Spinner />
                                {isLoading && numberOfImages > 1 && (
                                    <p className="text-sm text-neutral-500">
                                        {`${commonT.generating} (${progress}/${numberOfImages})`}
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                </div>
                {images.length > 1 && (
                  <div className="flex-shrink-0 w-full flex justify-center">
                    <div className="flex gap-2 overflow-x-auto p-2">
                      {images.map((img, index) => (
                        <button key={index} onClick={() => setSelectedImageIndex(index)} className={`w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden flex-shrink-0 transition-all duration-200 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 ${selectedImageIndex === index ? 'ring-4 ring-primary-500' : 'ring-2 ring-transparent hover:ring-primary-300'}`}>
                           {typeof img === 'string' ? (
                                <img src={`data:image/png;base64,${img}`} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                            ) : img && typeof img === 'object' ? (
                                <AlertTriangleIcon className="w-6 h-6 text-red-500" />
                            ) : (
                                <div className="flex flex-col items-center justify-center">
                                    <Spinner />
                                    <span className="text-[10px] mt-1 text-neutral-500">Slot {index + 1}</span>
                                </div>
                            )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          ) : isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Spinner />
                    <p className="text-sm text-neutral-500">
                        {`${commonT.generating}${numberOfImages > 1 ? ` (1/${numberOfImages})` : ''}`}
                    </p>
                    {isLoading && numberOfImages > 1 && <p className="text-xs text-neutral-400">Completed: {progress} / {numberOfImages}</p>}
                </div>
           ) : (
              <div className="text-center text-neutral-500 dark:text-neutral-600"><TikTokIcon className="w-16 h-16 mx-auto" /><p>{T.outputPlaceholder}</p></div>
          )}
      </>
    );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div><h2 className="text-lg font-semibold mb-2">{title}</h2>{children}</div>
);

export default TiktokAffiliateView;
