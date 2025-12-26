
import React, { useState, useCallback, useEffect } from 'react';
import { editOrComposeWithImagen } from '../../services/imagenV3Service';
import { addHistoryItem } from '../../services/historyService';
import ImageUpload from '../common/ImageUpload';
import Spinner from '../common/Spinner';
import { type MultimodalContent } from '../../services/geminiService';
import { DownloadIcon, ScissorsIcon, WandIcon, VideoIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getBackgroundRemovalPrompt } from '../../services/promptManager';
import { handleApiError } from '../../services/errorHandler';
import { incrementImageUsage } from '../../services/userService';
// FIX: Add missing Language import.
import { type User, type Language } from '../../types';


interface ImageData extends MultimodalContent {
  previewUrl: string;
}

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

interface BackgroundRemoverViewProps {
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  // FIX: Add 'language' to props interface.
  language: Language;
}

const SESSION_KEY = 'backgroundRemoverState';

const BackgroundRemoverView: React.FC<BackgroundRemoverViewProps> = ({ onReEdit, onCreateVideo, currentUser, onUserUpdate, language }) => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());

  
  useEffect(() => {
    // On load, we clear any previous session storage for this view
    // to avoid loading large, stale image data that might have been
    // saved by older versions of the component. This prevents quota errors.
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
    setImageData({ base64, mimeType, previewUrl: URL.createObjectURL(file) });
    setResultImage(null);
    setError(null);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageData(null);
  }, []);

  const handleRemove = useCallback(async () => {
    if (!imageData) {
      setError("Please upload an image to remove its background.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    
    try {
      const prompt = getBackgroundRemovalPrompt();
      const result = await editOrComposeWithImagen({
        prompt,
        images: [{ 
            base64: imageData.base64,
            mimeType: imageData.mimeType,
            category: 'MEDIA_CATEGORY_SUBJECT', 
            caption: 'image for background removal' 
        }],
        config: {
            aspectRatio: '1:1'
        }
      });

      const imageBase64 = result.imagePanels?.[0]?.generatedImages?.[0]?.encodedImage;

      if (imageBase64) {
        setResultImage(imageBase64);
        await addHistoryItem({
            type: 'Image',
            prompt: 'Background Removed',
            result: imageBase64,
        });

        const updateResult = await incrementImageUsage(currentUser);
        if (updateResult.success && updateResult.user) {
            onUserUpdate(updateResult.user);
        }
      } else {
        setError("The AI was unable to remove the background. Please try a different image.");
      }
    } catch (e) {
      handleApiError(e);
      setError("Failed"); // Set a generic state for UI, details are in console.
    } finally {
      setIsLoading(false);
    }
  }, [imageData, currentUser, onUserUpdate]);

  const handleReset = useCallback(() => {
    setImageData(null);
    setResultImage(null);
    setError(null);
    setIsLoading(false);
    setImageUploadKey(Date.now());
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const leftPanel = (
    <>
      <div>
        <h1 className="text-xl font-bold sm:text-3xl">AI Background Remover</h1>
        <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">Automatically remove the background from any image.</p>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
          {/* FIX: Add missing 'language' prop to ImageUpload component. */}
          <ImageUpload key={imageUploadKey} id="bg-remover-upload" onImageUpload={handleImageUpload} onRemove={handleRemoveImage} title="Upload Image" language={language}/>
      </div>
      
      <div className="pt-4 mt-auto">
          <div className="flex gap-4">
            <button
              onClick={handleRemove}
              disabled={isLoading || !imageData}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Spinner /> : "Remove Background"}
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
            <p className="text-neutral-500 dark:text-neutral-400">Removing background...</p>
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
                        <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Result (Transparent)</h4>
                        <div className="relative group bg-gray-200 dark:bg-gray-700 rounded-lg" style={{backgroundImage: 'repeating-conic-gradient(#e5e7eb 0 25%, transparent 0 50%)', backgroundSize: '16px 16px'}}>
                            <img src={`data:image/png;base64,${resultImage}`} alt="Background removed" className="rounded-lg w-full" />
                            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                               <button onClick={() => onReEdit({ base64: resultImage, mimeType: 'image/png' })} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><WandIcon className="w-4 h-4" /></button>
                               <button onClick={() => onCreateVideo({ prompt: 'Video of this subject with a transparent background', image: { base64: resultImage, mimeType: 'image/png' } })} title="Create video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><VideoIcon className="w-4 h-4" /></button>
                               <button onClick={() => triggerDownload(resultImage, 'monoklix-bg-removed')} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><DownloadIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="text-center text-neutral-500 dark:text-neutral-600">
          <ScissorsIcon className="w-16 h-16 mx-auto" />
          <p className="mt-2">Your result will appear here.</p>
        </div>
      )}
    </>
  );

  // FIX: Pass the 'language' prop to TwoColumnLayout to fix type error.
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

export default BackgroundRemoverView;
