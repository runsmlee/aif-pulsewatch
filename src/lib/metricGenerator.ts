import type { MetricConfig, MetricName } from '../types';

export interface MetricStream {
  config: MetricConfig;
  next: () => { value: number; timestamp: number };
  injectSpike: (durationTicks: number, magnitude: number) => void;
}

/**
 * Create a metric stream that generates realistic-looking metric values
 * with baseline + noise, plus optional spike injection.
 *
 * This is a synchronous pull-based stream (call .next() to get the next value).
 * The hook (useMetricStream) drives the timing with setInterval.
 */
export function createMetricStream(
  config: MetricConfig,
  _intervalMs: number = 500
): MetricStream {
  let spikeRemaining = 0;
  let spikeMagnitude = 0;

  // Use a simple LCG (Linear Congruential Generator) for reproducible randomness
  // seeded by metric name so different metrics have independent streams
  let seed = hashString(config.name);
  function random(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  return {
    config,

    next(): { value: number; timestamp: number } {
      // Box-Muller transform for gaussian noise
      const u1 = Math.max(random(), 1e-10);
      const u2 = random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

      let value = config.baseline + gaussian * config.noise;

      // Apply spike if active
      if (spikeRemaining > 0) {
        value += spikeMagnitude;
        spikeRemaining--;
      }

      // Clamp to min/max if specified
      if (config.min !== undefined) {
        value = Math.max(value, config.min);
      }
      if (config.max !== undefined) {
        value = Math.min(value, config.max);
      }

      return { value, timestamp: Date.now() };
    },

    injectSpike(durationTicks: number, magnitude: number): void {
      spikeRemaining = durationTicks;
      spikeMagnitude = magnitude;
    },
  };
}

/**
 * Inject a spike into a stream — sugar for stream.injectSpike().
 */
export function injectSpike(
  stream: MetricStream,
  durationTicks: number,
  magnitude: number
): void {
  stream.injectSpike(durationTicks, magnitude);
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash || 1;
}

/**
 * Standard metric configurations for Pulsewatch.
 */
export const METRIC_CONFIGS: Record<MetricName, MetricConfig> = {
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
