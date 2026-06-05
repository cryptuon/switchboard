/**
 * Switchboard Logging Framework
 *
 * Provides structured logging across all services
 */

import winston from 'winston';
import { ServiceError } from '../errors/service-errors';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  service: string;
  operation?: string;
  userId?: string;
  requestId?: string;
  chainId?: number;
  networkName?: string;
  transactionId?: string;
  deploymentId?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  timestamp: string;
  error?: any;
  duration?: number;
  metadata?: any;
}

export class Logger {
  private winston: winston.Logger;
  private service: string;
  private defaultContext: LogContext;

  constructor(service: string, level: LogLevel = LogLevel.INFO) {
    this.service = service;
    this.defaultContext = { service };

    this.winston = winston.createLogger({
      level: level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf((info) => {
          const logEntry: LogEntry = {
            level: info.level as LogLevel,
            message: String(info.message),
            context: { ...this.defaultContext, ...(info.context || {}) },
            timestamp: String(info.timestamp),
            error: info.error,
            duration: Number(info.duration) || undefined,
            metadata: info.metadata
          };
          return JSON.stringify(logEntry);
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf((info) => {
              const context = { ...this.defaultContext, ...(info.context || {}) };
              const contextStr = Object.keys(context).length > 1
                ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]`
                : '';

              let message = `${info.timestamp} ${info.level}: ${info.message}${contextStr}`;

              if (info.error) {
                message += `\nError: ${JSON.stringify(info.error, null, 2)}`;
              }

              if (info.duration) {
                message += ` (${info.duration}ms)`;
              }

              return message;
            })
          )
        }),
        new winston.transports.File({
          filename: `logs/${service}-error.log`,
          level: 'error',
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: `logs/${service}.log`,
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10
        })
      ]
    });
  }

  private log(level: LogLevel, message: string, context?: Partial<LogContext>, error?: any, metadata?: any) {
    this.winston.log({
      level,
      message,
      context: { ...this.defaultContext, ...context },
      error: error ? this.serializeError(error) : undefined,
      metadata
    });
  }

  private serializeError(error: any) {
    if (error instanceof ServiceError) {
      return error.toJSON();
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    return error;
  }

  error(message: string, error?: any, context?: Partial<LogContext>, metadata?: any) {
    this.log(LogLevel.ERROR, message, context, error, metadata);
  }

  warn(message: string, context?: Partial<LogContext>, metadata?: any) {
    this.log(LogLevel.WARN, message, context, undefined, metadata);
  }

  info(message: string, context?: Partial<LogContext>, metadata?: any) {
    this.log(LogLevel.INFO, message, context, undefined, metadata);
  }

  debug(message: string, context?: Partial<LogContext>, metadata?: any) {
    this.log(LogLevel.DEBUG, message, context, undefined, metadata);
  }

  /**
   * Log operation timing
   */
  time(operation: string, context?: Partial<LogContext>): () => void {
    const start = Date.now();
    const operationContext = { ...context, operation };

    this.debug(`Starting operation: ${operation}`, operationContext);

    return () => {
      const duration = Date.now() - start;
      this.info(`Completed operation: ${operation}`, operationContext, { duration });
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<LogContext>): Logger {
    const childLogger = new Logger(this.service);
    childLogger.defaultContext = { ...this.defaultContext, ...additionalContext };
    childLogger.winston = this.winston;
    return childLogger;
  }

  /**
   * Log HTTP request/response
   */
  httpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: Partial<LogContext>
  ) {
    const level = statusCode >= 500 ? LogLevel.ERROR :
                  statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

    this.log(
      level,
      `HTTP ${method} ${path} - ${statusCode}`,
      { ...context, httpMethod: method, httpPath: path, httpStatus: statusCode },
      undefined,
      { duration }
    );
  }

  /**
   * Log blockchain operation
   */
  blockchainOperation(
    operation: string,
    networkName: string,
    success: boolean,
    duration?: number,
    context?: Partial<LogContext>,
    error?: any
  ) {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Blockchain ${operation} on ${networkName} - ${success ? 'SUCCESS' : 'FAILED'}`;

    this.log(
      level,
      message,
      { ...context, operation, networkName },
      error,
      duration ? { duration } : undefined
    );
  }

  /**
   * Log database operation
   */
  databaseOperation(
    operation: string,
    table: string,
    success: boolean,
    duration?: number,
    context?: Partial<LogContext>,
    error?: any
  ) {
    const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
    const message = `Database ${operation} on ${table} - ${success ? 'SUCCESS' : 'FAILED'}`;

    this.log(
      level,
      message,
      { ...context, operation, table },
      error,
      duration ? { duration } : undefined
    );
  }
}

/**
 * Create a logger instance for a service
 */
export function createLogger(service: string, level?: LogLevel): Logger {
  const logLevel = level ||
    (process.env.LOG_LEVEL as LogLevel) ||
    (process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO);

  return new Logger(service, logLevel);
}

/**
 * Global logger for shared utilities
 */
export const globalLogger = createLogger('shared');