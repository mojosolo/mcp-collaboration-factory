/**
 * Environment-specific Database Configuration for Neon PostgreSQL
 * Handles multi-environment setup with proper isolation and security
 */

import { logSecurityEvent } from "./security";

export type Environment = "development" | "staging" | "production" | "test";

interface EnvironmentConfig {
  name: Environment;
  database: {
    pooledUrl: string;
    directUrl: string;
    maxConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
    acquireTimeout: number;
    statementTimeout: number;
    queryTimeout: number;
  };
  neon: {
    projectId: string;
    branchId: string;
    apiKey: string;
    region: string;
  };
  features: {
    enableQueryLogging: boolean;
    enableMetrics: boolean;
    enableAuditLog: boolean;
    enablePerformanceMonitoring: boolean;
    enableSlowQueryAlert: boolean;
    enableConnectionPooling: boolean;
  };
  security: {
    sslMode: "require" | "prefer" | "allow" | "disable";
    sslRejectUnauthorized: boolean;
    enableEncryption: boolean;
    enableRateLimit: boolean;
    maxRequestsPerMinute: number;
    enableOriginValidation: boolean;
    allowedOrigins: string[];
  };
  monitoring: {
    healthCheckInterval: number;
    metricsRetentionDays: number;
    alertThresholds: {
      connectionCount: number;
      queryTimeMs: number;
      errorRate: number;
      memoryUsagePercent: number;
    };
  };
  backup: {
    enableAutomaticBackup: boolean;
    backupInterval: string; // cron expression
    retentionDays: number;
    compressionEnabled: boolean;
  };
}

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private currentEnvironment: Environment;
  private configs: Map<Environment, EnvironmentConfig>;

  private constructor() {
    this.currentEnvironment = this.detectEnvironment();
    this.configs = new Map();
    this.initializeConfigurations();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /**
   * Get current environment configuration
   */
  public getCurrentConfig(): EnvironmentConfig {
    const config = this.configs.get(this.currentEnvironment);
    if (!config) {
      throw new Error(
        `Configuration not found for environment: ${this.currentEnvironment}`,
      );
    }
    return config;
  }

  /**
   * Get configuration for specific environment
   */
  public getConfig(environment: Environment): EnvironmentConfig {
    const config = this.configs.get(environment);
    if (!config) {
      throw new Error(
        `Configuration not found for environment: ${environment}`,
      );
    }
    return config;
  }

  /**
   * Get current environment
   */
  public getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * Switch environment (mainly for testing)
   */
  public switchEnvironment(environment: Environment): void {
    if (!this.configs.has(environment)) {
      throw new Error(`Environment ${environment} is not configured`);
    }

    logSecurityEvent({
      event: "AUTHENTICATION",
      details: {
        action: "environment_switch",
        from: this.currentEnvironment,
        to: environment,
      },
      severity: "MEDIUM",
    });

    this.currentEnvironment = environment;
  }

  /**
   * Validate environment configuration
   */
  public validateConfig(environment?: Environment): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const env = environment || this.currentEnvironment;
    const config = this.getConfig(env);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate database URLs
    if (!config.database.pooledUrl || !config.database.directUrl) {
      errors.push("Database URLs are required");
    }

    // Validate Neon configuration
    if (!config.neon.apiKey || !config.neon.projectId) {
      errors.push("Neon API configuration is incomplete");
    }

    // Validate SSL configuration for production
    if (env === "production" && config.security.sslMode !== "require") {
      warnings.push("SSL should be required in production");
    }

    // Validate connection limits
    if (config.database.maxConnections > 100) {
      warnings.push("High connection limit may impact performance");
    }

    // Validate security settings for production
    if (env === "production") {
      if (!config.security.enableEncryption) {
        errors.push("Encryption must be enabled in production");
      }
      if (!config.security.enableRateLimit) {
        warnings.push("Rate limiting should be enabled in production");
      }
      if (config.security.allowedOrigins.includes("*")) {
        errors.push("Wildcard origins not allowed in production");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get database connection string for current environment
   */
  public getDatabaseUrl(type: "pooled" | "direct" = "pooled"): string {
    const config = this.getCurrentConfig();
    return type === "pooled"
      ? config.database.pooledUrl
      : config.database.directUrl;
  }

  /**
   * Get Neon branch configuration for current environment
   */
  public getNeonBranchConfig(): {
    projectId: string;
    branchId: string;
    apiKey: string;
    region: string;
  } {
    const config = this.getCurrentConfig();
    return config.neon;
  }

  /**
   * Check if feature is enabled in current environment
   */
  public isFeatureEnabled(
    feature: keyof EnvironmentConfig["features"],
  ): boolean {
    const config = this.getCurrentConfig();
    return config.features[feature];
  }

  /**
   * Get monitoring configuration
   */
  public getMonitoringConfig(): EnvironmentConfig["monitoring"] {
    const config = this.getCurrentConfig();
    return config.monitoring;
  }

  /**
   * Get security configuration
   */
  public getSecurityConfig(): EnvironmentConfig["security"] {
    const config = this.getCurrentConfig();
    return config.security;
  }

  /**
   * Detect current environment from NODE_ENV and other indicators
   */
  private detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();

    // Check for test environment first
    if (nodeEnv === "test" || process.env.JEST_WORKER_ID) {
      return "test";
    }

    // Check for staging indicators
    if (
      nodeEnv === "staging" ||
      process.env.VERCEL_ENV === "preview" ||
      process.env.DATABASE_URL?.includes("staging")
    ) {
      return "staging";
    }

    // Check for production indicators
    if (
      nodeEnv === "production" ||
      process.env.VERCEL_ENV === "production" ||
      process.env.DATABASE_URL?.includes("prod")
    ) {
      return "production";
    }

    // Default to development
    return "development";
  }

  /**
   * Initialize configurations for all environments
   */
  private initializeConfigurations(): void {
    // Development Configuration
    this.configs.set("development", {
      name: "development",
      database: {
        pooledUrl:
          process.env.DATABASE_POOLED_URL || process.env.DATABASE_URL || "",
        directUrl:
          process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL || "",
        maxConnections: parseInt(process.env.DB_POOL_MAX || "20"),
        connectionTimeout: parseInt(
          process.env.DB_POOL_CONNECT_TIMEOUT || "10000",
        ),
        idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000"),
        acquireTimeout: parseInt(
          process.env.DB_POOL_ACQUIRE_TIMEOUT || "30000",
        ),
        statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || "60000"),
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || "30000"),
      },
      neon: {
        projectId: process.env.NEON_PROJECT_ID || "",
        branchId: process.env.NEON_BRANCH_ID || "main",
        apiKey: process.env.NEON_API_KEY || "",
        region: process.env.NEON_REGION || "us-east-1",
      },
      features: {
        enableQueryLogging: true,
        enableMetrics: true,
        enableAuditLog: false,
        enablePerformanceMonitoring: true,
        enableSlowQueryAlert: false,
        enableConnectionPooling: true,
      },
      security: {
        sslMode: "prefer",
        sslRejectUnauthorized: false,
        enableEncryption: false,
        enableRateLimit: false,
        maxRequestsPerMinute: 1000,
        enableOriginValidation: false,
        allowedOrigins: ["*"],
      },
      monitoring: {
        healthCheckInterval: 30000, // 30 seconds
        metricsRetentionDays: 7,
        alertThresholds: {
          connectionCount: 15,
          queryTimeMs: 5000,
          errorRate: 5, // 5%
          memoryUsagePercent: 80,
        },
      },
      backup: {
        enableAutomaticBackup: false,
        backupInterval: "0 2 * * *", // Daily at 2 AM
        retentionDays: 7,
        compressionEnabled: false,
      },
    });

    // Staging Configuration
    this.configs.set("staging", {
      name: "staging",
      database: {
        pooledUrl: process.env.DATABASE_POOLED_URL_STAGING || "",
        directUrl: process.env.DATABASE_DIRECT_URL_STAGING || "",
        maxConnections: parseInt(process.env.DB_POOL_MAX || "30"),
        connectionTimeout: parseInt(
          process.env.DB_POOL_CONNECT_TIMEOUT || "10000",
        ),
        idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000"),
        acquireTimeout: parseInt(
          process.env.DB_POOL_ACQUIRE_TIMEOUT || "30000",
        ),
        statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || "60000"),
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || "30000"),
      },
      neon: {
        projectId: process.env.NEON_PROJECT_ID || "",
        branchId: process.env.NEON_BRANCH_ID_STAGING || "staging",
        apiKey: process.env.NEON_API_KEY || "",
        region: process.env.NEON_REGION || "us-east-1",
      },
      features: {
        enableQueryLogging: true,
        enableMetrics: true,
        enableAuditLog: true,
        enablePerformanceMonitoring: true,
        enableSlowQueryAlert: true,
        enableConnectionPooling: true,
      },
      security: {
        sslMode: "require",
        sslRejectUnauthorized: true,
        enableEncryption: true,
        enableRateLimit: true,
        maxRequestsPerMinute: 500,
        enableOriginValidation: true,
        allowedOrigins: [
          "https://staging.projectwe.ai",
          "https://*.vercel.app",
        ],
      },
      monitoring: {
        healthCheckInterval: 60000, // 1 minute
        metricsRetentionDays: 30,
        alertThresholds: {
          connectionCount: 25,
          queryTimeMs: 3000,
          errorRate: 2, // 2%
          memoryUsagePercent: 75,
        },
      },
      backup: {
        enableAutomaticBackup: true,
        backupInterval: "0 1 * * *", // Daily at 1 AM
        retentionDays: 30,
        compressionEnabled: true,
      },
    });

    // Production Configuration
    this.configs.set("production", {
      name: "production",
      database: {
        pooledUrl: process.env.DATABASE_POOLED_URL_PROD || "",
        directUrl: process.env.DATABASE_DIRECT_URL_PROD || "",
        maxConnections: parseInt(process.env.DB_POOL_MAX || "50"),
        connectionTimeout: parseInt(
          process.env.DB_POOL_CONNECT_TIMEOUT || "10000",
        ),
        idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000"),
        acquireTimeout: parseInt(
          process.env.DB_POOL_ACQUIRE_TIMEOUT || "30000",
        ),
        statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || "60000"),
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || "30000"),
      },
      neon: {
        projectId: process.env.NEON_PROJECT_ID || "",
        branchId: process.env.NEON_BRANCH_ID_PROD || "main",
        apiKey: process.env.NEON_API_KEY || "",
        region: process.env.NEON_REGION || "us-east-1",
      },
      features: {
        enableQueryLogging: false,
        enableMetrics: true,
        enableAuditLog: true,
        enablePerformanceMonitoring: true,
        enableSlowQueryAlert: true,
        enableConnectionPooling: true,
      },
      security: {
        sslMode: "require",
        sslRejectUnauthorized: true,
        enableEncryption: true,
        enableRateLimit: true,
        maxRequestsPerMinute: 200,
        enableOriginValidation: true,
        allowedOrigins: ["https://projectwe.ai", "https://www.projectwe.ai"],
      },
      monitoring: {
        healthCheckInterval: 30000, // 30 seconds
        metricsRetentionDays: 90,
        alertThresholds: {
          connectionCount: 40,
          queryTimeMs: 2000,
          errorRate: 1, // 1%
          memoryUsagePercent: 70,
        },
      },
      backup: {
        enableAutomaticBackup: true,
        backupInterval: "0 0 * * *", // Daily at midnight
        retentionDays: 90,
        compressionEnabled: true,
      },
    });

    // Test Configuration
    this.configs.set("test", {
      name: "test",
      database: {
        pooledUrl:
          process.env.DATABASE_URL_TEST ||
          "postgresql://test:test@localhost:5432/projectwe_test",
        directUrl:
          process.env.DATABASE_URL_TEST ||
          "postgresql://test:test@localhost:5432/projectwe_test",
        maxConnections: 10,
        connectionTimeout: 5000,
        idleTimeout: 10000,
        acquireTimeout: 10000,
        statementTimeout: 30000,
        queryTimeout: 15000,
      },
      neon: {
        projectId: "test-project",
        branchId: "test-branch",
        apiKey: "test-key",
        region: "us-east-1",
      },
      features: {
        enableQueryLogging: false,
        enableMetrics: false,
        enableAuditLog: false,
        enablePerformanceMonitoring: false,
        enableSlowQueryAlert: false,
        enableConnectionPooling: false,
      },
      security: {
        sslMode: "disable",
        sslRejectUnauthorized: false,
        enableEncryption: false,
        enableRateLimit: false,
        maxRequestsPerMinute: 10000,
        enableOriginValidation: false,
        allowedOrigins: ["*"],
      },
      monitoring: {
        healthCheckInterval: 60000,
        metricsRetentionDays: 1,
        alertThresholds: {
          connectionCount: 8,
          queryTimeMs: 10000,
          errorRate: 10,
          memoryUsagePercent: 90,
        },
      },
      backup: {
        enableAutomaticBackup: false,
        backupInterval: "0 0 * * 0", // Weekly
        retentionDays: 1,
        compressionEnabled: false,
      },
    });
  }
}

// Singleton instance
export const envManager = EnvironmentManager.getInstance();

// Helper functions
export function getCurrentEnvironment(): Environment {
  return envManager.getCurrentEnvironment();
}

export function getCurrentConfig(): EnvironmentConfig {
  return envManager.getCurrentConfig();
}

export function getConfig(environment: Environment): EnvironmentConfig {
  return envManager.getConfig(environment);
}

export function getDatabaseUrl(type: "pooled" | "direct" = "pooled"): string {
  return envManager.getDatabaseUrl(type);
}

export function isFeatureEnabled(
  feature: keyof EnvironmentConfig["features"],
): boolean {
  return envManager.isFeatureEnabled(feature);
}

export function getMonitoringConfig(): EnvironmentConfig["monitoring"] {
  return envManager.getMonitoringConfig();
}

export function getSecurityConfig(): EnvironmentConfig["security"] {
  return envManager.getSecurityConfig();
}

export function validateCurrentConfig() {
  return envManager.validateConfig();
}

// Export types
export type { EnvironmentConfig };
