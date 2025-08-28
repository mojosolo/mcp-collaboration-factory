/**
 * Optimized Neon PostgreSQL Connection with Advanced Features
 * - Connection pooling with health checks
 * - Redis caching layer
 * - Query optimization with proper indexing
 * - Error handling with retries
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import Redis from "ioredis";
import * as schema from "@/db/schema";

interface ConnectionConfig {
  maxConnections: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
  acquireTimeoutMs: number;
  enableQueryLogging: boolean;
  enableMetrics: boolean;
  retryAttempts: number;
  retryDelayMs: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

interface QueryCacheConfig {
  ttl: number;
  keyPrefix: string;
  enabled: boolean;
}

interface DatabaseMetrics {
  activeConnections: number;
  totalQueries: number;
  cachedQueries: number;
  avgQueryTime: number;
  cacheHitRate: number;
  errorCount: number;
  lastError?: Error;
  lastHealthCheck: Date;
  poolStats: {
    available: number;
    waiting: number;
    idle: number;
  };
}

export class OptimizedDatabaseManager {
  private static instance: OptimizedDatabaseManager;
  private drizzleClient: ReturnType<typeof drizzle> | null = null;
  private connection: postgres.Sql | null = null;
  private redis: Redis | null = null;
  private metrics: DatabaseMetrics;
  private config: ConnectionConfig;
  private cacheConfig: QueryCacheConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private queryBuffer: Array<{
    query: string;
    duration: number;
    timestamp: Date;
    cached: boolean;
  }> = [];

  private constructor() {
    this.config = {
      maxConnections: parseInt(process.env.DB_POOL_MAX || "50"),
      connectionTimeoutMs: parseInt(
        process.env.DB_POOL_CONNECT_TIMEOUT || "10000",
      ),
      idleTimeoutMs: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000"),
      acquireTimeoutMs: parseInt(
        process.env.DB_POOL_ACQUIRE_TIMEOUT || "30000",
      ),
      enableQueryLogging: process.env.DB_ENABLE_QUERY_LOGGING === "true",
      enableMetrics: process.env.DB_ENABLE_METRICS === "true",
      retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || "3"),
      retryDelayMs: parseInt(process.env.DB_RETRY_DELAY || "1000"),
      cacheEnabled: process.env.REDIS_CACHE_ENABLED === "true",
      cacheTTL: parseInt(process.env.REDIS_CACHE_TTL || "300"), // 5 minutes default
    };

    this.cacheConfig = {
      ttl: this.config.cacheTTL,
      keyPrefix: "db:query:",
      enabled: this.config.cacheEnabled,
    };

    this.metrics = {
      activeConnections: 0,
      totalQueries: 0,
      cachedQueries: 0,
      avgQueryTime: 0,
      cacheHitRate: 0,
      errorCount: 0,
      lastHealthCheck: new Date(),
      poolStats: {
        available: 0,
        waiting: 0,
        idle: 0,
      },
    };

    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    if (!this.config.cacheEnabled || !process.env.REDIS_URL) {
      return;
    }

    try {
      this.redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        keyPrefix: this.cacheConfig.keyPrefix,
        // Connection pool settings
        family: 4,
        keepAlive: true,
        // Error handling
        retryPolicy: (times) => Math.min(times * 50, 2000),
      });

      this.redis.on("error", (error) => {
        console.error("Redis connection error:", error);
        this.metrics.errorCount++;
      });

      this.redis.on("connect", () => {
        console.log("✅ Connected to Redis cache");
      });

      await this.redis.ping();
    } catch (error) {
      console.warn(
        "⚠️ Redis cache unavailable, continuing without caching:",
        error,
      );
      this.redis = null;
    }
  }

  public static getInstance(): OptimizedDatabaseManager {
    if (!OptimizedDatabaseManager.instance) {
      OptimizedDatabaseManager.instance = new OptimizedDatabaseManager();
    }
    return OptimizedDatabaseManager.instance;
  }

  public async connect(): Promise<ReturnType<typeof drizzle>> {
    if (this.drizzleClient) {
      return this.drizzleClient;
    }

    try {
      const connectionString =
        process.env.DATABASE_POOLED_URL || process.env.DATABASE_URL;

      if (!connectionString) {
        throw new Error("DATABASE_URL is not set");
      }

      // Create optimized postgres connection
      this.connection = postgres(connectionString, {
        max: this.config.maxConnections,
        idle_timeout: this.config.idleTimeoutMs / 1000,
        connect_timeout: this.config.connectionTimeoutMs / 1000,
        ssl: process.env.NODE_ENV === "production" ? "require" : false,
        prepare: false, // Disable for Neon compatibility
        transform: {
          undefined: null, // Transform undefined to null
        },
        connection: {
          application_name: "projectwe-marketing-optimized",
          statement_timeout: "30000", // 30 seconds
          idle_in_transaction_session_timeout: "60000", // 60 seconds
        },
        // Connection pooling optimizations
        onnotice:
          process.env.NODE_ENV === "development" ? console.log : undefined,
        debug: this.config.enableQueryLogging,
      });

      // Create Drizzle client with optimizations
      this.drizzleClient = drizzle(this.connection, {
        schema,
        logger: this.config.enableQueryLogging,
      });

      // Test connection and create indexes
      await this.drizzleClient.execute(sql`SELECT 1`);
      await this.ensureIndexes();

      this.metrics.activeConnections++;
      console.log("✅ Connected to Neon PostgreSQL with optimizations");

      // Start monitoring
      if (this.config.enableMetrics) {
        this.startHealthCheckMonitoring();
      }

      return this.drizzleClient;
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastError = error as Error;
      console.error("❌ Failed to connect to database:", error);
      throw error;
    }
  }

  private async ensureIndexes(): Promise<void> {
    if (!this.drizzleClient) return;

    try {
      // Create indexes for ILIKE queries optimization
      const indexQueries = [
        // Client table indexes for ILIKE searches
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_company_name_gin 
         ON clients USING gin(company_name gin_trgm_ops)`,

        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_industry_gin 
         ON clients USING gin(industry gin_trgm_ops)`,

        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_full_text_search 
         ON clients USING gin(to_tsvector('english', company_name || ' ' || industry || ' ' || description))`,

        // User table indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_gin 
         ON users USING gin(email gin_trgm_ops)`,

        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_gin 
         ON users USING gin((first_name || ' ' || last_name) gin_trgm_ops)`,

        // Julie expertise table indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_julie_expertise_topic_gin 
         ON julie_expertise USING gin(topic gin_trgm_ops)`,

        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_julie_expertise_insights_gin 
         ON julie_expertise USING gin(key_insights gin_trgm_ops)`,

        // Framework table indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_frameworks_name_gin 
         ON frameworks USING gin(name gin_trgm_ops)`,

        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_frameworks_description_gin 
         ON frameworks USING gin(description gin_trgm_ops)`,

        // Composite indexes for common query patterns
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_status_industry 
         ON clients(client_status, industry)`,

        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_phase_updated 
         ON clients(client_phase, updated_at DESC)`,

        // Analytics and performance indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_timestamp 
         ON analytics_events(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days'`,

        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_activity_client_timestamp 
         ON client_activity(client_id, created_at DESC)`,

        // Enable pg_trgm extension for fuzzy text search
        `CREATE EXTENSION IF NOT EXISTS pg_trgm`,

        // Enable btree_gin for composite indexes
        `CREATE EXTENSION IF NOT EXISTS btree_gin`,
      ];

      for (const query of indexQueries) {
        try {
          await this.drizzleClient.execute(sql.raw(query));
        } catch (error: any) {
          // Ignore errors for existing indexes/extensions
          if (!error.message?.includes("already exists")) {
            console.warn(`Index creation warning: ${error.message}`);
          }
        }
      }

      console.log("✅ Database indexes ensured");
    } catch (error) {
      console.warn("⚠️ Index creation failed, continuing:", error);
    }
  }

  public async executeQuery<T = any>(
    query: any,
    cacheKey?: string,
    cacheTTL?: number,
    retryCount = 0,
  ): Promise<T> {
    const startTime = Date.now();
    const finalCacheKey = cacheKey || this.generateCacheKey(query);

    // Try cache first
    if (this.cacheConfig.enabled && cacheKey) {
      const cached = await this.getFromCache<T>(finalCacheKey);
      if (cached !== null) {
        this.updateCacheMetrics(true, Date.now() - startTime);
        return cached;
      }
    }

    try {
      if (!this.drizzleClient) {
        await this.connect();
      }

      const result = await this.drizzleClient!.execute(query);
      const duration = Date.now() - startTime;

      // Cache the result
      if (this.cacheConfig.enabled && cacheKey) {
        await this.setCache(
          finalCacheKey,
          result,
          cacheTTL || this.cacheConfig.ttl,
        );
      }

      this.updateQueryMetrics(duration, false);
      this.logQuery(query.toString(), duration, false);

      return result as T;
    } catch (error: any) {
      this.metrics.errorCount++;

      // Retry logic for transient errors
      if (
        retryCount < this.config.retryAttempts &&
        this.isRetryableError(error)
      ) {
        console.warn(
          `Retrying query (attempt ${retryCount + 1}/${this.config.retryAttempts})`,
        );
        await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));
        return this.executeQuery(query, cacheKey, cacheTTL, retryCount + 1);
      }

      throw error;
    }
  }

  public async executeCachedQuery<T = any>(
    query: any,
    cacheKey: string,
    ttl: number = this.cacheConfig.ttl,
  ): Promise<T> {
    return this.executeQuery<T>(query, cacheKey, ttl);
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      console.warn("Cache get error:", error);
    }
    return null;
  }

  private async setCache(key: string, value: any, ttl: number): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.warn("Cache set error:", error);
    }
  }

  private generateCacheKey(query: any): string {
    const queryStr = typeof query === "string" ? query : query.toString();
    const hash = this.simpleHash(queryStr);
    return `query:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  public async invalidateCache(pattern: string): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys(
        `${this.cacheConfig.keyPrefix}${pattern}`,
      );
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn("Cache invalidation error:", error);
    }
  }

  private updateQueryMetrics(duration: number, cached: boolean): void {
    this.metrics.totalQueries++;
    if (cached) {
      this.metrics.cachedQueries++;
    }

    this.metrics.avgQueryTime =
      (this.metrics.avgQueryTime * (this.metrics.totalQueries - 1) + duration) /
      this.metrics.totalQueries;

    this.metrics.cacheHitRate =
      this.metrics.totalQueries > 0
        ? (this.metrics.cachedQueries / this.metrics.totalQueries) * 100
        : 0;
  }

  private updateCacheMetrics(hit: boolean, duration: number): void {
    this.metrics.totalQueries++;
    if (hit) {
      this.metrics.cachedQueries++;
    }
    this.metrics.cacheHitRate =
      (this.metrics.cachedQueries / this.metrics.totalQueries) * 100;
  }

  private logQuery(query: string, duration: number, cached: boolean): void {
    if (!this.config.enableQueryLogging) return;

    this.queryBuffer.push({
      query: query.substring(0, 200),
      duration,
      timestamp: new Date(),
      cached,
    });

    if (this.queryBuffer.length > 100) {
      this.queryBuffer.shift();
    }
  }

  private startHealthCheckMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error("Health check failed:", error);
      }
    }, 60000); // Check every minute
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.drizzleClient) return;

    try {
      const result = await this.drizzleClient.execute(sql`
        SELECT 
          pg_database_size(current_database()) as db_size,
          (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND datname = current_database()) as active_queries,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle' AND datname = current_database()) as idle_connections
      `);

      this.metrics.lastHealthCheck = new Date();

      if (result[0]) {
        this.metrics.poolStats.available =
          this.config.maxConnections - result[0].connections;
        this.metrics.poolStats.idle = result[0].idle_connections;
        this.metrics.poolStats.waiting = Math.max(
          0,
          result[0].connections - this.config.maxConnections,
        );
      }
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastError = error as Error;
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableErrorCodes = [
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EHOSTUNREACH",
      "ECONNREFUSED",
      "57P03",
      "58000",
      "58P01",
      "XX000",
    ];

    return (
      retryableErrorCodes.includes(error.code) ||
      error.message?.includes("connection") ||
      error.message?.includes("timeout")
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  public async transaction<T = any>(fn: (tx: any) => Promise<T>): Promise<T> {
    if (!this.drizzleClient) {
      await this.connect();
    }

    const startTime = Date.now();
    try {
      const result = await this.drizzleClient!.transaction(fn);
      this.updateQueryMetrics(Date.now() - startTime, false);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  public async optimizeDatabase(): Promise<void> {
    if (!this.drizzleClient) {
      await this.connect();
    }

    try {
      // Run VACUUM ANALYZE
      await this.drizzleClient.execute(sql`VACUUM ANALYZE`);

      // Update statistics for all tables
      const tables = [
        "users",
        "organizations",
        "clients",
        "analytics_events",
        "frameworks",
        "julie_expertise",
      ];
      for (const table of tables) {
        await this.drizzleClient.execute(sql.raw(`ANALYZE ${table}`));
      }

      console.log("✅ Database optimization completed");
    } catch (error) {
      console.error("❌ Database optimization failed:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }

      if (this.connection) {
        await this.connection.end();
        this.connection = null;
        this.drizzleClient = null;
        this.metrics.activeConnections--;
        console.log("✅ Disconnected from database and cache");
      }
    } catch (error) {
      console.error("❌ Error disconnecting:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const optimizedDb = OptimizedDatabaseManager.getInstance();

// Convenience functions
export const connectOptimizedDb = () => optimizedDb.connect();
export const executeOptimizedQuery = <T = any>(
  query: any,
  cacheKey?: string,
  ttl?: number,
) => optimizedDb.executeQuery<T>(query, cacheKey, ttl);
export const executeCachedQuery = <T = any>(
  query: any,
  cacheKey: string,
  ttl?: number,
) => optimizedDb.executeCachedQuery<T>(query, cacheKey, ttl);
export const runOptimizedTransaction = <T = any>(fn: (tx: any) => Promise<T>) =>
  optimizedDb.transaction(fn);
export const getDbMetrics = () => optimizedDb.getMetrics();
export const invalidateQueryCache = (pattern: string) =>
  optimizedDb.invalidateCache(pattern);

export default optimizedDb;
