// Core domain types for Pulsewatch

export type MetricName = 'p95_latency' | 'error_rate' | 'throughput';

export interface MetricConfig {
  name: MetricName;
  label: string;
  unit: string;
  baseline: number;
  noise: number;
  min?: number;
  max?: number;
}

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export type AnomalyDirection = 'above' | 'below';

export type Severity = 'warning' | 'critical';

export interface Anomaly {
  id: string;
  metricName: MetricName;
  value: number;
  expectedRange: [number, number];
  direction: AnomalyDirection;
  severityScore: number;
  severity: Severity;
  timestamp: number;
}

export interface EwmaState {
  mean: number;
  variance: number;
  initialized: boolean;
  alpha: number;
}

export const SIGMA_MULTIPLIER = 3;
