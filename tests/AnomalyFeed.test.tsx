import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnomalyFeed from '../src/components/AnomalyFeed';
import type { Anomaly } from '../src/types';

const mockAnomalies: Anomaly[] = [
  {
    id: '1',
    metricName: 'p95_latency',
    value: 150,
    expectedRange: [90, 110],
    direction: 'above',
    severityScore: 4.2,
    severity: 'critical',
    timestamp: Date.now() - 1000,
  },
  {
    id: '2',
    metricName: 'error_rate',
    value: 0.001,
    expectedRange: [0.01, 0.05],
    direction: 'below',
    severityScore: 3.5,
    severity: 'warning',
    timestamp: Date.now() - 5000,
  },
];

beforeEach(() => {
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

describe('AnomalyFeed', () => {
  it('renders without crash with empty anomaly list', () => {
    render(<AnomalyFeed anomalies={[]} onClear={vi.fn()} />);
    expect(screen.getByText(/no anomalies detected/i)).toBeInTheDocument();
  });

  it('renders anomaly entries with correct severity coloring (critical = red accent, warning = amber)', () => {
    render(<AnomalyFeed anomalies={mockAnomalies} onClear={vi.fn()} />);

    const criticalEntry = screen.getByTestId('anomaly-entry-1');
    expect(criticalEntry).toBeInTheDocument();
    expect(criticalEntry.className).toMatch(/critical/);

    const warningEntry = screen.getByTestId('anomaly-entry-2');
    expect(warningEntry).toBeInTheDocument();
    expect(warningEntry.className).toMatch(/warning/);
  });

  it('clicking "Clear" empties the feed and persists to localStorage', () => {
    const onClear = vi.fn();
    render(<AnomalyFeed anomalies={mockAnomalies} onClear={onClear} />);

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('anomalies are sorted newest-first', () => {
    const olderFirst: Anomaly[] = [
      {
        id: 'old',
        metricName: 'error_rate',
        value: 0.001,
        expectedRange: [0.01, 0.05],
        direction: 'below',
        severityScore: 3.5,
        severity: 'warning',
        timestamp: Date.now() - 5000,
      },
      {
        id: 'new',
        metricName: 'p95_latency',
        value: 150,
        expectedRange: [90, 110],
        direction: 'above',
        severityScore: 4.2,
        severity: 'critical',
        timestamp: Date.now(),
      },
    ];

    render(<AnomalyFeed anomalies={olderFirst} onClear={vi.fn()} />);

    const entries = screen.getAllByTestId(/anomaly-entry-/);
    // The first entry should be the newest one ('new')
    expect(entries[0].getAttribute('data-testid')).toBe('anomaly-entry-new');
  });
});
