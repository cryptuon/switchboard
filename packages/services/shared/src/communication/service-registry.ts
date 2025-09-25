/**
 * ChainSync Service Registry
 *
 * Service discovery and registration
 */

import { EventEmitter } from 'events';
import { Logger } from '../logging/logger';
import { ServiceError, ErrorCode } from '../errors/service-errors';

export interface ServiceRegistration {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastHeartbeat: Date;
  metadata: {
    environment: string;
    tags: string[];
    capabilities: string[];
    [key: string]: any;
  };
  endpoints: {
    health: string;
    metrics: string;
    [key: string]: string;
  };
}

export interface ServiceQuery {
  name?: string;
  version?: string;
  status?: 'healthy' | 'unhealthy' | 'degraded';
  tags?: string[];
  capabilities?: string[];
}

export class ServiceRegistry extends EventEmitter {
  private services: Map<string, ServiceRegistration> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private roundRobinIndices: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  private readonly logger: Logger;
  private readonly heartbeatIntervalMs: number;
  private readonly serviceTimeoutMs: number;

  constructor(
    logger: Logger,
    heartbeatIntervalMs: number = 30000,
    serviceTimeoutMs: number = 90000
  ) {
    super();
    this.logger = logger;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.serviceTimeoutMs = serviceTimeoutMs;

    // Setup cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleServices();
    }, heartbeatIntervalMs);

    this.logger.info('Service registry initialized', {
      heartbeatIntervalMs,
      serviceTimeoutMs
    });
  }

  /**
   * Register a service
   */
  async register(registration: ServiceRegistration): Promise<void> {
    const serviceId = registration.id;

    this.logger.info('Registering service', {
      serviceId,
      name: registration.name,
      version: registration.version,
      host: registration.host,
      port: registration.port
    });

    // Validate registration
    this.validateRegistration(registration);

    // Update registration with current timestamp
    const updatedRegistration: ServiceRegistration = {
      ...registration,
      lastHeartbeat: new Date()
    };

    // Store service
    const isNewService = !this.services.has(serviceId);
    this.services.set(serviceId, updatedRegistration);

    // Setup heartbeat monitoring
    this.setupHeartbeatMonitoring(serviceId);

    // Emit events
    if (isNewService) {
      this.emit('serviceRegistered', updatedRegistration);
    } else {
      this.emit('serviceUpdated', updatedRegistration);
    }

    this.logger.debug('Service registered successfully', {
      serviceId,
      totalServices: this.services.size
    });
  }

  /**
   * Deregister a service
   */
  async deregister(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new ServiceError(
        `Service not found: ${serviceId}`,
        ErrorCode.NOT_FOUND,
        404,
        { serviceId },
        'service-registry'
      );
    }

    this.logger.info('Deregistering service', {
      serviceId,
      name: service.name
    });

    // Remove service
    this.services.delete(serviceId);

    // Clear heartbeat monitoring
    const heartbeatInterval = this.heartbeatIntervals.get(serviceId);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.heartbeatIntervals.delete(serviceId);
    }

    this.emit('serviceDeregistered', service);

    this.logger.debug('Service deregistered successfully', {
      serviceId,
      totalServices: this.services.size
    });
  }

  /**
   * Update service heartbeat
   */
  async heartbeat(serviceId: string, status?: 'healthy' | 'unhealthy' | 'degraded'): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new ServiceError(
        `Service not found: ${serviceId}`,
        ErrorCode.NOT_FOUND,
        404,
        { serviceId },
        'service-registry'
      );
    }

    const updatedService: ServiceRegistration = {
      ...service,
      status: status || service.status,
      lastHeartbeat: new Date()
    };

    this.services.set(serviceId, updatedService);

    this.logger.debug('Service heartbeat updated', {
      serviceId,
      status: updatedService.status
    });

    this.emit('serviceHeartbeat', updatedService);
  }

  /**
   * Discover services by query
   */
  discover(query: ServiceQuery = {}): ServiceRegistration[] {
    const services = Array.from(this.services.values());

    return services.filter(service => {
      // Filter by name
      if (query.name && service.name !== query.name) {
        return false;
      }

      // Filter by version
      if (query.version && service.version !== query.version) {
        return false;
      }

      // Filter by status
      if (query.status && service.status !== query.status) {
        return false;
      }

      // Filter by tags
      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(tag =>
          service.metadata.tags.includes(tag)
        );
        if (!hasAllTags) {
          return false;
        }
      }

      // Filter by capabilities
      if (query.capabilities && query.capabilities.length > 0) {
        const hasAllCapabilities = query.capabilities.every(capability =>
          service.metadata.capabilities.includes(capability)
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get a specific service by ID
   */
  getService(serviceId: string): ServiceRegistration | null {
    return this.services.get(serviceId) || null;
  }

  /**
   * Get all services
   */
  getAllServices(): ServiceRegistration[] {
    return Array.from(this.services.values());
  }

  /**
   * Get healthy services by name
   */
  getHealthyServices(serviceName: string): ServiceRegistration[] {
    return this.discover({
      name: serviceName,
      status: 'healthy'
    });
  }

  /**
   * Get service URL
   */
  getServiceUrl(serviceId: string, endpoint?: string): string | null {
    const service = this.services.get(serviceId);
    if (!service) {
      return null;
    }

    const baseUrl = `${service.protocol}://${service.host}:${service.port}`;

    if (endpoint) {
      const endpointPath = service.endpoints[endpoint];
      if (endpointPath) {
        return `${baseUrl}${endpointPath}`;
      }
    }

    return baseUrl;
  }

  /**
   * Load balance service selection
   */
  selectService(serviceName: string, strategy: 'round-robin' | 'random' = 'round-robin'): ServiceRegistration | null {
    const healthyServices = this.getHealthyServices(serviceName);

    if (healthyServices.length === 0) {
      return null;
    }

    if (healthyServices.length === 1) {
      return healthyServices[0];
    }

    switch (strategy) {
      case 'random':
        return healthyServices[Math.floor(Math.random() * healthyServices.length)];

      case 'round-robin':
      default:
        // Simple round-robin using service name as key
        const key = `rr_${serviceName}`;
        const currentIndex = this.roundRobinIndices.get(key) || 0;
        const index = currentIndex % healthyServices.length;
        this.roundRobinIndices.set(key, (currentIndex + 1) % healthyServices.length);
        return healthyServices[index];
    }
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const services = Array.from(this.services.values());
    const byStatus = services.reduce((acc, service) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byName = services.reduce((acc, service) => {
      acc[service.name] = (acc[service.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalServices: this.services.size,
      byStatus,
      byName,
      heartbeatIntervalMs: this.heartbeatIntervalMs,
      serviceTimeoutMs: this.serviceTimeoutMs
    };
  }

  /**
   * Validate service registration
   */
  private validateRegistration(registration: ServiceRegistration): void {
    const required = ['id', 'name', 'version', 'host', 'port'];
    for (const field of required) {
      if (!(registration as any)[field]) {
        throw new ServiceError(
          `Missing required field: ${field}`,
          ErrorCode.VALIDATION_ERROR,
          400,
          { field, registration },
          'service-registry'
        );
      }
    }

    if (registration.port < 1 || registration.port > 65535) {
      throw new ServiceError(
        'Port must be between 1 and 65535',
        ErrorCode.VALIDATION_ERROR,
        400,
        { port: registration.port },
        'service-registry'
      );
    }

    if (!['http', 'https'].includes(registration.protocol)) {
      throw new ServiceError(
        'Protocol must be http or https',
        ErrorCode.VALIDATION_ERROR,
        400,
        { protocol: registration.protocol },
        'service-registry'
      );
    }
  }

  /**
   * Setup heartbeat monitoring for a service
   */
  private setupHeartbeatMonitoring(serviceId: string): void {
    // Clear existing interval
    const existingInterval = this.heartbeatIntervals.get(serviceId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Setup new interval to check for stale heartbeats
    const interval = setInterval(() => {
      const service = this.services.get(serviceId);
      if (service) {
        const timeSinceHeartbeat = Date.now() - service.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > this.serviceTimeoutMs) {
          this.markServiceUnhealthy(serviceId, 'Heartbeat timeout');
        }
      }
    }, this.heartbeatIntervalMs);

    this.heartbeatIntervals.set(serviceId, interval);
  }

  /**
   * Mark service as unhealthy
   */
  private markServiceUnhealthy(serviceId: string, reason: string): void {
    const service = this.services.get(serviceId);
    if (service && service.status !== 'unhealthy') {
      const updatedService: ServiceRegistration = {
        ...service,
        status: 'unhealthy'
      };

      this.services.set(serviceId, updatedService);

      this.logger.warn('Service marked as unhealthy', {
        serviceId,
        name: service.name,
        reason
      });

      this.emit('serviceUnhealthy', updatedService);
    }
  }

  /**
   * Cleanup stale services
   */
  private cleanupStaleServices(): void {
    const now = Date.now();
    const staleServices: string[] = [];

    for (const [serviceId, service] of this.services) {
      const timeSinceHeartbeat = now - service.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > this.serviceTimeoutMs * 2) {
        staleServices.push(serviceId);
      }
    }

    if (staleServices.length > 0) {
      this.logger.info('Cleaning up stale services', {
        serviceCount: staleServices.length
      });

      for (const serviceId of staleServices) {
        try {
          this.deregister(serviceId);
        } catch (error) {
          this.logger.error('Error deregistering stale service', error, {
            serviceId
          });
        }
      }
    }
  }

  /**
   * Cleanup registry
   */
  async cleanup(): Promise<void> {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all heartbeat intervals
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();

    // Clear services
    this.services.clear();

    // Remove all listeners
    this.removeAllListeners();

    this.logger.info('Service registry cleaned up');
  }
}