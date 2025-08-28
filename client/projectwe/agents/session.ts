import crypto from "crypto";
import { Redis } from "ioredis";

// Session configuration
interface SessionConfig {
  secret: string;
  maxAge: number;
  redisUrl: string;
  cookieName: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "strict" | "lax" | "none";
}

// Session data interface
export interface SessionData {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  loginTime: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  mfaVerified: boolean;
  sessionFlags: {
    isPasswordReset?: boolean;
    requiresReauth?: boolean;
    isImpersonation?: boolean;
  };
}

// Session metadata
export interface SessionMetadata {
  id: string;
  data: SessionData;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

// Session store interface
export interface SessionStore {
  get(sessionId: string): Promise<SessionData | null>;
  set(sessionId: string, data: SessionData, ttl?: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
  touch(sessionId: string, ttl?: number): Promise<void>;
  getAllUserSessions(userId: string): Promise<SessionMetadata[]>;
  deleteUserSessions(userId: string): Promise<void>;
  cleanup(): Promise<void>;
}

// Redis session store implementation
export class RedisSessionStore implements SessionStore {
  private redis: Redis;
  private keyPrefix: string;
  private userSessionsPrefix: string;

  constructor(
    redisUrl: string,
    keyPrefix = "session:",
    userSessionsPrefix = "user_sessions:",
  ) {
    this.redis = new Redis(redisUrl);
    this.keyPrefix = keyPrefix;
    this.userSessionsPrefix = userSessionsPrefix;
  }

  private getSessionKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `${this.userSessionsPrefix}${userId}`;
  }

  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const data = await this.redis.get(this.getSessionKey(sessionId));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Session get error:", error);
      return null;
    }
  }

  async set(sessionId: string, data: SessionData, ttl = 7200): Promise<void> {
    try {
      const key = this.getSessionKey(sessionId);
      const userSessionsKey = this.getUserSessionsKey(data.userId);

      // Store session data
      await this.redis.setex(key, ttl, JSON.stringify(data));

      // Add to user's session list
      await this.redis.sadd(userSessionsKey, sessionId);
      await this.redis.expire(userSessionsKey, ttl);
    } catch (error) {
      console.error("Session set error:", error);
      throw error;
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      // Get session data to find user ID
      const sessionData = await this.get(sessionId);

      // Delete session
      await this.redis.del(this.getSessionKey(sessionId));

      // Remove from user's session list
      if (sessionData) {
        await this.redis.srem(
          this.getUserSessionsKey(sessionData.userId),
          sessionId,
        );
      }
    } catch (error) {
      console.error("Session delete error:", error);
      throw error;
    }
  }

  async exists(sessionId: string): Promise<boolean> {
    try {
      return (await this.redis.exists(this.getSessionKey(sessionId))) === 1;
    } catch (error) {
      console.error("Session exists error:", error);
      return false;
    }
  }

  async touch(sessionId: string, ttl = 7200): Promise<void> {
    try {
      await this.redis.expire(this.getSessionKey(sessionId), ttl);
    } catch (error) {
      console.error("Session touch error:", error);
    }
  }

  async getAllUserSessions(userId: string): Promise<SessionMetadata[]> {
    try {
      const sessionIds = await this.redis.smembers(
        this.getUserSessionsKey(userId),
      );
      const sessions: SessionMetadata[] = [];

      for (const sessionId of sessionIds) {
        const data = await this.get(sessionId);
        if (data) {
          const ttl = await this.redis.ttl(this.getSessionKey(sessionId));
          sessions.push({
            id: sessionId,
            data,
            expiresAt: Date.now() + ttl * 1000,
            createdAt: data.loginTime,
            updatedAt: data.lastActivity,
          });
        }
      }

      return sessions;
    } catch (error) {
      console.error("Get user sessions error:", error);
      return [];
    }
  }

  async deleteUserSessions(userId: string): Promise<void> {
    try {
      const sessionIds = await this.redis.smembers(
        this.getUserSessionsKey(userId),
      );

      if (sessionIds.length > 0) {
        // Delete all session keys
        const sessionKeys = sessionIds.map((id: string) =>
          this.getSessionKey(id),
        );
        await this.redis.del(...sessionKeys);

        // Delete user sessions set
        await this.redis.del(this.getUserSessionsKey(userId));
      }
    } catch (error) {
      console.error("Delete user sessions error:", error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL cleanup automatically
    console.log("Redis session cleanup completed");
  }
}

// In-memory session store (for development)
export class MemorySessionStore implements SessionStore {
  private sessions = new Map<
    string,
    { data: SessionData; expiresAt: number }
  >();
  private userSessions = new Map<string, Set<string>>();

  async get(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);

    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session.data;
  }

  async set(sessionId: string, data: SessionData, ttl = 7200): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;

    this.sessions.set(sessionId, { data, expiresAt });

    // Add to user sessions
    if (!this.userSessions.has(data.userId)) {
      this.userSessions.set(data.userId, new Set());
    }
    this.userSessions.get(data.userId)!.add(sessionId);
  }

  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);

    if (session) {
      const userSessions = this.userSessions.get(session.data.userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessions.delete(session.data.userId);
        }
      }
    }
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async touch(sessionId: string, ttl = 7200): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.expiresAt = Date.now() + ttl * 1000;
    }
  }

  async getAllUserSessions(userId: string): Promise<SessionMetadata[]> {
    const sessionIds = this.userSessions.get(userId) || new Set();
    const sessions: SessionMetadata[] = [];

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && Date.now() <= session.expiresAt) {
        sessions.push({
          id: sessionId,
          data: session.data,
          expiresAt: session.expiresAt,
          createdAt: session.data.loginTime,
          updatedAt: session.data.lastActivity,
        });
      }
    }

    return sessions;
  }

  async deleteUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId) || new Set();

    for (const sessionId of sessionIds) {
      this.sessions.delete(sessionId);
    }

    this.userSessions.delete(userId);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        await this.delete(sessionId);
      }
    }
  }
}

