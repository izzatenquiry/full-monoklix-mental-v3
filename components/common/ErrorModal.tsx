import React, { useState } from 'react';
import { type ErrorModalContent } from '../../types';
import { XIcon, AlertTriangleIcon, CheckCircleIcon, SparklesIcon } from '../Icons';
import Spinner from './Spinner';
import { getTranslations } from '../../services/translations';

interface ErrorModalProps {
    isOpen: boolean;
    errorContent: ErrorModalContent;
    onClose: () => void;
    onReport: () => Promise<void>;
    onAutoApiKey: () => void;
    onAutoVeoKey: () => Promise<boolean>;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, errorContent, onClose, onReport, onAutoApiKey, onAutoVeoKey }) => {
    const [isReporting, setIsReporting] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    const [veoStatus, setVeoStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
    const T = getTranslations().errorModal;

    const handleReport = async () => {
        setIsReporting(true);
        setReportSuccess(false);
        try {
            await onReport();
            setReportSuccess(true);
        } finally {
            setIsReporting(false);
        }
    };

    const handleAutoVeoKeyClick = async () => {
        setVeoStatus('loading');
        const success = await onAutoVeoKey();
        setVeoStatus(success ? 'success' : 'failed');
        if (success) {
            setTimeout(onClose, 1500); // Close on success after a short delay
        }
    };

    if (!isOpen) return null;

    const { title, message, suggestion, errorCode } = errorContent;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-zoomIn" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg m-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                            <AlertTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2" id="modal-title">
                                {title}
                                {errorCode && <span className="font-mono text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">Code: {errorCode}</span>}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                                    {message}
                                </p>
                                {suggestion && (
                                    <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300 p-3 bg-neutral-100 dark:bg-neutral-800/50 rounded-md border border-neutral-200 dark:border-neutral-700">
                                        <strong>{T.suggestion}</strong> {suggestion}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/50 px-6 py-4 space-y-3">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center items-center gap-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
                            onClick={handleAutoVeoKeyClick}
                            disabled={veoStatus === 'loading' || veoStatus === 'success'}
                        >
                            {veoStatus === 'loading' ? <Spinner /> : veoStatus === 'success' ? <CheckCircleIcon className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5"/>}
                            {veoStatus === 'success' ? T.refreshed : T.autoVeo}
                        </button>
                        <button
                            type="button"
                            className="w-full inline-flex justify-center items-center gap-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
                            onClick={onAutoApiKey}
                        >
                            <SparklesIcon className="w-5 h-5"/>
                            {T.autoApi}
                        </button>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center items-center gap-2 rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
                            onClick={handleReport}
                            disabled={isReporting || reportSuccess}
                        >
                            {isReporting ? <Spinner /> : reportSuccess ? <CheckCircleIcon className="w-5 h-5"/> : null}
                            {reportSuccess ? T.reported : T.report}
                        </button>
                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2 text-base font-medium text-neutral-700 dark:text-neutral-200 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
                            onClick={onClose}
                        >
                            {T.close}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ErrorModal;