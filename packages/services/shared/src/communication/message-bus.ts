/**
 * Switchboard Service Communication - Message Bus
 *
 * Provides inter-service communication patterns
 */

import { EventEmitter } from 'events';
import { Logger } from '../logging/logger';
import { ServiceError, ErrorCode } from '../errors/service-errors';
import { MetricsCollector } from '../metrics/metrics-collector';

export interface Message {
  id: string;
  type: string;
  source: string;
  target?: string;
  payload: any;
  timestamp: Date;
  correlationId?: string;
  retryCount?: number;
  expiresAt?: Date;
}

export interface MessageHandler {
  (message: Message): Promise<any>;
}

export interface MessageBusConfig {
  serviceName: string;
  enableRetries?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  messageTimeoutMs?: number;
  enableDeadLetterQueue?: boolean;
}

export class MessageBus extends EventEmitter {
  private handlers: Map<string, MessageHandler[]> = new Map();
  private deadLetterQueue: Message[] = [];
  private pendingMessages: Map<string, NodeJS.Timeout> = new Map();

  private readonly logger: Logger;
  private readonly config: MessageBusConfig;
  private readonly metricsCollector?: MetricsCollector;

  constructor(
    config: MessageBusConfig,
    logger: Logger,
    metricsCollector?: MetricsCollector
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.metricsCollector = metricsCollector;

    this.logger.info('Message bus initialized', {
      serviceName: config.serviceName,
      enableRetries: config.enableRetries,
      maxRetries: config.maxRetries
    });
  }

