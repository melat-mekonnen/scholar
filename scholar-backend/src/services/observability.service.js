const crypto = require("crypto");

class ObservabilityService {
  constructor() {
    this.traces = [];
    this.MAX_TRACES = 500;
    
    // Running global counters since server start
    this.metrics = {
      totalRequests: 0,
      total2xx: 0,
      total4xx: 0,
      total5xx: 0,
      aiRequests: 0,
      mlRequestCount: 0,
      mlPredictionCount: 0,
      mlPredictionLatencyMs: 0,
      mlFallbacks: 0,
      mlConfidenceSum: 0,
      activeModelVersion: "unknown",
      rateLimitHits: 0,
      authRequests: 0,
      guestRequests: 0,
      startTime: Date.now(),
    };
  }

  addTrace(trace) {
    this.traces.push(trace);
    
    // Maintain rolling buffer FIFO
    if (this.traces.length > this.MAX_TRACES) {
      this.traces.shift();
    }

    // Update global metrics
    this.metrics.totalRequests++;
    
    if (trace.statusCode >= 200 && trace.statusCode < 300) {
      this.metrics.total2xx++;
    } else if (trace.statusCode >= 400 && trace.statusCode < 500) {
      this.metrics.total4xx++;
      if (trace.statusCode === 429) {
        this.metrics.rateLimitHits++;
      }
    } else if (trace.statusCode >= 500) {
      this.metrics.total5xx++;
    }

    if (trace.userId) {
      this.metrics.authRequests++;
    } else {
      this.metrics.guestRequests++;
    }

    if (trace.endpoint.includes("/api/recommendations") || trace.endpoint.includes("/api/discovery/ai")) {
      this.metrics.aiRequests++;
    }
  }

  recordMlRecommendation({ success, latencyMs, modelVersion, count, averageConfidence }) {
    this.metrics.mlRequestCount++;
    this.metrics.activeModelVersion = modelVersion || this.metrics.activeModelVersion;
    if (typeof count === "number") {
      this.metrics.mlPredictionCount += count;
    }
    if (typeof latencyMs === "number") {
      this.metrics.mlPredictionLatencyMs += latencyMs;
    }
    if (typeof averageConfidence === "number") {
      this.metrics.mlConfidenceSum += averageConfidence * (count || 1);
    }
    if (!success) {
      this.metrics.mlFallbacks++;
    }
  }

  recordMlFallback() {
    this.metrics.mlFallbacks++;
  }

  getMetrics() {
    // Compute dynamic metrics from current buffer for latency/slowest endpoints
    let totalLatency = 0;
    const endpointStats = {}; // { endpoint: { count, totalTime, maxTime } }

    for (const trace of this.traces) {
      totalLatency += trace.responseTimeMs;

      if (!endpointStats[trace.endpoint]) {
        endpointStats[trace.endpoint] = { count: 0, totalTime: 0, maxTime: 0 };
      }
      endpointStats[trace.endpoint].count++;
      endpointStats[trace.endpoint].totalTime += trace.responseTimeMs;
      if (trace.responseTimeMs > endpointStats[trace.endpoint].maxTime) {
        endpointStats[trace.endpoint].maxTime = trace.responseTimeMs;
      }
    }

    const avgResponseTime = this.traces.length > 0 ? (totalLatency / this.traces.length).toFixed(2) : 0;

    // Identify slowest endpoints (top 5 by average time)
    const slowestEndpoints = Object.keys(endpointStats)
      .map((ep) => ({
        endpoint: ep,
        avgTime: (endpointStats[ep].totalTime / endpointStats[ep].count).toFixed(2),
        maxTime: endpointStats[ep].maxTime,
        count: endpointStats[ep].count,
      }))
      .sort((a, b) => parseFloat(b.avgTime) - parseFloat(a.avgTime))
      .slice(0, 5);

    // Calculate system status
    // Warning: > 5% error rate or > 500ms avg response. Critical: > 10% error rate or > 1000ms avg.
    let systemStatus = "Healthy";
    const errorRate = this.metrics.totalRequests > 0 
      ? ((this.metrics.total4xx + this.metrics.total5xx) / this.metrics.totalRequests) * 100 
      : 0;

    if (errorRate > 10 || parseFloat(avgResponseTime) > 1000) {
      systemStatus = "Critical";
    } else if (errorRate > 5 || parseFloat(avgResponseTime) > 500) {
      systemStatus = "Warning";
    }

    const averageMlLatency = this.metrics.mlRequestCount > 0 ? Number((this.metrics.mlPredictionLatencyMs / this.metrics.mlRequestCount).toFixed(2)) : 0;
    const averageMlConfidence = this.metrics.mlPredictionCount > 0 ? Number((this.metrics.mlConfidenceSum / this.metrics.mlPredictionCount).toFixed(4)) : 0;

    return {
      ...this.metrics,
      uptimeSeconds: Math.floor((Date.now() - this.metrics.startTime) / 1000),
      avgResponseTime: parseFloat(avgResponseTime),
      slowestEndpoints,
      systemStatus,
      errorRate: parseFloat(errorRate.toFixed(2)),
      bufferSize: this.traces.length,
      averageMlLatency,
      averageMlConfidence,
      mlFallbackRate: this.metrics.mlRequestCount > 0 ? Number(((this.metrics.mlFallbacks / this.metrics.mlRequestCount) * 100).toFixed(2)) : 0,
    };
  }

  getTraces(filters = {}) {
    let filtered = this.traces;

    if (filters.role && filters.role !== 'all') {
      filtered = filtered.filter(t => t.userRole === filters.role);
    }
    
    if (filters.endpoint) {
      filtered = filtered.filter(t => t.endpoint.includes(filters.endpoint));
    }

    if (filters.status) {
      filtered = filtered.filter(t => t.statusCode.toString().startsWith(filters.status[0]));
    }

    if (filters.errorsOnly === 'true') {
      filtered = filtered.filter(t => t.errorFlag);
    }

    // Return newest first
    return [...filtered].reverse();
  }
}

// Export a singleton instance
module.exports = new ObservabilityService();
