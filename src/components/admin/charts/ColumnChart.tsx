import React from 'react';
import { formatNumber, niceScale, SeriesPoint } from './chartUtils';

interface ColumnChartProps {
  data: SeriesPoint[];
  height?: number;
  color?: string;
  highlightColor?: string;
  valueLabel?: string;
  emptyLabel?: string;
}

const WIDTH = 720;
const PAD = { top: 16, right: 14, bottom: 34, left: 44 };

const ColumnChart: React.FC<ColumnChartProps> = ({
  data,
  height = 240,
  color = 'var(--admin-maroon)',
  highlightColor = 'var(--admin-brass)',
  valueLabel = 'logins',
  emptyLabel = 'No data for this range',
}) => {
  if (data.length === 0) {
    return <div className="chart-empty">{emptyLabel}</div>;
  }

  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const { max, ticks } = niceScale(maxValue);
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = height - PAD.top - PAD.bottom;
  const slot = plotWidth / data.length;
  const barWidth = Math.max(4, Math.min(28, slot * 0.58));
  const peak = data.reduce(
    (best, point, index) => (point.value > data[best].value ? index : best),
    0
  );

  const yFor = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight;

  return (
    <svg
      className="column-chart"
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-label={`مخطط أعمدة لـ${valueLabel}`}
    >
      {ticks.map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y}
              y2={y}
              stroke="var(--admin-line)"
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" className="chart-axis-text">
              {formatNumber(tick)}
            </text>
          </g>
        );
      })}

      {data.map((point, index) => {
        const x = PAD.left + slot * index + (slot - barWidth) / 2;
        const y = yFor(point.value);
        const barHeight = Math.max(point.value > 0 ? 2 : 0, PAD.top + plotHeight - y);
        return (
          <g key={`${point.label}-${index}`}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={index === peak ? highlightColor : color}
            >
              <title>{`${point.label}: ${formatNumber(point.value)} ${valueLabel}`}</title>
            </rect>
            {point.value > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="chart-axis-text chart-axis-text--strong"
              >
                {formatNumber(point.value)}
              </text>
            )}
          </g>
        );
      })}

      {data.map((point, index) => {
        // Keep x labels from colliding: show every nth label when dense.
        const stride = Math.ceil(data.length / 10);
        if (index % stride !== 0 && index !== data.length - 1) return null;
        const x = PAD.left + slot * index + slot / 2;
        return (
          <text
            key={`label-${point.label}-${index}`}
            x={x}
            y={height - 10}
            textAnchor="middle"
            className="chart-axis-text"
          >
            {point.label}
          </text>
        );
      })}
    </svg>
  );
};

export default ColumnChart;
