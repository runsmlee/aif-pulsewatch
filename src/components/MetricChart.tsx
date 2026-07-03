import { useMemo } from 'react';
import type { MetricStreamState } from '../hooks/useMetricStream';
import type { MetricConfig } from '../types';

interface MetricChartProps {
  config: MetricConfig;
  state: MetricStreamState;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 80;
const PADDING = { top: 10, right: 8, bottom: 6, left: 8 };

interface ChartData {
  pathD: string;
  areaD: string;
  minY: number;
  maxY: number;
  anomalyBands: { x: number; width: number }[];
  currentY: number | null;
  boundsLine: { upper: number; lower: number } | null;
}

const EMPTY_DATA: ChartData = {
  pathD: '',
  areaD: '',
  minY: 0,
  maxY: 0,
  anomalyBands: [],
  currentY: null,
  boundsLine: null,
};

export function MetricChart({ config, state }: MetricChartProps): JSX.Element {
  const { points, bounds, isAnomaly } = state;

  const chartData = useMemo<ChartData>(() => {
    if (points.length === 0) {
      return {
        ...EMPTY_DATA,
        minY: config.baseline - config.noise * 3,
        maxY: config.baseline + config.noise * 3,
      };
    }

    const plotW = CHART_WIDTH - PADDING.left - PADDING.right;
    const plotH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const values = points.map((p) => p.value);
    let minV = Math.min(...values);
    let maxV = Math.max(...values);

    if (bounds) {
      minV = Math.min(minV, bounds.lower);
      maxV = Math.max(maxV, bounds.upper);
    }

    const range = maxV - minV || 1;
    const pad = range * 0.15;
    const localMinY = minV - pad;
    const localMaxY = maxV + pad;
    const scaledRange = localMaxY - localMinY || 1;

    const stepX = plotW / Math.max(points.length - 1, 1);

    const coords = points.map((p, i) => {
      const x = PADDING.left + i * stepX;
      const y = PADDING.top + plotH - ((p.value - localMinY) / scaledRange) * plotH;
      return { x, y, value: p.value };
    });

    const pathD = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');

    const areaD =
      pathD +
      ` L ${coords[coords.length - 1].x.toFixed(1)} ${(PADDING.top + plotH).toFixed(1)}` +
      ` L ${coords[0].x.toFixed(1)} ${(PADDING.top + plotH).toFixed(1)} Z`;

    const anomalyBands: { x: number; width: number }[] = [];
    if (isAnomaly && coords.length > 0) {
      const lastCoord = coords[coords.length - 1];
      anomalyBands.push({ x: Math.max(lastCoord.x - stepX, PADDING.left), width: stepX * 2 });
    }

    const currentY = coords[coords.length - 1].y;

    const boundsLine = bounds
      ? {
          upper: PADDING.top + plotH - ((bounds.upper - localMinY) / scaledRange) * plotH,
          lower: PADDING.top + plotH - ((bounds.lower - localMinY) / scaledRange) * plotH,
        }
      : null;

    return { pathD, areaD, minY: localMinY, maxY: localMaxY, anomalyBands, currentY, boundsLine };
  }, [points, bounds, isAnomaly, config]);

  const latestValue = points.length > 0 ? points[points.length - 1].value : null;

  // Unique gradient ID per metric to avoid SVG conflicts
  const gradientId = `grad-${config.name}`;

  return (
    <div
      className={`card-surface ${isAnomaly ? 'card-anomaly' : ''} p-4 sm:p-5`}
      role="region"
      aria-label={`${config.label} chart`}
    >
      {/* Header row: label + value */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
            {config.label}
          </span>
          {latestValue !== null && (
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`font-mono text-2xl font-bold tabular-nums leading-none transition-colors duration-300 ${
                  isAnomaly ? 'text-brand-300' : 'text-ink'
                }`}
              >
                {formatValue(latestValue, config, true)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          {isAnomaly && (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-brand animate-pulse-soft" aria-label="anomaly detected" />
              <span className="text-[10px] font-semibold text-brand-300 uppercase tracking-wider">
                Anomaly
              </span>
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      <svg
        width="100%"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="overflow-visible block"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isAnomaly ? '#C7452E' : '#9B958A'} stopOpacity="0.25" />
            <stop offset="100%" stopColor={isAnomaly ? '#C7452E' : '#9B958A'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Anomaly band */}
        {chartData.anomalyBands.map((band, i) => (
          <rect
            key={i}
            x={band.x}
            y={PADDING.top}
            width={band.width}
            height={CHART_HEIGHT - PADDING.top - PADDING.bottom}
            fill="#C7452E"
            opacity={0.12}
            rx={2}
          />
        ))}

        {/* Control bounds lines */}
        {chartData.boundsLine && (
          <>
            <line
              x1={PADDING.left}
              y1={chartData.boundsLine.upper}
              x2={CHART_WIDTH - PADDING.right}
              y2={chartData.boundsLine.upper}
              stroke="#45413A"
              strokeWidth={0.5}
              strokeDasharray="2,3"
            />
            <line
              x1={PADDING.left}
              y1={chartData.boundsLine.lower}
              x2={CHART_WIDTH - PADDING.right}
              y2={chartData.boundsLine.lower}
              stroke="#45413A"
              strokeWidth={0.5}
              strokeDasharray="2,3"
            />
          </>
        )}

        {/* Area fill — gradient */}
        {chartData.areaD && (
          <path d={chartData.areaD} fill={`url(#${gradientId})`} />
        )}

        {/* Line */}
        <path
          d={chartData.pathD}
          fill="none"
          stroke={isAnomaly ? '#C7452E' : '#9B958A'}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Latest point — pulsing dot */}
        {chartData.currentY !== null && (
          <>
            <circle
              cx={CHART_WIDTH - PADDING.right}
              cy={chartData.currentY}
              r={isAnomaly ? 4 : 3}
              fill={isAnomaly ? '#C7452E' : '#E8E5E0'}
            />
            {isAnomaly && (
              <circle
                cx={CHART_WIDTH - PADDING.right}
                cy={chartData.currentY}
                r={7}
                fill="#C7452E"
                opacity={0.2}
              />
            )}
          </>
        )}
      </svg>

      {/* Range labels */}
      <div className="flex justify-between mt-2 text-[10px] text-ink-dim font-mono tabular-nums">
        <span>{formatValue(chartData.minY, config)}</span>
        <span className="text-ink-faint uppercase tracking-wider">{config.unit}</span>
        <span>{formatValue(chartData.maxY, config)}</span>
      </div>
    </div>
  );
}

function formatValue(value: number, config: MetricConfig, isPrimary = false): string {
  if (config.unit === '%') {
    return `${(value * 100).toFixed(isPrimary ? 2 : 1)}%`;
  }
  if (value >= 1000) {
    return `${value.toFixed(0)}`;
  }
  return value.toFixed(isPrimary ? 1 : 0);
}

export default MetricChart;
