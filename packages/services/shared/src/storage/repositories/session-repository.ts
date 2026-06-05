/**
 * Switchboard Session Repository
 *
 * Repository for managing user sessions in cache storage
 */

import { Logger } from '../../logging/logger';
import { MetricsCollector } from '../../metrics/metrics-collector';
import { StorageManager } from '../storage-manager';
import { BaseRepository, RepositoryOptions } from './base-repository';

export interface UserSession {
  sessionId: string;
  userId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastAccessAt: Date;
  expiresAt: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export class SessionRepository extends BaseRepository<UserSession> {
  private readonly defaultTTL = 3600; // 1 hour default session TTL

  constructor(
    storageManager: StorageManager,
    logger: Logger,
    metricsCollector?: MetricsCollector
  ) {
    super('user_sessions', storageManager, logger, metricsCollector);
  }

  /**
   * Create a new session
   */
  async createSession(sessionData: Omit<UserSession, 'sessionId' | 'createdAt' | 'lastAccessAt'>): Promise<UserSession> {
    return this.executeOperation(
      async () => {
        const sessionId = this.generateSessionId();
        const now = new Date();

        const session: UserSession = {
          ...sessionData,
          sessionId,
          createdAt: now,
          lastAccessAt: now,
          isActive: true
        };

        const storage = this.getCacheStorage();
        const ttl = Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000);

        // Store session in cache with TTL
        await storage.set(this.buildSessionKey(sessionId), session, ttl);

        // Also store user session mapping for cleanup
        const userSessionsKey = this.buildUserSessionsKey(session.userId);
        await storage.sadd(userSessionsKey, [sessionId]);
        await storage.expire(userSessionsKey, ttl);

        return session;
      },
      'createSession'
    );
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    return this.executeOperation(
      async () => {
        const storage = this.getCacheStorage();
        const sessionKey = this.buildSessionKey(sessionId);

        const session = await storage.get<UserSession>(sessionKey);

        if (session && session.expiresAt && new Date() > new Date(session.expiresAt)) {
          // Session expired, remove it
          await this.deleteSession(sessionId);
          return null;
        }

        return session;
      },
      'getSession'
    );
  }

  /**
   * Update session last access time
   */
  async touchSession(sessionId: string): Promise<UserSession | null> {
    return this.executeOperation(
      async () => {
        const storage = this.getCacheStorage();
        const sessionKey = this.buildSessionKey(sessionId);

        const session = await storage.get<UserSession>(sessionKey);
        if (!session) return null;

        // Update last access time
        session.lastAccessAt = new Date();

        // Calculate remaining TTL
        const ttl = Math.max(
          Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
          0
        );

        if (ttl > 0) {
          await storage.set(sessionKey, session, ttl);
          return session;
        } else {
          // Session expired
          await this.deleteSession(sessionId);
          return null;
        }
      },
      'touchSession'
    );
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    return this.executeOperation(
      async () => {
        const storage = this.getCacheStorage();

        // Get session to find user ID for cleanup
        const session = await storage.get<UserSession>(this.buildSessionKey(sessionId));

        // Delete session
        const deleted = await storage.del(this.buildSessionKey(sessionId));

        // Remove from user sessions set if session existed
        if (session) {
          const userSessionsKey = this.buildUserSessionsKey(session.userId);
          await storage.smembers(userSessionsKey).then(members => {
            if (members.includes(sessionId)) {
              // Remove this session ID from user's session set
              // Note: Redis doesn't have srem, so we'd need to implement this differently
              // For now, we'll rely on TTL to clean up the set
            }
          });
        }

        return deleted;
      },
      'deleteSession'
    );
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    return this.executeOperation(
      async () => {
        const storage = this.getCacheStorage();
        const userSessionsKey = this.buildUserSessionsKey(userId);

        const sessionIds = await storage.smembers<string>(userSessionsKey);
        const sessions: UserSession[] = [];

        for (const sessionId of sessionIds) {
          const session = await this.getSession(sessionId);
          if (session && session.isActive) {
            sessions.push(session);
          }
        }

        return sessions;
      },
      'getUserSessions'
    );
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    return this.executeOperation(
      async () => {
        const storage = this.getCacheStorage();
        const userSessionsKey = this.buildUserSessionsKey(userId);

        const sessionIds = await storage.smembers<string>(userSessionsKey);
        let deletedCount = 0;

        for (const sessionId of sessionIds) {
          const deleted = await storage.del(this.buildSessionKey(sessionId));
          if (deleted) deletedCount++;
        }

        // Clear user sessions set
        await storage.del(userSessionsKey);

        return deletedCount;
      },
      'deleteUserSessions'
    );
  }

