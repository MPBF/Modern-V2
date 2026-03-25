import { Response } from "express";
import { EventEmitter } from "events";
import type { IStorage } from "../storage";
import { logger } from "../lib/logger";

// SSE message types
export interface SSEMessage {
  id?: string;
  event?: string;
  data: any;
  retry?: number;
}

// Connection info
interface SSEConnection {
  id: string;
  userId: number;
  response: Response;
  lastHeartbeat: Date;
}

// System notification data
export interface SystemNotificationData {
  title: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  type: "system" | "order" | "production" | "maintenance" | "quality" | "hr";
  priority: "low" | "normal" | "high" | "urgent";
  recipient_type?: "user" | "group" | "role" | "all";
  recipient_id?: string;
  context_type?: string;
  context_id?: string;
  sound?: boolean;
  icon?: string;
}

export class NotificationManager extends EventEmitter {
  private connections = new Map<string, SSEConnection>();
  private storage: IStorage;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private productionUpdateDebounce: NodeJS.Timeout | null = null;

  constructor(storage: IStorage) {
    super();
    this.storage = storage;
    this.startHeartbeat();
    this.startCleanup();
    process.on("SIGTERM", () => this.shutdown());
    process.on("SIGINT", () => this.shutdown());
  }

  /**
   * Add SSE connection for a user
   */
  addConnection(
    connectionId: string,
    userId: number,
    response: Response,
  ): void {
    logger.debug(
      `[NotificationManager] Adding SSE connection for user ${userId}, connection ${connectionId}`,
    );

    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const connection: SSEConnection = {
      id: connectionId,
      userId,
      response,
      lastHeartbeat: new Date(),
    };
    this.connections.set(connectionId, connection);

    response.on("close", () => this.removeConnection(connectionId));
    response.on("error", () => this.removeConnection(connectionId));

    this.sendRecentNotifications(userId, connectionId, response);
  }

