/**
 * Switchboard HTTP Client
 *
 * HTTP client with retry, circuit breaker, and metrics
 */

import { Logger } from '../logging/logger';
import { ServiceError, ErrorCode } from '../errors/service-errors';
import { RetryManager, CircuitBreaker, CircuitBreakerConfig } from '../retry/retry-manager';
import { MetricsCollector } from '../metrics/metrics-collector';

export interface HttpClientConfig {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  circuitBreakerConfig?: CircuitBreakerConfig;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  body?: any;
  query?: Record<string, any>;
  validateStatus?: (status: number) => boolean;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestOptions;
}

export class HttpClient {
  private readonly config: HttpClientConfig;
  private readonly logger: Logger;
  private readonly retryManager: RetryManager;
  private readonly circuitBreaker?: CircuitBreaker;
  private readonly metricsCollector?: MetricsCollector;
  private readonly serviceName: string;

  constructor(
    config: HttpClientConfig,
    serviceName: string,
    logger: Logger,
    retryManager: RetryManager,
    metricsCollector?: MetricsCollector
  ) {
    this.config = config;
    this.serviceName = serviceName;
    this.logger = logger;
    this.retryManager = retryManager;
    this.metricsCollector = metricsCollector;

    if (config.circuitBreakerConfig) {
      this.circuitBreaker = new CircuitBreaker(logger, config.circuitBreakerConfig);
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, body?: any, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, body?: any, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, body?: any, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PATCH', body });
  }

  /**
   * Generic request method
   */
  async request<T = any>(url: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const requestConfig = this.buildRequestConfig(options);

    const operationName = `${options.method || 'GET'} ${url}`;
    const timer = this.metricsCollector?.createTimer();

    this.logger.debug('Making HTTP request', {
      method: requestConfig.method,
      url: fullUrl,
      headers: this.sanitizeHeaders(requestConfig.headers || {})
    });

    try {
      const operation = () => this.executeRequest<T>(fullUrl, requestConfig);

      const response = this.circuitBreaker
        ? await this.circuitBreaker.execute(operation, operationName)
        : await this.retryManager.withRetry(operation, operationName);

      this.metricsCollector?.recordHttpRequest(
        requestConfig.method || 'GET',
        url,
        response.status,
        timer?.() || 0
      );

      this.logger.debug('HTTP request completed', {
        method: requestConfig.method,
        url: fullUrl,
        status: response.status,
        duration: timer?.() || 0
      });

      return response;

    } catch (error) {
      const statusCode = (error as any).status || 0;
      this.metricsCollector?.recordHttpRequest(
        requestConfig.method || 'GET',
        url,
        statusCode,
        timer?.() || 0
      );

      this.logger.error('HTTP request failed', error, {
        method: requestConfig.method,
        url: fullUrl,
        status: statusCode
      });

      throw this.transformError(error, operationName);
    }
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(url: string, config: RequestOptions): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeout = config.timeout || this.config.timeout || 30000;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const requestInit: RequestInit = {
        method: config.method || 'GET',
        headers: config.headers,
        signal: controller.signal
      };

      if (config.body) {
        if (typeof config.body === 'object') {
          requestInit.body = JSON.stringify(config.body);
          requestInit.headers = {
            ...requestInit.headers,
            'Content-Type': 'application/json'
          };
        } else {
          requestInit.body = config.body;
        }
      }

      const response = await fetch(url, requestInit);

      // Validate status code
      const validateStatus = config.validateStatus || ((status: number) => status >= 200 && status < 300);
      if (!validateStatus(response.status)) {
        throw new ServiceError(
          `HTTP ${response.status}: ${response.statusText}`,
          this.getErrorCodeFromStatus(response.status),
          response.status,
          { url, method: config.method },
          this.serviceName
        );
      }

      // Parse response
      const contentType = response.headers.get('content-type') || '';
      let data: T;

      if (contentType.includes('application/json')) {
        data = await response.json() as T;
      } else if (contentType.includes('text/')) {
        data = await response.text() as any;
      } else {
        data = await response.arrayBuffer() as any;
      }

      // Convert headers to object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers,
        config
      };

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build full URL
   */
  private buildUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    const baseUrl = this.config.baseUrl || '';
    const separator = baseUrl.endsWith('/') || url.startsWith('/') ? '' : '/';

    return `${baseUrl}${separator}${url}`;
  }

  /**
   * Build request configuration
   */
  private buildRequestConfig(options: RequestOptions): RequestOptions {
    const headers = {
      ...this.config.defaultHeaders,
      ...options.headers
    };

    // Add query parameters to URL if provided
    if (options.query) {
      // This would normally be handled in buildUrl, but simplified here
    }

    return {
      ...options,
      headers,
      timeout: options.timeout || this.config.timeout,
      retries: options.retries !== undefined ? options.retries : this.config.maxRetries
    };
  }

  /**
   * Transform fetch errors to ServiceError
   */
  private transformError(error: any, operationName: string): ServiceError {
    if (error instanceof ServiceError) {
      return error;
    }

    if (error.name === 'AbortError') {
      return new ServiceError(
        'Request timeout',
        ErrorCode.TIMEOUT,
        408,
        { originalError: error, operation: operationName },
        this.serviceName
      );
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new ServiceError(
        'Network error',
        ErrorCode.NETWORK_ERROR,
        503,
        { originalError: error, operation: operationName },
        this.serviceName
      );
    }

    return new ServiceError(
      `HTTP client error: ${error.message}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      500,
      { originalError: error, operation: operationName },
      this.serviceName
    );
  }

  /**
   * Get error code from HTTP status
   */
  private getErrorCodeFromStatus(status: number): ErrorCode {
    if (status >= 400 && status < 500) {
      switch (status) {
        case 400: return ErrorCode.VALIDATION_ERROR;
        case 401: return ErrorCode.AUTHENTICATION_ERROR;
        case 403: return ErrorCode.AUTHORIZATION_ERROR;
        case 404: return ErrorCode.NOT_FOUND;
        case 408: return ErrorCode.TIMEOUT;
        case 429: return ErrorCode.RATE_LIMITED;
        default: return ErrorCode.VALIDATION_ERROR;
      }
    }

    if (status >= 500) {
      return ErrorCode.EXTERNAL_SERVICE_ERROR;
    }

    return ErrorCode.INTERNAL_ERROR;
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get client statistics
   */
  getStats() {
    return {
      config: {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      },
      circuitBreaker: this.circuitBreaker?.getStats() || null
    };
  }
}