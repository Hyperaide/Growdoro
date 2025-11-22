/**
 * Global image cache utility
 * Loads images once and reuses them across component instances and sessions
 * Uses IndexedDB for persistent caching across page reloads
 */

interface CachedImage {
  data: string; // Base64 data URL
  width: number;
  height: number;
  timestamp: number;
}

class ImageCache {
  private memoryCache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private dbName = 'garden-image-cache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;

  constructor() {
    this.dbReady = this.initDB();
  }

  private async initDB(): Promise<void> {
    // Check if we're in a browser environment and IndexedDB is available
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.warn('IndexedDB not available, using memory cache only');
        resolve(); // Continue without IndexedDB
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'url' });
        }
      };
    });
  }

  /**
   * Load an image from cache or network
   * Returns a promise that resolves to the loaded HTMLImageElement
   */
  async loadImage(url: string): Promise<HTMLImageElement> {
    // Check memory cache first (fastest)
    if (this.memoryCache.has(url)) {
      return this.memoryCache.get(url)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading
    const promise = this.loadImageInternal(url);
    this.loadingPromises.set(url, promise);

    try {
      const image = await promise;
      this.loadingPromises.delete(url);
      return image;
    } catch (error) {
      this.loadingPromises.delete(url);
      throw error;
    }
  }

  private async loadImageInternal(url: string): Promise<HTMLImageElement> {
    // Try to load from IndexedDB cache first
    const cached = await this.loadFromDB(url);
    if (cached) {
      const img = new Image();
      return new Promise((resolve, reject) => {
        img.onload = () => {
          this.memoryCache.set(url, img);
          resolve(img);
        };
        img.onerror = () => {
          // If cached image fails, try network
          this.loadFromNetwork(url).then(resolve).catch(reject);
        };
        img.src = cached.data;
      });
    }

    // Load from network
    return this.loadFromNetwork(url);
  }

  private async loadFromDB(url: string): Promise<CachedImage | null> {
    if (!this.db) {
      await this.dbReady;
      if (!this.db) return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result as CachedImage | undefined;
        if (result) {
          // Check if cache is still valid (7 days)
          const age = Date.now() - result.timestamp;
          if (age < 7 * 24 * 60 * 60 * 1000) {
            resolve(result);
          } else {
            // Cache expired, delete it
            this.deleteFromDB(url);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  private async loadFromNetwork(url: string): Promise<HTMLImageElement> {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS for canvas operations

    return new Promise((resolve, reject) => {
      img.onload = async () => {
        // Store in memory cache
        this.memoryCache.set(url, img);

        // Store in IndexedDB for persistence
        try {
          await this.saveToDB(url, img);
        } catch (error) {
          console.warn('Failed to cache image in IndexedDB:', error);
        }

        resolve(img);
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }

  private async saveToDB(url: string, img: HTMLImageElement): Promise<void> {
    if (!this.db) {
      await this.dbReady;
      if (!this.db) return;
    }

    // Convert image to base64
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');

    const cached: CachedImage = {
      data: dataUrl,
      width: img.width,
      height: img.height,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const request = store.put({ url, ...cached });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromDB(url: string): Promise<void> {
    if (!this.db) {
      await this.dbReady;
      if (!this.db) return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const request = store.delete(url);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Preload multiple images in parallel
   */
  async preloadImages(urls: string[]): Promise<Map<string, HTMLImageElement>> {
    const results = new Map<string, HTMLImageElement>();
    const promises = urls.map(async (url) => {
      try {
        const img = await this.loadImage(url);
        results.set(url, img);
      } catch (error) {
        console.warn(`Failed to preload image: ${url}`, error);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Clear all caches (memory and IndexedDB)
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear();
    this.loadingPromises.clear();

    if (this.db) {
      await this.dbReady;
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Get cache size (approximate)
   */
  getCacheSize(): number {
    return this.memoryCache.size;
  }
}

// Export singleton instance
export const imageCache = new ImageCache();

