import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createMetricStream,
  type MetricStream,
} from '../lib/metricGenerator';
import { detectAnomaly, createEwmaDetector, getControlBounds } from '../lib/anomaly';
import type {
  MetricName,
  MetricPoint,
  Anomaly,
  EwmaState,
} from '../types';

const MAX_POINTS = 60;
const STORAGE_KEY = 'pulsewatch:anomalies';

export interface MetricStreamState {
  points: MetricPoint[];
  bounds: { mean: number; lower: number; upper: number } | null;
  isAnomaly: boolean;
}

export interface MetricStreams {
  p95_latency: MetricStreamState;
  error_rate: MetricStreamState;
  throughput: MetricStreamState;
}

export interface UseMetricStreamResult {
  streams: MetricStreams;
  anomalies: Anomaly[];
  clearAnomalies: () => void;
  injectSpike: () => void;
}

function loadStoredAnomalies(): Anomaly[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveAnomalies(anomalies: Anomaly[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(anomalies));
  } catch {
    // ignore quota errors
  }
}

function trackEvent(event: string, props?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.aif?.track) {
    window.aif.track(event, props);
  }
}

const METRIC_NAMES: MetricName[] = ['p95_latency', 'error_rate', 'throughput'];

const INITIAL_STREAMS: MetricStreams = {
  p95_latency: { points: [], bounds: null, isAnomaly: false },
  error_rate: { points: [], bounds: null, isAnomaly: false },
  throughput: { points: [], bounds: null, isAnomaly: false },
};

export function useMetricStream(intervalMs: number = 500): UseMetricStreamResult {
  const [streams, setStreams] = useState<MetricStreams>(INITIAL_STREAMS);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(() => loadStoredAnomalies());

  // Persistent refs for streams and EWMA state
  const streamRefs = useRef<Record<MetricName, MetricStream> | null>(null);
  const ewmaRefs = useRef<Record<MetricName, EwmaState> | null>(null);
  const anomaliesRef = useRef<Anomaly[]>(anomalies);

  if (streamRefs.current === null) {
    streamRefs.current = {
      p95_latency: createMetricStream(
        { name: 'p95_latency', label: 'P95 Latency', unit: 'ms', baseline: 120, noise: 8, min: 1 },
        intervalMs
      ),
      error_rate: createMetricStream(
        { name: 'error_rate', label: 'Error Rate', unit: '%', baseline: 0.02, noise: 0.005, min: 0, max: 1 },
        intervalMs
      ),
      throughput: createMetricStream(
        { name: 'throughput', label: 'Throughput', unit: 'req/s', baseline: 850, noise: 30, min: 0 },
        intervalMs
      ),
    };
  }

  if (ewmaRefs.current === null) {
    ewmaRefs.current = {
      p95_latency: createEwmaDetector(0.3),
      error_rate: createEwmaDetector(0.3),
      throughput: createEwmaDetector(0.3),
    };
  }

  useEffect(() => {
    anomaliesRef.current = anomalies;
  }, [anomalies]);

  useEffect(() => {
    saveAnomalies(anomalies);
  }, [anomalies]);

  useEffect(() => {
    trackEvent('page_view', { path: '/' });
  }, []);

  // Main streaming loop
  useEffect(() => {
    const interval = setInterval(() => {
      const newAnomalies: Anomaly[] = [];
      const updates: Partial<MetricStreams> = {};

      for (const name of METRIC_NAMES) {
        const stream = streamRefs.current![name];
        const ewmaState = ewmaRefs.current![name];

        const { value, timestamp } = stream.next();
        const result = detectAnomaly(ewmaState, value, name);

        // Always update EWMA state
        ewmaRefs.current![name] = result.newState;

        const [lower, upper] = getControlBounds(result.newState);

        // Store latest data point for the functional state update
        updates[name] = {
          points: [{ timestamp, value }], // placeholder, will be merged in setStreams
          bounds: { mean: result.newState.mean, lower, upper },
          isAnomaly: result.anomaly !== null,
        };

        if (result.anomaly) {
          newAnomalies.push(result.anomaly);
          trackEvent('anomaly_detected', {
            metric: name,
            direction: result.anomaly.direction,
            severity: result.anomaly.severity,
            severity_score: result.anomaly.severityScore,
          });
        }
      }

      setStreams((prev) => {
        const next: MetricStreams = { ...prev };
        for (const name of METRIC_NAMES) {
          const upd = updates[name]!;
          const oldPoints = prev[name].points;
          next[name] = {
            points: [...oldPoints, { timestamp: upd.points[0].timestamp, value: upd.points[0].value }].slice(-MAX_POINTS),
            bounds: upd.bounds,
            isAnomaly: upd.isAnomaly,
          };
        }
        return next;
      });

      if (newAnomalies.length > 0) {
        const updated = [...newAnomalies.reverse(), ...anomaliesRef.current].slice(0, 200);
        anomaliesRef.current = updated;
        setAnomalies(updated);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  const clearAnomalies = useCallback(() => {
    setAnomalies([]);
    saveAnomalies([]);
    anomaliesRef.current = [];
    trackEvent('history_cleared');
  }, []);

  const injectSpike = useCallback(() => {
    const stream = streamRefs.current!['p95_latency'];
    // Inject a +50ms spike for 8 ticks (4 seconds at 500ms)
    stream.injectSpike(8, 50);
  }, []);

  return { streams, anomalies, clearAnomalies, injectSpike };
}
