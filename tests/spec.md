# Test Specifications

## Unit Tests (Vitest + React Testing Library)

### anomaly.test.ts
- [ ] `detectAnomaly` returns `null` for a value within EWMA ± 3σ bounds
- [ ] `detectAnomaly` returns an Anomaly object with severity when value exceeds upper bound by 3σ
- [ ] `detectAnomaly` returns an Anomaly with direction "below" when value drops below lower bound
- [ ] EWMA state updates correctly across sequential calls (warm-up period behaves sensibly)
- [ ] Severity score scales with distance from control bound (4σ → higher severity than 3.1σ)

### metricGenerator.test.ts
- [ ] `createMetricStream` emits values at the configured interval
- [ ] Generated p95 latency values stay within baseline range under normal conditions
- [ ] `injectSpike` causes the next N values to deviate by at least the specified sigma multiplier
- [ ] Error rate values never go below 0 or above 1

### MetricsDashboard.test.tsx
- [ ] renders without crash
- [ ] shows three metric charts (p95 latency, error rate, throughput) on mount
- [ ] displays "No anomalies detected" initial state in the anomaly feed
- [ ] when a spike is injected, an anomaly entry appears in the feed within 2 seconds
- [ ] anomaly entry shows metric name, timestamp, direction, and severity badge

### AnomalyFeed.test.tsx
- [ ] renders without crash with empty anomaly list
- [ ] renders anomaly entries with correct severity coloring (critical = red accent, warning = amber)
- [ ] clicking "Clear" empties the feed and persists to localStorage
- [ ] anomalies are sorted newest-first

## User Journey Tests

### Primary Workflow
1. App loads → three live metric charts begin streaming immediately, anomaly feed shows "Monitoring — no anomalies detected"
2. Metric stream naturally fluctuates → no false positive anomalies appear
3. A +3σ spike is injected into p95 latency → chart shows red anomaly band, feed adds entry with severity score
4. User refreshes the page → anomaly history persists in localStorage and appears in the feed

### Persistence
1. Trigger 2+ anomalies → entries appear in feed
2. Refresh page → previous anomalies reload from localStorage
3. Click "Clear History" → localStorage is wiped, feed resets to empty state

## Acceptance Criteria Checklist
(Reviewer verifies these against PRD.md features)
- [ ] AC: When a simulated metric stream injects a sustained +3σ spike in p95 latency, the dashboard highlights the anomaly region in under 2 seconds and an entry appears in the anomaly feed with timestamp, metric name, direction, and severity score.
- [ ] AC: After triggering an anomaly, refreshing the page shows the anomaly entry with its timestamp and severity in the history view.
