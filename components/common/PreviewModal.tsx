import React, { useEffect } from 'react';
import { type HistoryItem, type Language } from '../../types';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from '../Icons';
import { getTranslations } from '../../services/translations';

interface PreviewModalProps {
  item: HistoryItem | null;
  onClose: () => void;
  getDisplayUrl: (item: HistoryItem) => string;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  language: Language;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ item, onClose, getDisplayUrl, onNext, onPrevious, hasNext, hasPrevious, language }) => {
  // FIX: Remove `language` argument from `getTranslations` call.
  const T = getTranslations().common;
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && onNext && hasNext) onNext();
      if (event.key === 'ArrowLeft' && onPrevious && hasPrevious) onPrevious();
    };

    if (item) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose, onNext, onPrevious, hasNext, hasPrevious]);

  if (!item) return null;

  const displayUrl = getDisplayUrl(item);
  const isImage = item.type === 'Image' || item.type === 'Canvas';
  const isVideo = item.type === 'Video';

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-zoomIn p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
        {/* Navigation: Previous */}
        {hasPrevious && onPrevious && (
            <button
                onClick={(e) => { e.stopPropagation(); onPrevious(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-2 hover:bg-white/40 transition-colors z-10"
                aria-label={T.previousItem}
            >
                <ChevronLeftIcon className="w-8 h-8" />
            </button>
        )}

      <div
        className="relative bg-neutral-950 rounded-lg shadow-2xl p-4 w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the content
      >
        <button
          onClick={onClose}
          className="absolute -top-5 -right-5 bg-white text-black rounded-full p-2 hover:scale-110 transition-transform z-10 shadow-lg"
          aria-label={T.closePreview}
        >
          <XIcon className="w-6 h-6" />
        </button>

        <div className="flex-1 flex items-center justify-center min-h-0">
          {isImage && (
            <img src={displayUrl} alt={item.prompt} className="max-w-full max-h-full object-contain rounded-md" />
          )}
          {isVideo && displayUrl && (
            <video src={displayUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded-md" />
          )}
        </div>
        
        <div className="flex-shrink-0 mt-4 text-center">
            <p className="text-white text-sm line-clamp-2">{item.prompt}</p>
        </div>
      </div>

        {/* Navigation: Next */}
        {hasNext && onNext && (
            <button
                onClick={(e) => { e.stopPropagation(); onNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-2 hover:bg-white/40 transition-colors z-10"
                aria-label={T.nextItem}
            >
                <ChevronRightIcon className="w-8 h-8" />
            </button>
        )}
    </div>
  );
};

export default PreviewModal;