import { type AiLogItem } from '../types';
import { supabase } from './supabaseClient';
import { dbGetLogs, dbClearLogs, dbAddAndPruneLogEntry } from './indexedDBService';
import { logActivity } from './userService';

const MAX_LOG_ITEMS = 50;

/**
 * Gets the current user's ID from the active session.
 * @returns {string | null} The user's ID or null if not authenticated.
 */
const getCurrentUserId = (): string | null => {
    try {
        const savedUserJson = localStorage.getItem('currentUser');
        if (savedUserJson) {
            const user = JSON.parse(savedUserJson);
            if (user && user.id) {
                return user.id;
            }
        }
    } catch (error) {
        console.error("Failed to parse user from localStorage for AI log.", error);
    }
    // Silent fail to avoid console spam if just checking status
    return null;
};

/**
 * Retrieves the entire AI log for the current user from IndexedDB.
 * @returns {Promise<AiLogItem[]>} A promise that resolves to an array of log items.
 */
export const getLogs = async (): Promise<AiLogItem[]> => {
    const userId = getCurrentUserId();
    if (!userId) return [];
    return dbGetLogs(userId);
};

/**
 * Adds a new entry to the current user's AI log in IndexedDB and sends a copy to Supabase.
 * @param {Omit<AiLogItem, 'id' | 'timestamp' | 'userId'>} newLogData - The data for the new log item.
 */
export const addLogEntry = async (newLogData: Omit<AiLogItem, 'id' | 'timestamp' | 'userId'>) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const outputText = typeof newLogData.output === 'string' ? newLogData.output : '';

    // Filter out verbose/intermediate logs from Supabase to reduce DB load.
    // We ONLY want to log final successes ("Video ready") or Errors.
    const isVerboseLog = 
        outputText.includes('Checking video status') ||
        outputText.includes('Starting video generation') ||
        outputText.includes('Uploading reference image') ||
        outputText.includes('Cropping reference image') ||
        outputText.includes('In progress...') ||
        outputText.includes('Streaming response started') ||
        (outputText.includes('Attempt') && outputText.includes('failed')); // Retry attempts

    if (!isVerboseLog) {
        // Log to Supabase for admin tracking (fire-and-forget)
        logActivity('ai_generation', {
            model: newLogData.model,
            prompt: newLogData.prompt,
            // Truncate long text outputs to keep the log concise
            output: outputText.substring(0, 500) + (outputText.length > 500 ? '...' : ''),
            token_count: newLogData.tokenCount,
            status: newLogData.status,
            error_message: newLogData.error,
        }).catch(err => console.error("Supabase logging failed:", err));
    }

    const newLogItem: AiLogItem = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        userId,
        ...newLogData,
    };
  
    try {
        // FIX: Replaced separate add and prune operations with a single atomic transaction
        // to prevent database deadlocks which caused saving to fail and log viewing to hang.
        await dbAddAndPruneLogEntry(newLogItem, userId, MAX_LOG_ITEMS);
    } catch (error) {
        console.error("Failed to save AI log to IndexedDB:", error);
    }
};

/**
 * Clears the entire AI log for the current user from IndexedDB.
 */
export const clearLogs = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    await dbClearLogs(userId);
};