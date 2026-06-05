/**
 * Switchboard Service Error Classes
 *
 * Provides structured error handling across all services
 */

export enum ErrorCode {
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',

  // Service-specific errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  SOLANA_PROGRAM_ERROR = 'SOLANA_PROGRAM_ERROR',

  // Oracle Service errors
  RPC_CONNECTION_ERROR = 'RPC_CONNECTION_ERROR',
  CHAIN_SYNC_ERROR = 'CHAIN_SYNC_ERROR',
  STATE_VERIFICATION_ERROR = 'STATE_VERIFICATION_ERROR',

  // API Service errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  DEPLOYMENT_ERROR = 'DEPLOYMENT_ERROR',
  TRACKING_ERROR = 'TRACKING_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Network and timeout errors
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',

  // Billing Service errors
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  SUBSCRIPTION_ERROR = 'SUBSCRIPTION_ERROR',
  USAGE_CALCULATION_ERROR = 'USAGE_CALCULATION_ERROR'
}

export class ServiceError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly service: string;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    details?: any,
    service: string = 'unknown'
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.service = service;

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ServiceError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      service: this.service,
      stack: this.stack
    };
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: any, service: string = 'unknown') {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details, service);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends ServiceError {
  constructor(message: string, details?: any, service: string = 'unknown') {
    super(message, ErrorCode.DATABASE_ERROR, 500, details, service);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends ServiceError {
  constructor(message: string, details?: any, service: string = 'unknown') {
    super(message, ErrorCode.EXTERNAL_SERVICE_ERROR, 502, details, service);
    this.name = 'ExternalServiceError';
  }
}

export class BlockchainError extends ServiceError {
  constructor(message: string, details?: any, service: string = 'unknown') {
    super(message, ErrorCode.BLOCKCHAIN_ERROR, 503, details, service);
    this.name = 'BlockchainError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string, details?: any, service: string = 'unknown') {
    super(message, ErrorCode.NOT_FOUND, 404, details, service);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message: string, details?: any, service: string = 'unknown') {
    super(message, ErrorCode.UNAUTHORIZED, 401, details, service);
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends ServiceError {
  constructor(message: string, details?: any, service: string = 'unknown') {
    super(message, ErrorCode.RATE_LIMITED, 429, details, service);
    this.name = 'RateLimitError';
  }
}

/**
 * Utility function to check if an error is a ServiceError
 */
export function isServiceError(error: any): error is ServiceError {
  return error instanceof ServiceError;
}

/**
 * Utility function to convert any error to a ServiceError
 */
export function toServiceError(
  error: any,
  service: string = 'unknown',
  fallbackCode: ErrorCode = ErrorCode.INTERNAL_ERROR
): ServiceError {
  if (isServiceError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ServiceError(
      error.message,
      fallbackCode,
      500,
      { originalError: error.name, stack: error.stack },
      service
    );
  }

  return new ServiceError(
    'Unknown error occurred',
    fallbackCode,
    500,
    { originalError: error },
    service
  );
}