  /**
   * Clean up expired sessions (background task)
   */
  async cleanupExpiredSessions(): Promise<number> {
    return this.executeOperation(
      async () => {
        const storage = this.getCacheStorage();
        let cleanedCount = 0;

        // Use pattern matching to find all session keys
        const pattern = this.buildSessionKey('*');
        const sessionKeys = await storage.keys(pattern);

        for (const sessionKey of sessionKeys) {
          const session = await storage.get<UserSession>(sessionKey);
          if (session && new Date() > new Date(session.expiresAt)) {
            await storage.del(sessionKey);
            cleanedCount++;
          }
        }

        this.logger.info('Cleaned up expired sessions', { cleanedCount });
        return cleanedCount;
      },
      'cleanupExpiredSessions'
    );
  }

  /**
   * Extend session expiry
   */
  async extendSession(sessionId: string, additionalSeconds: number): Promise<UserSession | null> {
    return this.executeOperation(
      async () => {
        const storage = this.getCacheStorage();
        const sessionKey = this.buildSessionKey(sessionId);

        const session = await storage.get<UserSession>(sessionKey);
        if (!session) return null;

        // Extend expiry time
        const newExpiresAt = new Date(new Date(session.expiresAt).getTime() + (additionalSeconds * 1000));
        session.expiresAt = newExpiresAt;

        // Calculate new TTL
        const ttl = Math.floor((newExpiresAt.getTime() - Date.now()) / 1000);

        if (ttl > 0) {
          await storage.set(sessionKey, session, ttl);
          return session;
        } else {
          await this.deleteSession(sessionId);
          return null;
        }
      },
      'extendSession'
    );
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalActiveSessions: number;
    sessionsByUser: Record<string, number>;
  }> {
    return this.executeOperation(
      async () => {
        const storage = this.getCacheStorage();
        const pattern = this.buildSessionKey('*');
        const sessionKeys = await storage.keys(pattern);

        const sessionsByUser: Record<string, number> = {};
        let totalActiveSessions = 0;

        for (const sessionKey of sessionKeys) {
          const session = await storage.get<UserSession>(sessionKey);
          if (session && session.isActive && new Date() <= new Date(session.expiresAt)) {
            totalActiveSessions++;
            sessionsByUser[session.userId] = (sessionsByUser[session.userId] || 0) + 1;
          }
        }

        return {
          totalActiveSessions,
          sessionsByUser
        };
      },
      'getSessionStats'
    );
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `sess_${timestamp}_${random}`;
  }

  /**
   * Build session cache key
   */
  private buildSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  /**
   * Build user sessions set key
   */
  private buildUserSessionsKey(userId: string): string {
    return `user_sessions:${userId}`;
  }

  /**
   * Transform data for storage
   */
  protected transformForStorage(data: Partial<UserSession>): any {
    const transformed = { ...data };

    // Ensure dates are serialized properly
    if (transformed.createdAt) {
      transformed.createdAt = new Date(transformed.createdAt);
    }
    if (transformed.lastAccessAt) {
      transformed.lastAccessAt = new Date(transformed.lastAccessAt);
    }
    if (transformed.expiresAt) {
      transformed.expiresAt = new Date(transformed.expiresAt);
    }

    return transformed;
  }

  /**
   * Transform data from storage
   */
  protected transformFromStorage(data: any): UserSession {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      lastAccessAt: new Date(data.lastAccessAt),
      expiresAt: new Date(data.expiresAt)
    };
  }
}