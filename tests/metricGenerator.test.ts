import { describe, it, expect } from 'vitest';
import { createMetricStream, injectSpike } from '../src/lib/metricGenerator';
import type { MetricConfig } from '../src/types';

describe('metricGenerator', () => {
  const config: MetricConfig = {
    name: 'p95_latency',
    label: 'P95 Latency',
    unit: 'ms',
    baseline: 100,
    noise: 5,
  };

  it('createMetricStream emits values at the configured interval', () => {
    const stream = createMetricStream(config, 10); // 10ms interval
    // Collect a few values synchronously
    const values: number[] = [];
    for (let i = 0; i < 5; i++) {
      values.push(stream.next().value);
    }
    expect(values.length).toBe(5);
    values.forEach((v) => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    });
  });

  it('p95 latency values stay within baseline range under normal conditions', () => {
    const latencyConfig: MetricConfig = {
      name: 'p95_latency',
      label: 'P95 Latency',
      unit: 'ms',
      baseline: 100,
      noise: 10,
      min: 0,
    };
    const stream = createMetricStream(latencyConfig, 10);
    for (let i = 0; i < 100; i++) {
      const v = stream.next().value;
      // Values should cluster around baseline ± noise range
      // Under normal conditions, they shouldn't be extremely far
      expect(v).toBeGreaterThan(50);
      expect(v).toBeLessThan(200);
    }
  });

  it('injectSpike causes the next N values to deviate by at least the specified sigma multiplier', () => {
    const stream = createMetricStream(config, 10);
    // First, get baseline average
    let baselineSum = 0;
    for (let i = 0; i < 20; i++) {
      baselineSum += stream.next().value;
    }
    const baselineAvg = baselineSum / 20;

    // Inject spike: 5 ticks, +20 offset
    injectSpike(stream, 5, 20);
    const spikeValues: number[] = [];
    for (let i = 0; i < 5; i++) {
      spikeValues.push(stream.next().value);
    }

    // The average of spike values should be significantly higher than baseline
    const spikeAvg = spikeValues.reduce((a, b) => a + b, 0) / spikeValues.length;
    expect(spikeAvg).toBeGreaterThan(baselineAvg + 10);

    // After spike ends, values should return to normal range
    const postSpike = stream.next().value;
    expect(postSpike).toBeLessThan(baselineAvg + 15);
  });

  it('error rate values never go below 0 or above 1', () => {
    const errorConfig: MetricConfig = {
      name: 'error_rate',
      label: 'Error Rate',
      unit: '%',
      baseline: 0.02,
      noise: 0.01,
      min: 0,
      max: 1,
    };
    const stream = createMetricStream(errorConfig, 10);
    for (let i = 0; i < 200; i++) {
      const v = stream.next().value;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
