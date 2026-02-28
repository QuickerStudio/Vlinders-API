import type { KVNamespace } from '@cloudflare/workers-types';

export interface TelemetryMetrics {
  requests: {
    total: number;
    byStatus: Record<number, number>;
    byEndpoint: Record<string, number>;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  timestamp: string;
}

export interface RequestMetric {
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
  error?: string;
}

export class TelemetryService {
  private kv: KVNamespace;
  private metrics: RequestMetric[] = [];
  private readonly MAX_BUFFER_SIZE = 1000;
  private readonly AGGREGATION_INTERVAL = 300000; // 5 minutes

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async recordRequest(metric: RequestMetric): Promise<void> {
    this.metrics.push(metric);

    if (this.metrics.length >= this.MAX_BUFFER_SIZE) {
      await this.aggregate();
    }
  }

  async aggregate(): Promise<void> {
    if (this.metrics.length === 0) return;

    const metrics = [...this.metrics];
    this.metrics = [];

    const aggregated: TelemetryMetrics = {
      requests: {
        total: metrics.length,
        byStatus: {},
        byEndpoint: {},
      },
      errors: {
        total: 0,
        byType: {},
      },
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      },
      timestamp: new Date().toISOString(),
    };

    // Aggregate requests
    let totalDuration = 0;
    const durations: number[] = [];

    for (const metric of metrics) {
      // Count by status
      aggregated.requests.byStatus[metric.status] =
        (aggregated.requests.byStatus[metric.status] || 0) + 1;

      // Count by endpoint
      const endpoint = `${metric.method} ${metric.endpoint}`;
      aggregated.requests.byEndpoint[endpoint] =
        (aggregated.requests.byEndpoint[endpoint] || 0) + 1;

      // Track errors
      if (metric.error) {
        aggregated.errors.total++;
        aggregated.errors.byType[metric.error] =
          (aggregated.errors.byType[metric.error] || 0) + 1;
      }

      // Track performance
      totalDuration += metric.duration;
      durations.push(metric.duration);
    }

    // Calculate performance metrics
    aggregated.performance.avgResponseTime = totalDuration / metrics.length;

    durations.sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    aggregated.performance.p95ResponseTime = durations[p95Index] || 0;
    aggregated.performance.p99ResponseTime = durations[p99Index] || 0;

    // Store in KV
    const key = `telemetry:${Date.now()}`;
    await this.kv.put(key, JSON.stringify(aggregated), {
      expirationTtl: 86400 * 7, // 7 days
    });
  }

  async getMetrics(hours = 24): Promise<TelemetryMetrics[]> {
    const cutoff = Date.now() - (hours * 3600 * 1000);
    const list = await this.kv.list({ prefix: 'telemetry:' });

    const metrics: TelemetryMetrics[] = [];

    for (const key of list.keys) {
      const timestamp = parseInt(key.name.split(':')[1]);
      if (timestamp >= cutoff) {
        const value = await this.kv.get(key.name);
        if (value) {
          metrics.push(JSON.parse(value));
        }
      }
    }

    return metrics.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async getSummary(hours = 24): Promise<{
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    avgResponseTime: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    topErrors: Array<{ error: string; count: number }>;
  }> {
    const metrics = await this.getMetrics(hours);

    let totalRequests = 0;
    let totalErrors = 0;
    let totalDuration = 0;
    const endpointCounts: Record<string, number> = {};
    const errorCounts: Record<string, number> = {};

    for (const metric of metrics) {
      totalRequests += metric.requests.total;
      totalErrors += metric.errors.total;
      totalDuration += metric.performance.avgResponseTime * metric.requests.total;

      for (const [endpoint, count] of Object.entries(metric.requests.byEndpoint)) {
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + count;
      }

      for (const [error, count] of Object.entries(metric.errors.byType)) {
        errorCounts[error] = (errorCounts[error] || 0) + count;
      }
    }

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      avgResponseTime: totalRequests > 0 ? totalDuration / totalRequests : 0,
      topEndpoints,
      topErrors,
    };
  }
}
