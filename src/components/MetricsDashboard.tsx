import { useMetricStream } from '../hooks/useMetricStream';
import { MetricChart } from './MetricChart';
import { AnomalyFeed } from './AnomalyFeed';
import type { MetricConfig, MetricName, Anomaly } from '../types';

const METRIC_CONFIGS: Record<MetricName, MetricConfig> = {
  p95_latency: {
    name: 'p95_latency',
    label: 'P95 Latency',
    unit: 'ms',
    baseline: 120,
    noise: 8,
    min: 1,
  },
  error_rate: {
    name: 'error_rate',
    label: 'Error Rate',
    unit: '%',
    baseline: 0.02,
    noise: 0.005,
    min: 0,
    max: 1,
  },
  throughput: {
    name: 'throughput',
    label: 'Throughput',
    unit: 'req/s',
    baseline: 850,
    noise: 30,
    min: 0,
  },
};

const METRIC_LABELS: Record<MetricName, string> = {
  p95_latency: 'P95 Latency',
  error_rate: 'Error Rate',
  throughput: 'Throughput',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface SystemStatusBarProps {
  hasAnomaly: boolean;
  offendingMetric: MetricName | null;
  latestAnomaly: Anomaly | null;
}

function SystemStatusBar({ hasAnomaly, offendingMetric, latestAnomaly }: SystemStatusBarProps): JSX.Element {
  return (
    <div
      className={`flex items-center gap-3 px-4 sm:px-8 h-11 flex-shrink-0 border-b transition-colors duration-300 ${
        hasAnomaly
          ? 'bg-brand/15 border-brand/40'
          : 'bg-ok/10 border-ok/25'
      }`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="system-status-bar"
    >
      {/* Status indicator dot */}
      <div className="relative flex-shrink-0" aria-hidden="true">
        <div
          className={`w-2.5 h-2.5 rounded-full ${hasAnomaly ? 'bg-brand' : 'bg-ok'}`}
        />
        {hasAnomaly && (
          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-brand animate-ping opacity-60" />
        )}
      </div>

      {/* Status text */}
      <span
        className={`text-[13px] font-semibold tracking-tight ${
          hasAnomaly ? 'text-brand-300' : 'text-ok'
        }`}
      >
        {hasAnomaly
          ? offendingMetric
            ? `${METRIC_LABELS[offendingMetric]} anomaly detected`
            : 'Anomaly detected'
          : 'All Clear'}
      </span>

      {/* Metric name + timestamp on the right when anomaly active */}
      {hasAnomaly && latestAnomaly && (
        <span className="ml-auto text-[11px] font-mono text-brand-400/80 tabular-nums">
          {formatTime(latestAnomaly.timestamp)}
        </span>
      )}

      {/* "Monitoring" badge when all clear */}
      {!hasAnomaly && (
        <span className="ml-auto text-[11px] font-mono text-ok/60 uppercase tracking-wider">
          Monitoring
        </span>
      )}
    </div>
  );
}

export function MetricsDashboard(): JSX.Element {
  const { streams, anomalies, clearAnomalies, injectSpike } = useMetricStream(500);

  // Find which metrics currently have anomalies
  const anomalyMetrics = (Object.keys(streams) as MetricName[]).filter(
    (key) => streams[key].isAnomaly
  );
  const hasAnomaly = anomalyMetrics.length > 0;
  const offendingMetric: MetricName | null = hasAnomaly ? anomalyMetrics[0] : null;
  const latestAnomaly: Anomaly | null = anomalies.length > 0 ? anomalies[0] : null;

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col">
      {/* System Status Bar — full-width, always visible */}
      <SystemStatusBar
        hasAnomaly={hasAnomaly}
        offendingMetric={offendingMetric}
        latestAnomaly={latestAnomaly}
      />

      {/* Header */}
      <header className="border-b border-surface-border px-4 sm:px-8 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo mark — a pulse/heartbeat icon in brand color */}
          <div className="flex items-center gap-2.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M2 12h4l2-7 4 14 2-7h8"
                stroke="#C7452E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-[15px] font-bold text-ink tracking-tight">
              Pulsewatch
            </h1>
          </div>
          <span className="hidden sm:inline text-[13px] text-ink-muted">
            Real-time anomaly detection
          </span>
        </div>
        <button
          type="button"
          onClick={injectSpike}
          className="text-[13px] font-medium px-3.5 py-1.5 rounded-lg bg-brand/10 text-brand-300 border border-brand/25 hover:bg-brand/20 hover:border-brand/40 active:scale-[0.97] transition-all duration-200 min-h-[36px]"
          aria-label="Inject a latency spike to test anomaly detection"
        >
          Inject Spike
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 sm:p-6 lg:p-8 lg:gap-6">
        {/* Charts */}
        <div className="flex-1 flex flex-col gap-4 lg:gap-5 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {(Object.keys(METRIC_CONFIGS) as MetricName[]).map(
              (key) => (
                <MetricChart
                  key={key}
                  config={METRIC_CONFIGS[key]}
                  state={streams[key]}
                />
              )
            )}
          </div>
        </div>

        {/* Anomaly Feed */}
        <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0">
          <AnomalyFeed anomalies={anomalies} onClear={clearAnomalies} />
        </aside>
      </main>
    </div>
  );
}

export default MetricsDashboard;
