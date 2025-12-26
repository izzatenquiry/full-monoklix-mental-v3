import React from 'react';
import { AlertTriangleIcon } from '../Icons';
import { getTranslations } from '../../services/translations';
import { type Language } from '../../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  language: Language;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  language,
}) => {
  // FIX: Remove `language` argument from `getTranslations` call.
  const T = getTranslations().confirmationModal;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-zoomIn p-4" aria-modal="true" role="dialog" onClick={onCancel}>
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
        <div className="p-6">
            <div className="flex items-start gap-4">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                    <AlertTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{message}</p>
                </div>
            </div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={onCancel}
            type="button"
            className="px-4 py-2 text-sm font-semibold bg-neutral-200 dark:bg-neutral-600 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors"
          >
            {cancelText || T.cancel}
          </button>
          <button
            onClick={onConfirm}
            type="button"
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${confirmButtonClass}`}
          >
            {confirmText || T.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;