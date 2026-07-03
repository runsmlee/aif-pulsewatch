# Pulsewatch — Product Requirements Document

## Problem
Engineering teams find out about performance degradation from user complaints or post-mortem reports, not from their monitoring tools. Existing dashboards show data but require a human to stare at charts and decide if something is wrong. The gap between "metric starts degrading" and "someone notices" can be minutes to hours, turning cheap fixes into expensive incidents.

## Target Users
Backend/on-call engineers at teams of 5-50 who own service reliability and want to catch regressions in the first 30 seconds, not after the first PagerDuty page from a customer.

## Core Feature (default: exactly ONE)
- **Live Anomaly Detection on Real-Time Metrics**: Streams three key signals (p95 latency, error rate, requests/sec) with an EWMA-based anomaly detector that flags the exact moment a metric crosses its statistical control bounds. Anomalies appear instantly as red bands on the chart and entries in the anomaly feed — no thresholds to configure, no dashboards to stare at. Acceptance Criteria: When a simulated metric stream injects a sustained +3σ spike in p95 latency, the dashboard highlights the anomaly region in under 2 seconds and an entry appears in the anomaly feed with timestamp, metric name, direction, and severity score.

## Should Have (optional — only if the ONE feature requires it)
- **Persistent Anomaly Log**: Stores detected anomalies in localStorage so on-call engineers can review what happened during their shift after the fact, including severity and duration. Acceptance Criteria: After triggering an anomaly, refreshing the page shows the anomaly entry with its timestamp and severity in the history view.

## Out of Scope (v1)
- **Slack/email/webhook notification delivery**: Requires backend infrastructure and OAuth credentials. The anomaly feed IS the alert — delivery channels are a distribution problem, not a detection problem. Ship detection first.
- **AI-powered optimization recommendations**: Analyzing code patterns and suggesting infrastructure changes requires an LLM backend and access to source/deployment data. This is a fundamentally different product surface (recommendation engine vs. detection engine) and dilutes focus from "catch it fast" to "also fix it for you."
- **Multi-service / distributed tracing**: Supporting multiple services with cross-service correlation requires a backend ingestion pipeline. v1 monitors a single metric stream to prove the detection value proposition.
- **Custom metric configuration UI**: Letting users define their own metrics, thresholds, and formulas is a settings-heavy power-user feature. v1 uses sensible defaults (p95, error rate, throughput) to demonstrate the core detection loop.

## Success Metrics
- Primary: User sees an anomaly flagged on the dashboard within 2 seconds of the metric deviation beginning (sub-human-reaction detection).
- Secondary: Anomaly log retains 100% of detected events across page refreshes (reliability of persistence).

## Design Principles
- **Data is the hero, chrome recedes**: The charts dominate the viewport. Navigation, branding, and settings are minimal. The answer is always visible.
- **One glance, full picture**: A engineer looking at the screen for 3 seconds should know: is something wrong right now? What metric? How bad?
- **The hero contains the working ONE feature directly** — live metrics stream and anomaly detection render immediately on page load, no "connect your data source" or "start monitoring" gate.
