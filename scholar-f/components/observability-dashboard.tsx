"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Clock, ServerCrash, Zap, Filter, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle, ShieldX, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { apiFetchJson } from "@/lib/api";

interface Metrics {
  totalRequests: number;
  total2xx: number;
  total4xx: number;
  total5xx: number;
  aiRequests: number;
  rateLimitHits: number;
  authRequests: number;
  guestRequests: number;
  uptimeSeconds: number;
  avgResponseTime: number;
  slowestEndpoints: { endpoint: string; avgTime: string; maxTime: number; count: number }[];
  systemStatus: "Healthy" | "Warning" | "Critical";
  errorRate: number;
  bufferSize: number;
}

interface Trace {
  requestId: string;
  timestamp: string;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTimeMs: number;
  userRole: string;
  userId: string | null;
  planType: string;
  ipHash: string;
  errorFlag: boolean;
}

export function ObservabilityDashboard({ apiPathBase }: { apiPathBase: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [endpointFilter, setEndpointFilter] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [metricsData, tracesData] = await Promise.all([
        apiFetchJson<{ success: boolean; metrics: Metrics }>(`${apiPathBase}/observability/metrics`),
        apiFetchJson<{ success: boolean; traces: Trace[] }>(`${apiPathBase}/observability/traces?role=${roleFilter}&endpoint=${encodeURIComponent(endpointFilter)}&errorsOnly=${errorsOnly}`)
      ]);
      
      if (metricsData.data?.success) {
        setMetrics(metricsData.data.metrics);
      }
      
      if (tracesData.data?.success) {
        setTraces(tracesData.data.traces);
      }
    } catch (error) {
      console.error("Failed to fetch observability data", error);
    } finally {
      setLoading(false);
    }
  }, [apiPathBase, roleFilter, endpointFilter, errorsOnly]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 5000); // Auto-refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [fetchData]);

  const StatusIcon = {
    Healthy: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    Warning: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
    Critical: <ServerCrash className="h-6 w-6 text-red-500" />
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="System Observability" description="Real-time lightweight performance and trace monitoring" />
        
        <div className="flex items-center gap-4">
          {metrics && (
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              {StatusIcon[metrics.systemStatus]}
              <div>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">System Status</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{metrics.systemStatus}</p>
              </div>
            </div>
          )}
          <button 
            onClick={fetchData}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <h3 className="text-sm font-medium">Total Requests</h3>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{metrics.totalRequests.toLocaleString()}</p>
            <div className="mt-2 text-xs text-zinc-500 flex gap-2">
              <span className="text-green-600 font-medium">{metrics.total2xx} 2xx</span>
              <span className="text-yellow-600 font-medium">{metrics.total4xx} 4xx</span>
              <span className="text-red-600 font-medium">{metrics.total5xx} 5xx</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Clock className="h-5 w-5 text-indigo-500" />
              <h3 className="text-sm font-medium">Avg Response Time</h3>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{metrics.avgResponseTime}ms</p>
            <p className="mt-2 text-xs text-zinc-500">Based on last {metrics.bufferSize} requests</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-medium">AI & Rate Limits</h3>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{metrics.aiRequests}</p>
                <p className="text-xs text-zinc-500 mt-1">AI Requests</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-red-500">{metrics.rateLimitHits}</p>
                <p className="text-xs text-zinc-500 mt-1">Rate Limit Hits</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h3 className="text-sm font-medium">Error Rate</h3>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{metrics.errorRate}%</p>
            <div className="mt-2 text-xs text-zinc-500">
              Uptime: {Math.floor(metrics.uptimeSeconds / 60)}m {metrics.uptimeSeconds % 60}s
            </div>
          </div>
        </div>
      )}

      {/* Slowest Endpoints */}
      {metrics && metrics.slowestEndpoints.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Slowest Endpoints</h3>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-4">
              {metrics.slowestEndpoints.map((ep, i) => (
                <div key={i} className="flex-1 min-w-[200px] bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate" title={ep.endpoint}>{ep.endpoint}</p>
                  <div className="mt-2 flex justify-between items-end">
                    <p className="text-sm font-semibold text-amber-600">{ep.avgTime}ms avg</p>
                    <p className="text-xs text-zinc-500">{ep.count} reqs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Request Traces */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Live Trace Viewer
          </h3>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter endpoint..."
                value={endpointFilter}
                onChange={(e) => setEndpointFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              />
            </div>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            >
              <option value="all">All Roles</option>
              <option value="guest">Guest</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
              <option value="university_representative">University Rep</option>
            </select>
            
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={errorsOnly}
                onChange={(e) => setErrorsOnly(e.target.checked)}
                className="rounded border-zinc-300 text-red-600 focus:ring-red-600/20"
              />
              Errors Only
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 uppercase sticky top-0 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Method</th>
                <th className="px-6 py-3 font-medium">Endpoint</th>
                <th className="px-6 py-3 font-medium text-right">Time</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">IP Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {traces.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                    No traces match your filters or buffer is empty.
                  </td>
                </tr>
              ) : (
                traces.map((trace) => (
                  <tr 
                    key={trace.requestId} 
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                      trace.errorFlag ? 'bg-red-50/30 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-6 py-3 text-zinc-500 font-mono text-xs whitespace-nowrap">
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trace.statusCode >= 500 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        trace.statusCode >= 400 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        trace.statusCode >= 300 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {trace.statusCode}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {trace.method}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400 break-all max-w-md">
                      {trace.endpoint}
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${
                      trace.responseTimeMs > 500 ? 'text-amber-600' : 'text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {trace.responseTimeMs}ms
                    </td>
                    <td className="px-6 py-3">
                      <span className="capitalize text-zinc-600 dark:text-zinc-400">
                        {trace.userRole.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-zinc-500">
                      {trace.ipHash}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
