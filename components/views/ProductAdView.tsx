import React, { useState, useCallback, useEffect } from 'react';
import ImageUpload from '../common/ImageUpload';
import { generateMultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { StoreIcon, DownloadIcon, ClipboardIcon, CheckCircleIcon } from '../Icons';
import { type MultimodalContent } from '../../services/geminiService';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getProductAdPrompt } from '../../services/promptManager';
import { handleApiError } from '../../services/errorHandler';
// FIX: Add missing Language import.
import { type Language } from '../../types';
import { vibeOptions, lightingOptions } from '../../services/creativeDirectionService';


const contentTypeOptions = ["Random", "Hard Selling", "Soft Selling", "Storytelling", "Problem/Solution", "ASMR / Sensory", "Unboxing", "Educational", "Testimonial"];
const languages = ["English", "Bahasa Malaysia"];

const downloadText = (text: string, fileName: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const SelectControl: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const SESSION_KEY = 'productAdState';

interface ProductAdViewProps {
    // FIX: Add language to props.
    language: Language;
}

const ProductAdView: React.FC<ProductAdViewProps> = ({ language }) => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [productDesc, setProductDesc] = useState('');
  const [selections, setSelections] = useState({
    vibe: 'Random',
    lighting: 'Random',
    contentType: contentTypeOptions[0],
    language: "Bahasa Malaysia",
  });
  const [storyboard, setStoryboard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());
  
  useEffect(() => {
    try {
        const savedState = sessionStorage.getItem(SESSION_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);
            if (state.productImage) setProductImage(state.productImage);
            if (state.productDesc) setProductDesc(state.productDesc);
            if (state.selections) setSelections(state.selections);
            if (state.storyboard) setStoryboard(state.storyboard);
        }
    } catch (e) { console.error("Failed to load state from session storage", e); }
  }, []);

  useEffect(() => {
    try {
        const stateToSave = { productImage, productDesc, selections, storyboard };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
    } catch (e) { console.error("Failed to save state to session storage", e); }
  }, [productImage, productDesc, selections, storyboard]);

  const handleImageUpload = useCallback((base64: string, mimeType: string) => {
    setProductImage({ base64, mimeType });
  }, []);

  const handleRemoveImage = useCallback(() => {
    setProductImage(null);
  }, []);
  
  const handleSelection = (category: keyof typeof selections, value: string) => {
    setSelections(prev => ({ ...prev, [category]: value }));
  };

  const handleGenerate = async () => {
    if (!productImage || !productDesc) {
      setError("Imej dan penerangan produk diperlukan untuk menjana jalan cerita.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setStoryboard(null);
    setCopied(false);

    // FIX: Add missing 'language' property to the object passed to getProductAdPrompt.
    const prompt = getProductAdPrompt({
        productDesc,
        language: selections.language,
        vibe: selections.vibe,
        lighting: selections.lighting,
        contentType: selections.contentType,
    });

    try {
      const result = await generateMultimodalContent(prompt, [productImage]);
      setStoryboard(result);
      await addHistoryItem({
        type: 'Storyboard',
        prompt: `Product Ad: ${productDesc.substring(0, 50)}... (Lang: ${selections.language})`,
        result: result,
      });
    } catch (e) {
      handleApiError(e);
      setError("Failed"); // Set a generic state for UI, details are in console.
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopy = () => {
    if (!storyboard) return;
    navigator.clipboard.writeText(storyboard);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleReset = useCallback(() => {
    setProductImage(null);
    setProductDesc('');
    setSelections({
        vibe: 'Random',
        lighting: 'Random',
        contentType: contentTypeOptions[0],
        language: "Bahasa Malaysia",
    });
    setStoryboard(null);
    setError(null);
    setImageUploadKey(Date.now());
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const leftPanel = (
      <>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Jalan Cerita Iklan Produk</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Jana konsep iklan video yang pendek dan menarik.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Muat Naik Foto Produk</h2>
          {/* FIX: Add missing 'language' prop to ImageUpload component. */}
          <ImageUpload key={imageUploadKey} id="product-ad-upload" onImageUpload={handleImageUpload} onRemove={handleRemoveImage} language={language} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Penerangan Produk</h2>
          <textarea
            value={productDesc}
            onChange={(e) => setProductDesc(e.target.value)}
            placeholder="cth., Biji kopi organik dari Brazil, asal tunggal, aroma kaya..."
            rows={4}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Arahan Kreatif</h2>
          <div className="grid grid-cols-2 gap-4">
            <SelectControl
              label="Vibe / Mood"
              value={selections.vibe}
              onChange={(value) => handleSelection('vibe', value)}
              options={vibeOptions}
            />
            <SelectControl
              label="Lighting"
              value={selections.lighting}
              onChange={(value) => handleSelection('lighting', value)}
              options={lightingOptions}
            />
            <SelectControl
              label="Jenis Kandungan"
              value={selections.contentType}
              onChange={(value) => handleSelection('contentType', value)}
              options={contentTypeOptions}
            />
            <SelectControl
              label="Bahasa Output"
              value={selections.language}
              onChange={(value) => handleSelection('language', value)}
              options={languages}
            />
          </div>
        </div>

        <div className="pt-4 mt-auto">
            <div className="flex gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isLoading ? <Spinner /> : "Jana Jalan Cerita"}
                </button>
                 <button
                    onClick={handleReset}
                    disabled={isLoading}
                    className="flex-shrink-0 mt-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                >
                    Set Semula
                </button>
            </div>
            {error && error !== 'Failed' && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
        </div>
      </>
  );

  const rightPanel = (
      <>
        {storyboard && !isLoading && (
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                >
                  {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500"/> : <ClipboardIcon className="w-4 h-4"/>}
                  {copied ? "Disalin!" : "Salin"}
              </button>
              <button 
                onClick={() => downloadText(storyboard, `monoklix-storyboard-${Date.now()}.txt`)} 
                className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
              >
                  <DownloadIcon className="w-4 h-4"/> Muat Turun
              </button>
            </div>
        )}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Spinner />
            <p className="text-neutral-500 dark:text-neutral-400">Sedang menjana jalan cerita anda...</p>
          </div>
        )}
        {storyboard && !isLoading && (
          <div className="prose dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap w-full h-full overflow-y-auto pr-2 custom-scrollbar">
            {storyboard}
          </div>
        )}
        {!isLoading && !storyboard && (
          <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600">
            <div>
              <StoreIcon className="w-16 h-16 mx-auto" />
              <p>Papan cerita yang anda jana akan muncul di sini.</p>
            </div>
          </div>
        )}
      </>
  );
  
  // FIX: Pass the 'language' prop to the TwoColumnLayout component.
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

export default ProductAdView;