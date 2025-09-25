/**
 * Main Dashboard Component
 */

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  GlobeAltIcon,
  ClockIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '@/lib/api-client';

interface DashboardStats {
  totalChains: number;
  activeDeployments: number;
  averageLatency: number;
  transactionsPerSecond: number;
  systemStatus: 'optimal' | 'degraded' | 'critical';
}

interface LatencyDataPoint {
  timestamp: string;
  latency: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalChains: 0,
    activeDeployments: 0,
    averageLatency: 0,
    transactionsPerSecond: 0,
    systemStatus: 'optimal',
  });
  const [latencyData, setLatencyData] = useState<LatencyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();

    // Set up real-time updates
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);

      // Load chains data
      const chainsData = await apiClient.getChains();

      // Load streaming metrics
      const metricsData = await apiClient.getStreamingMetrics();

      // Load recent transactions
      const transactionsData = await apiClient.getTransactions({ limit: 10 });

      // Update stats
      setStats({
        totalChains: chainsData.summary.totalChains,
        activeDeployments: metricsData.queues.coordinationQueueSize,
        averageLatency: metricsData.performance.averageLatency,
        transactionsPerSecond: metricsData.performance.eventsPerSecond,
        systemStatus: metricsData.system.performanceStatus as any,
      });

      // Update latency chart data
      setLatencyData(prev => {
        const newDataPoint: LatencyDataPoint = {
          timestamp: new Date().toLocaleTimeString(),
          latency: metricsData.performance.averageLatency,
        };

        const newData = [...prev, newDataPoint];

        // Keep only last 20 data points
        return newData.slice(-20);
      });

      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  if (loading && stats.totalChains === 0) {
    return (
      <div className="px-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Real-time cross-chain coordination overview</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(stats.systemStatus)}`}>
            System {stats.systemStatus.charAt(0).toUpperCase() + stats.systemStatus.slice(1)}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GlobeAltIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Connected Chains</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalChains}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Deployments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeDeployments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Latency</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.averageLatency.toFixed(0)}ms
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CpuChipIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Events/sec</p>
              <p className="text-2xl font-bold text-gray-900">
                {typeof stats.transactionsPerSecond === 'string'
                  ? parseFloat(stats.transactionsPerSecond).toFixed(1)
                  : stats.transactionsPerSecond.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Latency Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Real-time Latency
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            System Health
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Chain Connections</span>
              <span className={`text-sm font-semibold ${getStatusColor('optimal')}`}>
                {stats.totalChains}/6 Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Coordination Latency</span>
              <span className={`text-sm font-semibold ${
                stats.averageLatency <= 400 ? 'text-green-600' :
                stats.averageLatency <= 600 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stats.averageLatency <= 400 ? 'Optimal' :
                 stats.averageLatency <= 600 ? 'Acceptable' : 'Degraded'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Queue Status</span>
              <span className={`text-sm font-semibold ${
                stats.activeDeployments <= 10 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {stats.activeDeployments <= 10 ? 'Normal' : 'High Load'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
              <div className="ml-3">
                <p className="text-sm text-gray-900">
                  Cross-chain deployment completed on 4 chains
                </p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
              <div className="ml-3">
                <p className="text-sm text-gray-900">
                  Solana coordination latency optimized to 180ms
                </p>
                <p className="text-xs text-gray-500">5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
              <div className="ml-3">
                <p className="text-sm text-gray-900">
                  High transaction volume detected on Ethereum
                </p>
                <p className="text-xs text-gray-500">8 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}