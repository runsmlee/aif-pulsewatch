import type { Anomaly, EwmaState, MetricName, Severity } from '../types';

/**
 * Create a new EWMA detector state.
 * @param alpha - smoothing factor (0 < alpha <= 1). Lower = slower reaction.
 */
export function createEwmaDetector(alpha: number = 0.3): EwmaState {
  return {
    mean: 0,
    variance: 0,
    initialized: false,
    alpha,
  };
}

/**
 * Compute the control bounds: mean ± k*sigma.
 */
export function getControlBounds(
  state: EwmaState,
  k: number = 3
): [number, number] {
  const sigma = Math.sqrt(Math.max(state.variance, 1e-10));
  return [state.mean - k * sigma, state.mean + k * sigma];
}

function computeSeverityScore(
  value: number,
  mean: number,
  sigma: number
): number {
  if (sigma === 0) return 3.0;
  const rawSigma = Math.abs(value - mean) / sigma;
  return Math.round(rawSigma * 10) / 10;
}

function classifySeverity(score: number, k: number): Severity {
  if (score >= k * 1.5) return 'critical';
  return 'warning';
}

export interface AnomalyResult {
  anomaly: Anomaly | null;
  newState: EwmaState;
}

/**
 * Detect if a value is anomalous given the current EWMA state.
 * Always returns the updated EWMA state (newState).
 * Returns anomaly=null when the value is within control bounds.
 */
export function detectAnomaly(
  state: EwmaState,
  value: number,
  metricName: MetricName,
  k: number = 3
): AnomalyResult {
  const alpha = state.alpha;

  // First observation: initialize
  if (!state.initialized) {
    const newState: EwmaState = {
      ...state,
      mean: value,
      variance: 1e-10,
      initialized: true,
    };
    return { anomaly: null, newState };
  }

  const [lower, upper] = getControlBounds(state, k);

  // Update EWMA state regardless of anomaly status
  const delta = value - state.mean;
  const newMean = state.mean + alpha * delta;
  const newVariance = (1 - alpha) * (state.variance + alpha * delta * delta);
  const newState: EwmaState = {
    ...state,
    mean: newMean,
    variance: Math.max(newVariance, 1e-10),
  };

  // Check if value is outside control bounds
  if (value > upper || value < lower) {
    const sigma = Math.sqrt(Math.max(state.variance, 1e-10));
    const severityScore = computeSeverityScore(value, state.mean, sigma);
    const direction = value > upper ? 'above' : 'below';

    const anomaly: Anomaly = {
      id: `${metricName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      metricName,
      value,
      expectedRange: [lower, upper],
      direction,
      severityScore,
      severity: classifySeverity(severityScore, k),
      timestamp: Date.now(),
    };

    return { anomaly, newState };
  }

  return { anomaly: null, newState };
}
