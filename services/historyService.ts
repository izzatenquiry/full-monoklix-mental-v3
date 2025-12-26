import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import { type HistoryItem } from '../types';
import { cacheVideo, getCachedVideo, deleteCachedVideo } from './videoCacheService';

const HISTORY_KEY = 'monoklix_history';
const MAX_HISTORY_ITEMS = 100;

// ===============================
// 📝 HISTORY MANAGEMENT
// ===============================

/**
 * Add item to history with video caching
 */
export const addHistoryItem = async (item: Omit<HistoryItem, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const newItem: HistoryItem = {
      ...item,
      id: uuidv4(),
      timestamp: Date.now(),
    };

    // ✅ If it's a video, cache it persistently
    if (item.type === 'Video' && item.result instanceof Blob) {
      console.log('💾 Caching video to persistent storage...');
      
      await cacheVideo(
        newItem.id,
        item.result,
        {
          prompt: item.prompt,
          model: 'veo-3.0', // You can pass this from the caller
          duration: undefined // Can calculate if needed
        }
      );

      // Store reference to cached video instead of blob
      newItem.result = `cached:${newItem.id}`;
    }

    const history = await localforage.getItem<HistoryItem[]>(HISTORY_KEY) || [];
    history.unshift(newItem);

    // Limit history size
    if (history.length > MAX_HISTORY_ITEMS) {
      const removed = history.splice(MAX_HISTORY_ITEMS);
      
      // Clean up cached videos for removed items
      for (const item of removed) {
        if (item.type === 'Video' && typeof item.result === 'string' && item.result.startsWith('cached:')) {
          const videoId = item.result.replace('cached:', '');
          await deleteCachedVideo(videoId).catch(err => 
            console.warn('Failed to delete cached video:', err)
          );
        }
      }
    }

    await localforage.setItem(HISTORY_KEY, history);
    console.log('✅ History item added:', newItem.id);

  } catch (error) {
    console.error('❌ Failed to add history item:', error);
    throw error;
  }
};

/**
 * Get all history items with cached video URLs
 */
export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const history = await localforage.getItem<HistoryItem[]>(HISTORY_KEY) || [];
    
    // ✅ Resolve cached video references
    const resolvedHistory = await Promise.all(
      history.map(async (item) => {
        if (item.type === 'Video' && typeof item.result === 'string' && item.result.startsWith('cached:')) {
          const videoId = item.result.replace('cached:', '');
          const cachedBlob = await getCachedVideo(videoId);
          
          if (cachedBlob) {
            // Return item with blob for immediate use
            return { ...item, result: cachedBlob };
          } else {
            // Video was evicted from cache or corrupted. Mark it as unavailable.
            console.warn(`⚠️ Cached video not found: ${videoId}`);
            return { ...item, result: 'unavailable' };
          }
        }
        return item;
      })
    );

    // Return all items, letting the UI handle the 'unavailable' state
    return resolvedHistory;

  } catch (error) {
    console.error('❌ Failed to get history:', error);
    return [];
  }
};

/**
 * Get single history item by ID with cached video
 */
export const getHistoryItemById = async (id: string): Promise<HistoryItem | null> => {
  try {
    const history = await getHistory();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('❌ Failed to get history item:', error);
    return null;
  }
};

/**
 * Delete history item and its cached video
 */
export const deleteHistoryItem = async (id: string): Promise<void> => {
  try {
    const history = await localforage.getItem<HistoryItem[]>(HISTORY_KEY) || [];
    const itemIndex = history.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      console.warn('⚠️ History item not found:', id);
      return;
    }

    const item = history[itemIndex];

    // Delete cached video if exists
    if (item.type === 'Video' && typeof item.result === 'string' && item.result.startsWith('cached:')) {
      const videoId = item.result.replace('cached:', '');
      await deleteCachedVideo(videoId).catch(err =>
        console.warn('Failed to delete cached video:', err)
      );
    }

    history.splice(itemIndex, 1);
    await localforage.setItem(HISTORY_KEY, history);
    console.log('✅ History item deleted:', id);

  } catch (error) {
    console.error('❌ Failed to delete history item:', error);
    throw error;
  }
};

/**
 * Clear entire history and video cache
 */
export const clearHistory = async (): Promise<void> => {
  try {
    const history = await localforage.getItem<HistoryItem[]>(HISTORY_KEY) || [];

    // Delete all cached videos
    const deletePromises = history
      .filter(item => item.type === 'Video' && typeof item.result === 'string' && item.result.startsWith('cached:'))
      .map(item => {
        const videoId = (item.result as string).replace('cached:', '');
        return deleteCachedVideo(videoId).catch(err =>
          console.warn('Failed to delete cached video:', err)
        );
      });

    await Promise.all(deletePromises);
    await localforage.removeItem(HISTORY_KEY);
    console.log('✅ History cleared');

  } catch (error) {
    console.error('❌ Failed to clear history:', error);
    throw error;
  }
};

/**
 * Get history filtered by type
 */
export const getHistoryByType = async (type: HistoryItem['type']): Promise<HistoryItem[]> => {
  try {
    const history = await getHistory();
    return history.filter(item => item.type === type);
  } catch (error) {
    console.error('❌ Failed to get history by type:', error);
    return [];
  }
};

/**
 * Export history as JSON (without video blobs)
 */
export const exportHistory = async (): Promise<string> => {
  try {
    const history = await localforage.getItem<HistoryItem[]>(HISTORY_KEY) || [];
    
    // Convert to exportable format (remove blobs)
    const exportData = history.map(item => ({
      id: item.id,
      type: item.type,
      prompt: item.prompt,
      timestamp: item.timestamp,
      // Store video reference only
      result: item.type === 'Video' ? 'cached' : item.result
    }));

    return JSON.stringify(exportData, null, 2);

  } catch (error) {
    console.error('❌ Failed to export history:', error);
    throw error;
  }
};

/**
 * Get history statistics
 */
export const getHistoryStats = async (): Promise<{
  total: number;
  byType: Record<string, number>;
  totalSize: string;
}> => {
  try {
    const history = await getHistory();
    const byType: Record<string, number> = {};
    let totalSize = 0;

    for (const item of history) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      
      if (item.result instanceof Blob) {
        totalSize += item.result.size;
      }
    }

    return {
      total: history.length,
      byType,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
    };

  } catch (error) {
    console.error('❌ Failed to get history stats:', error);
    return { total: 0, byType: {}, totalSize: '0 MB' };
  }
};
