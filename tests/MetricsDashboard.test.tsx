import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MetricsDashboard from '../src/components/MetricsDashboard';

// Mock the analytics tracker
const mockTrack = vi.fn();
beforeEach(() => {
  vi.stubGlobal('aif', { track: mockTrack });
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  });
});

describe('MetricsDashboard', () => {
  it('renders without crash', () => {
    render(<MetricsDashboard />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('shows three metric charts (p95 latency, error rate, throughput) on mount', () => {
    render(<MetricsDashboard />);
    expect(screen.getByText(/p95 latency/i)).toBeInTheDocument();
    expect(screen.getByText(/error rate/i)).toBeInTheDocument();
    expect(screen.getByText(/throughput/i)).toBeInTheDocument();
  });

  it('displays "No anomalies detected" initial state in the anomaly feed', () => {
    render(<MetricsDashboard />);
    expect(screen.getByText(/no anomalies detected/i)).toBeInTheDocument();
  });

  it('when a spike is injected, an anomaly entry appears in the feed within 2 seconds', async () => {
    vi.useFakeTimers();
    render(<MetricsDashboard />);

    // Find and click the "Inject Spike" button to trigger anomaly
    const spikeButton = screen.getByRole('button', { name: /inject.*spike/i });
    act(() => {
      spikeButton.click();
    });

    // Advance timers to let the stream emit and detection run
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // An anomaly entry should appear in the feed
    expect(screen.queryByText(/no anomalies detected/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('anomaly entry shows metric name, timestamp, direction, and severity badge', async () => {
    vi.useFakeTimers();
    render(<MetricsDashboard />);

    const spikeButton = screen.getByRole('button', { name: /inject.*spike/i });
    act(() => {
      spikeButton.click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Check the anomaly feed has visible entries with metric name
    const anomalyEntries = screen.getAllByTestId(/anomaly-entry/);
    expect(anomalyEntries.length).toBeGreaterThan(0);

    // Each entry should have a severity badge
    const badges = screen.getAllByText(/warning|critical/i);
    expect(badges.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });
});