  /**
   * Subscribe to a message type
   */
  subscribe(messageType: string, handler: MessageHandler): void {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, []);
    }

    this.handlers.get(messageType)!.push(handler);
    this.logger.debug('Handler subscribed', {
      messageType,
      handlerCount: this.handlers.get(messageType)!.length
    });
  }

  /**
   * Unsubscribe from a message type
   */
  unsubscribe(messageType: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(messageType);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.logger.debug('Handler unsubscribed', {
        messageType,
        handlerCount: handlers.length
      });
    }
  }

  /**
   * Publish a message
   */
  async publish(message: Omit<Message, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: Message = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date(),
      retryCount: 0
    };

    this.logger.debug('Publishing message', {
      messageId: fullMessage.id,
      type: fullMessage.type,
      source: fullMessage.source,
      target: fullMessage.target
    });

    const timer = this.metricsCollector?.createTimer();

    try {
      await this.processMessage(fullMessage);

      this.metricsCollector?.recordHttpRequest(
        'PUBLISH',
        `/message/${fullMessage.type}`,
        200,
        timer?.() || 0
      );

      this.emit('messagePublished', fullMessage);
    } catch (error) {
      this.metricsCollector?.recordHttpRequest(
        'PUBLISH',
        `/message/${fullMessage.type}`,
        500,
        timer?.() || 0
      );

      this.logger.error('Failed to publish message', error, {
        messageId: fullMessage.id,
        type: fullMessage.type
      });

      throw new ServiceError(
        `Failed to publish message: ${String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        { originalError: error, message: fullMessage },
        this.config.serviceName
      );
    }
  }

  /**
   * Send a message and wait for response
   */
  async sendAndWait<T = any>(
    message: Omit<Message, 'id' | 'timestamp'>,
    timeoutMs: number = 5000
  ): Promise<T> {
    const messageId = this.generateMessageId();
    const correlationId = message.correlationId || this.generateCorrelationId();

    const fullMessage: Message = {
      ...message,
      id: messageId,
      timestamp: new Date(),
      correlationId,
      retryCount: 0
    };

    return new Promise<T>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener(`response:${correlationId}`, responseHandler);
        reject(new ServiceError(
          'Message response timeout',
          ErrorCode.TIMEOUT,
          408,
          { messageId, correlationId, timeoutMs },
          this.config.serviceName
        ));
      }, timeoutMs);

      const responseHandler = (response: any) => {
        clearTimeout(timeout);
        resolve(response);
      };

      this.once(`response:${correlationId}`, responseHandler);

      try {
        await this.publish(fullMessage);
      } catch (error) {
        clearTimeout(timeout);
        this.removeListener(`response:${correlationId}`, responseHandler);
        reject(error);
      }
    });
  }

  /**
   * Send a response to a message
   */
  async sendResponse(originalMessage: Message, response: any): Promise<void> {
    if (!originalMessage.correlationId) {
      throw new ServiceError(
        'Cannot send response to message without correlation ID',
        ErrorCode.VALIDATION_ERROR,
        400,
        { messageId: originalMessage.id },
        this.config.serviceName
      );
    }

    this.emit(`response:${originalMessage.correlationId}`, response);

    this.logger.debug('Response sent', {
      originalMessageId: originalMessage.id,
      correlationId: originalMessage.correlationId
    });
  }

  /**
   * Process a message
   */
  private async processMessage(message: Message): Promise<void> {
    const handlers = this.handlers.get(message.type);
    if (!handlers || handlers.length === 0) {
      this.logger.warn('No handlers for message type', {
        messageId: message.id,
        type: message.type
      });
      return;
    }

    // Check if message is expired
    if (message.expiresAt && new Date() > message.expiresAt) {
      this.logger.warn('Message expired', {
        messageId: message.id,
        type: message.type,
        expiresAt: message.expiresAt
      });
      return;
    }

    // Set timeout for message processing
    if (this.config.messageTimeoutMs) {
      const timeoutId = setTimeout(() => {
        this.logger.warn('Message processing timeout', {
          messageId: message.id,
          type: message.type,
          timeoutMs: this.config.messageTimeoutMs
        });
      }, this.config.messageTimeoutMs);

      this.pendingMessages.set(message.id, timeoutId);
    }

    try {
      // Process with all handlers
      const results = await Promise.allSettled(
        handlers.map(handler => this.executeHandler(handler, message))
      );

      // Check for failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`${failures.length} handlers failed`);
      }

      this.logger.debug('Message processed successfully', {
        messageId: message.id,
        type: message.type,
        handlerCount: handlers.length
      });

    } catch (error) {
      await this.handleMessageFailure(message, error);
    } finally {
      // Clear timeout
      const timeoutId = this.pendingMessages.get(message.id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.pendingMessages.delete(message.id);
      }
    }
  }

  /**
   * Execute a message handler with error handling
   */
  private async executeHandler(
    handler: MessageHandler,
    message: Message
  ): Promise<any> {
    const timer = this.metricsCollector?.createTimer();

    try {
      const result = await handler(message);

      this.metricsCollector?.recordHttpRequest(
        'HANDLE',
        `/message/${message.type}`,
        200,
        timer?.() || 0
      );

      return result;
    } catch (error) {
      this.metricsCollector?.recordHttpRequest(
        'HANDLE',
        `/message/${message.type}`,
        500,
        timer?.() || 0
      );

      this.logger.error('Message handler failed', error, {
        messageId: message.id,
        type: message.type
      });

      throw error;
    }
  }

  /**
   * Handle message processing failure
   */
  private async handleMessageFailure(message: Message, error: any): Promise<void> {
    this.logger.error('Message processing failed', error, {
      messageId: message.id,
      type: message.type,
      retryCount: message.retryCount
    });

    if (this.config.enableRetries &&
        (message.retryCount || 0) < (this.config.maxRetries || 3)) {

      // Retry the message
      await this.retryMessage(message);
    } else if (this.config.enableDeadLetterQueue) {
      // Send to dead letter queue
      this.deadLetterQueue.push({
        ...message,
        retryCount: (message.retryCount || 0) + 1
      });

      this.emit('messageDeadLetter', message);
      this.logger.warn('Message sent to dead letter queue', {
        messageId: message.id,
        type: message.type,
        retryCount: message.retryCount
      });
    }

    this.emit('messageError', { message, error });
  }

  /**
   * Retry a failed message
   */
  private async retryMessage(message: Message): Promise<void> {
    const retryCount = (message.retryCount || 0) + 1;
    const delay = (this.config.retryDelayMs || 1000) * Math.pow(2, retryCount - 1);

    this.logger.info('Retrying message', {
      messageId: message.id,
      type: message.type,
      retryCount,
      delayMs: delay
    });

    setTimeout(async () => {
      try {
        await this.processMessage({
          ...message,
          retryCount
        });
      } catch (error) {
        // Will be handled by handleMessageFailure
      }
    }, delay);
  }

  /**
   * Get dead letter queue messages
   */
  getDeadLetterQueue(): Message[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue.length = 0;

    this.logger.info('Dead letter queue cleared', { messageCount: count });
  }

  /**
   * Reprocess dead letter queue messages
   */
  async reprocessDeadLetterQueue(): Promise<void> {
    const messages = [...this.deadLetterQueue];
    this.deadLetterQueue.length = 0;

    this.logger.info('Reprocessing dead letter queue', {
      messageCount: messages.length
    });

    for (const message of messages) {
      try {
        await this.processMessage({
          ...message,
          retryCount: 0
        });
      } catch (error) {
        this.logger.error('Failed to reprocess dead letter message', error, {
          messageId: message.id
        });
      }
    }
  }

  /**
   * Get message bus statistics
   */
  getStats() {
    const handlerCount = Array.from(this.handlers.values())
      .reduce((total, handlers) => total + handlers.length, 0);

    return {
      messageTypes: this.handlers.size,
      totalHandlers: handlerCount,
      deadLetterQueueSize: this.deadLetterQueue.length,
      pendingMessages: this.pendingMessages.size,
      config: this.config
    };
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${this.config.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear all pending timeouts
    for (const timeoutId of this.pendingMessages.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingMessages.clear();

    // Remove all listeners
    this.removeAllListeners();

    this.logger.info('Message bus cleaned up');
  }
}