  /**
   * Remove SSE connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        // Remove event listeners first to prevent memory leaks
        connection.response.removeAllListeners("close");
        connection.response.removeAllListeners("error");

        // Check if response is still writable before ending
        if (!connection.response.headersSent || connection.response.writable) {
          connection.response.end();
        }
      } catch (error) {
        // Log but don't throw - connection cleanup should be resilient
        logger.warn(
          `[NotificationManager] Error cleaning up connection ${connectionId}`,
          error,
        );
      } finally {
        this.connections.delete(connectionId);
      }
    }
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(
    userId: number,
    notificationData: SystemNotificationData,
  ): Promise<void> {
    if (notificationData.priority === "low") {
      logger.debug(
        `[NotificationManager] Skipped low-priority notification for user ${userId}`,
      );
      return;
    }

    try {
      const notification = await this.storage.createNotification({
        title: notificationData.title,
        title_ar: notificationData.title_ar,
        message: notificationData.message,
        message_ar: notificationData.message_ar,
        type: notificationData.type,
        priority: notificationData.priority,
        recipient_type: "user",
        recipient_id: userId.toString(),
        context_type: notificationData.context_type,
        context_id: notificationData.context_id,
        status: "sent",
      });

      const userConnections = Array.from(this.connections.values()).filter(
        (conn) => conn.userId === userId,
      );

      if (userConnections.length > 0) {
        const sseData = {
          event: "notification",
          data: {
            id: notification.id,
            title: notification.title,
            title_ar: notification.title_ar,
            message: notification.message,
            message_ar: notification.message_ar,
            type: notification.type,
            priority: notification.priority,
            context_type: notification.context_type,
            context_id: notification.context_id,
            created_at: notification.created_at,
            sound:
              notificationData.sound ||
              this.shouldPlaySound(notification.priority || "normal"),
            icon:
              notificationData.icon || this.getIconForType(notification.type),
          },
        };
        userConnections.forEach((conn) =>
          this.sendToConnection(conn.id, conn.response, sseData),
        );
      }
    } catch (error) {
      logger.error(
        `[NotificationManager] Error sending notification to user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send notification to multiple users by role
   */
  async sendToRole(
    roleId: number,
    notificationData: SystemNotificationData,
  ): Promise<void> {
    if (notificationData.priority === "low") return;

    try {
      const notification = await this.storage.createNotification({
        title: notificationData.title,
        title_ar: notificationData.title_ar,
        message: notificationData.message,
        message_ar: notificationData.message_ar,
        type: notificationData.type,
        priority: notificationData.priority,
        recipient_type: "role",
        recipient_id: roleId.toString(),
        context_type: notificationData.context_type,
        context_id: notificationData.context_id,
        status: "sent",
      });

      const users = await this.storage.getSafeUsersByRole(roleId);
      const sseData = {
        event: "notification",
        data: {
          id: notification.id,
          title: notification.title,
          title_ar: notification.title_ar,
          message: notification.message,
          message_ar: notification.message_ar,
          type: notification.type,
          priority: notification.priority,
          context_type: notification.context_type,
          context_id: notification.context_id,
          created_at: notification.created_at,
          sound:
            notificationData.sound ||
            this.shouldPlaySound(notification.priority || "normal"),
          icon:
            notificationData.icon || this.getIconForType(notification.type),
        },
      };

      users.forEach((user) => {
        const userConnections = Array.from(this.connections.values()).filter(
          (conn) => conn.userId === user.id,
        );
        userConnections.forEach((conn) =>
          this.sendToConnection(conn.id, conn.response, sseData),
        );
      });
    } catch (error) {
      logger.error(
        `[NotificationManager] Error sending notification to role ${roleId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send notification to all users
   */
  async sendToAll(notificationData: SystemNotificationData): Promise<void> {
    if (notificationData.priority === "low") return;

    try {
      const users = await this.storage.getSafeUsers();
      const activeUsers = users.filter((user) => user.status === "active");
      const promises = activeUsers.map((user) =>
        this.sendToUser(user.id, notificationData),
      );
      await Promise.all(promises);
    } catch (error) {
      logger.error(
        `[NotificationManager] Error sending notification to all users`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send recent unread notifications
   */
  private async sendRecentNotifications(
    userId: number,
    connectionId: string,
    response: Response,
  ): Promise<void> {
    try {
      const notifications = await this.storage.getUserNotifications(userId, {
        unreadOnly: true,
        limit: 50,
      });

      const filtered = notifications.filter((n) => n.priority !== "low");
      if (filtered.length > 0) {
        const recentData = {
          event: "recent_notifications",
          data: {
            notifications: filtered.map((n) => ({
              id: n.id,
              title: n.title,
              title_ar: n.title_ar,
              message: n.message,
              message_ar: n.message_ar,
              type: n.type,
              priority: n.priority,
              context_type: n.context_type,
              context_id: n.context_id,
              created_at: n.created_at,
              icon: this.getIconForType(n.type),
            })),
            count: filtered.length,
          },
        };
        this.sendToConnection(connectionId, response, recentData);
      }
    } catch (error) {
      logger.error(
        `[NotificationManager] Error sending recent notifications to user ${userId}`,
        error,
      );
    }
  }

  /**
   * Send SSE message
   */
  private sendToConnection(
    connectionId: string,
    response: Response,
    message: SSEMessage,
  ): void {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      // Check if connection is still writable
      if (response.destroyed || response.writableEnded || !response.writable) {
        logger.debug(
          `[NotificationManager] Connection ${connectionId} is no longer writable, removing`,
        );
        this.removeConnection(connectionId);
        return;
      }

      let sseMessage = "";
      if (message.id) sseMessage += `id: ${message.id}\n`;
      if (message.event) sseMessage += `event: ${message.event}\n`;
      if (message.retry) sseMessage += `retry: ${message.retry}\n`;
      sseMessage += `data: ${JSON.stringify(message.data)}\n\n`;

      response.write(sseMessage);
      connection.lastHeartbeat = new Date();
    } catch (error) {
      logger.warn(
        `[NotificationManager] Error sending to connection ${connectionId}`,
        error,
      );
      this.removeConnection(connectionId);
    }
  }

  /**
   * Send heartbeat as SSE comment
   */
  private sendHeartbeat(): void {
    const ping = `:ping ${new Date().toISOString()}\n\n`;
    const stalConnections: string[] = [];

    this.connections.forEach((conn, connectionId) => {
      try {
        // Check if connection is still writable before sending heartbeat
        if (
          conn.response.destroyed ||
          conn.response.writableEnded ||
          !conn.response.writable
        ) {
          stalConnections.push(connectionId);
          return;
        }

        conn.response.write(ping);
        conn.lastHeartbeat = new Date();
      } catch (error) {
        logger.warn(
          `[NotificationManager] Heartbeat failed for connection ${connectionId}`,
          error,
        );
        stalConnections.push(connectionId);
      }
    });

    // Clean up stale connections
    stalConnections.forEach((id) => this.removeConnection(id));
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const stale: string[] = [];

      // Enhanced connection health check
      this.connections.forEach((conn, id) => {
        const diff = now.getTime() - conn.lastHeartbeat.getTime();

        // Check for stale connections (2 minutes timeout)
        if (diff > 120000) {
          stale.push(id);
          return;
        }

        // Check for destroyed/closed connections
        if (
          conn.response.destroyed ||
          conn.response.writableEnded ||
          !conn.response.writable
        ) {
          logger.debug(
            `[NotificationManager] Found destroyed connection ${id}, marking for cleanup`,
          );
          stale.push(id);
        }
      });

      // Clean up stale connections
      stale.forEach((id) => this.removeConnection(id));

      // Memory optimization: log connection stats for monitoring
      if (stale.length > 0) {
        logger.debug(
          `[NotificationManager] Cleaned up ${stale.length} stale connections. Active ${this.connections.size}`,
        );
      }

      // Additional memory cleanup every 10 minutes
      const currentTime = now.getTime();
      if (currentTime % (10 * 60 * 1000) < 60 * 1000) {
        // Every 10 minutes
        this.performMemoryCleanup();
      }
    }, 60000);
  }

  /**
   * Perform memory cleanup to prevent leaks
   */
  private performMemoryCleanup(): void {
    try {
      logger.debug("[NotificationManager] Running memory cleanup");

      // First, validate all connections and remove any that are invalid
      const invalidConnections: string[] = [];
      this.connections.forEach((conn, id) => {
        if (
          conn.response.destroyed ||
          conn.response.writableEnded ||
          !conn.response.writable
        ) {
          invalidConnections.push(id);
        }
      });

      invalidConnections.forEach((id) => this.removeConnection(id));

      // Clear accumulated event listeners (but don't remove all - be selective)
      const listenerCounts =
        this.listenerCount("error") + this.listenerCount("close");
      if (listenerCounts > this.connections.size * 2) {
        logger.debug(
          `[NotificationManager] Found ${listenerCounts} listeners, cleaning up`,
        );
        this.removeAllListeners("error");
        this.removeAllListeners("close");
      }

      // Force garbage collection if available (development only)
      if (global.gc && process.env.NODE_ENV === "development") {
        global.gc();
      }

      logger.debug(
        `[NotificationManager] Memory cleanup completed. Active connections ${this.connections.size}, Cleaned invalid ${invalidConnections.length}`,
      );
    } catch (error) {
      logger.error("[NotificationManager] Memory cleanup failed", error);
    }
  }

  private getIconForType(type: string): string {
    const icons: Record<string, string> = {
      system: "⚙️",
      order: "📋",
      production: "🏭",
      maintenance: "🔧",
      quality: "✅",
      hr: "👥",
      whatsapp: "📱",
      sms: "💬",
      email: "📧",
    };
    return icons[type] || "🔔";
  }

  private shouldPlaySound(priority: string): boolean {
    return priority === "high" || priority === "urgent";
  }

  getStats(): {
    activeConnections: number;
    connectionsByUser: Record<number, number>;
  } {
    const connectionsByUser: Record<number, number> = {};
    this.connections.forEach((c) => {
      connectionsByUser[c.userId] = (connectionsByUser[c.userId] || 0) + 1;
    });
    return {
      activeConnections: this.connections.size,
      connectionsByUser,
    };
  }

  shutdown(): void {
    logger.info("[NotificationManager] Shutting down");

    // Clear all intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.productionUpdateDebounce) {
      clearTimeout(this.productionUpdateDebounce);
      this.productionUpdateDebounce = null;
    }

    // Clean up all connections
    const connectionIds = Array.from(this.connections.keys());
    connectionIds.forEach((id) => this.removeConnection(id));

    // Clear all event listeners
    this.removeAllListeners();

    logger.info(
      `[NotificationManager] Shutdown complete. Cleaned up ${connectionIds.length} connections`,
    );
  }

  /**
   * Send production queue update to all connected users (debounced)
   */
  broadcastProductionUpdate(
    updateType: "film" | "printing" | "cutting" | "all" = "all",
  ): void {
    // Debounce to prevent spam - only send one update per 2 seconds
    if (this.productionUpdateDebounce) {
      clearTimeout(this.productionUpdateDebounce);
    }

    this.productionUpdateDebounce = setTimeout(() => {
      if (this.connections.size === 0) return;

      logger.debug(
        `[NotificationManager] Broadcasting production update ${updateType}`,
      );

      const updateMessage: SSEMessage = {
        event: "production_update",
        data: {
          type: updateType,
          timestamp: new Date().toISOString(),
          queues:
            updateType === "all"
              ? ["film", "printing", "cutting"]
              : [updateType],
        },
      };

      // Send to all connected production users
      this.connections.forEach((conn) => {
        this.sendToConnection(conn.id, conn.response, updateMessage);
      });
    }, 2000); // 2 second debounce
  }

  /**
   * Send production queue update to specific users based on their roles/sections
   */
  async broadcastProductionUpdateToRoles(
    updateType: "film" | "printing" | "cutting" | "all" = "all",
  ): Promise<void> {
    try {
      // Get users who should receive production updates (production roles)
      const productionRoles = [1, 2]; // Manager, Production Manager

      for (const roleId of productionRoles) {
        const users = await this.storage.getSafeUsersByRole(roleId);
        const activeUsers = users.filter((user) => user.status === "active");

        activeUsers.forEach((user) => {
          const userConnections = Array.from(this.connections.values()).filter(
            (conn) => conn.userId === user.id,
          );

          if (userConnections.length > 0) {
            const updateMessage: SSEMessage = {
              event: "production_update",
              data: {
                type: updateType,
                timestamp: new Date().toISOString(),
                queues:
                  updateType === "all"
                    ? ["film", "printing", "cutting"]
                    : [updateType],
              },
            };

            userConnections.forEach((conn) => {
              this.sendToConnection(conn.id, conn.response, updateMessage);
            });
          }
        });
      }
    } catch (error) {
      logger.error(
        "[NotificationManager] Error broadcasting production update to roles",
        error,
      );
    }
  }
}

// Singleton
let notificationManager: NotificationManager | null = null;
export function getNotificationManager(storage: IStorage): NotificationManager {
  if (!notificationManager)
    notificationManager = new NotificationManager(storage);
  return notificationManager;
}