// Session manager
export class SessionManager {
  private store: SessionStore;
  private config: SessionConfig;

  constructor(config: SessionConfig) {
    this.config = config;
    this.store = config.redisUrl
      ? new RedisSessionStore(config.redisUrl)
      : new MemorySessionStore();

    // Start cleanup interval for memory store
    if (this.store instanceof MemorySessionStore) {
      setInterval(() => this.store.cleanup(), 300000); // 5 minutes
    }
  }

  // Generate secure session ID
  generateSessionId(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  // Create session
  async createSession(
    sessionData: Omit<SessionData, "loginTime" | "lastActivity">,
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const fullSessionData: SessionData = {
      ...sessionData,
      loginTime: now,
      lastActivity: now,
    };

    await this.store.set(sessionId, fullSessionData, this.config.maxAge);

    return sessionId;
  }

  // Get session
  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!sessionId) return null;

    const session = await this.store.get(sessionId);

    if (session) {
      // Update last activity
      session.lastActivity = Date.now();
      await this.store.set(sessionId, session, this.config.maxAge);
    }

    return session;
  }

  // Update session
  async updateSession(
    sessionId: string,
    updates: Partial<SessionData>,
  ): Promise<void> {
    const session = await this.store.get(sessionId);

    if (session) {
      const updatedSession = {
        ...session,
        ...updates,
        lastActivity: Date.now(),
      };

      await this.store.set(sessionId, updatedSession, this.config.maxAge);
    }
  }

  // Destroy session
  async destroySession(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);
  }

  // Validate session
  async validateSession(
    sessionId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    valid: boolean;
    session?: SessionData;
    reason?: string;
  }> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return { valid: false, reason: "Session not found" };
    }

    // Check IP address (optional - can be disabled for mobile users)
    if (
      process.env.ENFORCE_IP_BINDING === "true" &&
      session.ipAddress !== ipAddress
    ) {
      return { valid: false, reason: "IP address mismatch" };
    }

    // Check user agent
    if (session.userAgent !== userAgent) {
      return { valid: false, reason: "User agent mismatch" };
    }

    // Check if session requires re-authentication
    if (session.sessionFlags.requiresReauth) {
      return { valid: false, reason: "Re-authentication required" };
    }

    return { valid: true, session };
  }

  // Get all user sessions
  async getUserSessions(userId: string): Promise<SessionMetadata[]> {
    return this.store.getAllUserSessions(userId);
  }

  // Revoke all user sessions
  async revokeUserSessions(userId: string): Promise<void> {
    await this.store.deleteUserSessions(userId);
  }

  // Encrypt session cookie
  encryptSessionCookie(sessionId: string): string {
    const cipher = crypto.createCipher("aes-256-cbc", this.config.secret);
    let encrypted = cipher.update(sessionId, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  // Decrypt session cookie
  decryptSessionCookie(encryptedSessionId: string): string {
    try {
      const decipher = crypto.createDecipher("aes-256-cbc", this.config.secret);
      let decrypted = decipher.update(encryptedSessionId, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      throw new Error("Invalid session cookie");
    }
  }

  // Generate device fingerprint
  generateDeviceFingerprint(
    userAgent: string,
    acceptLanguage: string,
    acceptEncoding: string,
  ): string {
    const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    return crypto.createHash("sha256").update(fingerprint).digest("hex");
  }

  // Clean up expired sessions
  async cleanup(): Promise<void> {
    await this.store.cleanup();
  }
}

// Create session manager instance
const getSessionConfig = (): SessionConfig => ({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString("hex"),
  maxAge: parseInt(process.env.SESSION_MAX_AGE || "7200", 10), // 2 hours
  redisUrl: process.env.REDIS_URL || "",
  cookieName: process.env.SESSION_COOKIE_NAME || "projectwe_session",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "strict",
});

export const sessionManager = new SessionManager(getSessionConfig());

// Utility functions
export const SessionUtils = {
  // Check if session is near expiry
  isSessionNearExpiry(session: SessionData, thresholdMinutes = 10): boolean {
    const threshold = thresholdMinutes * 60 * 1000;
    return Date.now() - session.lastActivity > threshold;
  },

  // Get session duration
  getSessionDuration(session: SessionData): number {
    return Date.now() - session.loginTime;
  },

  // Check if session is idle
  isSessionIdle(session: SessionData, idleTimeoutMinutes = 30): boolean {
    const idleTimeout = idleTimeoutMinutes * 60 * 1000;
    return Date.now() - session.lastActivity > idleTimeout;
  },

  // Mask sensitive session data for logging
  maskSessionData(session: SessionData): Partial<SessionData> {
    return {
      userId: session.userId.substring(0, 8) + "...",
      email: session.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
      roles: session.roles,
      loginTime: session.loginTime,
      lastActivity: session.lastActivity,
      mfaVerified: session.mfaVerified,
    };
  },
};

export default SessionManager;
