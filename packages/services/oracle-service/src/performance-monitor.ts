/**
 * ChainSync Performance Monitor
 *
 * Real-time monitoring dashboard for streaming oracle performance
 * Tracks sub-400ms coordination target compliance
 */

import { StreamingStateOracle } from './streaming-state-oracle';
import { SolanaIntegration } from './solana-integration';

interface PerformanceSnapshot {
  timestamp: number;
  streamingMetrics: any;
  solanaMetrics: any;
  systemStatus: any;
  latencyCompliance: {
    target: number;
    actual: number;
    compliance: boolean;
    deviation: number;
  };
}

export class PerformanceMonitor {
  private oracle: StreamingStateOracle;
  private isMonitoring: boolean = false;
  private snapshots: PerformanceSnapshot[] = [];
  private maxSnapshots: number = 100;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(oracle: StreamingStateOracle) {
    this.oracle = oracle;
  }

  /**
   * Start real-time performance monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      console.warn('⚠️ Performance monitoring already active');
      return;
    }

    console.log('📊 Starting real-time performance monitoring...');
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.capturePerformanceSnapshot();
        this.displayRealTimeDashboard();
      } catch (error) {
        console.error('❌ Performance monitoring error:', error);
      }
    }, intervalMs);

    console.log('✅ Performance monitoring active');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.isMonitoring = false;
    console.log('⏹️ Performance monitoring stopped');
  }

  /**
   * Capture current performance snapshot
   */
  private async capturePerformanceSnapshot(): Promise<PerformanceSnapshot> {
    const streamingMetrics = this.oracle.getStreamingMetrics();
    const systemStatus = await this.oracle.getSystemStatus();

    // Get Solana metrics if available
    let solanaMetrics = null;
    try {
      const solanaIntegration = (this.oracle as any).solanaIntegration as SolanaIntegration;
      if (solanaIntegration) {
        solanaMetrics = solanaIntegration.getCoordinationMetrics();
      }
    } catch (error) {
      // Solana metrics not available
    }

    const target = this.oracle.getConfig().coordinationLatencyTarget;
    const actual = streamingMetrics.averageLatency;

    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      streamingMetrics,
      solanaMetrics,
      systemStatus,
      latencyCompliance: {
        target,
        actual,
        compliance: actual <= target,
        deviation: actual - target
      }
    };

