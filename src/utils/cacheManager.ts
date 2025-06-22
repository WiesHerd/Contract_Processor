/**
 * Enterprise-Grade Cache Manager
 * Provides centralized cache configuration, invalidation strategies, and analytics
 */

export interface CacheConfig {
  duration: number; // Cache duration in milliseconds
  maxSize?: number; // Maximum number of items in cache
  staleWhileRevalidate?: number; // Time to serve stale data while revalidating
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  averageAge: number;
}

class CacheManager {
  private caches: Map<string, Map<string, CacheEntry<any>>> = new Map();
  private configs: Map<string, CacheConfig> = new Map();
  private stats: Map<string, { hits: number; misses: number }> = new Map();

  // Default cache configurations
  private defaultConfigs: Record<string, CacheConfig> = {
    providers: { duration: 5 * 60 * 1000, maxSize: 1000 }, // 5 minutes
    templates: { duration: 5 * 60 * 1000, maxSize: 100 }, // 5 minutes
    mappings: { duration: 5 * 60 * 1000, maxSize: 500 }, // 5 minutes
    clauses: { duration: 5 * 60 * 1000, maxSize: 200 }, // 5 minutes
    auditLogs: { duration: 2 * 60 * 1000, maxSize: 1000 }, // 2 minutes
  };

  constructor() {
    // Initialize default configurations
    Object.entries(this.defaultConfigs).forEach(([key, config]) => {
      this.configs.set(key, config);
      this.caches.set(key, new Map());
      this.stats.set(key, { hits: 0, misses: 0 });
    });
  }

  /**
   * Set cache configuration for a specific cache type
   */
  setConfig(cacheType: string, config: CacheConfig): void {
    this.configs.set(cacheType, config);
    if (!this.caches.has(cacheType)) {
      this.caches.set(cacheType, new Map());
      this.stats.set(cacheType, { hits: 0, misses: 0 });
    }
  }

  /**
   * Get cached data if valid, otherwise return null
   */
  get<T>(cacheType: string, key: string): T | null {
    const cache = this.caches.get(cacheType);
    const config = this.configs.get(cacheType);
    const stats = this.stats.get(cacheType);

    if (!cache || !config || !stats) {
      return null;
    }

    const entry = cache.get(key);
    if (!entry) {
      stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      // Entry has expired, remove it
      cache.delete(key);
      stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    stats.hits++;

    return entry.data;
  }

  /**
   * Set data in cache
   */
  set<T>(cacheType: string, key: string, data: T): void {
    const cache = this.caches.get(cacheType);
    const config = this.configs.get(cacheType);

    if (!cache || !config) {
      return;
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + config.duration,
      accessCount: 0,
      lastAccessed: now,
    };

    // Check if cache is full and evict least recently used
    if (config.maxSize && cache.size >= config.maxSize) {
      this.evictLRU(cacheType);
    }

    cache.set(key, entry);
  }

  /**
   * Check if data exists and is valid in cache
   */
  has(cacheType: string, key: string): boolean {
    const cache = this.caches.get(cacheType);
    if (!cache) return false;

    const entry = cache.get(key);
    if (!entry) return false;

    return Date.now() <= entry.expiresAt;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(cacheType: string, key: string): void {
    const cache = this.caches.get(cacheType);
    if (cache) {
      cache.delete(key);
    }
  }

  /**
   * Clear entire cache
   */
  clear(cacheType: string): void {
    const cache = this.caches.get(cacheType);
    if (cache) {
      cache.clear();
    }
    const stats = this.stats.get(cacheType);
    if (stats) {
      stats.hits = 0;
      stats.misses = 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(cacheType: string): CacheStats | null {
    const cache = this.caches.get(cacheType);
    const stats = this.stats.get(cacheType);

    if (!cache || !stats) {
      return null;
    }

    const totalRequests = stats.hits + stats.misses;
    const hitRate = totalRequests > 0 ? stats.hits / totalRequests : 0;

    // Calculate average age of cache entries
    const now = Date.now();
    let totalAge = 0;
    let entryCount = 0;

    cache.forEach(entry => {
      totalAge += now - entry.timestamp;
      entryCount++;
    });

    const averageAge = entryCount > 0 ? totalAge / entryCount : 0;

    return {
      hits: stats.hits,
      misses: stats.misses,
      size: cache.size,
      hitRate,
      averageAge,
    };
  }

  /**
   * Get all cache statistics
   */
  getAllStats(): Record<string, CacheStats> {
    const allStats: Record<string, CacheStats> = {};
    this.caches.forEach((_, cacheType) => {
      const stats = this.getStats(cacheType);
      if (stats) {
        allStats[cacheType] = stats;
      }
    });
    return allStats;
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(cacheType: string): void {
    const cache = this.caches.get(cacheType);
    const config = this.configs.get(cacheType);

    if (!cache || !config || !config.maxSize) {
      return;
    }

    // Find least recently used entry
    let lruKey: string | null = null;
    let lruTime = Infinity;

    cache.forEach((entry, key) => {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    });

    if (lruKey) {
      cache.delete(lruKey);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    this.caches.forEach((cache, cacheType) => {
      cache.forEach((entry, key) => {
        if (now > entry.expiresAt) {
          cache.delete(key);
        }
      });
    });
  }

  /**
   * Get cache size for a specific cache type
   */
  getSize(cacheType: string): number {
    const cache = this.caches.get(cacheType);
    return cache ? cache.size : 0;
  }

  /**
   * Get total memory usage estimate (rough calculation)
   */
  getMemoryUsage(): number {
    let totalSize = 0;
    this.caches.forEach(cache => {
      cache.forEach(entry => {
        // Rough estimate: 100 bytes per entry + data size
        totalSize += 100 + JSON.stringify(entry.data).length;
      });
    });
    return totalSize;
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Auto-cleanup every 5 minutes
setInterval(() => {
  cacheManager.cleanup();
}, 5 * 60 * 1000);

// Export utility functions for common cache operations
export const cacheUtils = {
  /**
   * Check if data should be fetched based on cache state
   */
  shouldFetch: (cacheType: string, key: string): boolean => {
    return !cacheManager.has(cacheType, key);
  },

  /**
   * Get cached data or return null
   */
  getCached: <T>(cacheType: string, key: string): T | null => {
    return cacheManager.get<T>(cacheType, key);
  },

  /**
   * Cache data with automatic key generation
   */
  cacheData: <T>(cacheType: string, data: T, key?: string): void => {
    const cacheKey = key || 'default';
    cacheManager.set(cacheType, cacheKey, data);
  },

  /**
   * Invalidate cache for a specific type
   */
  invalidateCache: (cacheType: string, key?: string): void => {
    if (key) {
      cacheManager.invalidate(cacheType, key);
    } else {
      cacheManager.clear(cacheType);
    }
  },

  /**
   * Get cache performance statistics
   */
  getCacheStats: (cacheType?: string): CacheStats | Record<string, CacheStats> | null => {
    if (cacheType) {
      return cacheManager.getStats(cacheType);
    }
    return cacheManager.getAllStats();
  },
}; 