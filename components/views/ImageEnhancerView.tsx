
import React, { useState, useCallback, useEffect } from 'react';
import { addHistoryItem } from '../../services/historyService';
import ImageUpload from '../common/ImageUpload';
import Spinner from '../common/Spinner';
import { type MultimodalContent } from '../../services/geminiService';
import { DownloadIcon, WandIcon, VideoIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getImageEnhancementPrompt } from '../../services/promptManager';
import { handleApiError } from '../../services/errorHandler';
import { editOrComposeWithImagen } from '../../services/imagenV3Service';
import { incrementImageUsage } from '../../services/userService';
// FIX: Add missing Language import.
import { type User, type Language } from '../../types';


interface ImageData extends MultimodalContent {
  previewUrl: string;
}

type EnhancementType = 'upscale' | 'colors';

const triggerDownload = (data: string, fileNameBase: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${data}`;
    link.download = `${fileNameBase}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface ImageEnhancerViewProps {
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  // FIX: Add 'language' to props interface.
  language: Language;
}

const SESSION_KEY = 'imageEnhancerState';

const ImageEnhancerView: React.FC<ImageEnhancerViewProps> = ({ onReEdit, onCreateVideo, currentUser, onUserUpdate, language }) => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancementType, setEnhancementType] = useState<EnhancementType>('upscale');
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());

  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem(SESSION_KEY);
      if (savedState) {
        const { enhancementType } = JSON.parse(savedState);
        // Do not load image data
        // if (imageData) setImageData(imageData);
        // if (resultImage) setResultImage(resultImage);
        if (enhancementType) setEnhancementType(enhancementType);
      }
    } catch (e) { console.error("Failed to load state from session storage", e); }
  }, []);

  useEffect(() => {
    try {
      // Only save non-image data to session storage to avoid quota errors.
      const stateToSave = { enhancementType };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
    } catch (e) { console.error("Failed to save state to session storage", e); }
  }, [enhancementType]);

  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
    setImageData({ base64, mimeType, previewUrl: URL.createObjectURL(file) });
    setResultImage(null);
    setError(null);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageData(null);
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!imageData) {
      setError("Please upload an image to enhance.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    
    const prompt = getImageEnhancementPrompt(enhancementType);
    const historyPrompt = enhancementType === 'upscale' ? "Image Upscaled" : "Image Colors Enhanced";

    try {
       const result = await editOrComposeWithImagen({
          prompt,
          images: [{ ...imageData, category: 'MEDIA_CATEGORY_SUBJECT', caption: 'image to enhance' }],
          config: { aspectRatio: '1:1' }
      });
      const imageBase64 = result.imagePanels[0]?.generatedImages[0]?.encodedImage;

      if (imageBase64) {
        setResultImage(imageBase64);
        await addHistoryItem({
            type: 'Image',
            prompt: historyPrompt,
            result: imageBase64,
        });

        const updateResult = await incrementImageUsage(currentUser);
        if (updateResult.success && updateResult.user) {
            onUserUpdate(updateResult.user);
        }
      } else {
        setError("The AI was unable to enhance the image. Please try a different image.");
      }
    } catch (e) {
      handleApiError(e);
      setError("Failed"); // Set a generic state for UI, details are in console.
    } finally {
      setIsLoading(false);
    }
  }, [imageData, enhancementType, currentUser, onUserUpdate]);

  const handleReset = useCallback(() => {
    setImageData(null);
    setResultImage(null);
    setError(null);
    setEnhancementType('upscale');
    setImageUploadKey(Date.now());
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const leftPanel = (
    <>
      <div>
        <h1 className="text-xl font-bold sm:text-3xl">AI Image Enhancer</h1>
        <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">Improve the quality and colors of your images.</p>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
          {/* FIX: Add missing 'language' prop to ImageUpload component. */}
          <ImageUpload key={imageUploadKey} id="enhancer-upload" onImageUpload={handleImageUpload} onRemove={handleRemoveImage} title="Upload Image to Enhance" language={language}/>
      </div>
      
      <div className="space-y-4 pt-4 mt-auto">
          <div className="flex justify-center gap-4">
              <button onClick={() => setEnhancementType('upscale')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm ${enhancementType === 'upscale' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Upscale & Sharpen</button>
              <button onClick={() => setEnhancementType('colors')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm ${enhancementType === 'colors' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Enhance Colors</button>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleEnhance}
              disabled={isLoading || !imageData}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Spinner /> : "Enhance Image"}
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
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <Spinner />
            <p className="text-neutral-500 dark:text-neutral-400">Enhancing image...</p>
        </div>
      ) : resultImage && imageData ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                        <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Original</h4>
                        <img src={imageData.previewUrl} alt="Original" className="rounded-lg w-full" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Enhanced</h4>
                        <div className="relative group">
                            <img src={`data:image/png;base64,${resultImage}`} alt="Enhanced" className="rounded-lg w-full" />
                            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                               <button onClick={() => onReEdit({ base64: resultImage, mimeType: 'image/png' })} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><WandIcon className="w-4 h-4" /></button>
                               <button onClick={() => onCreateVideo({ prompt: 'Video of this enhanced image', image: { base64: resultImage, mimeType: 'image/png' } })} title="Create video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><VideoIcon className="w-4 h-4" /></button>
                               <button onClick={() => triggerDownload(resultImage, 'monoklix-enhanced')} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><DownloadIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="text-center text-neutral-500 dark:text-neutral-600">
          <WandIcon className="w-16 h-16 mx-auto" />
          <p className="mt-2">Your enhanced image will appear here.</p>
        </div>
      )}
    </>
  );
  
  // FIX: Pass the 'language' prop to TwoColumnLayout to fix type error.
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

export default ImageEnhancerView;
