/**
 * Documents Cache Service
 * Specialized caching for WE_PROJECTS documents with intelligent invalidation
 */

import { RedisCache } from '@/lib/database/redis-cache';

interface DocumentsCacheEntry {
  documents: any[];
  total: number;
  categories: Record<string, number>;
  metadata?: {
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

class DocumentsCache {
  private cache: RedisCache;
  private readonly TTL = 300; // 5 minutes
  private readonly CATEGORY_TTL = 600; // 10 minutes for category counts
  
  constructor() {
    this.cache = new RedisCache({
      keyPrefix: 'we_projects:',
      defaultTTL: this.TTL,
      enableCompression: true,
      enableMetrics: true
    });
  }
  
  /**
   * Generate cache key for documents query
   */
  private getCacheKey(params: {
    category?: string;
    search?: string;
    page: number;
    limit: number;
  }): string {
    const parts = [
      'docs',
      params.category || 'all',
      params.search || 'nosearch',
      `p${params.page}`,
      `l${params.limit}`
    ];
    return parts.join(':').toLowerCase();
  }
  
  /**
   * Get documents from cache
   */
  async get(params: {
    category?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<DocumentsCacheEntry | null> {
    try {
      const key = this.getCacheKey(params);
      const cached = await this.cache.get<DocumentsCacheEntry>(key);
      
      if (cached) {
        console.log(`Cache hit for documents: ${key}`);
        return cached;
      }
      
      console.log(`Cache miss for documents: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error: ', error);
      return null;
    }
  }
  
  /**
   * Set documents in cache
   */
  async set(
    params: {
      category?: string;
      search?: string;
      page: number;
      limit: number;
    },
    data: DocumentsCacheEntry
  ): Promise<void> {
    try {
      const key = this.getCacheKey(params);
      
      // Don't cache searches with less than 3 results (likely too specific)
      if (params.search && data.documents.length < 3) {
        console.log(`Skipping cache for low-result search: ${key}`);
        return;
      }
      
      const ttl = params.search ? 180 : this.TTL; // Shorter TTL for searches
      const tags = ['documents', params.category || 'all'];
      
      await this.cache.set(key, data, ttl, tags);
      
      console.log(`Cached documents: ${key}`);
    } catch (error) {
      console.error('Cache set error: ', error);
    }
  }
  
  /**
   * Get category counts from cache
   */
  async getCategoryCounts(): Promise<Record<string, number> | null> {
    try {
      const cached = await this.cache.get<Record<string, number>>('category:counts');
      if (cached) {
        console.log('Cache hit for category counts');
        return cached;
      }
      return null;
    } catch (error) {
      console.error('Cache get category counts error: ', error);
      return null;
    }
  }
  
  /**
   * Set category counts in cache
   */
  async setCategoryCounts(counts: Record<string, number>): Promise<void> {
    try {
      await this.cache.set('category:counts', counts, this.CATEGORY_TTL, ['categories']);
      console.log('Cached category counts');
    } catch (error) {
      console.error('Cache set category counts error: ', error);
    }
  }
  
  /**
   * Invalidate cache by category
   */
  async invalidateCategory(category: string): Promise<void> {
    try {
      await this.cache.invalidateByTags([category]);
      await this.cache.invalidateByTags(['categories']);
      console.log(`Invalidated cache for category: ${category}`);
    } catch (error) {
      console.error('Cache invalidate category error: ', error);
    }
  }
  
  /**
   * Invalidate all documents cache
   */
  async invalidateAll(): Promise<void> {
    try {
      await this.cache.invalidateByTags(['documents']);
      await this.cache.invalidateByTags(['categories']);
      console.log('Invalidated all documents cache');
    } catch (error) {
      console.error('Cache invalidate all error: ', error);
    }
  }
  
  /**
   * Warm up cache with common queries
   */
  async warmUp(fetchFunction: Function): Promise<void> {
    console.log('Warming up documents cache...');
    
    const commonQueries = [
      { category: undefined, page: 1, limit: 20 }, // All documents, first page
      { category: 'Framework', page: 1, limit: 20 },
      { category: 'Best Practices', page: 1, limit: 20 },
      { category: 'Knowledge', page: 1, limit: 20 },
    ];
    
    for (const query of commonQueries) {
      try {
        const data = await fetchFunction(query);
        if (data) {
          await this.set(query, data);
        }
      } catch (error) {
        console.error(`Cache warm-up failed for query:`, query, error);
      }
    }
    
    console.log('Cache warm-up completed');
  }
  
  /**
   * Get cache metrics
   */
  async getMetrics() {
    return this.cache.getMetrics();
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    return this.cache.healthCheck();
  }
}

// Export singleton instance
export const documentsCache = new DocumentsCache();