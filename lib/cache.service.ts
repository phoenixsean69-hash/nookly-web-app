// lib/cache.service.ts

interface CacheItem {
  data: any;
  timestamp: number;
  expiry: number; // in milliseconds
}

class CacheService {
  private readonly CACHE_PREFIX = 'nookly_cache_';
  private readonly DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutes

  // Set cache with expiry
  set(key: string, data: any, expiry: number = this.DEFAULT_EXPIRY): void {
    if (typeof window === 'undefined') return;
    
    const cacheItem: CacheItem = {
      data,
      timestamp: Date.now(),
      expiry,
    };
    
    try {
      localStorage.setItem(
        this.CACHE_PREFIX + key,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  // Get cache if not expired
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!cached) return null;
      
      const cacheItem: CacheItem = JSON.parse(cached);
      const isExpired = Date.now() - cacheItem.timestamp > cacheItem.expiry;
      
      if (isExpired) {
        this.remove(key);
        return null;
      }
      
      return cacheItem.data as T;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  // Remove cache
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.CACHE_PREFIX + key);
  }

  // Clear all cache
  clearAll(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Check if cache exists and is valid
  isValid(key: string): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const cached = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!cached) return false;
      
      const cacheItem: CacheItem = JSON.parse(cached);
      return Date.now() - cacheItem.timestamp <= cacheItem.expiry;
    } catch {
      return false;
    }
  }
}

export const cacheService = new CacheService();