/**
 * Enhanced Neon PostgreSQL Connection Management
 * Optimized for production multi-tenant architecture with Drizzle ORM
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
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
}

interface DatabaseMetrics {
  activeConnections: number;
  totalQueries: number;
  avgQueryTime: number;
  errorCount: number;
  lastError?: Error;
  lastHealthCheck: Date;
}

class NeonDatabaseManager {
  private static instance: NeonDatabaseManager;
  private drizzleClient: ReturnType<typeof drizzle> | null = null;
  private connection: postgres.Sql | null = null;
  private metrics: DatabaseMetrics;
  private config: ConnectionConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private queryBuffer: Array<{
    query: string;
    duration: number;
    timestamp: Date;
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
    };

    this.metrics = {
      activeConnections: 0,
      totalQueries: 0,
      avgQueryTime: 0,
      errorCount: 0,
      lastHealthCheck: new Date(),
    };
  }

  public static getInstance(): NeonDatabaseManager {
    if (!NeonDatabaseManager.instance) {
      NeonDatabaseManager.instance = new NeonDatabaseManager();
    }
    return NeonDatabaseManager.instance;
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

      // Create postgres connection with Neon optimizations
      this.connection = postgres(connectionString, {
        max: this.config.maxConnections,
        idle_timeout: this.config.idleTimeoutMs / 1000,
        connect_timeout: this.config.connectionTimeoutMs / 1000,
        ssl: process.env.NODE_ENV === "production" ? "require" : false,
        prepare: false, // Disable prepared statements for Neon
        // Enable connection pooling for serverless
        connection: {
          application_name: "projectwe-marketing",
        },
      });

      // Create Drizzle client
      this.drizzleClient = drizzle(this.connection, {
        schema,
        logger: this.config.enableQueryLogging,
      });

      // Test connection
      await this.drizzleClient.execute(sql`SELECT 1`);

      this.metrics.activeConnections++;
      console.log("✅ Connected to Neon PostgreSQL via Drizzle");

      // Start health check monitoring
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

  public async disconnect(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      if (this.connection) {
        await this.connection.end();
        this.connection = null;
        this.drizzleClient = null;
        this.metrics.activeConnections--;
        console.log("✅ Disconnected from database");
      }
    } catch (error) {
      console.error("❌ Error disconnecting from database:", error);
      throw error;
    }
  }

  public async executeQuery<T = any>(query: any, retryCount = 0): Promise<T> {
    const startTime = Date.now();

    try {
      if (!this.drizzleClient) {
        await this.connect();
      }

      const result = await this.drizzleClient!.execute(query);

      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration);

      if (this.config.enableQueryLogging) {
        this.logQuery(query.toString(), duration);
      }

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
        return this.executeQuery(query, retryCount + 1);
      }

      throw error;
    }
  }

  public async transaction<T = any>(fn: (tx: any) => Promise<T>): Promise<T> {
    if (!this.drizzleClient) {
      await this.connect();
    }

    const startTime = Date.now();

    try {
      const result = await this.drizzleClient!.transaction(fn);

      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration);

      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
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
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND datname = current_database()) as active_queries
      `);

      this.metrics.lastHealthCheck = new Date();

      if (this.config.enableMetrics) {
        console.log("Database health check:", result);
      }
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastError = error as Error;
      throw error;
    }
  }

  private updateQueryMetrics(duration: number): void {
    this.metrics.totalQueries++;
    this.metrics.avgQueryTime =
      (this.metrics.avgQueryTime * (this.metrics.totalQueries - 1) + duration) /
      this.metrics.totalQueries;
  }

  private logQuery(query: string, duration: number): void {
    this.queryBuffer.push({
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: new Date(),
    });

    // Keep only last 100 queries
    if (this.queryBuffer.length > 100) {
      this.queryBuffer.shift();
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableErrorCodes = [
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EHOSTUNREACH",
      "ECONNREFUSED",
      "57P03", // cannot_connect_now
      "58000", // system_error
      "58P01", // undefined_file
      "XX000", // internal_error
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

  public getQueryHistory(): Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }> {
    return [...this.queryBuffer];
  }

  public async getPoolStats() {
    // postgres-js doesn't expose pool metrics like pg.Pool; track metrics ourselves
    return {
      activeConnections: this.metrics.activeConnections,
      totalQueries: this.metrics.totalQueries,
      avgQueryTime: this.metrics.avgQueryTime,
      errorCount: this.metrics.errorCount,
      lastHealthCheck: this.metrics.lastHealthCheck,
    };
  }

  public async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    activeConnections: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      if (!this.drizzleClient) {
        await this.connect();
      }

      // Run a simple query to check connection
      await this.drizzleClient!.execute(sql`SELECT 1`);

      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        activeConnections: this.metrics.activeConnections,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        healthy: false,
        latency: Date.now() - startTime,
        activeConnections: this.metrics.activeConnections,
        errors,
      };
    }
  }

  public async runMigrations(): Promise<void> {
    // Drizzle migrations are handled via drizzle-kit CLI
    console.log("Migrations should be run using: npm run db:migrate");
  }

  public async optimizeDatabase(): Promise<void> {
    if (!this.drizzleClient) {
      await this.connect();
    }

    if (!this.drizzleClient) {
      throw new Error("DB not initialized");
    }

    try {
      // Run VACUUM ANALYZE for query optimization
      await this.drizzleClient.execute(sql`VACUUM ANALYZE`);

      // Update table statistics
      const tables = ["users", "organizations", "clients", "analytics_events"];
      for (const table of tables) {
        await this.drizzleClient.execute(sql.raw(`ANALYZE ${table}`));
      }

      console.log("✅ Database optimization completed");
    } catch (error) {
      console.error("❌ Database optimization failed:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseManager = NeonDatabaseManager.getInstance();

// Export convenience functions
export const connectDatabase = () => databaseManager.connect();
export const disconnectDatabase = () => databaseManager.disconnect();
export const executeQuery = <T = any>(query: any) =>
  databaseManager.executeQuery<T>(query);
export const runTransaction = <T = any>(fn: (tx: any) => Promise<T>) =>
  databaseManager.transaction(fn);
export const getDatabaseMetrics = () => databaseManager.getMetrics();
export const optimizeDatabase = () => databaseManager.optimizeDatabase();

// Export for backward compatibility
export default databaseManager;

// Additional backward compatibility exports
export const dbManager = databaseManager;
export const getPoolStats = () => databaseManager.getPoolStats();
