import { describe, it, expect } from 'vitest';
import {
  createEwmaDetector,
  detectAnomaly,
} from '../src/lib/anomaly';
import type { MetricName } from '../src/types';

describe('detectAnomaly', () => {
  const metricName: MetricName = 'p95_latency';

  it('returns null anomaly for a value within EWMA ± 3σ bounds', () => {
    let state = createEwmaDetector(0.3);
    // Warm up with noisy values so variance is non-trivial
    for (let i = 0; i < 60; i++) {
      const noisy = 100 + (i % 3) - 1; // oscillates around 100
      const result = detectAnomaly(state, noisy, metricName);
      state = result.newState;
    }

    // A value well within the bounds should return null
    const result = detectAnomaly(state, 100, metricName);
    expect(result.anomaly).toBeNull();
  });

  it('returns an Anomaly object with severity when value exceeds upper bound by 3σ', () => {
    let state = createEwmaDetector(0.3);
    // Warm up with stable values
    for (let i = 0; i < 50; i++) {
      const result = detectAnomaly(state, 100, metricName);
      state = result.newState;
    }

    // After stable warm-up, variance is near zero.
    // Add noise so variance > 0, then spike.
    for (let i = 0; i < 30; i++) {
      const noisy = 100 + (i % 2 === 0 ? 2 : -2);
      const result = detectAnomaly(state, noisy, metricName);
      state = result.newState;
    }

    // Now inject a spike well above the control limit
    const result = detectAnomaly(state, 130, metricName);
    expect(result.anomaly).not.toBeNull();
    expect(result.anomaly!.direction).toBe('above');
    expect(result.anomaly!.severityScore).toBeGreaterThan(0);
    expect(result.anomaly!.metricName).toBe(metricName);
  });

  it('returns an Anomaly with direction "below" when value drops below lower bound', () => {
    let state = createEwmaDetector(0.3);
    // Warm up
    for (let i = 0; i < 50; i++) {
      const result = detectAnomaly(state, 100, metricName);
      state = result.newState;
    }

    // Add noise for variance
    for (let i = 0; i < 30; i++) {
      const noisy = 100 + (i % 2 === 0 ? 2 : -2);
      const result = detectAnomaly(state, noisy, metricName);
      state = result.newState;
    }

    // Inject a drop below the lower bound
    const result = detectAnomaly(state, 70, metricName);
    expect(result.anomaly).not.toBeNull();
    expect(result.anomaly!.direction).toBe('below');
  });

  it('EWMA state updates correctly across sequential calls (warm-up behaves sensibly)', () => {
    const initialState = createEwmaDetector(0.3);
    expect(initialState.initialized).toBe(false);

    // First call should initialize
    const r1 = detectAnomaly(initialState, 100, metricName);
    const state1 = r1.newState;
    expect(state1.initialized).toBe(true);
    expect(state1.mean).toBeCloseTo(100, 1);

    // Subsequent calls should converge the mean toward recent values
    const r2 = detectAnomaly(state1, 110, metricName);
    const state2 = r2.newState;
    // Mean should move toward 110 but not jump all the way
    expect(state2.mean).toBeGreaterThan(100);
    expect(state2.mean).toBeLessThan(110);
  });

  it('severity score scales with distance from control bound (4σ > 3.1σ)', () => {
    let state = createEwmaDetector(0.3);

    // Build a stable baseline with noise
    for (let i = 0; i < 60; i++) {
      const noisy = 100 + (i % 3) - 1;
      const result = detectAnomaly(state, noisy, metricName);
      state = result.newState;
    }

    const sigma = Math.sqrt(Math.max(state.variance, 1e-10));
    expect(sigma).toBeGreaterThan(0);

    // 3.1σ deviation
    const value31 = state.mean + 3.1 * sigma;
    const result31 = detectAnomaly(state, value31, metricName);
    expect(result31.anomaly).not.toBeNull();

    // 5σ deviation — much further out
    const value5 = state.mean + 5 * sigma;
    const result5 = detectAnomaly(state, value5, metricName);
    expect(result5.anomaly).not.toBeNull();

    expect(result5.anomaly!.severityScore).toBeGreaterThan(
      result31.anomaly!.severityScore
    );
  });
});
