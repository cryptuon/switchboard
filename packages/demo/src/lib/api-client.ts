/**
 * API Client for ChainSync Demo
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export interface ApiError {
  code: string;
  message: string;
  timestamp: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ChainInfo {
  name: string;
  rpcUrl: string;
  chainId: number;
  status: 'healthy' | 'degraded' | 'offline';
  isStreaming: boolean;
  bufferSize: number;
  lastSyncedBlock: number;
}

export interface StreamingMetrics {
  totalEvents: number;
  eventsPerSecond: string;
  latencyStatus: 'optimal' | 'acceptable' | 'degraded';
  coordinationQueueSize: number;
}

export interface DeploymentResult {
  deploymentId: string;
  status: 'initiated' | 'completed' | 'failed';
  chains: Array<{
    chain: string;
    currentBlock: number;
    networkHealth: string;
  }>;
  timestamp: string;
  estimatedCompletionTime: string;
  coordinationLatency: number;
}

export interface Transaction {
  id: string;
  chain: string;
  type: string;
  blockNumber: number;
  blockHash: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  transactionCount: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

class ApiClient {
  private api: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    // All requests now go through the Customer API service
    this.api = axios.create({
      baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
      timeout: 10000,
    });

    // Add request interceptors
    this.setupInterceptors(this.api);
  }

  private setupInterceptors(axiosInstance: AxiosInstance) {
    // Request interceptor to add auth token
    axiosInstance.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Response interceptor to handle errors
    axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          // Redirect to login if needed
        }
        return Promise.reject(error);
      }
    );
  }

  setAuth(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  clearAuth() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  loadAuth() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        this.accessToken = token;
      }
    }
  }

  // Authentication methods
  async register(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await this.api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/register', {
      email,
      password,
    });
    return response.data.data!;
  }

  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await this.api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', {
      email,
      password,
    });
    return response.data.data!;
  }

  // Chain and deployment methods
  async getChains(): Promise<{
    chains: ChainInfo[];
    summary: {
      totalChains: number;
      streamingChains: number;
      performanceStatus: string;
      averageLatency: string;
      coordinationTarget: string;
      lastCoordinationTime: string;
    };
  }> {
    const response = await this.api.get<ApiResponse>('/api/v1/chains');
    return response.data.data!;
  }

  async deployContract(chains: string[], contractCode: string): Promise<DeploymentResult> {
    const response = await this.api.post<ApiResponse<DeploymentResult>>('/api/v1/deploy', {
      chains,
      contractCode,
    });
    return response.data.data!;
  }

  async getDeploymentStatus(deploymentId: string): Promise<{
    deploymentId: string;
    status: string;
    chains: Array<{
      name: string;
      status: string;
      lastBlock: number;
      latency: string;
    }>;
    performance: {
      totalChains: number;
      streamingChains: number;
      latencyStatus: string;
      coordinationTime: string;
    };
  }> {
    const response = await this.api.get<ApiResponse>(`/api/v1/deploy/${deploymentId}/status`);
    return response.data.data!;
  }

  async getTransactions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    chain?: string;
  }): Promise<{
    data: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    streaming: StreamingMetrics;
  }> {
    const response = await this.api.get<ApiResponse>('/api/v1/transactions', { params });
    return response.data.data!;
  }

  async getStreamingMetrics(): Promise<{
    performance: {
      totalEvents: number;
      eventsPerSecond: number;
      averageLatency: number;
      coordinationTime: number;
      latencyStatus: string;
    };
    system: {
      totalChains: number;
      streamingChains: number;
      performanceStatus: string;
      solanaConnectionStatus: boolean;
    };
    queues: {
      coordinationQueueSize: number;
      bufferSizes: { [chain: string]: number };
    };
    timestamp: string;
  }> {
    const response = await this.api.get<ApiResponse>('/api/v1/metrics/streaming');
    return response.data.data!;
  }

  // Health and info methods
  async getApiHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    checks: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      message: string;
    }>;
  }> {
    const response = await this.api.get<ApiResponse>('/health');
    return response.data.data || response.data;
  }

  async getCoreEngineHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
  }> {
    // Get health check from Core Engine through Customer API
    const response = await this.api.get<ApiResponse>('/api/v1/core-engine/health');
    return response.data.data || response.data;
  }

  // Billing methods
  async getPlans(): Promise<Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
  }>> {
    // Billing requests now go through Customer API
    const response = await this.api.get<ApiResponse>('/api/v1/billing/plans');
    return response.data.data!;
  }

  async createCustomer(userId: string, email: string, name?: string): Promise<{
    id: string;
    stripeCustomerId: string;
    email: string;
    name?: string;
    createdAt: string;
  }> {
    // Billing requests now go through Customer API
    const response = await this.api.post<ApiResponse>('/api/v1/billing/customers', {
      userId,
      email,
      name,
    });
    return response.data.data!;
  }

  async createSubscription(customerId: string, planId: string): Promise<{
    id: string;
    stripeSubscriptionId: string;
    planId: string;
    status: string;
    clientSecret?: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    createdAt: string;
  }> {
    // Billing requests now go through Customer API
    const response = await this.api.post<ApiResponse>('/api/v1/billing/subscriptions', {
      customerId,
      planId,
    });
    return response.data.data!;
  }
}

export const apiClient = new ApiClient();