    // Add to snapshots and trim if needed
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Display real-time dashboard in console
   */
  private displayRealTimeDashboard(): void {
    const latest = this.snapshots[this.snapshots.length - 1];
    if (!latest) return;

    // Clear console for live dashboard effect
    console.clear();

    console.log('🚀 ChainSync Real-time Performance Dashboard');
    console.log('═'.repeat(60));
    console.log(`📅 ${new Date(latest.timestamp).toLocaleTimeString()}`);
    console.log('');

    // Latency Performance
    console.log('⚡ LATENCY PERFORMANCE');
    console.log('─'.repeat(30));
    const { latencyCompliance } = latest;
    const complianceStatus = latencyCompliance.compliance ? '✅ COMPLIANT' : '❌ EXCEEDED';
    const complianceColor = latencyCompliance.compliance ? '' : '';

    console.log(`Target Latency:    ${latencyCompliance.target}ms`);
    console.log(`Actual Latency:    ${latencyCompliance.actual.toFixed(0)}ms`);
    console.log(`Status:            ${complianceStatus}`);
    if (latencyCompliance.deviation > 0) {
      console.log(`Deviation:         +${latencyCompliance.deviation.toFixed(0)}ms`);
    }
    console.log('');

    // Streaming Metrics
    console.log('🌊 STREAMING METRICS');
    console.log('─'.repeat(30));
    const { streamingMetrics } = latest;
    console.log(`Events/sec:        ${streamingMetrics.eventsPerSecond.toFixed(2)}`);
    console.log(`Total Events:      ${streamingMetrics.totalEvents.toLocaleString()}`);
    console.log(`Active Streams:    ${streamingMetrics.healthyStreams}/${streamingMetrics.totalStreams}`);
    console.log(`Queue Size:        ${streamingMetrics.coordinationQueueSize}`);
    console.log(`Status:            ${streamingMetrics.latencyStatus.toUpperCase()}`);
    console.log('');

    // Solana Coordination
    if (latest.solanaMetrics) {
      console.log('☀️ SOLANA COORDINATION');
      console.log('─'.repeat(30));
      const { solanaMetrics } = latest;
      console.log(`Coordination Avg:  ${solanaMetrics.averageLatency.toFixed(0)}ms`);
      console.log(`Success Rate:      ${solanaMetrics.successRate.toFixed(1)}%`);
      console.log(`Total Coords:      ${solanaMetrics.totalCoordinations.toLocaleString()}`);
      console.log(`Performance:       ${solanaMetrics.performanceStatus.toUpperCase()}`);
      console.log('');
    }

    // System Status
    console.log('🏥 SYSTEM HEALTH');
    console.log('─'.repeat(30));
    const { systemStatus } = latest;
    console.log(`Connected Chains:  ${systemStatus.connectedChains.join(', ')}`);
    console.log(`Streaming Chains:  ${systemStatus.streamingChains}/${systemStatus.totalChains}`);
    console.log(`Solana Status:     ${systemStatus.solanaConnectionStatus ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`Performance:       ${systemStatus.performanceStatus.toUpperCase()}`);
    console.log('');

    // Performance History (last 10 snapshots)
    if (this.snapshots.length >= 2) {
      console.log('📈 LATENCY TREND (Last 10 snapshots)');
      console.log('─'.repeat(30));
      const recentSnapshots = this.snapshots.slice(-10);
      const latencyTrend = recentSnapshots.map(s => s.latencyCompliance.actual.toFixed(0));
      console.log(`${latencyTrend.join('ms → ')}ms`);

      const avgLatency = recentSnapshots.reduce((sum, s) => sum + s.latencyCompliance.actual, 0) / recentSnapshots.length;
      const trendDirection = avgLatency > latest.latencyCompliance.actual ? '📉 Improving' : '📈 Degrading';
      console.log(`Trend: ${trendDirection} (Avg: ${avgLatency.toFixed(0)}ms)`);
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('Press Ctrl+C to stop monitoring');
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: any;
    complianceRate: number;
    averageLatency: number;
    performanceTrend: 'improving' | 'stable' | 'degrading';
  } {
    if (this.snapshots.length === 0) {
      throw new Error('No performance data available');
    }

    const compliantSnapshots = this.snapshots.filter(s => s.latencyCompliance.compliance);
    const complianceRate = (compliantSnapshots.length / this.snapshots.length) * 100;

    const totalLatency = this.snapshots.reduce((sum, s) => sum + s.latencyCompliance.actual, 0);
    const averageLatency = totalLatency / this.snapshots.length;

    // Determine trend (compare first half vs second half)
    const midpoint = Math.floor(this.snapshots.length / 2);
    const firstHalf = this.snapshots.slice(0, midpoint);
    const secondHalf = this.snapshots.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.latencyCompliance.actual, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.latencyCompliance.actual, 0) / secondHalf.length;

    const performanceTrend =
      secondHalfAvg < firstHalfAvg * 0.95 ? 'improving' :
      secondHalfAvg > firstHalfAvg * 1.05 ? 'degrading' : 'stable';

    return {
      summary: {
        totalSnapshots: this.snapshots.length,
        timespan: this.snapshots.length > 0 ?
          this.snapshots[this.snapshots.length - 1].timestamp - this.snapshots[0].timestamp : 0,
        complianceRate,
        averageLatency,
        performanceTrend
      },
      complianceRate,
      averageLatency,
      performanceTrend
    };
  }

  /**
   * Export performance data for analysis
   */
  exportData(): PerformanceSnapshot[] {
    return [...this.snapshots];
  }
}