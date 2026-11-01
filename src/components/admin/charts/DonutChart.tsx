import React from 'react';
import { formatNumber } from './chartUtils';

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  centerLabel?: string;
  valueLabel?: string;
  colors?: string[];
  emptyLabel?: string;
}

const DEFAULT_COLORS = [
  'var(--admin-maroon)',
  'var(--admin-brass)',
  'var(--admin-sage)',
  'var(--admin-blue)',
  '#b07a83',
  '#7d6a58',
  '#8f9c88',
  '#c2a25e',
];

const RADIUS = 70;
const STROKE = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  centerLabel = 'Total',
  valueLabel = 'logins',
  colors = DEFAULT_COLORS,
  emptyLabel = 'لا توجد بيانات في هذه الفترة',
}) => {
  const visible = data.filter((slice) => slice.value > 0);
  const total = visible.reduce((sum, slice) => sum + slice.value, 0);

  if (visible.length === 0 || total === 0) {
    return <div className="chart-empty">{emptyLabel}</div>;
  }

  let offset = 0;
  const segments = visible.map((slice, index) => {
    const fraction = slice.value / total;
    const dash = Math.max(fraction * CIRCUMFERENCE - 2, 0);
    const segment = {
      ...slice,
      color: slice.color || colors[index % colors.length],
      fraction,
      dash,
      offset,
    };
    offset += fraction * CIRCUMFERENCE;
    return segment;
  });

  return (
    <div className="donut-layout">
      <svg
        className="donut-chart"
        viewBox="0 0 200 200"
        role="img"
        aria-label={`مخطط دائري لـ${valueLabel} حسب الفئة`}
      >
        <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="var(--admin-paper-2)" strokeWidth={STROKE} />
        {segments.map((segment) => (
          <circle
            key={segment.label}
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke={segment.color}
            strokeWidth={STROKE}
            strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
            strokeDashoffset={-segment.offset}
            transform="rotate(-90 100 100)"
          >
            <title>{`${segment.label}: ${formatNumber(segment.value)} (${Math.round(
              segment.fraction * 100
            )}%)`}</title>
          </circle>
        ))}
        <text x="100" y="94" textAnchor="middle" className="donut-center-number">
          {formatNumber(total)}
        </text>
        <text x="100" y="112" textAnchor="middle" className="donut-center-label">
          {centerLabel}
        </text>
      </svg>

      <ul className="donut-legend">
        {segments.map((segment) => (
          <li className="donut-legend__row" key={segment.label}>
            <span className="donut-legend__swatch" style={{ background: segment.color }} />
            <span className="donut-legend__label" title={segment.label}>
              {segment.label}
            </span>
            <span className="donut-legend__value">
              {formatNumber(segment.value)}
              <em>{Math.round(segment.fraction * 100)}%</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DonutChart;
