import { useMemo } from 'react';
import type { Anomaly, MetricName } from '../types';

interface AnomalyFeedProps {
  anomalies: Anomaly[];
  onClear: () => void;
}

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

export function AnomalyFeed({ anomalies, onClear }: AnomalyFeedProps): JSX.Element {
  const sorted = useMemo(
    () => [...anomalies].sort((a, b) => b.timestamp - a.timestamp),
    [anomalies]
  );

  return (
    <section
      className="card-surface flex flex-col h-full max-h-[calc(100vh-7rem)] lg:sticky lg:top-6"
      aria-label="Anomaly feed"
    >
      <header className="flex items-center justify-between px-4 py-3.5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[13px] font-semibold text-ink">Anomaly Feed</h2>
          {sorted.length > 0 && (
            <span className="text-[11px] font-mono font-medium text-ink-muted bg-surface px-1.5 py-0.5 rounded-md tabular-nums">
              {sorted.length}
            </span>
          )}
        </div>
        {sorted.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] font-medium text-ink-dim hover:text-brand-300 transition-colors px-2 py-1 rounded-md hover:bg-surface min-h-[32px] min-w-[44px]"
            aria-label="Clear anomaly history"
          >
            Clear
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
            {/* Animated pulse icon — signals "monitoring active" */}
            <div className="relative mb-4" aria-hidden="true">
              <div className="w-10 h-10 rounded-full bg-ok/10 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-ok" />
              </div>
              <div className="absolute inset-0 w-10 h-10 rounded-full border border-ok/20 animate-pulse-soft" />
            </div>
            <p className="text-[13px] font-medium text-ink-muted">
              No anomalies detected
            </p>
            <p className="text-[12px] text-ink-dim mt-1.5 leading-relaxed max-w-[200px]">
              All metrics within statistical control bounds. The feed updates the moment a regression is detected.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5" role="list">
            {sorted.map((anomaly) => (
              <AnomalyEntry key={anomaly.id} anomaly={anomaly} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AnomalyEntry({ anomaly }: { anomaly: Anomaly }): JSX.Element {
  const severityClass: string =
    anomaly.severity === 'critical'
      ? 'critical border-l-brand bg-brand/5 hover:bg-brand/10'
      : 'warning border-l-warn bg-warn/5 hover:bg-warn/10';

  const badgeClass: string =
    anomaly.severity === 'critical'
      ? 'bg-brand/15 text-brand-300'
      : 'bg-warn/15 text-warn';

  const directionSymbol = anomaly.direction === 'above' ? '↑' : '↓';

  return (
    <li
      data-testid={`anomaly-entry-${anomaly.id}`}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-2 transition-colors duration-200 ${severityClass}`}
      role="listitem"
    >
      <div className="flex-shrink-0">
        <span
          className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeClass}`}
        >
          {anomaly.severity}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-ink">
            {METRIC_LABELS[anomaly.metricName]}
          </span>
          <span className="text-[12px] font-mono tabular-nums text-ink-muted">
            {directionSymbol} {anomaly.value.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <time
            className="text-[10px] text-ink-dim font-mono tabular-nums"
            dateTime={new Date(anomaly.timestamp).toISOString()}
          >
            {formatTime(anomaly.timestamp)}
          </time>
          <span className="text-[10px] text-ink-dim font-mono tabular-nums">
            σ {anomaly.severityScore.toFixed(1)}
          </span>
        </div>
      </div>
    </li>
  );
}

export default AnomalyFeed;
