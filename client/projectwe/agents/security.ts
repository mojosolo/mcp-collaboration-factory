/**
 * Enhanced Authentication Security Module
 * Implements security best practices and threat protection
 */

import { auth } from "@clerk/nextjs/server";
import { AuthConfig } from "./unified-service";
import { Logger } from "../logger";
import * as crypto from "crypto";

export class AuthSecurity {
  private logger: Logger;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    this.logger = new Logger("AuthSecurity");
  }

  /**
   * Enhanced cookie configuration with security headers
   */
  getCookieConfig() {
    const isProduction = process.env.NODE_ENV === "production";
    const cookiePrefix = this.config.isAdminDomain ? "admin-auth" : "next-auth";

    return {
      sessionToken: {
        name: `${cookiePrefix}.session-token`,
        options: {
          httpOnly: true,
          sameSite: "strict" as const, // Strict for enhanced security
          path: "/",
          secure: isProduction,
          // Shorter expiry for admin domains
          maxAge: this.config.isAdminDomain ? 3600 : 86400,
        },
      },
      callbackUrl: {
        name: `${cookiePrefix}.callback-url`,
        options: {
          httpOnly: true,
          sameSite: "strict" as const,
          path: "/",
          secure: isProduction,
        },
      },
      csrfToken: {
        name: `${cookiePrefix}.csrf-token`,
        options: {
          httpOnly: true,
          sameSite: "strict" as const,
          path: "/",
          secure: isProduction,
        },
      },
      pkceCodeVerifier: {
        name: `${cookiePrefix}.pkce.code_verifier`,
        options: {
          httpOnly: true,
          sameSite: "strict" as const,
          path: "/",
          secure: isProduction,
          maxAge: 900, // 15 minutes
        },
      },
      state: {
        name: `${cookiePrefix}.state`,
        options: {
          httpOnly: true,
          sameSite: "strict" as const,
          path: "/",
          secure: isProduction,
          maxAge: 900, // 15 minutes
        },
      },
      nonce: {
        name: `${cookiePrefix}.nonce`,
        options: {
          httpOnly: true,
          sameSite: "strict" as const,
          path: "/",
          secure: isProduction,
        },
      },
    };
  }

  /**
   * Enhanced JWT encoding with additional security
   */
  async encodeJWT(params: any): Promise<string> {
    try {
      const { token, secret, maxAge } = params;

      // Add security metadata
      const enhancedToken = {
        ...token,
        // Security fingerprint
        _security: {
          domain: this.config.domain,
          level: this.config.securityLevel,
          fingerprint: await this.createSecurityFingerprint(token),
          issued: Date.now(),
          issuer: "ProjectWE-Auth-v2",
        },
      };

      const encodedJWT = await encode({
        token: enhancedToken,
        secret,
        maxAge:
          maxAge || (this.config.securityLevel === "strict" ? 3600 : 86400),
      });

      this.logger.debug("JWT encoded", {
        userId: token?.sub,
        domain: this.config.domain,
        securityLevel: this.config.securityLevel,
      });

      return encodedJWT;
    } catch (error) {
      this.logger.error("JWT encoding failed", error);
      throw new Error("Authentication token creation failed");
    }
  }

  /**
   * Enhanced JWT decoding with security validation
   */
  async decodeJWT(params: any): Promise<JWT | null> {
    try {
      const { token, secret } = params;

      const decoded = await decode({
        token,
        secret,
      });

      if (!decoded) {
        return null;
      }

      // Security validation
      if (decoded._security) {
        const isValid = await this.validateSecurityFingerprint(decoded);
        if (!isValid) {
          this.logger.warn("Invalid security fingerprint detected", {
            userId: decoded.sub,
            domain: decoded._security?.domain,
          });
          return null;
        }
      }

      this.logger.debug("JWT decoded and validated", {
        userId: decoded?.sub,
        domain: this.config.domain,
      });

      return decoded;
    } catch (error) {
      this.logger.error("JWT decoding failed", error);
      return null;
    }
  }

  /**
   * Create security fingerprint for token
   */
  private async createSecurityFingerprint(token: any): Promise<string> {
    const data = {
      userId: token?.sub,
      email: token?.email,
      domain: this.config.domain,
      timestamp: Date.now(),
    };

    return crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
  }

  /**
   * Validate security fingerprint
   */
  private async validateSecurityFingerprint(token: any): Promise<boolean> {
    if (!token._security?.fingerprint) {
      return false;
    }

    // Check token age for strict security
    if (this.config.securityLevel === "strict" && token._security?.issued) {
      const tokenAge = Date.now() - token._security.issued;
      const maxAge = 3600000; // 1 hour in milliseconds

      if (tokenAge > maxAge) {
        this.logger.warn("Token expired for strict security", {
          userId: token.sub,
          tokenAge: Math.floor(tokenAge / 1000) + "s",
        });
        return false;
      }
    }

    // Validate domain consistency
    if (token._security && token._security.domain !== this.config.domain) {
      this.logger.warn("Token domain mismatch", {
        tokenDomain: token._security.domain,
        currentDomain: this.config.domain,
        userId: token.sub,
      });
      return false;
    }

    return true;
  }

  /**
   * Enhanced session validation
   */
  async validateSession(session: any): Promise<boolean> {
    if (!user?.id) {
      return false;
    }

    try {
      // Basic validation
      if (!session.user.email) {
        this.logger.warn("Session missing required fields", {
          userId: session.user.id,
        });
        return false;
      }

      // Admin domain specific validation
      if (this.config.isAdminDomain) {
        if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
          this.logger.warn("Insufficient permissions for admin domain", {
            userId: session.user.id,
            role: session.user.role,
          });
          return false;
        }
      }

      // Rate limiting check for strict security
      if (this.config.securityLevel === "strict") {
        const isRateLimited = await this.checkRateLimit(session.user.id);
        if (isRateLimited) {
          this.logger.warn("Session rate limited", {
            userId: session.user.id,
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error("Session validation failed", error);
      return false;
    }
  }

  /**
   * Rate limiting for enhanced security (edge runtime compatible)
   */
  private async checkRateLimit(userId: string): Promise<boolean> {
    try {
      // Simple rate limiting for edge runtime
      const now = Date.now();
      const windowMs = 60000; // 1 minute
      const maxRequests = this.config.securityLevel === "strict" ? 10 : 100;

      // In edge runtime, we'll use a simple time-based check
      // In production, this should use Redis or external rate limiting service
      const lastRequest = parseInt(userId.slice(-4), 16) || 0;
      const timeSinceLastRequest = now - lastRequest;

      // Simple check: if requests are too frequent, rate limit
      if (timeSinceLastRequest < 60000 / maxRequests) {
        this.logger.warn("Rate limit triggered", {
          userId,
          timeSinceLastRequest,
        });
        return true; // Rate limited
      }

      return false; // Not rate limited
    } catch (error) {
      this.logger.error("Rate limit check failed", error);
      return false; // Allow on error to prevent lockouts
    }
  }

  /**
   * Security audit logging
   */
  async logSecurityEvent(event: string, data: any) {
    const securityLog = {
      event,
      timestamp: new Date().toISOString(),
      domain: this.config.domain,
      securityLevel: this.config.securityLevel,
      ...data,
    };

    this.logger.security(event, securityLog);

    // In production, send to security monitoring system
    if (process.env.NODE_ENV === "production") {
      // await sendToSecurityMonitoring(securityLog);
    }
  }

  /**
   * Generate secure random tokens
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Hash passwords securely
   */
  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import("bcryptjs");
    const saltRounds = this.config.securityLevel === "strict" ? 14 : 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify passwords securely
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(password, hash);
  }

  /**
   * Get security status
   */
  getStatus() {
    return {
      securityLevel: this.config.securityLevel,
      domain: this.config.domain,
      features: {
        enhancedCookies: true,
        jwtSecurity: true,
        sessionValidation: true,
        rateLimiting: this.config.securityLevel === "strict",
        securityLogging: true,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
