import localforage from 'localforage';

// ===============================
// 📦 VIDEO CACHE CONFIGURATION
// ===============================

const VIDEO_CACHE_KEY = 'monoklix_video_cache';
// NOTA: Had ini tidak lagi dikuatkuasakan untuk storan kekal.
const MAX_CACHE_SIZE_MB = 500;
const MAX_VIDEOS = 50;

interface CachedVideo {
  id: string;
  blob: Blob;
  timestamp: number;
  size: number; // in bytes
  metadata: {
    prompt?: string;
    model?: string;
    duration?: number;
  };
}

interface CacheStats {
  totalSize: number;
  totalVideos: number;
  oldestVideo: number;
  newestVideo: number;
}

// Configure localforage for video storage
const videoStorage = localforage.createInstance({
  name: 'monoklix',
  storeName: 'videos',
  description: 'Persistent video cache'
});

// ===============================
// 🎬 CACHE MANAGEMENT
// ===============================

/**
 * Save video to persistent cache
 */
export const cacheVideo = async (
  videoId: string,
  blob: Blob,
  metadata?: { prompt?: string; model?: string; duration?: number }
): Promise<void> => {
  try {
    console.log(`💾 Caching video: ${videoId} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);

    // DILUMPUHKAN: Tidak lagi menguatkuasakan had cache untuk storan kekal.
    // await enforceCacheLimits(blob.size);

    const cachedVideo: CachedVideo = {
      id: videoId,
      blob,
      timestamp: Date.now(),
      size: blob.size,
      metadata: metadata || {}
    };

    await videoStorage.setItem(videoId, cachedVideo);
    console.log(`✅ Video cached successfully: ${videoId}`);

    // Update cache index
    await updateCacheIndex(videoId, blob.size);

  } catch (error) {
    console.error('❌ Failed to cache video:', error);
    throw error;
  }
};

/**
 * Retrieve video from cache
 */
export const getCachedVideo = async (videoId: string): Promise<Blob | null> => {
  try {
    const cached = await videoStorage.getItem<CachedVideo>(videoId);
    
    if (!cached) {
      console.log(`⚠️ Video not found in cache: ${videoId}`);
      return null;
    }

    console.log(`✅ Video retrieved from cache: ${videoId}`);
    
    // Update access timestamp (LRU)
    cached.timestamp = Date.now();
    await videoStorage.setItem(videoId, cached);
    
    return cached.blob;

  } catch (error) {
    console.error('❌ Failed to retrieve cached video:', error);
    return null;
  }
};

/**
 * Check if video exists in cache
 */
export const isVideoCached = async (videoId: string): Promise<boolean> => {
  try {
    const cached = await videoStorage.getItem<CachedVideo>(videoId);
    return cached !== null;
  } catch (error) {
    console.error('❌ Failed to check cache:', error);
    return false;
  }
};

/**
 * Delete video from cache
 */
export const deleteCachedVideo = async (videoId: string): Promise<void> => {
  try {
    const cached = await videoStorage.getItem<CachedVideo>(videoId);
    if (cached) {
      await videoStorage.removeItem(videoId);
      await updateCacheIndex(videoId, -cached.size);
      console.log(`🗑️ Deleted cached video: ${videoId}`);
    }
  } catch (error) {
    console.error('❌ Failed to delete cached video:', error);
    throw error;
  }
};

/**
 * Clear entire video cache
 */
export const clearVideoCache = async (): Promise<void> => {
  try {
    await videoStorage.clear();
    await localforage.removeItem(VIDEO_CACHE_KEY);
    console.log('🧹 Video cache cleared');
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
    throw error;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<CacheStats> => {
  try {
    const keys = await videoStorage.keys();
    let totalSize = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    for (const key of keys) {
      const cached = await videoStorage.getItem<CachedVideo>(key);
      if (cached) {
        totalSize += cached.size;
        if (cached.timestamp < oldestTimestamp) oldestTimestamp = cached.timestamp;
        if (cached.timestamp > newestTimestamp) newestTimestamp = cached.timestamp;
      }
    }

    return {
      totalSize,
      totalVideos: keys.length,
      oldestVideo: oldestTimestamp === Infinity ? 0 : oldestTimestamp,
      newestVideo: newestTimestamp
    };

  } catch (error) {
    console.error('❌ Failed to get cache stats:', error);
    return { totalSize: 0, totalVideos: 0, oldestVideo: 0, newestVideo: 0 };
  }
};

/**
 * Get all cached video IDs
 */
export const getAllCachedVideoIds = async (): Promise<string[]> => {
  try {
    return await videoStorage.keys();
  } catch (error) {
    console.error('❌ Failed to get cached video IDs:', error);
    return [];
  }
};

// ===============================
// 🔧 INTERNAL HELPERS
// ===============================

/**
 * Maintain cache index for quick lookups
 */
const updateCacheIndex = async (videoId: string, sizeChange: number): Promise<void> => {
  try {
    let index = await localforage.getItem<Record<string, number>>(VIDEO_CACHE_KEY) || {};
    
    if (sizeChange < 0) {
      // Deletion
      delete index[videoId];
    } else {
      // Addition
      index[videoId] = Date.now();
    }
    
    await localforage.setItem(VIDEO_CACHE_KEY, index);
  } catch (error) {
    console.error('❌ Failed to update cache index:', error);
  }
};

/**
 * Enforce cache size and count limits (LRU eviction)
 * NOTA: Fungsi ini kini dilumpuhkan dalam `cacheVideo` untuk menyediakan storan kekal.
 */
const enforceCacheLimits = async (newVideoSize: number): Promise<void> => {
  const stats = await getCacheStats();
  const maxSizeBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;

  // Check if adding new video would exceed limits
  if (stats.totalVideos >= MAX_VIDEOS || (stats.totalSize + newVideoSize) > maxSizeBytes) {
    console.log('⚠️ Cache limit reached, evicting old videos...');
    
    // Get all videos sorted by timestamp (oldest first)
    const keys = await videoStorage.keys();
    const videos: Array<{ id: string; timestamp: number; size: number }> = [];

    for (const key of keys) {
      const cached = await videoStorage.getItem<CachedVideo>(key);
      if (cached) {
        videos.push({ id: cached.id, timestamp: cached.timestamp, size: cached.size });
      }
    }

    // Sort by timestamp (oldest first)
    videos.sort((a, b) => a.timestamp - b.timestamp);

    // Evict oldest videos until we have space
    let currentSize = stats.totalSize;
    let currentCount = stats.totalVideos;

    for (const video of videos) {
      if (currentCount < MAX_VIDEOS && (currentSize + newVideoSize) <= maxSizeBytes) {
        break;
      }

      console.log(`🗑️ Evicting old video: ${video.id} (${(video.size / 1024 / 1024).toFixed(2)} MB)`);
      await deleteCachedVideo(video.id);
      currentSize -= video.size;
      currentCount--;
    }

    console.log(`✅ Cache cleaned: ${currentCount} videos, ${(currentSize / 1024 / 1024).toFixed(2)} MB`);
  }
};

// ===============================
// 🎯 HELPER UTILITIES
// ===============================

/**
 * Create object URL from cached video (with auto-revoke)
 */
export const createCachedVideoURL = async (videoId: string): Promise<string | null> => {
  const blob = await getCachedVideo(videoId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
};

/**
 * Get video metadata
 */
export const getVideoMetadata = async (videoId: string): Promise<CachedVideo['metadata'] | null> => {
  try {
    const cached = await videoStorage.getItem<CachedVideo>(videoId);
    return cached?.metadata || null;
  } catch (error) {
    console.error('❌ Failed to get video metadata:', error);
    return null;
  }
};

/**
 * Export cache stats for UI display
 */
export const getFormattedCacheStats = async (): Promise<{
  size: string;
  count: number;
}> => {
  const stats = await getCacheStats();
  
  return {
    size: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
    count: stats.totalVideos,
  };
};
